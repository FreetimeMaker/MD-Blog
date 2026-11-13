# MD-Blog

A static Markdown blog hosted on **GitHub Pages**, at **https://blog.free-time.me**. No Node API, serverless functions, or secrets are required in production. Node.js 24 is only needed for builds and local previews.

## Architecture

- The build renders `public/md/index.md` with Marked into the homepage.
- The build fetches `/v2/blog/posts` from `https://api.free-time.me` and generates a real `dist/blog/<title-slug>/index.html` shell with a clean canonical URL for every known title, plus compatible API-slug alias pages. No individual post requests or content snapshots are needed during the build.
- The browser loads posts and categories directly from the same API using credential-free GET requests. API content changes appear without rebuilding the site.
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

Build output is in ignored `dist/`. Builds require access to the public post-list API (20-second timeout). HTTP/network errors, invalid JSON, malformed list entries, unsafe directory slugs, missing/empty titles, duplicate slugs and conflicting routes fail the build explicitly, before the previous artifact is removed. There is no silent fallback to local archives or an incomplete post list. An explicitly empty `posts` array is valid and generates zero post paths; the build logs the generated count.

Tests require a completed build and exercise rendering with mocked API responses, build-time API validation, metadata/Markdown security, canonicals, every generated post directory, and the preview server. Tests themselves do not require the external API.

## Routes and existing links

| URL                            | Behaviour                                                |
| ------------------------------ | -------------------------------------------------------- |
| `/`                            | Pre-rendered homepage (also readable without JavaScript) |
| `/blog` or `/blog/`            | Blog list; Pages may redirect to the trailing slash      |
| `/blog/?category=Apps,Android` | Intersection of categories                               |
| `/blog/<encoded-slug>/`        | Title-based post links; HTTP 200 when built        |
| `/blog/<encoded-slug>`         | Same post; Pages may redirect to the trailing slash      |
| `/blog/?post=<encoded-slug>`   | Compatible old query link, HTTP 200; clean canonical     |
| `/api/blog/<slug>`             | Existing link rendered by `404.html`                     |
| `/api/blog.js`                 | Legacy list alias via `404.html`                         |

Generated links and canonicals use title-based paths: **XMRiGUI Update V2.0.0** becomes **https://blog.free-time.me/blog/xmrigui-update-v2-0-0/**, resolved to API slug `xmrigui`. Build and browser share `public/scripts/post-routes.js`: NFKD normalization, removal of combining marks, lowercase ASCII, non-alphanumeric runs replaced by a hyphen, and trimmed edge hyphens. Missing, empty or overlong title slugs fail validation. Duplicate title paths and title/API-alias collisions fail explicitly, independent of list order; fix the conflicting API metadata before rebuilding. API slugs are validated as portable directory names. The trailing slash matches the actual directory index on Pages and avoids its directory redirect. Query and legacy API URLs remain readable; successful runtime rendering sets their canonical to the clean post URL and uses `history.replaceState` to normalize the address bar when the validated post list is available (preserving unrelated query parameters and fragments).

Title-path resolution requires the live post list. If discovery fails, old API-slug links can still fetch their post directly, but cannot be normalized reliably. Renaming a title changes its canonical path; previous title paths are not retained automatically, whereas API-slug paths remain compatible.

The fallback renders directly at the original URL and preserves query strings. Posts published after the last build are still loaded live at their clean URL through `404.html`, but **retain HTTP 404 until the next build/deployment**. `/api/blog/<slug>` aliases also retain HTTP 404. GitHub Pages cannot rewrite arbitrary paths with HTTP 200; crawlers and link checkers can treat fallback links as missing. Unknown paths display “Page not found” rather than the list. Post content, dynamic titles and social previews are not server-rendered: the generated files are shells with canonical metadata, not snapshots of API Markdown.

The Back link is intentionally absolute: **https://blog.free-time.me/blog** inside posts, **https://blog.free-time.me** otherwise, including in local previews. The brand links to `/`.

## Deployment to GitHub Pages

`.github/workflows/pages.yml` builds and tests on pushes to `main` and on manual dispatch, uploads only `dist`, and deploys using the official Pages actions with scoped deployment permissions. API discovery failures fail the build job and prevent upload/deployment; the existing deployed site remains unchanged. After publishing new API posts, manually run this workflow (or push to `main`) to give their clean paths HTTP 200. There is no automatic API publishing hook or scheduled rebuild.

1. In repository **Settings → Pages → Build and deployment**, select **GitHub Actions**.
2. Configure the custom domain **blog.free-time.me** in Pages settings. This domain was already used by the existing navigation; the build writes it into `dist/CNAME` as well. The repository also retains its root `CNAME` file.
3. Configure a DNS CNAME for `blog.free-time.me` pointing to `freetimemaker.github.io` (not a repository path). Remove conflicting DNS records/old Vercel targeting for this host. Verify domain ownership in GitHub if requested.
4. Run the workflow, wait for DNS and certificate provisioning, then enable **Enforce HTTPS** in Pages settings.
5. Verify `/`, `/blog/`, `/blog/xmrigui-update-v2-0-0/` (HTTP 200 and canonical), an old query post URL, and an old `/api/blog/<slug>` fallback link on the live domain.

The configuration deliberately targets the custom domain root, with root-relative assets. A project URL such as `freetimemaker.github.io/MD-Blog/` without that domain is **not supported** without base-path changes. No automatic DNS changes are made by this repository. The old Vercel configuration and Node handlers have been removed.

## API and CORS

On **2026-11-13**, live HTTPS GET checks returned HTTP 200 and `Access-Control-Allow-Origin: *` for:

- `/v2/blog/categories` (with `Origin: https://blog.free-time.me`)
- `/v2/blog/posts`
- `/v2/blog/posts/xmrigui` (with `Origin: https://blog.free-time.me`)

The list and post JSON shapes match this frontend. This supports credential-free cross-origin fetches; no preflight is needed for these simple GETs. A real browser check on the deployed Pages origin and DNS/HTTPS provisioning have **not** been performed. CORS policy can change: if it becomes restrictive, the API must allow `https://blog.free-time.me` (and `http://localhost:3000` for previews), or keep `*` for this public, credential-free API. Pages cannot add a proxy or fix API response headers. `no-cors` is not a workaround because it makes JSON unreadable.

Requests time out after 20 seconds. API/CORS/network failures show an unavailable message; missing posts show a not-found message. Blog contents require JavaScript and API availability even at generated HTTP-200 paths. No snapshot fallback is used, to avoid silently showing stale posts. Requests disclose visitors' network information to the API; the unchanged Google Fonts stylesheet also makes external requests.

To use another API, change `API` in both `public/scripts/blog.js` and `scripts/post-pages.js` and rebuild. The former server-only `ALL_API_URL` environment variable is no longer used. Never embed secrets in frontend configuration.

## Editing content

- Edit `public/md/index.md` for the homepage; its first H1 is the title. As before, top-level H1 lines are removed from the body.
- Publish posts through the external API's source/publishing process. `public/blogs/` contains retained local Markdown source/archive files; adding one here alone does **not** publish it to the API or the Pages blog list. Post Markdown removes H1 lines and lines containing `Categories:` as before; categories come from API metadata.
- Edit `public/styles/style.css` for the design, `public/views/home.html` for the shared shell, and `public/scripts/` for browser behaviour. The homepage Markdown is trusted repository content, rendered at build time; API Markdown is sanitized at runtime.

## License

Created by [Freetime Maker](https://github.com/FreetimeMaker). GPL-3.0-only; see [LICENSE.txt](LICENSE.txt). Marked and DOMPurify retain their upstream licenses in npm dependencies.
