import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { marked } from 'marked';

export function timestamps(markdown) {
    return markdown.replace(/<t:(\d+)(?::([tTdDfFR]))?>/g, (_, stamp, style = 'f') =>
        `<time class="discord-timestamp" data-timestamp="${stamp}" data-style="${style}"></time>`);
}
const escape = text => text.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
await rm('dist', { recursive: true, force: true });
await mkdir('dist/blog', { recursive: true });
for (const dir of ['styles', 'favicons', 'scripts']) await cp(`public/${dir}`, `dist/${dir}`, { recursive: true });
await mkdir('dist/vendor', { recursive: true });
await cp('node_modules/marked/lib/marked.esm.js', 'dist/vendor/marked.js');
await cp('node_modules/dompurify/dist/purify.es.mjs', 'dist/vendor/dompurify.js');
const template = await readFile('public/views/home.html', 'utf8');
const markdown = await readFile('public/md/index.md', 'utf8');
const title = (markdown.match(/^# (.+)/) || [])[1] || 'Homepage';
await writeFile('dist/index.html', template.replaceAll('{{title}}', escape(title)).replace('{{content}}', marked.parse(timestamps(markdown.replace(/^# .*\n?/gm, '')))));
const shell = template.replace('<a class="navigate-btn" href="/blog">Blogs</a>', '<a class="navigate-btn" href="https://blog.free-time.me">Back</a>')
    .replaceAll('{{title}}', 'My Blogs').replace('{{content}}', '<div id="blog-content" aria-live="polite"><p>Loading…</p></div><noscript>JavaScript is required to load blog posts from the API.</noscript>')
    .replace('</body>', '<script type="module" src="/scripts/blog.js"></script></body>');
await writeFile('dist/blog/index.html', shell);
await writeFile('dist/404.html', shell);
await writeFile('dist/CNAME', 'blog.free-time.me\n');
await writeFile('dist/.nojekyll', '');
