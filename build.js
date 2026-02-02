#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const http = require('http');
const url = require('url');
const matter = require('gray-matter');
const { marked } = require('marked');
const hljs = require('highlight.js');

const DEFAULT_IN = 'src';
const DEFAULT_OUT = 'docs';
const DEFAULT_PORT = 8080;
const INCLUDE_DIR = '_includes';
const LAYOUT_DIR = '_layouts';

marked.setOptions({ mangle: false, headerIds: false });
marked.use({
  renderer: {
    code(code, infostring) {
      const language = (infostring || '').trim().split(/\s+/)[0];
      const hasLanguage = language && hljs.getLanguage(language);
      const highlighted = hasLanguage
        ? hljs.highlight(code, { language }).value
        : hljs.highlightAuto(code).value;
      const className = hasLanguage ? `hljs language-${language}` : 'hljs';
      return `<pre><code class="${className}">${highlighted}</code></pre>`;
    },
  },
});

/**
 * Parses command-line arguments and returns configuration options.
 * Supports: --in (source dir), --out (output dir), --clean, --watch, --serve, --port
 * @param {string[]} argv - The process.argv array
 * @returns {object} Configuration object with inDir, outDir, clean, watch, serve, port
 */
function parseArgs(argv) {
  const args = { inDir: DEFAULT_IN, outDir: DEFAULT_OUT, clean: false, watch: false, serve: false, port: DEFAULT_PORT };
  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--in') args.inDir = argv[++i];
    else if (arg === '--out') args.outDir = argv[++i];
    else if (arg === '--clean') args.clean = true;
    else if (arg === '--watch') args.watch = true;
    else if (arg === '--serve') {
      args.serve = true;
      const maybePort = argv[i + 1];
      if (maybePort && !maybePort.startsWith('--')) {
        args.port = Number(maybePort) || DEFAULT_PORT;
        i += 1;
      }
    }
    else if (arg === '--port') args.port = Number(argv[++i]) || DEFAULT_PORT;
  }
  return args;
}

/**
 * Recursively walks a directory and returns all file paths.
 * @param {string} dir - The directory to walk
 * @returns {string[]} Array of absolute file paths
 */
function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...walk(fullPath));
    } else {
      files.push(fullPath);
    }
  }
  return files;
}

/**
 * Creates a directory and all parent directories if they don't exist.
 * @param {string} dirPath - The directory path to create
 */
function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

/**
 * Checks if a file/directory should be ignored (paths starting with underscore).
 * Used to exclude _layouts, _includes, _data from output.
 * @param {string} relPath - Relative path to check
 * @returns {boolean} True if the path should be ignored
 */
function isIgnored(relPath) {
  const parts = relPath.split(path.sep);
  return parts.some((part) => part.startsWith('_'));
}

/**
 * Gets a nested value from an object using dot notation (e.g., "site.title").
 * @param {object} obj - The object to query
 * @param {string} key - Dot-separated key path
 * @returns {*} The value, or empty string if not found
 */
function getValue(obj, key) {
  const parts = key.split('.');
  let current = obj;
  for (const part of parts) {
    if (current == null) return '';
    current = current[part];
  }
  return current == null ? '' : current;
}

/**
 * Renders a template string by replacing {{variables}} and {{> partials}}.
 * Handles include directives ({{> filename}}) and variable interpolation.
 * @param {string} input - The template string
 * @param {object} context - Variables available for interpolation
 * @param {object} opts - Options: srcDir, includeCache, depth (recursion limit)
 * @returns {string} The rendered template
 */
function renderTemplate(input, context, opts = {}) {
  const { srcDir, includeCache, depth = 0 } = opts;
  if (depth > 10) return input;

  let output = input.replace(/\{\{\s*>\s*([^\s}]+)\s*\}\}/g, (_, partial) => {
    const includePath = path.join(srcDir, INCLUDE_DIR, `${partial}.html`);
    if (!fs.existsSync(includePath)) return '';
    if (!includeCache.has(includePath)) {
      includeCache.set(includePath, fs.readFileSync(includePath, 'utf8'));
    }
    const includeContent = includeCache.get(includePath);
    return renderTemplate(includeContent, context, { srcDir, includeCache, depth: depth + 1 });
  });

  output = output.replace(/\{\{\s*([^\s}]+)\s*\}\}/g, (_, key) => {
    const value = getValue(context, key);
    return String(value);
  });

  return output;
}

/**
 * Resolves a layout name to its file path.
 * @param {string} srcDir - The source directory
 * @param {string} layoutName - Layout name (e.g., "base" or "post")
 * @returns {string|null} Full path to layout file, or null if none
 */
function resolveLayout(srcDir, layoutName) {
  if (!layoutName || layoutName === 'none') return null;
  if (layoutName.endsWith('.html')) return path.join(srcDir, layoutName);
  return path.join(srcDir, LAYOUT_DIR, `${layoutName}.html`);
}

/**
 * Recursively applies layout templates to content.
 * Layouts can chain (a layout can specify its own parent layout).
 * @param {object} params - Contains srcDir, layoutName, content, context, includeCache, depth
 * @returns {string} The fully laid-out HTML
 */
function applyLayouts({ srcDir, layoutName, content, context, includeCache, depth = 0 }) {
  if (!layoutName || layoutName === 'none' || depth > 8) return content;
  const layoutPath = resolveLayout(srcDir, layoutName);
  if (!layoutPath || !fs.existsSync(layoutPath)) return content;

  const layoutRaw = fs.readFileSync(layoutPath, 'utf8');
  const layoutParsed = matter(layoutRaw);
  const layoutContent = layoutParsed.content || layoutRaw;
  const layoutData = layoutParsed.data || {};

  const rendered = renderTemplate(layoutContent, { ...context, ...layoutData, content }, { srcDir, includeCache });
  const nextLayout = layoutData.layout;

  return applyLayouts({
    srcDir,
    layoutName: nextLayout,
    content: rendered,
    context,
    includeCache,
    depth: depth + 1,
  });
}

/**
 * Parses a date value into a Date object.
 * @param {string|Date} value - Date string or Date object
 * @returns {Date|null} Parsed Date, or null if invalid
 */
function parseDate(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

/**
 * Formats a Date object as a human-readable string (e.g., "Jan 15, 2026").
 * @param {Date} date - The date to format
 * @returns {string} Formatted date string
 */
function formatDate(date) {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  }).format(date);
}

/**
 * Extracts a date from a filename (e.g., "2026-01-15-my-post" → "2026-01-15").
 * @param {string} baseName - The filename without extension
 * @returns {string|null} Date string if found, otherwise null
 */
function inferDateFromFilename(baseName) {
  const match = baseName.match(/^(\d{4}-\d{2}(?:-\d{2})?)-/);
  return match ? match[1] : null;
}

/**
 * Computes the output file path for a source file.
 * Respects custom permalinks, handles posts specially, converts .md to .html.
 * @param {object} params - Contains srcDir, outDir, relPath, ext, data, isPost, slug
 * @returns {string} The output file path
 */
function computeOutputPath({ srcDir, outDir, relPath, ext, data, isPost, slug }) {
  if (data.permalink) {
    const permalink = data.permalink.replace(/^\//, '');
    if (permalink.endsWith('/')) {
      return path.join(outDir, permalink, 'index.html');
    }
    if (permalink.endsWith('.html')) {
      return path.join(outDir, permalink);
    }
    return path.join(outDir, permalink, 'index.html');
  }

  if (isPost) {
    return path.join(outDir, 'posts', slug, 'index.html');
  }

  const dir = path.dirname(relPath);
  const baseName = path.basename(relPath, ext);
  if (baseName === 'index') {
    return path.join(outDir, dir, 'index.html');
  }
  return path.join(outDir, dir, baseName, 'index.html');
}

/**
 * Computes the public URL for a file based on its output path.
 * @param {string} outDir - The output directory
 * @param {string} outPath - The full output file path
 * @returns {string} The URL path (e.g., "/posts/my-post/")
 */
function computeUrl(outDir, outPath) {
  const rel = path.relative(outDir, outPath).replace(/\\/g, '/');
  if (rel === 'index.html') return '/';
  if (rel.endsWith('/index.html')) return `/${rel.replace(/index\.html$/, '')}`;
  return `/${rel}`;
}

function joinUrl(base, pathname) {
  if (!base) return pathname;
  const cleanBase = base.replace(/\/$/, '');
  const cleanPath = pathname.startsWith('/') ? pathname : `/${pathname}`;
  return `${cleanBase}${cleanPath}`;
}

function escapeXml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function stripHtml(value) {
  return String(value)
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Main build function. Processes all source files and generates the static site.
 * - Reads site config from _data/site.json
 * - Processes .md and .html files with frontmatter
 * - Copies static assets (images, CSS, etc.)
 * - Applies layouts and renders templates
 * - Generates post listings
 * @param {object} options - Contains inDir, outDir, clean
 */
function buildSite({ inDir, outDir, clean }) {
  const srcDir = path.resolve(inDir);
  const targetDir = path.resolve(outDir);

  if (clean) {
    if (targetDir === '/' || targetDir === '.' || targetDir === srcDir) {
      throw new Error('Refusing to clean output directory.');
    }
    fs.rmSync(targetDir, { recursive: true, force: true });
  }

  ensureDir(targetDir);

  const files = walk(srcDir);
  const entries = [];
  const includeCache = new Map();

  const site = {
    title: 'J.A. Lamb',
    description: 'A minimal, readable publishing pipeline.',
    baseUrl: '',
    url: '',
  };
  const siteDataPath = path.join(srcDir, '_data', 'site.json');
  if (fs.existsSync(siteDataPath)) {
    try {
      const siteData = JSON.parse(fs.readFileSync(siteDataPath, 'utf8'));
      Object.assign(site, siteData);
    } catch (err) {
      console.error('Invalid _data/site.json; using defaults.');
    }
  }

  const basePrefix = site.baseUrl ? site.baseUrl.replace(/\/$/, '') : '';
  const siteUrl = site.url || (site.domain ? `https://${site.domain}` : '');
  const siteRoot = siteUrl ? `${siteUrl}${basePrefix}` : basePrefix;
  const ideasPath = path.join(srcDir, '_data', 'ideas.json');
  let ideas = [];
  if (fs.existsSync(ideasPath)) {
    try {
      const ideasData = JSON.parse(fs.readFileSync(ideasPath, 'utf8'));
      if (Array.isArray(ideasData)) ideas = ideasData;
    } catch (err) {
      console.error('Invalid _data/ideas.json; using empty list.');
    }
  }

  for (const file of files) {
    const relPath = path.relative(srcDir, file);
    if (!relPath) continue;

    const ext = path.extname(file).toLowerCase();
    if (isIgnored(relPath)) {
      continue;
    }

    if (ext !== '.md' && ext !== '.html') {
      const outPath = path.join(targetDir, relPath);
      ensureDir(path.dirname(outPath));
      fs.copyFileSync(file, outPath);
      continue;
    }

    const raw = fs.readFileSync(file, 'utf8');
    const parsed = matter(raw);
    const data = parsed.data || {};
    const body = parsed.content || '';
    const summary = data.summary || data.description || '';

    const baseName = path.basename(file, ext);
    const inferredDate = inferDateFromFilename(baseName);

    const dateValue = data.date || inferredDate;
    const dateObj = parseDate(dateValue);
    const dateISO = dateObj ? dateObj.toISOString().slice(0, 10) : '';
    const dateHuman = dateObj ? formatDate(dateObj) : '';

    const slug = data.slug || baseName.replace(/^\d{4}-\d{2}-(?:\d{2}-)?/, '');
    const isPost = relPath.startsWith(`posts${path.sep}`);

    const outPath = computeOutputPath({ srcDir, outDir: targetDir, relPath, ext, data, isPost, slug });
    const urlPath = computeUrl(targetDir, outPath);

    const htmlContent = ext === '.md' ? marked.parse(body) : body;

    entries.push({
      srcPath: file,
      relPath,
      ext,
      data,
      summary,
      htmlContent,
      outPath,
      urlPath,
      slug,
      isPost,
      dateObj,
      dateISO,
      dateHuman,
      title: data.title || slug,
    });
  }

  const posts = entries
    .filter((entry) => entry.isPost)
    .sort((a, b) => {
      if (a.dateObj && b.dateObj) return b.dateObj - a.dateObj;
      if (a.dateObj) return -1;
      if (b.dateObj) return 1;
      return a.slug.localeCompare(b.slug);
    });

  const postsHtml = posts
    .map((post) => {
      const date = post.dateISO ? `<time datetime="${post.dateISO}">${post.dateHuman}</time>` : '';
      const spacer = date ? ' ' : '';
      return `<li><a href="${basePrefix}${post.urlPath}">${post.title}</a>${spacer}${date}</li>`;
    })
    .join('\n');

  const ideasHtml = (ideas.length ? ideas : ['Add ideas in src/_data/ideas.json'])
    .map((idea) => {
      if (typeof idea === 'string') {
        return `<li>${escapeXml(idea)}</li>`;
      }
      const title = idea && idea.title ? escapeXml(idea.title) : '';
      const note = idea && idea.note ? ` <span class="idea-note">${escapeXml(idea.note)}</span>` : '';
      const label = title || escapeXml(String(idea));
      return `<li>${label}${note}</li>`;
    })
    .join('\n');

  for (const entry of entries) {
    const page = {
      ...entry.data,
      title: entry.title,
      url: entry.urlPath,
      slug: entry.slug,
      date: entry.dateISO,
      dateHuman: entry.dateHuman,
      summary: entry.summary,
    };

    const context = {
      site,
      page,
      title: page.title || site.title,
      description: page.summary || page.description || site.description,
      url: page.url,
      date: page.date,
      dateHuman: page.dateHuman,
      posts,
      postsHtml,
      ideas,
      ideasHtml,
      year: new Date().getFullYear(),
    };

    const contentRendered = renderTemplate(entry.htmlContent, context, { srcDir, includeCache });
    const layoutName = entry.data.layout || (entry.ext === '.md' ? 'base' : null);
    const finalHtml = applyLayouts({
      srcDir,
      layoutName,
      content: contentRendered,
      context,
      includeCache,
    });

    ensureDir(path.dirname(entry.outPath));
    fs.writeFileSync(entry.outPath, finalHtml);
  }

  const sitemapItems = entries
    .filter((entry) => !entry.data.draft)
    .map((entry) => {
      const loc = joinUrl(siteRoot, entry.urlPath);
      const lastmod = entry.dateISO
        || new Date(fs.statSync(entry.srcPath).mtime).toISOString().slice(0, 10);
      return `  <url><loc>${escapeXml(loc)}</loc><lastmod>${lastmod}</lastmod></url>`;
    })
    .join('\n');

  const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    `${sitemapItems}\n` +
    `</urlset>\n`;
  fs.writeFileSync(path.join(targetDir, 'sitemap.xml'), sitemapXml);

  const rssItems = posts
    .filter((post) => !post.data.draft)
    .map((post) => {
      const link = joinUrl(siteRoot, post.urlPath);
      const description = escapeXml(post.summary || '');
      const pubDate = post.dateObj ? post.dateObj.toUTCString() : new Date().toUTCString();
      return [
        '  <item>',
        `    <title>${escapeXml(post.title)}</title>`,
        `    <link>${escapeXml(link)}</link>`,
        `    <guid isPermaLink="true">${escapeXml(link)}</guid>`,
        `    <pubDate>${pubDate}</pubDate>`,
        `    <description>${description}</description>`,
        '  </item>',
      ].join('\n');
    })
    .join('\n');

  const rssXml = `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<rss version="2.0">\n` +
    `<channel>\n` +
    `  <title>${escapeXml(site.title)}</title>\n` +
    `  <link>${escapeXml(siteRoot || '/')}</link>\n` +
    `  <description>${escapeXml(site.description)}</description>\n` +
    `${rssItems}\n` +
    `</channel>\n` +
    `</rss>\n`;
  fs.writeFileSync(path.join(targetDir, 'rss.xml'), rssXml);

  const postsJson = posts
    .filter((post) => !post.data.draft)
    .map((post) => ({
      title: post.title,
      date: post.dateISO,
      summary: post.summary,
      url: joinUrl(siteRoot, post.urlPath),
      path: post.urlPath,
      slug: post.slug,
      content_html: post.htmlContent,
      content_text: stripHtml(post.htmlContent),
    }));

  const postsJsonPayload = {
    generatedAt: new Date().toISOString(),
    site: {
      title: site.title,
      description: site.description,
      url: siteRoot,
    },
    posts: postsJson,
  };
  fs.writeFileSync(path.join(targetDir, 'posts.json'), `${JSON.stringify(postsJsonPayload, null, 2)}\n`);

  if (site.domain) {
    const cnamePath = path.join(targetDir, 'CNAME');
    fs.writeFileSync(cnamePath, `${site.domain}\n`);
  }
}

/**
 * Starts a local HTTP server to serve the built site.
 * @param {string} outDir - The directory to serve
 * @param {number} port - The port to listen on
 */
function startServer(outDir, port) {
  const base = path.resolve(outDir);

  const server = http.createServer((req, res) => {
    const parsedUrl = url.parse(req.url);
    const decodePath = decodeURIComponent(parsedUrl.pathname);
    let filePath = path.join(base, decodePath);

    if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
      filePath = path.join(filePath, 'index.html');
    }

    if (!fs.existsSync(filePath)) {
      res.statusCode = 404;
      res.end('Not found');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const typeMap = {
      '.html': 'text/html; charset=utf-8',
      '.css': 'text/css; charset=utf-8',
      '.js': 'text/javascript; charset=utf-8',
      '.svg': 'image/svg+xml',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.json': 'application/json; charset=utf-8',
    };

    res.setHeader('Content-Type', typeMap[ext] || 'application/octet-stream');
    fs.createReadStream(filePath).pipe(res);
  });

  server.listen(port, () => {
    console.log(`Serving ${outDir} at http://localhost:${port}`);
  });
}

/**
 * Watches the source directory for changes and rebuilds automatically.
 * Uses debouncing to avoid rebuilding too frequently.
 * @param {object} options - Build options (inDir, outDir, clean)
 */
function watchAndBuild(options) {
  let timer = null;
  const srcDir = path.resolve(options.inDir);

  fs.watch(srcDir, { recursive: true }, () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      try {
        buildSite(options);
        console.log('Rebuilt.');
      } catch (err) {
        console.error(err.message);
      }
    }, 50);
  });
}

/**
 * Entry point. Parses arguments, builds the site, and optionally
 * starts the dev server and/or file watcher.
 */
function main() {
  const options = parseArgs(process.argv);
  try {
    buildSite(options);
    console.log(`Built ${options.outDir}`);
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }

  if (options.serve) {
    startServer(options.outDir, options.port);
  }

  if (options.watch) {
    watchAndBuild(options);
  }
}

main();
