#!/usr/bin/env node
/** Copy HeartBench coach-eval scenarios from numetal-datebook into static site data (no API hop for humans). */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const src = resolve(root, "../numetal-datebook/src/heartbench/scenarios-public.ts");
const outDir = resolve(root, "marketing/heartbench/scenarios");
const out = resolve(outDir, "data.json");

if (!existsSync(src)) {
  if (!existsSync(out)) {
    console.error(`✘ HeartBench sync: missing ${src} and no committed ${out}`);
    process.exit(1);
  }
  console.log(`⚠ HeartBench sync skipped (no numetal-datebook checkout — using committed data.json)`);
  process.exit(0);
}

const text = readFileSync(src, "utf8");
const start = text.indexOf("export const PUBLIC_SCENARIOS = ");
if (start < 0) throw new Error(`PUBLIC_SCENARIOS not found in ${src}`);
const arrStart = text.indexOf("[", start);
const arrEnd = text.indexOf("] as const", arrStart);
if (arrStart < 0 || arrEnd < 0) throw new Error(`PUBLIC_SCENARIOS array bounds not found in ${src}`);
const scenarios = JSON.parse(text.slice(arrStart, arrEnd + 1));
mkdirSync(outDir, { recursive: true });
writeFileSync(out, JSON.stringify({ ok: true, count: scenarios.length, scenarios, syncedAt: new Date().toISOString() }, null, 2) + "\n");
console.log(`✓ synced ${scenarios.length} HeartBench scenarios → marketing/heartbench/scenarios/data.json`);
