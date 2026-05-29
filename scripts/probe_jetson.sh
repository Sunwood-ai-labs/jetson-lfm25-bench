#!/usr/bin/env bash
set -euo pipefail

host="${1:-jetson-orin}"
stamp="$(date -u +%Y%m%dT%H%M%SZ)"
out_dir="logs"
mkdir -p "$out_dir"
out="$out_dir/${stamp}-probe-${host}.md"

{
  echo "# Jetson Probe ${stamp}"
  echo
  echo '```text'
  ssh "$host" '
    set -eu
    echo "HOST=$(hostname)"
    echo "DATE_UTC=$(date -u +%Y-%m-%dT%H:%M:%SZ)"
    echo
    uname -a
    echo
    free -h
    echo
    df -h ~ /tmp 2>/dev/null || true
    echo
    command -v ollama || true
    command -v llama-cli || true
    command -v nvidia-smi || true
    command -v jtop || true
    echo
    nvidia-smi || true
    echo
    ollama list || true
  '
  echo '```'
} | tee "$out"

echo "wrote $out"

