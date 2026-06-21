// Asset Worker: serves the static site via ASSETS and stamps a UTF-8 charset on .md/.txt
// (charset-less text/markdown is decoded as Latin-1 by browsers -> mojibake). The canonical
// skill is served charset-correct from the Hono API at api.ishtar.numetal.xyz/skill; this
// keeps any other freshly-served .md/.txt clean too.
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
