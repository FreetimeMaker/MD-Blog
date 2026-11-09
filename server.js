import http from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import home from './api/index.js';
import blog from './api/blog.js';
import post from './api/blog/[slug].js';

const root = path.dirname(fileURLToPath(import.meta.url));
process.chdir(root);
const publicRoot = path.join(root, 'public');
const types = {
    '.css': 'text/css; charset=utf-8',
    '.png': 'image/png',
    '.ico': 'image/x-icon',
    '.webmanifest': 'application/manifest+json',
    '.svg': 'image/svg+xml'
};

const server = http.createServer(async (req, res) => {
    res.status = code => { res.statusCode = code; return res; };
    res.send = body => {
        if (!res.hasHeader('Content-Type')) res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.end(body);
    };

    try {
        if (req.method !== 'GET' && req.method !== 'HEAD') {
            res.setHeader('Allow', 'GET, HEAD');
            return res.status(405).send('Method not allowed');
        }
        const url = new URL(req.url, 'http://localhost');
        const pathname = decodeURIComponent(url.pathname);
        req.query = Object.fromEntries(url.searchParams);

        if (pathname === '/' || pathname === '/api/index.js') return await home(req, res);
        if (pathname === '/blog' || pathname === '/api/blog.js') return await blog(req, res);
        const match = pathname.match(/^\/(?:api\/)?blog\/([^/]+)$/);
        if (match) {
            req.query.slug = match[1];
            return await post(req, res);
        }

        if (pathname.startsWith('/styles/') || pathname.startsWith('/favicons/')) {
            const filename = path.resolve(publicRoot, '.' + pathname);
            const relative = path.relative(publicRoot, filename);
            if (relative.startsWith('..') || path.isAbsolute(relative)) {
                return res.status(403).send('Forbidden');
            }
            const data = await readFile(filename);
            res.setHeader('Content-Type', types[path.extname(filename)] || 'application/octet-stream');
            return res.end(data);
        }
        res.status(404).send('Not found');
    } catch (error) {
        if (error instanceof URIError) return res.status(400).send('Invalid URL');
        if (error.code === 'ENOENT' || error.code === 'ENOTDIR') return res.status(404).send('Not found');
        console.error('[server] Request failed:', error);
        res.status(500).send('Internal server error');
    }
});

const port = process.env.PORT || 3000;
server.listen(port, () => console.log(`MD-Blog running at http://localhost:${port}`));
