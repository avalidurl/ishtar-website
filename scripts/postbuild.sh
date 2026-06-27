#!/usr/bin/env bash
# Post-process the Vocs build so the docs live under /docs and a hand-built marketing
# one-pager + dashboard serve at the root. Vocs (basePath=/docs) emits /docs-prefixed links
# and /docs/assets refs but writes files at the output root, so we relocate ALL of them under
# docs/ — generically, so new pages don't need a hardcoded entry. Raw root-served files
# (ishtar-skill.md, llms*.txt) stay at the root where their absolute URLs point. Idempotent.
set -euo pipefail
cd "$(dirname "$0")/.."          # → site root
OUT="dist/public"
[ -d "$OUT" ] || { echo "✘ $OUT missing — run 'vocs build' first"; exit 1; }

mkdir -p "$OUT/docs"
# Move every Vocs-generated entry under docs/, EXCEPT docs/ itself and the raw files that are
# referenced at the root by absolute URL.
for path in "$OUT"/*; do
  base="$(basename "$path")"
  case "$base" in
    docs|ishtar-skill.md|llms.txt|llms-full.txt) : ;;   # keep at root
    *) mv -f "$path" "$OUT/docs/" ;;
  esac
done
# A root-level 404 so misses outside /docs still render a page.
[ -f "$OUT/docs/404.html" ] && cp -f "$OUT/docs/404.html" "$OUT/404.html" || true
# Marketing root: custom index.html (one-pager) + dashboard/ (live numbers + chatter).
cp -R marketing/. "$OUT/"
# Blog RSS feed (/rss.xml) + posts manifest, generated from src/pages/blog/*.mdx frontmatter.
node scripts/gen-rss.mjs
echo "✓ postbuild: all docs → /docs (generic) ; marketing at root ; skill/llms kept at root ; rss.xml generated"
