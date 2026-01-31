#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const http = require('http');
const url = require('url');
const matter = require('gray-matter');
const { marked } = require('marked');

const DEFAULT_IN = 'src';
const DEFAULT_OUT = 'html';
const DEFAULT_PORT = 8080;
const INCLUDE_DIR = '_includes';
const LAYOUT_DIR = '_layouts';

marked.setOptions({ mangle: false, headerIds: false });

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

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function isIgnored(relPath) {
  const parts = relPath.split(path.sep);
  return parts.some((part) => part.startsWith('_'));
}

function getValue(obj, key) {
  const parts = key.split('.');
  let current = obj;
  for (const part of parts) {
    if (current == null) return '';
    current = current[part];
  }
  return current == null ? '' : current;
}

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

function resolveLayout(srcDir, layoutName) {
  if (!layoutName || layoutName === 'none') return null;
  if (layoutName.endsWith('.html')) return path.join(srcDir, layoutName);
  return path.join(srcDir, LAYOUT_DIR, `${layoutName}.html`);
}

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

function parseDate(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

function formatDate(date) {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  }).format(date);
}

function inferDateFromFilename(baseName) {
  const match = baseName.match(/^(\d{4}-\d{2}(?:-\d{2})?)-/);
  return match ? match[1] : null;
}

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

function computeUrl(outDir, outPath) {
  const rel = path.relative(outDir, outPath).replace(/\\/g, '/');
  if (rel === 'index.html') return '/';
  if (rel.endsWith('/index.html')) return `/${rel.replace(/index\.html$/, '')}`;
  return `/${rel}`;
}

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
      return `<li><a href="${post.urlPath}">${post.title}</a>${spacer}${date}</li>`;
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
    };

    const context = {
      site,
      page,
      title: page.title || site.title,
      description: page.description || site.description,
      url: page.url,
      date: page.date,
      dateHuman: page.dateHuman,
      posts,
      postsHtml,
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
}

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
