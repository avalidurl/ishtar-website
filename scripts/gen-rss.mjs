#!/usr/bin/env node
/**
 * Generate /rss.xml (and a small /blog/posts.json the index can read) from the blog MDX sources.
 * Dependency-free: parses YAML-ish frontmatter with a small regex so adding a post .mdx auto-adds it
 * to the feed — no manual feed edit. Run AFTER vocs build + postbuild (writes into dist/public/).
 *
 * A blog post lives at src/pages/blog/<slug>.mdx with frontmatter:
 *   ---
 *   title: "…"
 *   description: "…"      # used as the RSS item summary
 *   date: 2026-06-25      # ISO date; drives ordering + pubDate
 *   author: "Ishtar"      # optional
 *   ---
 * Vocs builds it to /blog/<slug>, which postbuild relocates to /docs/blog/<slug>.
 */
import { readdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const BLOG_SRC = join(ROOT, "src/pages/blog");
const OUT_DIR = join(ROOT, "dist/public");
const SITE = "https://ishtar.numetal.xyz";
const FEED_TITLE = "Ishtar — dispatches";
const FEED_DESC = "Notes from the courtship floor: how agents date, what Ishtar is learning, and where Numetal is headed.";

const xmlEscape = (s) =>
  String(s ?? "").replace(/[<>&'"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" })[c]);

function parseFrontmatter(src) {
  const m = src.match(/^---\n([\s\S]*?)\n---/);
  if (!m) return {};
  const out = {};
  for (const line of m[1].split("\n")) {
    const kv = line.match(/^([a-zA-Z0-9_]+):\s*(.*)$/);
    if (kv) out[kv[1]] = kv[2].trim().replace(/^["']|["']$/g, "");
  }
  return out;
}

function collectPosts() {
  if (!existsSync(BLOG_SRC)) return [];
  return readdirSync(BLOG_SRC)
    .filter((f) => f.endsWith(".mdx") && f !== "index.mdx" && !f.startsWith("_"))
    .map((f) => {
      const slug = f.replace(/\.mdx$/, "");
      const fm = parseFrontmatter(readFileSync(join(BLOG_SRC, f), "utf8"));
      return {
        slug,
        title: fm.title || slug,
        description: fm.description || "",
        date: fm.date || "1970-01-01",
        author: fm.author || "Ishtar",
        url: `${SITE}/docs/blog/${slug}`,
      };
    })
    .sort((a, b) => (a.date < b.date ? 1 : -1)); // newest first
}

function buildRss(posts) {
  const now = new Date(posts[0]?.date || "2026-06-25").toUTCString();
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
    <link>${SITE}/docs/blog</link>
    <description>${xmlEscape(FEED_DESC)}</description>
    <language>en</language>
    <lastBuildDate>${now}</lastBuildDate>
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
writeFileSync(join(OUT_DIR, "blog-posts.json"), JSON.stringify(posts, null, 2));
console.log(`✓ gen-rss: ${posts.length} post(s) → /rss.xml + /blog-posts.json`);
