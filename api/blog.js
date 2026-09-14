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

            // Primär den neuen Discord-ähnlichen Unix-Timestamp verwenden.
            // Beispiel: Released on <t:1789303200:F> (<t:1789303200:R>)
            const timestampMatch = data.match(/Released on[\s\S]*?<t:(\d+)(?::[tTdDfFR])?>/i);
            let releaseTimestamp = 0;

            if (timestampMatch) {
                releaseTimestamp = Number(timestampMatch[1]);
            } else {
                // Fallback für ältere Posts, die noch das alte Datumsformat verwenden.
                const dateMatch = data.match(/Released on\s+(\d{2})\.(\d{2})\.(\d{4})(?:\s+at)?\s+(\d{2}):(\d{2})/i);
                if (dateMatch) {
                    const [_, day, month, year, hour, minute] = dateMatch;
                    releaseTimestamp = Math.floor(new Date(`${year}-${month}-${day}T${hour}:${minute}:00`).getTime() / 1000);
                }
            }

            const categoryMatch = data.match(/Categories:\s*(.+)/i);
            const categories = categoryMatch
                ? categoryMatch[1].split(',').map(c => c.replace(/\*/g, '').trim())
                : [];

            const title = (data.match(/^# (.+)/) || [])[1]
                          || slug.replace(/-/g, ' ').replace(/^\w/, c => c.toUpperCase());

            return { slug, title, releaseTimestamp, categories };
        });

    // Alle verfügbaren Kategorien sammeln (Unique)
    const allCategories = [...new Set(allPosts.flatMap(post => post.categories))].sort();

    // Aktive Filter parsen (Array von Kategorien)
    const activeFilters = category
        ? category.split(',').map(c => c.trim()).filter(Boolean)
        : [];

    // Sortieren: neuester Release zuerst.
    // Posts ohne erkannten Release-Zeitstempel landen automatisch am Ende.
    allPosts.sort((a, b) => b.releaseTimestamp - a.releaseTimestamp);

    // Filtern nach Kategorien (AND-Logik: Post muss ALLE aktiven Kategorien haben)
    let filteredPosts = allPosts;
    if (activeFilters.length > 0) {
        filteredPosts = allPosts.filter(post =>
            activeFilters.every(f =>
                post.categories.some(cat => cat.toLowerCase() === f.toLowerCase())
            )
        );
    }

    const categoryCloud = allCategories.length > 0
        ? `<div class="categories-container" style="margin-bottom: 30px;">
             <strong>Filter by:</strong> ${allCategories.map(cat => {
                const isActive = activeFilters.some(f => f.toLowerCase() === cat.toLowerCase());

                // URL für Toggle-Effekt bauen
                let newFilters;
                if (isActive) {
                    newFilters = activeFilters.filter(f => f.toLowerCase() !== cat.toLowerCase());
                } else {
                    newFilters = [...activeFilters, cat];
                }

                const href = newFilters.length > 0
                    ? `/blog?category=${encodeURIComponent(newFilters.join(','))}`
                    : '/blog';

                return `<a href="${href}" class="category-tag ${isActive ? 'active' : ''}">${cat}${isActive ? ' ✕' : ''}</a>`;
             }).join('')}
             ${activeFilters.length > 0 ? `<a href="/blog" style="margin-left: 10px; font-size: 0.8rem;">Clear All</a>` : ''}
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

    if (activeFilters.length > 0 && filteredPosts.length === 0) {
        content = categoryCloud + `<p>No posts found matching all selected categories: <strong>${activeFilters.join(', ')}</strong></p>`;
    }

    const titleText = activeFilters.length > 0
        ? `My Blogs: ${activeFilters.join(' + ')}`
        : 'My Blogs';

    const html = template.replace(/{{title}}/g, titleText).replace(/{{content}}/g, content);

    res.setHeader('Content-Type', 'text/html');
    res.status(200).send(html);
}
