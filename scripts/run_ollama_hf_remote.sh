#!/usr/bin/env bash
set -euo pipefail

host="${1:-jetson-orin}"
model_ref="${2:-hf.co/LiquidAI/LFM2.5-8B-A1B-GGUF:Q4_K_M}"
stamp="$(date -u +%Y%m%dT%H%M%SZ)"
out_dir="logs"
mkdir -p "$out_dir"
safe_model="${model_ref//[^A-Za-z0-9_.-]/-}"
out="$out_dir/${stamp}-ollama-hf-${safe_model}.md"

{
  echo "# Ollama HF Run ${stamp}"
  echo
  echo "- host: ${host}"
  echo "- model_ref: ${model_ref}"
  echo
  echo '```text'
  ssh "$host" "MODEL_REF='$model_ref' bash -s" <<'REMOTE'
set -euo pipefail

echo "== baseline =="
date -u +%Y-%m-%dT%H:%M:%SZ
free -h
df -h "$HOME" /tmp 2>/dev/null || true
nvidia-smi || true
ollama list || true
ollama ps || true

echo
echo "== memory cleanup =="
running="$(ollama ps | awk 'NR>1 {print $1}')"
if [ -n "$running" ]; then
  while read -r model; do
    [ -n "$model" ] && ollama stop "$model" || true
  done <<EOF
$running
EOF
fi
if sudo -n true 2>/dev/null; then
  sudo sync
  echo 3 | sudo tee /proc/sys/vm/drop_caches >/dev/null
  echo "drop_caches=ok"
else
  sync
  echo "drop_caches=skipped_no_passwordless_sudo"
fi
free -h

echo
echo "== prompt =="
start_epoch="$(date +%s)"
ollama run "$MODEL_REF" "日本語で短く答えてください。Jetson Orin Nano Super 8GBでLFM2.5 8B A1B Q4_K_Mを動かす時、RAM不足を避けるために最初に下げるべき設定は何ですか？"
end_epoch="$(date +%s)"
echo "elapsed_seconds=$((end_epoch - start_epoch))"

echo
echo "== post-run =="
ollama ps || true
nvidia-smi || true
free -h
REMOTE
  echo '```'
} | tee "$out"

echo "wrote $out"
