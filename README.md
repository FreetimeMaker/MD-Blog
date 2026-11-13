# MD-Blog

A static Markdown blog hosted on **GitHub Pages**, at **https://blog.free-time.me**. No Node API, serverless functions, or secrets are required in production. Node.js 24 is only needed for builds and local previews.

## Architecture

- The build renders `public/md/index.md` with Marked into the homepage.
- The browser loads posts and categories directly from `https://api.free-time.me/v2` using credential-free GET requests. API changes appear without rebuilding the site.
- Blog Markdown uses Marked and DOMPurify (bundled locally, not a CDN). HTML formatting is supported; executable HTML, event handlers, and unsafe links are removed. API titles, categories, slugs and error messages are rendered through DOM/text APIs, never HTML interpolation.
- The existing stylesheet, theme toggle with local storage, category AND filtering (case-insensitive), and localized Discord timestamps (`t`, `T`, `d`, `D`, `f`, `F`, `R`) are retained. Relative timestamps refresh every 30 seconds.
- Category titles use `A`, `A & B`, or `A, B & C`.

## Local development

```sh
npm ci
npm run dev
```

Open `http://localhost:3000`. `npm start` does the same. `PORT` changes the preview port. The preview serves only `dist` and mimics Pages' 404 fallback; it does not proxy the API. Stop and rerun after changing source files (no watcher).

```sh
npm run build
npm test
```

Build output is in ignored `dist/`. Tests require a completed build and exercise rendering with mocked API responses, metadata/Markdown security, routing, and the preview server. They do not require the external API.

## Routes and existing links

| URL                            | Behaviour                                                |
| ------------------------------ | -------------------------------------------------------- |
| `/`                            | Pre-rendered homepage (also readable without JavaScript) |
| `/blog` or `/blog/`            | Blog list; Pages may redirect to the trailing slash      |
| `/blog/?category=Apps,Android` | Intersection of categories                               |
| `/blog/?post=<encoded-slug>`   | New post links; static page with HTTP 200                |
| `/blog/<slug>`                 | Existing link rendered by `404.html`                     |
| `/api/blog/<slug>`             | Existing link rendered by `404.html`                     |
| `/api/blog.js`                 | Legacy list alias via `404.html`                         |

The fallback renders directly at the original URL and preserves query strings. Unknown paths display “Page not found” rather than the list. GitHub Pages cannot rewrite arbitrary paths with HTTP 200: legacy post URLs **retain HTTP 404**, even though JavaScript displays the post. Crawlers, link checkers, and no-JavaScript clients can treat those links as missing. Use the new query URLs when publishing links. Dynamic post metadata/social previews and server-rendered SEO are not provided; these would require build-time generation of all posts or a hosting platform with rewrites/server rendering.

The Back link is intentionally absolute: **https://blog.free-time.me/blog** inside posts, **https://blog.free-time.me** otherwise, including in local previews. The brand links to `/`.

## Deployment to GitHub Pages

`.github/workflows/pages.yml` builds and tests on pushes to `main` and on manual dispatch, uploads only `dist`, and deploys using the official Pages actions with scoped deployment permissions.

1. In repository **Settings → Pages → Build and deployment**, select **GitHub Actions**.
2. Configure the custom domain **blog.free-time.me** in Pages settings. This domain was already used by the existing navigation; the build writes it into `dist/CNAME` as well. There was no existing CNAME file in the repository.
3. Configure a DNS CNAME for `blog.free-time.me` pointing to `freetimemaker.github.io` (not a repository path). Remove conflicting DNS records/old Vercel targeting for this host. Verify domain ownership in GitHub if requested.
4. Run the workflow, wait for DNS and certificate provisioning, then enable **Enforce HTTPS** in Pages settings.
5. Verify `/`, `/blog/`, a query post URL, and an old `/api/blog/<slug>` link on the live domain.

The configuration deliberately targets the custom domain root, with root-relative assets. A project URL such as `freetimemaker.github.io/MD-Blog/` without that domain is **not supported** without base-path changes. No automatic DNS changes are made by this repository. The old Vercel configuration and Node handlers have been removed.

## API and CORS

On **2026-11-13**, live HTTPS GET checks returned HTTP 200 and `Access-Control-Allow-Origin: *` for:

- `/v2/blog/categories` (with `Origin: https://blog.free-time.me`)
- `/v2/blog/posts`
- `/v2/blog/posts/xmrigui` (with `Origin: https://blog.free-time.me`)

The list and post JSON shapes match this frontend. This supports credential-free cross-origin fetches; no preflight is needed for these simple GETs. A real browser check on the deployed Pages origin and DNS/HTTPS provisioning have **not** been performed. CORS policy can change: if it becomes restrictive, the API must allow `https://blog.free-time.me` (and `http://localhost:3000` for previews), or keep `*` for this public, credential-free API. Pages cannot add a proxy or fix API response headers. `no-cors` is not a workaround because it makes JSON unreadable.

Requests time out after 20 seconds. API/CORS/network failures show an unavailable message; missing posts show a not-found message. Blog contents require JavaScript and API availability. No snapshot fallback is used, to avoid silently showing stale posts. Requests disclose visitors' network information to the API; the unchanged Google Fonts stylesheet also makes external requests.

To use another API, change `API` in `public/scripts/blog.js` and rebuild. The former server-only `ALL_API_URL` environment variable is no longer used. Never embed secrets in frontend configuration.

## Editing content

- Edit `public/md/index.md` for the homepage; its first H1 is the title. As before, top-level H1 lines are removed from the body.
- Publish posts through the external API's source/publishing process. `public/blogs/` contains retained local Markdown source/archive files; adding one here alone does **not** publish it to the API or the Pages blog list. Post Markdown removes H1 lines and lines containing `Categories:` as before; categories come from API metadata.
- Edit `public/styles/style.css` for the design, `public/views/home.html` for the shared shell, and `public/scripts/` for browser behaviour. The homepage Markdown is trusted repository content, rendered at build time; API Markdown is sanitized at runtime.

## License

Created by [Freetime Maker](https://github.com/FreetimeMaker). GPL-3.0-only; see [LICENSE.txt](LICENSE.txt). Marked and DOMPurify retain their upstream licenses in npm dependencies.
