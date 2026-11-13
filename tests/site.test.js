import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { JSDOM } from 'jsdom';
import { marked } from 'marked';
import createDOMPurify from 'dompurify';
import { server } from '../server.js';

const shell = await readFile('dist/blog/index.html', 'utf8');
const source = (await readFile('public/scripts/blog.js', 'utf8')).replace(/^import .*;\n/gm, '').replace('export async function render', 'async function render');
async function render(url, responses) {
    const dom = new JSDOM(shell, { url });
    const calls = [];
    const request = async (url, options) => {
        assert.equal(options.credentials, 'omit'); calls.push(url);
        const value = responses[url.split('/v2')[1]];
        return { ok: !!value && !value.status, status: value?.status || 200, json: async () => value };
    };
    const execute = new (Object.getPrototypeOf(async function(){}).constructor)('document', 'location', 'fetch', 'marked', 'DOMPurify', 'updateDiscordTimestamps', 'console', source);
    await execute(dom.window.document, dom.window.location, request, marked, createDOMPurify(dom.window), () => {}, { error() {} });
    return { document: dom.window.document, calls };
}
const posts = { posts: [{ slug: 'test/a', title: '<img src=x onerror=alert(1)>', categories: ['A', 'B', 'C'] }] };
const categories = { categories: ['A', 'B', 'C', '<script>evil</script>'] };
test('list uses safe metadata, encoded slugs and comma/ampersand title', async () => {
    const { document: d } = await render('https://blog.free-time.me/blog/?category=A,B,C', { '/blog/posts': posts, '/blog/categories': categories });
    assert.equal(d.title, 'My Blogs: A, B & C');
    assert.equal(d.querySelector('li a').textContent, posts.posts[0].title);
    assert.equal(d.querySelector('li a').getAttribute('href'), '/blog/?post=test%2Fa');
    assert.equal(d.querySelector('#blog-content img, #blog-content script'), null);
    assert.equal(d.querySelector('.navigate-btn').href, 'https://blog.free-time.me/');
});
test('legacy and canonical post links render sanitized Markdown with timestamps', async () => {
    for (const path of ['/api/blog/test', '/blog/test', '/blog/?post=test']) {
        const { document: d } = await render(`https://blog.free-time.me${path}`, { '/blog/posts/test': { title: '<b>Title</b>', categories: ['<img src=x>'], markdown: '# Heading\nCategories: hidden\n**bold** <t:1788258000:R>\n<script>alert(1)</script><img src=x onerror="evil()">\n[bad](javascript:alert)\n' } });
        assert.equal(d.title, '<b>Title</b>');
        assert.equal(d.querySelector('.navigate-btn').href, 'https://blog.free-time.me/blog');
        assert.equal(d.querySelector('#blog-content h1'), null);
        assert.ok(d.querySelector('#blog-content strong'));
        assert.ok(d.querySelector('time[data-style="R"]'));
        assert.equal(d.querySelector('#blog-content script, [onerror], a[href^="javascript:"]'), null);
    }
});
test('empty filters, unavailable API, missing post and unknown routes', async () => {
    const empty = await render('https://blog.free-time.me/blog?category=missing', { '/blog/posts': posts, '/blog/categories': categories });
    assert.match(empty.document.querySelector('#blog-content').textContent, /No posts found/);
    const missing = await render('https://blog.free-time.me/api/blog/missing', { '/blog/posts/missing': { status: 404 } });
    assert.equal(missing.document.title, 'Post not found');
    const unavailable = await render('https://blog.free-time.me/blog', {});
    assert.equal(unavailable.document.title, 'Blog unavailable');
    const unknown = await render('https://blog.free-time.me/unknown', {});
    assert.equal(unknown.document.title, 'Page not found');
    assert.equal(unknown.calls.length, 0);
});
test('static artifact and preview HTTP routing', async () => {
    assert.equal((await readFile('dist/CNAME', 'utf8')).trim(), 'blog.free-time.me');
    const home = await readFile('dist/index.html', 'utf8');
    assert.match(home, /About Me/); assert.match(home, /data-style="R"/);
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    try {
        const origin = `http://127.0.0.1:${server.address().port}`;
        for (const path of ['/', '/blog', '/blog/?post=test', '/vendor/marked.js', '/vendor/dompurify.js', '/styles/style.css']) assert.equal((await fetch(origin + path)).status, 200, path);
        const legacy = await fetch(origin + '/api/blog/test');
        assert.equal(legacy.status, 404); assert.match(await legacy.text(), /scripts\/blog.js/);
        assert.equal((await fetch(origin, { method: 'POST' })).status, 405);
    } finally { await new Promise(resolve => server.close(resolve)); }
});

test('theme persistence and all timestamp styles including invalid dates', async () => {
    const dom = new JSDOM(shell, { url: 'https://blog.free-time.me', runScripts: 'outside-only' });
    const { window } = dom;
    window.localStorage.setItem('theme', 'dark');
    for (const style of ['t', 'T', 'd', 'D', 'f', 'F', 'R']) {
        const time = window.document.createElement('time');
        time.className = 'discord-timestamp'; time.dataset.timestamp = '1788258000'; time.dataset.style = style;
        window.document.body.append(time);
    }
    const invalid = window.document.createElement('time');
    invalid.className = 'discord-timestamp'; invalid.dataset.timestamp = '999999999999999999999999';
    window.document.body.append(invalid);
    window.setInterval = () => 0;
    window.eval((await readFile('public/scripts/theme.js', 'utf8')).replace('export function', 'function'));
    assert.ok(window.document.body.classList.contains('dark-mode'));
    for (const time of window.document.querySelectorAll('time[data-style]')) {
        assert.ok(time.textContent); assert.match(time.dateTime, /^2026-/);
    }
    window.document.querySelector('.theme-toggle').click();
    assert.equal(window.localStorage.getItem('theme'), 'light');
    assert.equal(window.document.querySelector('.theme-toggle').getAttribute('aria-pressed'), 'false');
    window.close();
});
