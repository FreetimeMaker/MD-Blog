import { createPostRoutes } from "../public/scripts/post-routes.js";
export { postPath } from "../public/scripts/post-routes.js";
const API = "https://api.free-time.me/v2";

export async function loadPostRoutes(request = fetch) {
  try {
    const response = await request(`${API}/blog/posts`, {
      credentials: "omit",
      signal: AbortSignal.timeout(20000),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    return createPostRoutes(data.posts);
  } catch (error) {
    throw new Error(
      `Cannot generate blog post paths from ${API}/blog/posts: ${error.message}`,
      { cause: error },
    );
  }
}
export async function loadPostSlugs(request = fetch) {
  return (await loadPostRoutes(request)).map((post) => post.slug);
}
