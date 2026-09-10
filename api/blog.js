import fs from 'fs';
import path from 'path';

export const config = {
  runtime: 'nodejs'
};

export default function handler(req, res) {
    const { category } = req.query;
    const blogDir = path.join(process.cwd(), 'public', 'blogs');
    const templatePath = path.join(process.cwd(), 'public', 'views', 'blog.html');
    const template = fs.readFileSync(templatePath, 'utf-8');

    const files = fs.readdirSync(blogDir);

    const allPosts = files
        .filter(f => f.endsWith('.md'))
        .map(f => {
            const slug = f.replace('.md', '');
            const filePath = path.join(blogDir, f);
            const data = fs.readFileSync(filePath, 'utf-8');

            const dateMatch = data.match(/Released on\s+(\d{2})\.(\d{2})\.(\d{4})(?:\s+at)?\s+(\d{2}):(\d{2})/i);
            let date = new Date(0);
            if (dateMatch) {
                const [_, day, month, year, hour, minute] = dateMatch;
                date = new Date(`${year}-${month}-${day}T${hour}:${minute}:00`);
            }

            const categoryMatch = data.match(/Categories:\s*(.+)/i);
            const categories = categoryMatch
                ? categoryMatch[1].split(',').map(c => c.replace(/\*/g, '').trim())
                : [];

            const title = (data.match(/^# (.+)/) || [])[1]
                          || slug.replace(/-/g, ' ').replace(/^\w/, c => c.toUpperCase());

            return { slug, title, date, categories };
        });

    // Alle verfügbaren Kategorien sammeln (Unique)
    const allCategories = [...new Set(allPosts.flatMap(post => post.categories))].sort();

    // Sortieren: Neueste zuerst
    allPosts.sort((a, b) => b.date - a.date);

    // Filtern nach Kategorie, falls ausgewählt
    let filteredPosts = allPosts;
    if (category) {
        filteredPosts = allPosts.filter(post =>
            post.categories.some(cat => cat.toLowerCase() === category.toLowerCase())
        );
    }

    const categoryCloud = allCategories.length > 0
        ? `<div class="categories-container" style="margin-bottom: 30px;">
             <strong>Filter by:</strong> ${allCategories.map(cat =>
                `<a href="/blog?category=${encodeURIComponent(cat)}" class="category-tag ${category && category.toLowerCase() === cat.toLowerCase() ? 'active' : ''}">${cat}</a>`
             ).join('')}
             ${category ? `<a href="/blog" style="margin-left: 10px; font-size: 0.8rem;">Clear</a>` : ''}
           </div>`
        : '';

    const listItems = filteredPosts
        .map(post => {
            const catHtml = post.categories.length > 0
                ? ` <span class="categories">(${post.categories.map(cat => `<a href="/blog?category=${encodeURIComponent(cat)}">${cat}</a>`).join(', ')})</span>`
                : '';
            return `<li><a href="/api/blog/${post.slug}">${post.title}</a>${catHtml}</li>`;
        })
        .join('\n');

    let content = categoryCloud + `<ul>${listItems}</ul>`;

    if (category && filteredPosts.length === 0) {
        content = categoryCloud + `<p>No posts found in this category.</p>`;
    }

    const html = template.replace(/{{title}}/g, category ? `Blogs: ${category}` : 'My Blogs').replace(/{{content}}/g, content);

    res.setHeader('Content-Type', 'text/html');
    res.status(200).send(html);
}
