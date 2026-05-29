import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";

const demo = process.env.DEMO || "short";
const query = demo === "long" ? "demo=long" : "demo=1";
const baseUrl = process.env.CHAT_URL || `http://127.0.0.1:8765/?${query}`;
const outputDir = resolve("captures");
const captureName = demo === "long" ? "jetson-lfm25-longform-demo" : "jetson-lfm25-chat-demo";
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
await page.screenshot({ path: resolve(outputDir, `${captureName}.png`) });
const video = page.video();
await context.close();
await browser.close();
const videoPath = video ? await video.path() : "";
console.log(JSON.stringify({ screenshot: resolve(outputDir, `${captureName}.png`), video: videoPath }));
