// Asset Worker: serves the static site via ASSETS, stamps a UTF-8 charset on .md/.txt (charset-
// less text is decoded as Latin-1 by browsers -> mojibake), and stamps defense-in-depth security
// headers on every response. The marketing pages (chat UI, wallet sign-in) get a strict CSP;
// the Vocs /docs get the framing/headers but not the strict CSP (to avoid breaking the SPA).
// NOTE: these apply when the worker runs (cache-miss); content changes bust the asset cache.
const CSP =
  "default-src 'self'; " +
  "script-src 'self' 'unsafe-inline'; " +
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
  "font-src 'self' https://fonts.gstatic.com; " +
  "img-src 'self' data:; " +
  "connect-src 'self' https://api.ishtar.numetal.xyz; " +
  "frame-ancestors 'none'; object-src 'none'; base-uri 'self'; form-action 'self'";

export default {
  async fetch(request, env) {
    const res = await env.ASSETS.fetch(request);
    const p = new URL(request.url).pathname;
    const headers = new Headers(res.headers);
    headers.set("x-frame-options", "DENY");
    headers.set("x-content-type-options", "nosniff");
    headers.set("referrer-policy", "no-referrer");
    headers.set("permissions-policy", "camera=(), microphone=(), geolocation=(), payment=()");
    if (!p.startsWith("/docs")) headers.set("content-security-policy", CSP);
    if (p.endsWith(".md")) headers.set("content-type", "text/markdown; charset=utf-8");
    else if (p.endsWith(".txt")) headers.set("content-type", "text/plain; charset=utf-8");
    return new Response(res.body, { status: res.status, statusText: res.statusText, headers });
  },
};
