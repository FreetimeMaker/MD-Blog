import { marked } from "../vendor/marked.js";
import DOMPurify from "../vendor/dompurify.js";
import { updateDiscordTimestamps } from "./theme.js";

import { createPostRoutes, postPath } from "./post-routes.js";

const API = "https://api.free-time.me/v2";
const content = document.querySelector("#blog-content");
const heading = document.querySelector("h1 strong");
const back = document.querySelector(".navigate-btn");
function element(tag, text, className) {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  if (className) node.className = className;
  return node;
}
function link(text, href, className) {
  const node = element("a", text, className);
  node.href = href;
  return node;
}
function setTitle(title) {
  heading.textContent = title;
  document.title = title;
}
function filterUrl(filters) {
  return filters.length
    ? `/blog/?category=${encodeURIComponent(filters.join(","))}`
    : "/blog/";
}
const strings = (value) =>
  Array.isArray(value) ? value.filter((item) => typeof item === "string") : [];
async function request(path) {
  const response = await fetch(`${API}${path}`, {
    credentials: "omit",
    signal: AbortSignal.timeout(20000),
  });
  if (!response.ok) {
    const error = new Error(`Blog API returned ${response.status}`);
    error.status = response.status;
    throw error;
  }
  return response.json();
}
function categoryLinks(categories) {
  const box = element("div", undefined, "categories-container");
  for (const category of categories)
    box.append(link(category, filterUrl([category]), "category-tag"));
  return box;
}
async function list() {
  const filters = (new URLSearchParams(location.search).get("category") || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const names =
    filters.length > 1
      ? `${filters.slice(0, -1).join(", ")} & ${filters.at(-1)}`
      : filters[0];
  setTitle(filters.length ? `My Blogs: ${names}` : "My Blogs");
  const [data, categoryData] = await Promise.all([
    request("/blog/posts"),
    request("/blog/categories"),
  ]);
  if (!Array.isArray(data.posts) || !Array.isArray(categoryData.categories))
    throw new Error("Invalid API response");
  const cloud = element("div", undefined, "categories-container");
  cloud.append(element("strong", "Filter by:"));
  for (const category of strings(categoryData.categories)) {
    const active = filters.some(
      (f) => f.toLowerCase() === category.toLowerCase(),
    );
    const next = active
      ? filters.filter((f) => f.toLowerCase() !== category.toLowerCase())
      : [...filters, category];
    cloud.append(
      link(
        category + (active ? " ✕" : ""),
        filterUrl(next),
        `category-tag${active ? " active" : ""}`,
      ),
    );
  }
  if (filters.length) cloud.append(link("Clear All", "/blog/"));
  const ul = element("ul");
  for (const post of createPostRoutes(data.posts)) {
    if (!post || typeof post.slug !== "string") continue;
    const categories = strings(post.categories);
    if (
      !filters.every((f) =>
        categories.some((c) => c.toLowerCase() === f.toLowerCase()),
      )
    )
      continue;
    const li = element("li");
    li.append(
      link(
        typeof post.title === "string" ? post.title : post.slug,
        postPath(post.route),
      ),
    );
    if (categories.length) {
      const span = element("span", "(", "categories");
      categories.forEach((cat, i) => {
        if (i) span.append(", ");
        span.append(link(cat, filterUrl([cat])));
      });
      span.append(")");
      li.append(span);
    }
    ul.append(li);
  }
  content.replaceChildren(
    cloud,
    ul.children.length
      ? ul
      : element(
          "p",
          filters.length
            ? `No posts found matching all selected categories: ${filters.join(", ")}`
            : "No posts found.",
        ),
  );
}
async function post(slug, isApiSlug = false) {
  let route;
  let discovery;
  try {
    discovery = await request("/blog/posts");
  } catch (error) {
    // Old API-slug links can still load if discovery is temporarily unavailable.
    console.error("[blog routes]", error);
  }
  if (discovery) {
    const routes = createPostRoutes(discovery.posts);
    route = routes.find((p) =>
      isApiSlug ? p.slug === slug : p.route === slug || p.slug === slug,
    );
  }
  if (route) slug = route.slug;
  back.href = "https://blog.free-time.me/blog";
  const data = await request(`/blog/posts/${encodeURIComponent(slug)}`);
  setTitle(typeof data.title === "string" && data.title ? data.title : slug);
  if (typeof data.markdown !== "string")
    throw new Error("Invalid post response");
  const markdown = data.markdown
    .replace(/^# .*\n?/gm, "")
    .replace(/.*Categories:.*\n?/gi, "")
    .replace(
      /<t:(\d+)(?::([tTdDfFR]))?>/g,
      (_, stamp, style = "f") =>
        `<time class="discord-timestamp" data-timestamp="${stamp}" data-style="${style}"></time>`,
    );
  const article = element("div");
  // Markdown supports HTML, but executable HTML and unsafe URLs must not run.
  article.innerHTML = DOMPurify.sanitize(marked.parse(markdown));
  content.replaceChildren(categoryLinks(strings(data.categories)), article);
  let canonical = document.querySelector('link[rel="canonical"]');
  if (!canonical) {
    canonical = document.createElement("link");
    canonical.rel = "canonical";
    document.head.append(canonical);
  }
  const path = postPath(route ? route.route : slug);
  canonical.href = `https://blog.free-time.me${path}`;
  if (route) {
    const url = new URL(location.href);
    url.pathname = path;
    url.searchParams.delete("post");
    history.replaceState(null, "", url.pathname + url.search + url.hash);
  }
  updateDiscordTimestamps();
}
export async function render() {
  try {
    const path = location.pathname;
    const legacy = path.match(/^\/(?:api\/)?blog\/([^/]+)\/?$/);
    const slug = legacy
      ? decodeURIComponent(legacy[1])
      : new URLSearchParams(location.search).get("post");
    if (legacy || /^\/blog\/?$/.test(path) || path === "/api/blog.js") {
      if (slug) await post(slug, path.startsWith("/api/") || !legacy);
      else await list();
    } else {
      setTitle("Page not found");
      content.replaceChildren(element("p", "This page does not exist."));
    }
  } catch (error) {
    console.error("[blog]", error);
    setTitle(error.status === 404 ? "Post not found" : "Blog unavailable");
    content.replaceChildren(
      element(
        "p",
        error.status === 404
          ? "This blog post does not exist."
          : "Blog posts are temporarily unavailable. Please try again later.",
      ),
    );
  }
}
await render();
