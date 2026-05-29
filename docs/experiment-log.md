# Experiment Log

## 2026-05-29

Initial target:

- SSH alias: `jetson-orin`
- RAM: 7.4 GiB total, 5.6 GiB available before model load
- Swap: 3.7 GiB total
- Disk: NVMe root filesystem, about 405 GiB free
- Runtime: Ollama present at `/usr/local/bin/ollama`
- `llama-cli`: not present

Decision:

- Start with Ollama GGUF import because it is already installed.
- Keep llama.cpp as a fallback only if Ollama cannot import or run the target
  GGUF.
- If LFM2.5-8B-A1B Q4_K_M does not fit in the 8 GiB unified memory profile,
  reduce context first, then try a smaller GGUF.

