#!/usr/bin/env bash
set -euo pipefail

host="${1:-jetson-orin}"
ollama_url="${OLLAMA_URL:-http://127.0.0.1:11435}"
model="${OLLAMA_MODEL:-hf.co/LiquidAI/LFM2.5-8B-A1B-GGUF:Q4_K_M}"
stamp="$(date -u +%Y%m%dT%H%M%SZ)"
out_dir="logs"
mkdir -p "$out_dir"
out="$out_dir/${stamp}-longform-lfm25-q4.md"
json_out="$out_dir/${stamp}-longform-lfm25-q4-response.json"

prompt='あなたはJetson Orin Nano Super上でローカルLLMを運用する検証担当です。

以下の観測事実だけを根拠に、長めの日本語レポートを書いてください。推測でGPU VRAM量を作らないでください。

観測事実:
- デバイスはJetson Orin Nano Super相当で、Linux 5.15.148-tegra。
- メモリは7.4GiB total。
- 実験前はおおむね5.6GiBから6.0GiB available。
- 対象モデルはhf.co/LiquidAI/LFM2.5-8B-A1B-GGUF:Q4_K_M。
- Ollamaのpullサイズは5.2GB。
- 短文実験ではollama ps上の常駐サイズが5.5から5.6GB、contextは4096。
- 生成中のavailable memoryは334MiBから483MiB程度まで低下した。
- swapは1.4GiBから1.6GiB程度使われた。
- nvidia-smiはOrinでGPU memoryをNot Supportedと表示した。
- ollama stop後はavailable memoryが約5.9GiBから6.0GiBに戻った。

レポート要件:
1. まず結論を3行で書く。
2. 次に「実測値」「8GB Jetsonでの意味」「長文運用の注意」「次の改善案」の4見出しで説明する。
3. 数値は上の観測事実に含まれるものだけを使う。
4. 文章量は1200字程度。
5. 最後に、LAN公開した動画ビューワーで見せる時の短い説明文を3案出す。'

remote_snapshot() {
  local title="$1"
  {
    echo "## ${title}"
    echo
    echo '```text'
    ssh "$host" 'date -u +%Y-%m-%dT%H:%M:%SZ; free -h; ollama ps || true; ps -eo pid,comm,rss,%mem --sort=-rss | head -8'
    echo '```'
    echo
  }
}

{
  echo "# Longform LFM2.5 Q4_K_M API Run"
  echo
  echo "- UTC start: ${stamp}"
  echo "- host: ${host}"
  echo "- ollama_url: ${ollama_url}"
  echo "- model: ${model}"
  echo
  remote_snapshot "Before"
} > "$out"

start_epoch="$(date +%s)"
curl -sS "${ollama_url}/api/chat" \
  -H 'content-type: application/json' \
  -d "$(jq -n --arg model "$model" --arg prompt "$prompt" '{
    model: $model,
    stream: false,
    options: { num_ctx: 4096, temperature: 0.2 },
    messages: [
      { role: "system", content: "Answer in Japanese. Do not reveal chain-of-thought. Use only the facts provided by the user for numeric claims." },
      { role: "user", content: $prompt }
    ]
  }')" > "$json_out"
end_epoch="$(date +%s)"

answer="$(jq -r '.message.content // ""' "$json_out")"

{
  echo "## Result"
  echo
  echo "- elapsed_seconds: $((end_epoch - start_epoch))"
  echo "- prompt_eval_count: $(jq -r '.prompt_eval_count // "null"' "$json_out")"
  echo "- eval_count: $(jq -r '.eval_count // "null"' "$json_out")"
  echo "- total_duration_ns: $(jq -r '.total_duration // "null"' "$json_out")"
  echo "- load_duration_ns: $(jq -r '.load_duration // "null"' "$json_out")"
  echo "- prompt_eval_duration_ns: $(jq -r '.prompt_eval_duration // "null"' "$json_out")"
  echo "- eval_duration_ns: $(jq -r '.eval_duration // "null"' "$json_out")"
  echo
  echo "## Answer"
  echo
  echo "$answer"
  echo
  remote_snapshot "After"
} >> "$out"

echo "wrote $out"
echo "wrote $json_out"
