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
  "img-src 'self' data: https://gokhan.vc; " +
  "connect-src 'self' https://api.ishtar.numetal.xyz https://api.gokhan.vc; " +
  "base-uri 'self'; form-action 'self' https://api.gokhan.vc";

const CSP_MARKETING = CSP_BASE + "; frame-ancestors 'none'; object-src 'none'";

const CSP_BLOG = CSP_BASE + "; frame-ancestors 'none'; object-src 'none'";

const FEEDHUB_XMTP = "https://api.gokhan.vc/newsletter/xmtp/subscribe";
const FEEDHUB_SUBSCRIBE = "https://gokhanturhan.com/newsletter/subscribe"; // the live journal list (api.gokhan.vc no longer exists)
const FEEDHUB_FEED = "https://api.gokhan.vc/feed.json";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const p = url.pathname.replace(/\/+$/, "") || "/";

    // /subscribe/ retired in favour of /newsletter/ (estate list, no post list). 301 keeps old links alive.
    if (p === "/subscribe") {
      return Response.redirect(new URL("/newsletter/", url.origin).toString(), 301);
    }

    // Same-origin proxy: zone-level CSP on ishtar.numetal.xyz can block connect-src to
    // api.gokhan.vc even when the worker sets a looser policy. Proxy keeps subscribe on 'self'.
    // Email subscribe — the form used to POST straight to api.gokhan.vc, which the zone CSP's
    // form-action 'self' silently blocked, so subscribing from this site never reached feedhub.
    if (p === "/newsletter/subscribe" && request.method === "POST") {
      const upstream = await fetch(FEEDHUB_SUBSCRIBE, {
        method: "POST",
        headers: {
          "content-type": request.headers.get("content-type") || "application/x-www-form-urlencoded",
          accept: request.headers.get("accept") || "text/html",
        },
        body: request.body,
      });
      const headers = new Headers(upstream.headers);
      headers.set("Cache-Control", "no-store");
      headers.set("Cloudflare-CDN-Cache-Control", "no-store");
      return new Response(upstream.body, { status: upstream.status, headers });
    }

    // Estate aggregate feed, same-origin, so /newsletter/ can show a live "Latest".
    if (p === "/newsletter/latest.json" && request.method === "GET") {
      const upstream = await fetch(FEEDHUB_FEED, { cf: { cacheTtl: 300, cacheEverything: true } });
      return new Response(upstream.body, {
        status: upstream.status,
        headers: {
          "content-type": "application/feed+json; charset=utf-8",
          "cache-control": "public, max-age=300",
        },
      });
    }

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

    headers.set("x-frame-options", "DENY");
    if (!p.startsWith("/docs")) {
      headers.set("content-security-policy", p.startsWith("/blog") ? CSP_BLOG : CSP_MARKETING);
    }

    if (p.endsWith(".md")) headers.set("content-type", "text/markdown; charset=utf-8");
    else if (p.endsWith(".txt")) headers.set("content-type", "text/plain; charset=utf-8");
    return new Response(res.body, { status: res.status, statusText: res.statusText, headers });
  },
};
