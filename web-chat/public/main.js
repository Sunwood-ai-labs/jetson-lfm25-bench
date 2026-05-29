const statusBox = document.querySelector("#status");
const statusText = document.querySelector("#statusText");
const modelName = document.querySelector("#modelName");
const runtimeState = document.querySelector("#runtimeState");
const transcript = document.querySelector("#transcript");
const form = document.querySelector("#chatForm");
const promptInput = document.querySelector("#prompt");
const sendButton = document.querySelector("#sendButton");

function setStatus(kind, text) {
  statusBox.className = `status ${kind}`;
  statusText.textContent = text;
}

function addBubble(role, text = "") {
  const article = document.createElement("article");
  article.className = `bubble ${role}`;
  const label = document.createElement("span");
  label.className = "label";
  label.textContent = role === "user" ? "prompt" : "remote model";
  const p = document.createElement("p");
  p.textContent = text;
  article.append(label, p);
  transcript.append(article);
  transcript.scrollTop = transcript.scrollHeight;
  p.bubbleElement = article;
  return p;
}

function addAssistantBubble() {
  const article = document.createElement("article");
  article.className = "bubble assistant";
  const label = document.createElement("span");
  label.className = "label";
  label.textContent = "remote model";
  const think = document.createElement("details");
  think.className = "think-box";
  const summary = document.createElement("summary");
  summary.textContent = "think stream";
  const thinkText = document.createElement("pre");
  think.append(summary, thinkText);
  const p = document.createElement("p");
  article.append(label, think, p);
  transcript.append(article);
  transcript.scrollTop = transcript.scrollHeight;
  return { answer: p, think, thinkText };
}

async function refreshStatus() {
  try {
    const response = await fetch("/api/status");
    const data = await response.json();
    if (!data.ok) throw new Error(data.error || "upstream unavailable");
    modelName.textContent = data.model;
    runtimeState.textContent = data.ps?.models?.length ? "Loaded" : "Ready";
    setStatus("ready", "ready");
  } catch (error) {
    runtimeState.textContent = "Offline";
    setStatus("error", "offline");
  }
}

async function sendPrompt(prompt) {
  if (document.body.classList.contains("recording")) {
    for (const bubble of transcript.querySelectorAll(".bubble")) {
      bubble.classList.add("compact-history");
      const details = bubble.querySelector("details");
      if (details) details.open = false;
    }
  }
  const userBubble = addBubble("user", prompt);
  const { answer, think, thinkText } = addAssistantBubble();
  if (document.body.classList.contains("recording")) {
    userBubble.bubbleElement.scrollIntoView({ block: "start" });
  }
  setStatus("", "generating");
  runtimeState.textContent = "Streaming";
  sendButton.disabled = true;

  const response = await fetch("/api/chat", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ prompt })
  });

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let hiddenThink = false;
  let thinkSeen = false;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const events = buffer.split("\n\n");
    buffer = events.pop() || "";
    for (const event of events) {
      const line = event.split("\n").find((item) => item.startsWith("data: "));
      if (!line) continue;
      const payload = JSON.parse(line.slice(6));
      if (payload.token) {
        let token = payload.token;
        if (token.includes("<think>")) {
          hiddenThink = true;
          thinkSeen = true;
          think.open = true;
          token = token.replace("<think>", "");
        }
        if (hiddenThink) {
          if (token.includes("</think>")) {
            hiddenThink = false;
            const parts = token.split("</think>");
            thinkText.textContent += parts.shift();
            token = parts.join("</think>");
          } else {
            thinkText.textContent += token;
            token = "";
          }
        }
        answer.textContent += token;
        if (document.body.classList.contains("recording")) {
          userBubble.bubbleElement.scrollIntoView({ block: "start" });
        } else {
          transcript.scrollTop = transcript.scrollHeight;
        }
      }
      if (payload.elapsedMs) {
        runtimeState.textContent = `${Math.round(payload.elapsedMs / 1000)}s`;
      }
    }
  }

  if (!answer.textContent.trim()) {
    answer.textContent = "応答は取得できましたが、表示対象の本文が空でした。";
  }
  if (!thinkSeen) {
    think.remove();
  }
  setStatus("ready", "ready");
  sendButton.disabled = false;
  promptInput.focus();
  await refreshStatus();
  if (document.body.classList.contains("recording")) {
    userBubble.bubbleElement.scrollIntoView({ block: "start" });
  }
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const prompt = promptInput.value.trim();
  if (!prompt) return;
  promptInput.value = "";
  try {
    await sendPrompt(prompt);
  } catch (error) {
    addBubble("assistant", `error: ${error.message}`);
    setStatus("error", "error");
    sendButton.disabled = false;
  }
});

await refreshStatus();

const params = new URLSearchParams(location.search);
if (params.get("recording") === "1") {
  document.body.classList.add("recording");
}
if (params.get("demo") === "1") {
  promptInput.value = "このJetson上でLFM2.5 Q4_K_Mを動かした実測結果を、短い日本語で説明して。";
  setTimeout(() => form.requestSubmit(), 700);
}

if (params.get("demo") === "long") {
  promptInput.value = [
    "このJetson上でLFM2.5 Q4_K_Mの長文生成を試した結果を、日本語で詳しめに説明して。",
    "必ず次の観測値だけを使ってください。",
    "入力側prompt_eval_countは415、生成側eval_countは2618、壁時計時間は100秒、total_durationは約99.7秒、load_durationは約7.3秒、eval_durationは約89.1秒。",
    "実行直後のavailable memoryは403MiB、Ollama RSSは約5.8GiB、contextは4096。",
    "最後に、このLAN動画ビューワーで見る価値を一文でまとめてください。"
  ].join("\\n");
  setTimeout(() => form.requestSubmit(), 700);
}

if (params.get("demo") === "multi") {
  const prompts = [
    "ホットスタートだと最初の表示が速くなる理由を2文で説明して。",
    "think表示デモとして、何が見えるようになったか2文で説明して。",
    "Jetson LFM2.5 Q4_K_M連続チャット実験の見どころを3点で短くまとめて。"
  ];
  let index = 0;
  const runNext = async () => {
    if (index >= prompts.length) return;
    promptInput.value = prompts[index++];
    form.requestSubmit();
    const timer = setInterval(() => {
      if (!sendButton.disabled) {
        clearInterval(timer);
        setTimeout(runNext, 900);
      }
    }, 500);
  };
  setTimeout(runNext, 700);
}
