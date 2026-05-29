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
  return p;
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
  addBubble("user", prompt);
  const answer = addBubble("assistant", "");
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
        if (token.includes("<think>")) hiddenThink = true;
        if (hiddenThink) {
          if (token.includes("</think>")) {
            hiddenThink = false;
            token = token.split("</think>").slice(1).join("</think>");
          } else {
            token = "";
          }
        }
        answer.textContent += token;
        transcript.scrollTop = transcript.scrollHeight;
      }
      if (payload.elapsedMs) {
        runtimeState.textContent = `${Math.round(payload.elapsedMs / 1000)}s`;
      }
    }
  }

  if (!answer.textContent.trim()) {
    answer.textContent = "応答は取得できましたが、表示対象の本文が空でした。";
  }
  setStatus("ready", "ready");
  sendButton.disabled = false;
  promptInput.focus();
  await refreshStatus();
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

if (new URLSearchParams(location.search).get("demo") === "1") {
  promptInput.value =
    "このJetson上でLFM2.5 Q4_K_Mを動かした実測結果を、短い日本語で説明して。";
  setTimeout(() => form.requestSubmit(), 700);
}
