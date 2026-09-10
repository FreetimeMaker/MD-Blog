import fs from 'fs';
import path from 'path';

export const config = {
  runtime: 'nodejs'
};

export default function handler(req, res) {
    const blogDir = path.join(process.cwd(), 'public', 'blogs');
    const templatePath = path.join(process.cwd(), 'public', 'views', 'blog.html');
    const template = fs.readFileSync(templatePath, 'utf-8');

    const files = fs.readdirSync(blogDir);

    const blogPosts = files
        .filter(f => f.endsWith('.md'))
        .map(f => {
            const slug = f.replace('.md', '');
            const filePath = path.join(blogDir, f);
            const data = fs.readFileSync(filePath, 'utf-8');

            // Datum extrahieren: Released on DD.MM.YYYY [at] HH:mm
            const dateMatch = data.match(/Released on\s+(\d{2})\.(\d{2})\.(\d{4})(?:\s+at)?\s+(\d{2}):(\d{2})/i);
            let date = new Date(0);
            if (dateMatch) {
                const [_, day, month, year, hour, minute] = dateMatch;
                date = new Date(`${year}-${month}-${day}T${hour}:${minute}:00`);
            }

            // Titel aus Markdown holen
            const title = (data.match(/^# (.+)/) || [])[1] 
                          || slug.replace(/-/g, ' ').replace(/^\w/, c => c.toUpperCase());

            return { slug, title, date };
        });

    // Sortieren: Neueste zuerst
    blogPosts.sort((a, b) => b.date - a.date);

    const listItems = blogPosts
        .map(post => `<li><a href="/api/blog/${post.slug}">${post.title}</a></li>`)
        .join('\n');

    const content = `<ul>${listItems}</ul>`;
    const html = template.replace(/{{title}}/g, 'My Blogs').replace(/{{content}}/g, content);

    res.setHeader('Content-Type', 'text/html');
    res.status(200).send(html);
}
