#!/usr/bin/env bash
set -euo pipefail

host="${1:-jetson-orin}"
gguf_path="${2:-$HOME/models/lfm25/LFM2.5-8B-A1B-Q4_K_M.gguf}"
model_name="${3:-lfm25:8b-a1b-q4}"
stamp="$(date -u +%Y%m%dT%H%M%SZ)"
out_dir="logs"
mkdir -p "$out_dir"
out="$out_dir/${stamp}-ollama-${model_name//[:\/]/-}.md"

{
  echo "# Ollama GGUF Run ${stamp}"
  echo
  echo "- host: ${host}"
  echo "- gguf_path: ${gguf_path}"
  echo "- model_name: ${model_name}"
  echo
  echo '```text'
  ssh "$host" "GGUF_PATH='$gguf_path' MODEL_NAME='$model_name' bash -s" <<'REMOTE'
set -euo pipefail

echo "== baseline =="
date -u +%Y-%m-%dT%H:%M:%SZ
free -h
df -h "$HOME" /tmp 2>/dev/null || true
nvidia-smi || true
ollama ps || true

echo
echo "== memory cleanup =="
ollama stop "$(ollama ps | awk 'NR==2 {print $1}')" 2>/dev/null || true
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
echo "== gguf =="
if [ ! -f "$GGUF_PATH" ]; then
  echo "missing_gguf=$GGUF_PATH"
  exit 20
fi
ls -lh "$GGUF_PATH"

workdir="$(mktemp -d)"
trap 'rm -rf "$workdir"' EXIT
cat > "$workdir/Modelfile" <<EOF
FROM $GGUF_PATH
PARAMETER num_ctx 4096
PARAMETER temperature 0.2
EOF

echo
echo "== ollama create =="
ollama create "$MODEL_NAME" -f "$workdir/Modelfile"

echo
echo "== short prompt =="
start_epoch="$(date +%s)"
ollama run "$MODEL_NAME" "Answer in one short Japanese paragraph: Jetson Orin Nano Superで小型MoE GGUFを動かす時に見るべきメモリ指標は？"
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
