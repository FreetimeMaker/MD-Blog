# 🚀 MD Blog

**MD Blog** is a serverless-friendly version of the original [MDXpress Blog](https://github.com/eshan-singh78/MDXpress-Blog/), reworked to deploy seamlessly on platforms like **Vercel** using **Serverless Functions**.

It’s a markdown-powered, minimal blogging platform that compiles content on-the-fly without any backend server, database, or complex setup.

## 📁 Project Structure

```
mdxpress-blog-cnp/
├── api/                 # Serverless function handlers
│   ├── index.js         # Homepage rendering
│   ├── blog.js          # Blog listing route
│   └── blog/[slug].js   # Dynamic blog rendering
├── public/
│   ├── blogs/           # Markdown files for each blog post
│   ├── styles/          # CSS with dark mode support
│   └── views/           # HTML templates
├── vercel.json          # Vercel routing and config
├── package.json         # Metadata and dependencies
└── README.md            # This file
```

---

## 🧪 How to Run Locally

1. **Clone the Repository**
   ```bash
   git clone https://github.com/FreetimeMaker/MD-Blog
   cd MD-Blog
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Run Locally with Vercel**
   ```bash
   vercel dev
   ```

4. **Visit the App**
   Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📌 How It Works on Vercel

- All backend logic is handled via Serverless Functions in `/api`.
- Static assets (styles, markdown files) are served from `/public`.
- HTML templates are combined with rendered Markdown and returned as HTML.

---

## 🙋‍♂️ About the Creator

Crafted by [Eshan Singh](mailto:eshan.singh.04.dev@gmail.com), a full-stack developer & cybersecurity enthusiast exploring the balance of performance and simplicity in web apps.

---