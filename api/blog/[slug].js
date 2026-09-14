import fs from 'fs';
import path from 'path';
import { marked } from 'marked';

function replaceDiscordTimestamps(markdown) {
    return markdown.replace(/<t:(\d+)(?::([tTdDfFR]))?>/g, (_, timestamp, style = 'f') => {
        return `<time class="discord-timestamp" data-timestamp="${timestamp}" data-style="${style}"><t:${timestamp}:${style}></time>`;
    });
}

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

    // Kategorien extrahieren
    const categoryMatch = data.match(/Categories:\s*(.+)/i);
    const categories = categoryMatch
        ? categoryMatch[1].split(',').map(c => c.replace(/\*/g, '').trim())
        : [];

    // Kategorien aus dem Body entfernen, um Dopplungen zu vermeiden
    let contentMarkdown = data.replace(/^# .*\n?/gm, '');
    contentMarkdown = contentMarkdown.replace(/.*Categories:.*\n?/gi, '');
    contentMarkdown = replaceDiscordTimestamps(contentMarkdown);

    const content = marked.parse(contentMarkdown);
    const template = fs.readFileSync(templatePath, 'utf-8');

    const catHtml = categories.length > 0
        ? `<div class="categories-container">${categories.map(c => `<a href="/blog?category=${encodeURIComponent(c)}" class="category-tag">${c}</a>`).join('')}</div>`
        : '';

    const html = template
        .replace(/{{title}}/g, title)
        .replace(/{{content}}/g, catHtml + content);

    res.setHeader('Content-Type', 'text/html');
    res.status(200).send(html);
}
