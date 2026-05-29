# Jetson LFM2.5 Bench

Reproducible notes and scripts for testing Liquid AI LFM2.5 GGUF models on a
Jetson Orin Nano Super-class device.

## Target

- Host alias: `jetson-orin`
- Device observed: NVIDIA Jetson Orin Nano Engineering Reference Developer Kit
- OS kernel observed: `5.15.148-tegra`
- Initial runtime: Ollama installed, `nvidia-smi` available, no `llama-cli`

## Experiment Plan

1. Capture baseline memory, disk, GPU, and Ollama state.
2. Stop unused Ollama models and clear Linux page cache when permitted.
3. Download a GGUF model outside git.
4. Create an Ollama model from the GGUF.
5. Run a short prompt, a longer context smoke test, and a repeatable benchmark.
6. Save sanitized logs under `logs/` and commit only small text reports.

## Model Policy

GGUF files are intentionally excluded from git. Put models under:

```text
~/models/lfm25/
```

The first target is `LFM2.5-8B-A1B-Q4_K_M.gguf` if available. If RAM pressure
or runtime setup blocks it, use a smaller GGUF as a fallback and record the
fallback in the report.

## Quick Run

```bash
./scripts/probe_jetson.sh jetson-orin
./scripts/run_ollama_gguf_remote.sh jetson-orin ~/models/lfm25/LFM2.5-8B-A1B-Q4_K_M.gguf lfm25:8b-a1b-q4
```

## Public Safety

Do not commit:

- GGUF model files
- private SSH config or keys
- full home-directory listings
- tokens, API keys, or browser/session material
- large raw benchmark dumps

