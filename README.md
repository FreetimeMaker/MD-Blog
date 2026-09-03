# MD-Blog

MD-Blog is a lightweight blog platform for publishing Markdown files as web pages. It is designed for simple personal blogs, app changelogs, project updates, and other content that should be easy to write and maintain.

## Features

- Render Markdown files as HTML with [Marked](https://marked.js.org/)
- Automatically discover blog posts from `public/blogs`
- Generate readable URLs from Markdown filenames
- Reusable HTML templates for the homepage and blog posts
- Light and dark theme toggle
- Ready for deployment on Vercel

## Project Structure

```text
api/
	index.js           Homepage endpoint
	blog.js            Blog index endpoint
	blog/[slug].js     Individual blog post endpoint
public/
	blogs/             Markdown blog posts
	md/index.md        Homepage content
	views/             HTML templates
	styles/            Stylesheets
vercel.json          URL routing configuration
```

## Getting Started

Install the project dependencies:

```bash
npm install
```

The available npm scripts are:

```bash
npm run dev
npm start
```

Both scripts currently start `server.js`. For local execution, make sure a compatible `server.js` is present or use the Vercel development environment for the API routes.

## Adding a Blog Post

1. Create a new Markdown file in `public/blogs`.
2. Use a filename that will work as a URL slug, for example `my-first-post.md`.
3. Add a level-one heading. It becomes the post title.

Example:

```markdown
# My First Post

This is the content of my first blog post.
```

The post will be available at:

```text
/blog/my-first-post
```

Posts without a level-one heading use a title generated from their filename.

## Routes

| URL | Description |
| --- | --- |
| `/` | Renders the homepage from `public/md/index.md` |
| `/blog` | Lists all Markdown files in `public/blogs` |
| `/blog/<slug>` | Renders one blog post |

## Deployment

This project includes a `vercel.json` file with the required routes for Vercel. To deploy:

1. Import the repository into Vercel.
2. Keep the project root as the repository root.
3. Deploy without adding a build command.

After deployment, the homepage and blog routes will be available through the assigned Vercel domain.

## Author

Created and maintained by [Freetime Maker](https://github.com/FreetimeMaker).

## License

This project is licensed under the GPL-3.0 License. See [LICENSE.txt](LICENSE.txt) for details.
