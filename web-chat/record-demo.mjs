import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";

const baseUrl = process.env.CHAT_URL || "http://127.0.0.1:8765/?demo=1";
const outputDir = resolve("captures");
await mkdir(outputDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1280, height: 800 },
  recordVideo: { dir: outputDir, size: { width: 1280, height: 800 } }
});
const page = await context.newPage();
await page.goto(baseUrl, { waitUntil: "networkidle" });
await page.waitForSelector(".bubble.assistant p");
await page.waitForFunction(() => {
  const status = document.querySelector("#statusText")?.textContent || "";
  const bubbles = [...document.querySelectorAll(".bubble.assistant p")];
  const latest = bubbles[bubbles.length - 1]?.textContent.trim() || "";
  return status === "ready" && bubbles.length >= 2 && latest.length > 20;
}, null, { timeout: 180000 });
await page.waitForTimeout(2500);
await page.screenshot({ path: resolve(outputDir, "jetson-lfm25-chat-demo.png") });
const video = page.video();
await context.close();
await browser.close();
const videoPath = video ? await video.path() : "";
console.log(JSON.stringify({ screenshot: resolve(outputDir, "jetson-lfm25-chat-demo.png"), video: videoPath }));
