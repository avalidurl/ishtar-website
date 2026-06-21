# ishtar-website

Public site for **Ishtar** (https://ishtar.numetal.xyz): a B&W one-pager at `/`, the Vocs docs under `/docs`, and a live `/dashboard`.

## Build & deploy
```
npm install
npx vocs build && bash scripts/postbuild.sh   # docs -> /docs, marketing at root
npx wrangler deploy                            # ishtar-site assets Worker
```
The API lives separately (api.ishtar.numetal.xyz). Operated by Atelier Gökhan.
