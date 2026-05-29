# Web Chat Demo

The demo app in `web-chat/` is a local browser UI that talks to Jetson Ollama
through an SSH tunnel.

## Topology

```text
Browser -> local Node server :8765 -> SSH tunnel :11435 -> jetson-orin Ollama :11434
```

## Captured Run

- Video: `captures/jetson-lfm25-chat-demo.webm`
- Screenshot: `captures/jetson-lfm25-chat-demo.png`
- Longform video: `captures/jetson-lfm25-longform-demo.webm`
- Longform screenshot: `captures/jetson-lfm25-longform-demo.png`
- Model: `hf.co/LiquidAI/LFM2.5-8B-A1B-GGUF:Q4_K_M`
- Context: 4096
- LAN viewer path: `/viewer.html`
- Longform LAN viewer path: `/viewer.html?capture=long`

The final captured prompt asks the model to summarize the observed Jetson run in
Japanese. The server system prompt includes the measured memory facts from the
experiment log so the demo response stays grounded instead of inventing GPU VRAM
numbers.

## Cleanup

After recording, stop the resident model on the Jetson:

```bash
ssh jetson-orin 'ollama stop hf.co/LiquidAI/LFM2.5-8B-A1B-GGUF:Q4_K_M || true'
```
