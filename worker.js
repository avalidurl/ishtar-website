// Thin asset Worker: serves the static site via the ASSETS binding, and fixes the one thing
// the static asset server gets wrong — it serves .md / .txt without a charset, so browsers
// decode the (correct) UTF-8 bytes as Latin-1 and show mojibake (e.g. "Gökhan" → "GÃ¶khan").
// run_worker_first in wrangler.toml routes .md/.txt here so we can stamp charset=utf-8.
export default {
  async fetch(request, env) {
    const res = await env.ASSETS.fetch(request);
    const p = new URL(request.url).pathname;
    if (p.endsWith(".md") || p.endsWith(".txt")) {
      const headers = new Headers(res.headers);
      headers.set("content-type", (p.endsWith(".md") ? "text/markdown" : "text/plain") + "; charset=utf-8");
      return new Response(res.body, { status: res.status, statusText: res.statusText, headers });
    }
    return res;
  },
};
