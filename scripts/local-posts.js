import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

export async function loadLocalPosts(root = "public/blogs") {
  const posts = [];
  async function walk(directory) {
    const entries = await readdir(directory, { withFileTypes: true });
    entries.sort((a, b) => a.name.localeCompare(b.name));
    for (const entry of entries) {
      const filename = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        await walk(filename);
      } else if (entry.isFile() && /\.md$/i.test(entry.name)) {
        const markdown = await readFile(filename, "utf8");
        const slug = entry.name.replace(/\.md$/i, "");
        if (
          posts.some((post) => post.slug.toLowerCase() === slug.toLowerCase())
        ) {
          throw new Error(`Duplicate local blog slug: ${slug}`);
        }
        const title =
          markdown.match(/^#\s+(.+)$/m)?.[1].trim() ||
          slug.replace(/[-_]/g, " ");
        const categoryLine =
          markdown.match(/^.*Categories:\s*(.*)$/im)?.[1] || "";
        const categories = categoryLine
          .replace(/[*_`]/g, "")
          .split(",")
          .map((value) => value.trim())
          .filter(Boolean);
        const release = markdown.match(
          /\bReleased on\s+<t:(\d+)(?::[tTdDfFR])?>/i,
        );
        const timestamp = release ? Number(release[1]) : NaN;
        const publishedAt =
          Number.isFinite(timestamp) &&
          Number.isFinite(new Date(timestamp * 1000).getTime())
            ? timestamp
            : null;
        posts.push({ slug, title, categories, markdown, publishedAt });
      }
    }
  }
  await walk(root);
  return posts.sort((a, b) => {
    if (a.publishedAt === null && b.publishedAt !== null) return 1;
    if (b.publishedAt === null && a.publishedAt !== null) return -1;
    return (
      (b.publishedAt ?? 0) - (a.publishedAt ?? 0) ||
      a.slug.localeCompare(b.slug, "en")
    );
  });
}
