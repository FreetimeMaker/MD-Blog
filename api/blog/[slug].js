import fs from 'fs';
import path from 'path';
import { marked } from 'marked';

export default function handler(req, res) {
    const { slug } = req.query;
    const filePath = path.join(process.cwd(), 'public', 'blogs', `${slug}.md`);
    const templatePath = path.join(process.cwd(), 'public', 'views', 'blog.html');

    if (!fs.existsSync(filePath)) {
        res.status(404).send('Post not found');
        return;
    }

    const data = fs.readFileSync(filePath, 'utf-8');
    const title = (data.match(/^# (.+)/) || [])[1] || slug;
    const contentMarkdown = data.replace(/^# .*\n?/gm, '');
    const content = marked.parse(contentMarkdown);
    const template = fs.readFileSync(templatePath, 'utf-8');
    const html = template.replace(/{{title}}/g, title).replace(/{{content}}/g, content);

    res.setHeader('Content-Type', 'text/html');
    res.status(200).send(html);
}
