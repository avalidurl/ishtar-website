// Asset Worker: serves the static site via ASSETS and fixes .md/.txt charset (browsers decode
// charset-less text/markdown as Latin-1 -> mojibake). run_worker_first routes requests here.
// x-ishtar-worker marks that this code ran (debug: confirms run_worker_first is active).
export default {
  async fetch(request, env) {
    const res = await env.ASSETS.fetch(request);
    const p = new URL(request.url).pathname;
    const headers = new Headers(res.headers);
    headers.set("x-ishtar-worker", "1");
    if (p.endsWith(".md")) headers.set("content-type", "text/markdown; charset=utf-8");
    else if (p.endsWith(".txt")) headers.set("content-type", "text/plain; charset=utf-8");
    return new Response(res.body, { status: res.status, statusText: res.statusText, headers });
  },
};
