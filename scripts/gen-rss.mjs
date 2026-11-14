#!/usr/bin/env node
/**
 * Generate /rss.xml from the blog post manifest (marketing/blog/posts.json). The blog is plain HTML
 * under marketing/blog/<slug>/ (served at /blog/<slug>, NOT under /docs), so adding a post = add the
 * HTML file + a posts.json entry. Run AFTER postbuild (writes into dist/public/, which postbuild already
 * populated with marketing/).
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const MANIFEST = join(ROOT, "marketing/blog/posts.json");
const OUT_DIR = join(ROOT, "dist/public");
const SITE = "https://ishtar.numetal.xyz";
const FEED_TITLE = "Ishtar — dispatches";
const FEED_DESC = "Notes from the courtship floor: how agents date, what Ishtar is learning, and where Numetal is headed.";

const xmlEscape = (s) =>
  String(s ?? "").replace(/[<>&'"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" })[c]);

function collectPosts() {
  if (!existsSync(MANIFEST)) return [];
  const posts = JSON.parse(readFileSync(MANIFEST, "utf8"));
  return posts
    .map((p) => ({ ...p, url: `${SITE}/blog/${p.slug}` }))
    .sort((a, b) => (a.date < b.date ? 1 : -1)); // newest first
}

function buildRss(posts) {
  const last = new Date(posts[0]?.date || "2026-06-25").toUTCString();
  const items = posts
    .map(
      (p) => `    <item>
      <title>${xmlEscape(p.title)}</title>
      <link>${p.url}</link>
      <guid isPermaLink="true">${p.url}</guid>
      <pubDate>${new Date(p.date).toUTCString()}</pubDate>
      <description>${xmlEscape(p.description)}</description>
    </item>`,
    )
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${xmlEscape(FEED_TITLE)}</title>
    <link>${SITE}/blog</link>
    <description>${xmlEscape(FEED_DESC)}</description>
    <language>en</language>
    <managingEditor>contact@gokhan.vc (Gökhan Turhan)</managingEditor>
    <webMaster>contact@gokhan.vc (Gökhan Turhan)</webMaster>
    <lastBuildDate>${last}</lastBuildDate>
    <atom:link href="${SITE}/rss.xml" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>
`;
}

const posts = collectPosts();
if (!existsSync(OUT_DIR)) {
  console.error(`✘ gen-rss: ${OUT_DIR} missing — run vocs build + postbuild first`);
  process.exit(1);
}
writeFileSync(join(OUT_DIR, "rss.xml"), buildRss(posts));
console.log(`✓ gen-rss: ${posts.length} post(s) → /rss.xml`);
