// Asset Worker: serves the static site via ASSETS, stamps a UTF-8 charset on .md/.txt (charset-
// less text is decoded as Latin-1 by browsers -> mojibake), and stamps defense-in-depth security
// headers on every response. The marketing pages (chat UI, wallet sign-in) get a strict CSP;
// the Vocs /docs get the framing/headers but not the strict CSP (to avoid breaking the SPA).
// NOTE: these apply when the worker runs (cache-miss); content changes bust the asset cache.
const CSP_BASE =
  "default-src 'self'; " +
  "script-src 'self' 'unsafe-inline'; " +
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
  "font-src 'self' https://fonts.gstatic.com; " +
  "img-src 'self' data:; " +
  "connect-src 'self' https://api.ishtar.numetal.xyz https://api.gokhan.vc; " +
  "base-uri 'self'; form-action 'self' https://api.gokhan.vc";

const CSP_MARKETING = CSP_BASE + "; frame-ancestors 'none'; object-src 'none'";

const CSP_BLOG =
  CSP_BASE +
  "; frame-ancestors 'none'; object-src 'self'; frame-src 'self' https://assets.numetal.xyz https://numetal.xyz; child-src 'self' https://assets.numetal.xyz https://numetal.xyz";

// Origins that may iframe deck PDFs / the minimal embed shell (blog syndication).
const EMBED_FRAME_ANCESTORS =
  "frame-ancestors 'self' https://numetal.xyz https://www.numetal.xyz https://gokhanturhan.com https://www.gokhanturhan.com https://gokhan.vc https://www.gokhan.vc";

const FEEDHUB_XMTP = "https://api.gokhan.vc/newsletter/xmtp/subscribe";

const PDF_EMBED_HTML = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>Ishtar pitch deck</title>
<meta name="robots" content="noindex" />
<style>
  html, body { margin: 0; height: 100%; overflow: hidden; background: #fff; }
  object, embed, iframe { width: 100%; height: 100%; border: 0; display: block; }
</style>
</head>
<body>
  <object data="ishtar-deck-not-a-preseed.pdf#toolbar=1&amp;navpanes=1" type="application/pdf" aria-label="Ishtar pitch deck PDF">
    <embed src="ishtar-deck-not-a-preseed.pdf#toolbar=1&amp;navpanes=1" type="application/pdf" />
    <p style="padding:1rem;font:14px system-ui,sans-serif">
      Your browser can't embed PDFs.
      <a href="ishtar-deck-not-a-preseed.pdf">Download the deck</a>.
    </p>
  </object>
</body>
</html>`;

function isDeckPdf(path) {
  return /^\/deck\/.*\.pdf$/i.test(path);
}

function isDeckEmbed(path) {
  return /^\/deck\/.*\/pdf-embed(?:\.html)?$/i.test(path);
}

function embedHeaders() {
  const headers = new Headers({
    "content-type": "text/html; charset=utf-8",
    "cache-control": "no-store",
    "cloudflare-cdn-cache-control": "no-store",
    "x-content-type-options": "nosniff",
    "referrer-policy": "no-referrer",
    "permissions-policy": "camera=(), microphone=(), geolocation=(), payment=()",
    "content-security-policy": `${CSP_BASE}; object-src 'self'; frame-src 'self'; ${EMBED_FRAME_ANCESTORS}`,
  });
  return headers;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const p = url.pathname.replace(/\/+$/, "") || "/";

    // Same-origin proxy: zone-level CSP on ishtar.numetal.xyz can block connect-src to
    // api.gokhan.vc even when the worker sets a looser policy. Proxy keeps subscribe on 'self'.
    if (p === "/newsletter/xmtp/subscribe" && request.method === "POST") {
      const upstream = await fetch(FEEDHUB_XMTP, {
        method: "POST",
        headers: { "content-type": request.headers.get("content-type") || "application/json" },
        body: request.body,
      });
      const headers = new Headers(upstream.headers);
      headers.set("Cache-Control", "no-store");
      headers.set("Cloudflare-CDN-Cache-Control", "no-store");
      return new Response(upstream.body, { status: upstream.status, headers });
    }

    if (p === "/deck/not-raising-a-preseed/pdf-embed") {
      return new Response(PDF_EMBED_HTML, { status: 200, headers: embedHeaders() });
    }

    let res = await env.ASSETS.fetch(request);

    // Markdown twins: Vocs' "Ask AI / view as markdown" button on every page links to /<page>.md
    // (e.g. /docs/numetal.md), but the static build only emits the twin at /docs/assets/md/<page>.md.
    // Vocs' md-router middleware rewrites this in its own server — which our static Workers-Assets
    // deploy never runs. Replicate it here so EVERY page's "see as markdown" resolves: on a .md miss,
    // serve the twin. Real root .md files (ishtar-skill.md) return 200 above and never reach this.
    if (res.status === 404 && p.endsWith(".md") && !p.startsWith("/docs/assets/md/")) {
      const rest = (p.startsWith("/docs/") ? p.slice(6) : p.slice(1)).replace(/\.md$/, "");
      for (const twin of [`/docs/assets/md/${rest}.md`, `/docs/assets/md/${rest}/index.md`]) {
        const r = await env.ASSETS.fetch(new URL(twin, url.origin));
        if (r.ok) {
          res = r;
          break;
        }
      }
    }

    const headers = new Headers(res.headers);
    headers.set("Cache-Control", "no-store");
    headers.set("Cloudflare-CDN-Cache-Control", "no-store");
    headers.set("x-content-type-options", "nosniff");
    headers.set("referrer-policy", "no-referrer");
    headers.set("permissions-policy", "camera=(), microphone=(), geolocation=(), payment=()");

    if (isDeckPdf(p)) {
      // Allow partner blogs to iframe the PDF (fallback) while keeping other framing blocked.
      headers.delete("x-frame-options");
      headers.set("content-security-policy", `default-src 'none'; ${EMBED_FRAME_ANCESTORS}`);
    } else if (isDeckEmbed(p)) {
      // Minimal same-origin PDF shell — partner sites iframe this page, not the raw PDF.
      headers.delete("x-frame-options");
      headers.set(
        "content-security-policy",
        `${CSP_BASE}; object-src 'self'; frame-src 'self'; ${EMBED_FRAME_ANCESTORS}`,
      );
    } else {
      headers.set("x-frame-options", "DENY");
      if (!p.startsWith("/docs")) {
        headers.set("content-security-policy", p.startsWith("/blog") ? CSP_BLOG : CSP_MARKETING);
      }
    }

    if (p.endsWith(".md")) headers.set("content-type", "text/markdown; charset=utf-8");
    else if (p.endsWith(".txt")) headers.set("content-type", "text/plain; charset=utf-8");
    return new Response(res.body, { status: res.status, statusText: res.statusText, headers });
  },
};
