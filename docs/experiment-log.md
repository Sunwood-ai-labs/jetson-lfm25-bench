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

Run result:

- `hf.co/LiquidAI/LFM2.5-8B-A1B-GGUF:Q4_K_M` pulled successfully through
  Ollama.
- Short Japanese prompt completed.
- `ollama ps` reported 5.6 GB resident size, 37% CPU / 63% GPU, and 4096
  context.
- RAM while resident was tight: only about 334 MiB available, with swap use
  rising to about 1.6 GiB.
- After `ollama stop`, available RAM returned to about 5.9 GiB.
- Practical conclusion: Q4_K_M is usable on this 8 GB Jetson, but normal work
  should keep context small and avoid loading another model alongside it.

Longform follow-up:

- `scripts/run_longform_ollama_api.sh jetson-orin` completed a longer API run.
- Prompt prefill: 415 tokens.
- Generated output: 2618 tokens.
- Wall time: 100 seconds.
- Ollama timing: total duration about 99.7 seconds, load duration about 7.3
  seconds, eval duration about 89.1 seconds.
- Post-run memory was still tight: about 403 MiB available, Ollama RSS about
  5.8 GiB, context 4096.
- The model emitted hidden reasoning text despite instructions, so the public
  log keeps only metrics and a sanitized interpretation.
