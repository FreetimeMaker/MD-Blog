import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { loadPostSlugs, postPath } from "../scripts/post-pages.js";
import { createPostRoutes, postPath as sharedPostPath, slugify } from "../public/scripts/post-routes.js";
import { JSDOM } from "jsdom";
import { marked } from "marked";
import createDOMPurify from "dompurify";
import { server } from "../server.js";

const shell = await readFile("dist/blog/index.html", "utf8");
const source = (await readFile("public/scripts/blog.js", "utf8"))
  .replace(/^import .*;\n/gm, "")
  .replace("export async function render", "async function render");
async function render(url, responses) {
  const dom = new JSDOM(shell, { url });
  const calls = [];
  const request = async (url, options) => {
    assert.equal(options.credentials, "omit");
    calls.push(url);
    const value = responses[url.split("/v2")[1]];
    return {
      ok: !!value && !value.status,
      status: value?.status || 200,
      json: async () => value,
    };
  };
  const execute = new (Object.getPrototypeOf(async function () {}).constructor)(
    "document",
    "location",
    "fetch",
    "marked",
    "DOMPurify",
    "updateDiscordTimestamps",
    "console",
    "createPostRoutes", "postPath", "history",
    source,
  );
  await execute(
    dom.window.document,
    dom.window.location,
    request,
    marked,
    createDOMPurify(dom.window),
    () => {},
    { error() {} },
    createPostRoutes, sharedPostPath, dom.window.history,
  );
  return { document: dom.window.document, calls };
}
const posts = {
  posts: [
    {
      slug: "test",
      title: "<img src=x onerror=alert(1)>",
      categories: ["A", "B", "C"],
    },
  ],
};
const categories = { categories: ["A", "B", "C", "<script>evil</script>"] };
test("build slug discovery validates API failures, shape and portable paths", async () => {
  const mock = (data) => async (url, options) => {
    assert.equal(url, "https://api.free-time.me/v2/blog/posts");
    assert.equal(options.credentials, "omit");
    assert.ok(options.signal);
    return { ok: true, json: async () => data };
  };
  assert.deepEqual(
    await loadPostSlugs(
      mock({ posts: [{ slug: "xmrigui", title: "XMRiGUI Update V2.0.0" }, { slug: "hello world", title: "Hello" }] }),
    ),
    ["xmrigui", "hello world"],
  );
  assert.deepEqual(await loadPostSlugs(mock({ posts: [] })), []);
  for (const data of [
    {},
    { posts: null },
    { posts: [null] },
    ...["", "..", ".", "../escape", "a/b", "a\\b", "x\n", "x."].map((slug) => ({
      posts: [{ slug }],
    })),
    { posts: [{ slug: "a" }, { slug: "A" }] },
  ]) {
    await assert.rejects(
      loadPostSlugs(mock(data)),
      /Cannot generate blog post paths/,
    );
  }
  await assert.rejects(
    loadPostSlugs(async () => ({ ok: false, status: 503 })),
    /HTTP 503/,
  );
  await assert.rejects(
    loadPostSlugs(async () => {
      throw new Error("timeout");
    }),
    /timeout/,
  );
  await assert.rejects(
    loadPostSlugs(async () => ({
      ok: true,
      json: async () => {
        throw new Error("Invalid JSON");
      },
    })),
    /Invalid JSON/,
  );
});
test("list uses safe metadata, encoded slugs and comma/ampersand title", async () => {
  const { document: d } = await render(
    "https://blog.free-time.me/blog/?category=A,B,C",
    { "/blog/posts": posts, "/blog/categories": categories },
  );
  assert.equal(d.title, "My Blogs: A, B & C");
  assert.equal(d.querySelector("li a").textContent, posts.posts[0].title);
  assert.equal(d.querySelector("li a").getAttribute("href"), sharedPostPath(slugify(posts.posts[0].title)));
  assert.equal(
    d.querySelector("#blog-content img, #blog-content script"),
    null,
  );
  assert.equal(
    d.querySelector(".navigate-btn").href,
    "https://blog.free-time.me/",
  );
});
test("legacy and canonical post links render sanitized Markdown with timestamps", async () => {
  for (const path of [
    "/api/blog/test",
    "/blog/test",
    "/blog/test/",
    "/blog/?post=test",
  ]) {
    const { document: d } = await render(`https://blog.free-time.me${path}`, {
      "/blog/posts/test": {
        title: "<b>Title</b>",
        categories: ["<img src=x>"],
        markdown:
          '# Heading\nCategories: hidden\n**bold** <t:1788258000:R>\n<script>alert(1)</script><img src=x onerror="evil()">\n[bad](javascript:alert)\n',
      },
    });
    assert.equal(d.title, "<b>Title</b>");
    assert.equal(
      d.querySelector('link[rel="canonical"]').href,
      "https://blog.free-time.me/blog/test/",
    );
    assert.equal(
      d.querySelector(".navigate-btn").href,
      "https://blog.free-time.me/blog",
    );
    assert.equal(d.querySelector("#blog-content h1"), null);
    assert.ok(d.querySelector("#blog-content strong"));
    assert.ok(d.querySelector('time[data-style="R"]'));
    assert.equal(
      d.querySelector(
        '#blog-content script, [onerror], a[href^="javascript:"]',
      ),
      null,
    );
  }
});
test("a post published after the build renders via the fallback with a clean canonical", async () => {
  const { document: d, calls } = await render(
    "https://blog.free-time.me/blog/not-built-yet/",
    {
      "/blog/posts/not-built-yet": {
        title: "Fresh post",
        markdown: "**New content**",
        categories: [],
      },
    },
  );
  assert.equal(d.title, "Fresh post");
  assert.equal(
    d.querySelector("#blog-content strong").textContent,
    "New content",
  );
  assert.equal(
    d.querySelector('link[rel="canonical"]').href,
    "https://blog.free-time.me/blog/not-built-yet/",
  );
  assert.equal(calls.length, 2);
});
test("empty filters, unavailable API, missing post and unknown routes", async () => {
  const empty = await render(
    "https://blog.free-time.me/blog?category=missing",
    { "/blog/posts": posts, "/blog/categories": categories },
  );
  assert.match(
    empty.document.querySelector("#blog-content").textContent,
    /No posts found/,
  );
  const missing = await render("https://blog.free-time.me/api/blog/missing", {
    "/blog/posts/missing": { status: 404 },
  });
  assert.equal(missing.document.title, "Post not found");
  const unavailable = await render("https://blog.free-time.me/blog", {});
  assert.equal(unavailable.document.title, "Blog unavailable");
  const unknown = await render("https://blog.free-time.me/unknown", {});
  assert.equal(unknown.document.title, "Page not found");
  assert.equal(unknown.calls.length, 0);
});
test("static artifact and preview HTTP routing", async () => {
  assert.equal(
    (await readFile("dist/CNAME", "utf8")).trim(),
    "blog.free-time.me",
  );
  const home = await readFile("dist/index.html", "utf8");
  assert.match(home, /About Me/);
  assert.match(home, /data-style="R"/);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  try {
    const origin = `http://127.0.0.1:${server.address().port}`;
    for (const path of [
      "/",
      "/blog",
      "/blog/?post=test",
      "/vendor/marked.js",
      "/vendor/dompurify.js",
      "/styles/style.css",
    ])
      assert.equal((await fetch(origin + path)).status, 200, path);
    for (const entry of await readdir("dist/blog", { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const route = postPath(entry.name);
      const page = await fetch(origin + route);
      assert.equal(page.status, 200, route);
      const html = new JSDOM(await page.text());
      assert.equal(
        html.window.document.querySelector('link[rel="canonical"]').href,
        new JSDOM(await readFile(`dist/blog/${entry.name}/index.html`, "utf8")).window.document.querySelector("link[rel=canonical]").href,
      );
      assert.equal((await fetch(origin + route.slice(0, -1))).status, 200);
      html.window.close();
    }
    const fresh = await fetch(origin + "/blog/not-built-yet/");
    assert.equal(fresh.status, 404);
    assert.match(await fresh.text(), /scripts\/blog.js/);
    const legacy = await fetch(origin + "/api/blog/test");
    assert.equal(legacy.status, 404);
    assert.match(await legacy.text(), /scripts\/blog.js/);
    assert.equal((await fetch(origin, { method: "POST" })).status, 405);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test("theme persistence and all timestamp styles including invalid dates", async () => {
  const dom = new JSDOM(shell, {
    url: "https://blog.free-time.me",
    runScripts: "outside-only",
  });
  const { window } = dom;
  window.localStorage.setItem("theme", "dark");
  for (const style of ["t", "T", "d", "D", "f", "F", "R"]) {
    const time = window.document.createElement("time");
    time.className = "discord-timestamp";
    time.dataset.timestamp = "1788258000";
    time.dataset.style = style;
    window.document.body.append(time);
  }
  const invalid = window.document.createElement("time");
  invalid.className = "discord-timestamp";
  invalid.dataset.timestamp = "999999999999999999999999";
  window.document.body.append(invalid);
  window.setInterval = () => 0;
  window.eval(
    (await readFile("public/scripts/theme.js", "utf8")).replace(
      "export function",
      "function",
    ),
  );
  assert.ok(window.document.body.classList.contains("dark-mode"));
  for (const time of window.document.querySelectorAll("time[data-style]")) {
    assert.ok(time.textContent);
    assert.match(time.dateTime, /^2026-/);
  }
  window.document.querySelector(".theme-toggle").click();
  assert.equal(window.localStorage.getItem("theme"), "light");
  assert.equal(
    window.document.querySelector(".theme-toggle").getAttribute("aria-pressed"),
    "false",
  );
  window.close();
});

test("title routes normalize versions and reject ambiguous or unsafe paths", () => {
  assert.equal(slugify("XMRiGUI Update V2.0.0"), "xmrigui-update-v2-0-0");
  assert.equal(slugify("Änderung: V2.10.3!"), "anderung-v2-10-3");
  const route = createPostRoutes([{ slug: "xmrigui", title: "XMRiGUI Update V2.0.0" }])[0];
  assert.equal(postPath(route.route), "/blog/xmrigui-update-v2-0-0/");
  for (const entries of [
    [{ slug: "one", title: "Same!" }, { slug: "two", title: "Same?" }],
    [{ slug: "one", title: "two" }, { slug: "two", title: "Other" }],
    [{ slug: "../escape", title: "Safe title" }],
    [{ slug: "CON", title: "Safe title" }],
    [{ slug: "safe", title: "..." }],
  ]) assert.throws(() => createPostRoutes(entries));
});

test("title URL resolves API slug and legacy URLs replace address and canonical", async () => {
  const title = "XMRiGUI Update V2.0.0";
  for (const path of ["/blog/xmrigui-update-v2-0-0/", "/blog/xmrigui/", "/blog/?post=xmrigui", "/api/blog/xmrigui"]) {
    const { document: d, calls } = await render(`https://blog.free-time.me${path}`, {
      "/blog/posts": { posts: [{ slug: "xmrigui", title }] },
      "/blog/posts/xmrigui": { title, markdown: "Update", categories: [] },
    });
    assert.equal(d.title, title);
    assert.equal(new URL(d.URL).pathname, "/blog/xmrigui-update-v2-0-0/");
    assert.equal(new URL(d.URL).search, "");
    assert.equal(d.querySelector("link[rel=canonical]").href, "https://blog.free-time.me/blog/xmrigui-update-v2-0-0/");
    assert.ok(calls.includes("https://api.free-time.me/v2/blog/posts/xmrigui"));
  }
});
