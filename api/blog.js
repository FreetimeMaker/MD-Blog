import fs from 'fs';
import path from 'path';

const API_BASE = process.env.ALL_API_URL || 'https://api.free-time.me/v2';

export const config = { runtime: 'nodejs' };

export default async function handler(req, res) {
    const { category } = req.query;
    const templatePath = path.join(process.cwd(), 'public', 'views', 'blog.html');
    const template = fs.readFileSync(templatePath, 'utf-8');

    try {
        const [postsResponse, categoriesResponse] = await Promise.all([
            fetch(`${API_BASE}/blog/posts`),
            fetch(`${API_BASE}/blog/categories`)
        ]);

        if (!postsResponse.ok || !categoriesResponse.ok) {
            throw new Error(`Blog API returned ${postsResponse.status}/${categoriesResponse.status}`);
        }

        const { posts: allPosts = [] } = await postsResponse.json();
        const { categories: allCategories = [] } = await categoriesResponse.json();

        const activeFilters = category
            ? category.split(',').map(c => c.trim()).filter(Boolean)
            : [];

        const filteredPosts = activeFilters.length > 0
            ? allPosts.filter(post => activeFilters.every(filter =>
                post.categories.some(cat => cat.toLowerCase() === filter.toLowerCase())
            ))
            : allPosts;

        const categoryCloud = allCategories.length > 0
            ? `<div class="categories-container" style="margin-bottom: 30px;">
                 <strong>Filter by:</strong> ${allCategories.map(cat => {
                    const isActive = activeFilters.some(f => f.toLowerCase() === cat.toLowerCase());
                    const newFilters = isActive
                        ? activeFilters.filter(f => f.toLowerCase() !== cat.toLowerCase())
                        : [...activeFilters, cat];
                    const href = newFilters.length > 0
                        ? `/blog?category=${encodeURIComponent(newFilters.join(','))}`
                        : '/blog';
                    return `<a href="${href}" class="category-tag ${isActive ? 'active' : ''}">${cat}${isActive ? ' ✕' : ''}</a>`;
                 }).join('')}
                 ${activeFilters.length > 0 ? `<a href="/blog" style="margin-left: 10px; font-size: 0.8rem;">Clear All</a>` : ''}
               </div>`
            : '';

        const listItems = filteredPosts.map(post => {
            const catHtml = post.categories.length > 0
                ? ` <span class="categories">(${post.categories.map(cat => `<a href="/blog?category=${encodeURIComponent(cat)}">${cat}</a>`).join(', ')})</span>`
                : '';
            return `<li><a href="/api/blog/${post.slug}">${post.title}</a>${catHtml}</li>`;
        }).join('\n');

        let content = categoryCloud + `<ul>${listItems}</ul>`;
        if (activeFilters.length > 0 && filteredPosts.length === 0) {
            content = categoryCloud + `<p>No posts found matching all selected categories: <strong>${activeFilters.join(', ')}</strong></p>`;
        }

        const titleText = activeFilters.length > 0
            ? `My Blogs: ${activeFilters.join(' + ')}`
            : 'My Blogs';

        const html = template.replace(/{{title}}/g, titleText).replace(/{{content}}/g, content);
        res.setHeader('Content-Type', 'text/html');
        res.status(200).send(html);
    } catch (error) {
        console.error('[blog] API error:', error);
        const html = template
            .replace(/{{title}}/g, 'My Blogs')
            .replace(/{{content}}/g, '<p>Blog posts are temporarily unavailable. Please try again later.</p>');
        res.setHeader('Content-Type', 'text/html');
        res.status(503).send(html);
    }
}
