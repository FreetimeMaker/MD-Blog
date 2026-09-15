import fs from 'fs';
import path from 'path';
import { marked } from 'marked';

function renderTimestamps(markdown) {
    return markdown.replace(/<t:(\d+)(?::([tTdDfFR]))?>/g, (_, timestamp, style = 'f') =>
        `<time class="discord-timestamp" data-timestamp="${timestamp}" data-style="${style}"></time>`
    );
}

export default function handler(req, res) {
    const mdPath = path.join(process.cwd(), 'public', 'md', 'index.md');
    const templatePath = path.join(process.cwd(), 'public', 'views', 'home.html');

    const md = fs.readFileSync(mdPath, 'utf-8');
    const template = fs.readFileSync(templatePath, 'utf-8');

    const title = (md.match(/^# (.+)/) || [])[1] || 'Homepage';
    const contentMarkdown = md.replace(/^# .*\n?/gm, '');
    const content = marked.parse(renderTimestamps(contentMarkdown));
    const html = template.replace(/{{title}}/g, title).replace(/{{content}}/g, content);

    res.setHeader('Content-Type', 'text/html');
    res.status(200).send(html);
}
