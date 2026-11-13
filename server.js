import http from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("./dist/", import.meta.url));
const types = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".webmanifest": "application/manifest+json",
};
export const server = http.createServer(async (req, res) => {
  if (!["GET", "HEAD"].includes(req.method)) {
    res.writeHead(405, { Allow: "GET, HEAD" });
    return res.end();
  }
  try {
    let pathname = decodeURIComponent(
      new URL(req.url, "http://localhost").pathname,
    );
    if (pathname === "/") pathname = "/index.html";
    if (pathname === "/blog" || pathname === "/blog/")
      pathname = "/blog/index.html";
    const filename = path.resolve(root, "." + pathname);
    if (!filename.startsWith(root)) {
      res.writeHead(403);
      return res.end();
    }
    let body;
    let type = types[path.extname(filename)] || "application/octet-stream";
    try {
      try {
        body = await readFile(filename);
      } catch (error) {
        if (error.code !== "EISDIR") throw error;
        body = await readFile(path.join(filename, "index.html"));
        type = "text/html";
      }
    } catch (error) {
      if (!["ENOENT", "ENOTDIR", "EISDIR"].includes(error.code)) throw error;
      body = await readFile(path.join(root, "404.html"));
      type = "text/html";
      res.statusCode = 404;
    }
    res.setHeader(
      "Content-Type",
      type + (type.startsWith("text/") ? "; charset=utf-8" : ""),
    );
    res.end(req.method === "HEAD" ? undefined : body);
  } catch (error) {
    res.statusCode = error instanceof URIError ? 400 : 500;
    res.end("Request failed");
  }
});
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  server.listen(process.env.PORT || 3000, () =>
    console.log("MD-Blog static preview: http://localhost:3000"),
  );
}
