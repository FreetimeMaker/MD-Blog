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

    const listItems = files
        .filter(f => f.endsWith('.md'))
        .map(f => {
            const slug = f.replace('.md', '');
            const filePath = path.join(blogDir, f);
            const data = fs.readFileSync(filePath, 'utf-8');

            // Titel aus Markdown holen
            const title = (data.match(/^# (.+)/) || [])[1] 
                          || slug.replace(/-/g, ' ').replace(/^\w/, c => c.toUpperCase());

            return `<li><a href="/api/blog/${slug}">${title}</a></li>`;
        })
        .join('\n');

    const content = `<h1>My Blogs</h1><ul>${listItems}</ul>`;
    const html = template.replace(/{{title}}/g, 'My Blogs').replace(/{{content}}/g, content);

    res.setHeader('Content-Type', 'text/html');
    res.status(200).send(html);
}
