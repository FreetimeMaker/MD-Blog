import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { loadLocalPosts } from "../scripts/local-posts.js";
import { createPostRoutes } from "../public/scripts/post-routes.js";

test("local posts sort by publication descending, with undated posts last", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "md-blog-order-"));
  try {
    await mkdir(path.join(root, "nested"));
    const files = {
      "a-old.md": "# Old\n## **Released on <t:100:F> (<t:100:R>)**",
      "nested/z-new.md": "# New\n## ****Released on <t:300:F>****",
      "b-tie.md": "# Tie\nReleased on <t:300>",
      "undated.md": "# Undated\nAn unrelated timestamp: <t:999:F>",
      "invalid.md": "# Invalid\nReleased on <t:999999999999999999999999:F>",
    };
    for (const [name, markdown] of Object.entries(files)) {
      await writeFile(path.join(root, name), markdown);
    }
    const posts = await loadLocalPosts(root);
    assert.deepEqual(posts.map((post) => post.slug), ["b-tie", "z-new", "a-old", "invalid", "undated"]);
    assert.deepEqual(posts.map((post) => post.publishedAt), [300, 300, 100, null, null]);
    assert.deepEqual(createPostRoutes(posts).map((post) => post.slug), posts.map((post) => post.slug));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
