#!/usr/bin/env node
/**
 * Generate a text-selectable PDF of the pitch deck via headless Chrome print.
 * Output: marketing/deck/not-raising-a-preseed/ishtar-deck-not-a-preseed.pdf
 */
import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { dirname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync } from "node:fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const MARKETING = join(ROOT, "marketing");
const OUT_PDF = join(MARKETING, "deck/not-raising-a-preseed/ishtar-deck-not-a-preseed.pdf");
/** Resolve root-relative hrefs to production — Chrome bakes print link targets from the page origin. */
const PRODUCTION_ORIGIN = "https://ishtar.numetal.xyz";

const CHROME_CANDIDATES = [
  process.env.CHROME_PATH,
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
  "google-chrome",
  "chromium",
  "chromium-browser",
].filter(Boolean);

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".woff2": "font/woff2",
};

function findChrome() {
  for (const bin of CHROME_CANDIDATES) {
    if (bin.includes("/") && existsSync(bin)) return bin;
  }
  return CHROME_CANDIDATES.find((b) => !b.includes("/")) ?? null;
}

function serveStatic() {
  return createServer(async (req, res) => {
    try {
      let path = decodeURIComponent(req.url?.split("?")[0] ?? "/");
      if (path === "/") path = "/deck/not-raising-a-preseed/index.html";
      const rel = path.replace(/^\//, "");
      const file = normalize(join(MARKETING, rel));
      if (!file.startsWith(MARKETING)) {
        res.writeHead(403);
        res.end("forbidden");
        return;
      }
      await stat(file);
      let body = await readFile(file);
      const ext = file.slice(file.lastIndexOf("."));
      if (ext === ".html") {
        const html = body.toString("utf8");
        const base = `<base href="${PRODUCTION_ORIGIN}/" />`;
        body = Buffer.from(
          html.includes("<base ")
            ? html.replace(/<base[^>]*>/i, base)
            : html.replace(/<head([^>]*)>/i, `<head$1>\n${base}`)
        );
      }
      res.writeHead(200, { "Content-Type": MIME[ext] ?? "application/octet-stream" });
      res.end(body);
    } catch {
      res.writeHead(404);
      res.end("not found");
    }
  });
}

function runChrome(chrome, url, outPath) {
  return new Promise((resolve, reject) => {
    const args = [
      "--headless=new",
      "--disable-gpu",
      "--no-sandbox",
      "--run-all-compositor-stages-before-draw",
      "--virtual-time-budget=15000",
      `--print-to-pdf=${outPath}`,
      "--print-to-pdf-no-header",
      url,
    ];
    const proc = spawn(chrome, args, { stdio: "inherit" });
    proc.on("error", reject);
    proc.on("close", (code) => (code === 0 ? resolve() : reject(new Error(`Chrome exited ${code}`))));
  });
}

async function main() {
  const chrome = findChrome();
  if (!chrome) {
    console.error("✘ Chrome/Chromium not found. Set CHROME_PATH or install Google Chrome.");
    process.exit(1);
  }

  const server = serveStatic();
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const { port } = server.address();
  const url = `http://127.0.0.1:${port}/deck/not-raising-a-preseed/index.html#print=1`;

  console.log(`→ Printing deck via ${chrome}`);
  console.log(`→ ${url}`);
  await runChrome(chrome, url, OUT_PDF);
  server.close();

  const { size } = await stat(OUT_PDF);
  console.log(`✓ PDF written: ${OUT_PDF} (${Math.round(size / 1024)} KB)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
