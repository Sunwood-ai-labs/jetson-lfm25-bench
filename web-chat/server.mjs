import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL(".", import.meta.url));
const publicRoot = join(root, "public");
const repoRoot = join(root, "..");
const capturesRoot = join(repoRoot, "captures");
const port = Number(process.env.PORT || 8765);
const host = process.env.HOST || "0.0.0.0";
const ollamaBase = process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11435";
const model =
  process.env.OLLAMA_MODEL || "hf.co/LiquidAI/LFM2.5-8B-A1B-GGUF:Q4_K_M";
let lastPrewarm = null;

const mime = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".mp4": "video/mp4",
  ".png": "image/png",
  ".webm": "video/webm"
};

function sendJson(res, status, body) {
  res.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(body));
}

async function readRequestJson(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
}

async function proxyChat(req, res) {
  const { prompt } = await readRequestJson(req);
  if (!prompt || typeof prompt !== "string") {
    sendJson(res, 400, { error: "prompt is required" });
    return;
  }

  res.writeHead(200, {
    "content-type": "text/event-stream; charset=utf-8",
    "cache-control": "no-cache, no-transform",
    connection: "keep-alive"
  });

  const startedAt = Date.now();
  try {
    const response = await fetch(`${ollamaBase}/api/chat`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        model,
        stream: true,
        options: {
          num_ctx: 4096,
          temperature: 0.2
        },
        messages: [
          {
            role: "system",
            content:
              "Answer concisely in Japanese. Do not reveal chain-of-thought. If you need reasoning, summarize the result only. Ground answers in these observed facts: Jetson RAM is 7.4GiB total. LFM2.5 Q4_K_M pulled size is 5.2GB. Ollama ps observed 5.5-5.6GB resident size at context 4096. During the run, available RAM dropped to roughly 334-483MiB and swap was about 1.4-1.6GiB. nvidia-smi on Orin reports GPU memory as Not Supported, so do not invent GPU VRAM numbers."
          },
          { role: "user", content: prompt }
        ]
      })
    });

    if (!response.ok || !response.body) {
      res.write(`event: error\ndata: ${JSON.stringify({ status: response.status })}\n\n`);
      res.end();
      return;
    }

    const decoder = new TextDecoder();
    let buffer = "";
    let visible = "";
    for await (const chunk of response.body) {
      buffer += decoder.decode(chunk, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";
      for (const line of lines) {
        if (!line.trim()) continue;
        const item = JSON.parse(line);
        const token = item.message?.content || "";
        visible += token;
        res.write(`data: ${JSON.stringify({ token })}\n\n`);
        if (item.done) {
          res.write(
            `event: done\ndata: ${JSON.stringify({
              elapsedMs: Date.now() - startedAt,
              chars: visible.length,
              model
            })}\n\n`
          );
        }
      }
    }
    res.end();
  } catch (error) {
    res.write(`event: error\ndata: ${JSON.stringify({ error: error.message })}\n\n`);
    res.end();
  }
}

async function status(res) {
  try {
    const [tags, ps] = await Promise.all([
      fetch(`${ollamaBase}/api/tags`).then((r) => r.json()),
      fetch(`${ollamaBase}/api/ps`).then((r) => r.json())
    ]);
    sendJson(res, 200, { ok: true, ollamaBase, model, tags, ps });
  } catch (error) {
    sendJson(res, 502, { ok: false, ollamaBase, model, error: error.message });
  }
}

async function prewarm(res) {
  const startedAt = Date.now();
  try {
    const response = await fetch(`${ollamaBase}/api/chat`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        model,
        stream: false,
        keep_alive: "15m",
        options: { num_ctx: 4096, temperature: 0 },
        messages: [
          { role: "system", content: "Reply with OK only." },
          { role: "user", content: "OK" }
        ]
      })
    });
    const body = await response.json();
    lastPrewarm = {
      ok: response.ok,
      elapsedMs: Date.now() - startedAt,
      loadDurationNs: body.load_duration || null,
      totalDurationNs: body.total_duration || null
    };
    sendJson(res, response.ok ? 200 : 502, { ok: response.ok, model, lastPrewarm });
  } catch (error) {
    lastPrewarm = { ok: false, elapsedMs: Date.now() - startedAt, error: error.message };
    sendJson(res, 502, { ok: false, model, lastPrewarm });
  }
}

async function serveFile(req, res, baseDir, rawPath) {
  const safePath = normalize(rawPath).replace(/^(\.\.[/\\])+/, "");
  const filePath = join(baseDir, safePath);
  if (!filePath.startsWith(baseDir)) {
    res.writeHead(403, { "content-type": "text/plain; charset=utf-8" });
    res.end("forbidden");
    return;
  }
  try {
    const data = await readFile(filePath);
    res.writeHead(200, { "content-type": mime[extname(filePath)] || "application/octet-stream" });
    res.end(data);
  } catch {
    res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    res.end("not found");
  }
}

async function serveStatic(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const rawPath = url.pathname === "/" ? "/index.html" : url.pathname;
  if (rawPath.startsWith("/captures/")) {
    return serveFile(req, res, capturesRoot, rawPath.replace("/captures/", "/"));
  }
  return serveFile(req, res, publicRoot, rawPath);
}

createServer(async (req, res) => {
  if (req.method === "GET" && req.url?.startsWith("/api/status")) return status(res);
  if (req.method === "POST" && req.url === "/api/prewarm") return prewarm(res);
  if (req.method === "POST" && req.url === "/api/chat") return proxyChat(req, res);
  return serveStatic(req, res);
}).listen(port, host, () => {
  console.log(`Jetson LFM2.5 chat: http://${host}:${port}`);
  console.log(`Ollama upstream: ${ollamaBase}`);
  if (process.env.PREWARM === "1") {
    fetch(`http://127.0.0.1:${port}/api/prewarm`, { method: "POST" })
      .then((r) => r.json())
      .then((data) => console.log(`Prewarm: ${JSON.stringify(data.lastPrewarm)}`))
      .catch((error) => console.error(`Prewarm failed: ${error.message}`));
  }
});
