export const postPath = slug => `/blog/${encodeURIComponent(slug)}/`;

export function slugify(title) {
  return title.normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export function createPostRoutes(posts) {
  if (!Array.isArray(posts)) throw new Error('Expected a posts array');
  const owners = new Map();
  const routes = posts.map(post => {
    const slug = post?.slug;
    if (typeof slug !== 'string' || !slug || slug.trim() !== slug ||
        /[/\\\x00-\x1f\x7f<>:"|?*%]/.test(slug) || /^[.]+$/.test(slug) || /[. ]$/.test(slug) ||
        /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(slug) || slug.length > 180) {
      throw new Error(`Unsafe or invalid post slug: ${JSON.stringify(slug)}`);
    }
    const route = typeof post.title === 'string' ? slugify(post.title) : '';
    if (!route || route.length > 180) throw new Error(`Invalid title for post: ${slug}`);
    return { ...post, route };
  });
  const apiSlugs = new Set();
  for (const post of routes) {
    const key = post.slug.toLowerCase();
    if (apiSlugs.has(key)) throw new Error(`Duplicate post slug: ${post.slug}`);
    apiSlugs.add(key);
    for (const name of new Set([key, post.route])) {
      if (owners.has(name)) throw new Error(`Conflicting post path: ${name}`);
      owners.set(name, post.slug);
    }
  }
  return routes;
}
