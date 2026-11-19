const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = process.env.PORT || 3001;
const LOCAL_API_TARGET = 'http://127.0.0.1:8000';

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.map': 'application/json',
};

function proxyRequest(req, res, targetBase) {
  const targetUrl = new URL(req.url, targetBase);
  const isHttps = targetUrl.protocol === 'https:';
  const client = isHttps ? https : http;

  const headers = { ...req.headers };
  headers.host = targetUrl.host;

  const proxyReq = client.request(
    targetUrl,
    {
      method: req.method,
      headers: headers,
    },
    (proxyRes) => {
      res.writeHead(proxyRes.statusCode, proxyRes.headers);
      proxyRes.pipe(res);
    }
  );

  proxyReq.on('error', (err) => {
    console.error('[Proxy Error]', err.message);
    res.writeHead(502, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: false, message: 'API Gateway Unavailable', error: err.message }));
  });

  req.pipe(proxyReq);
}

function resolveStaticFile(pathname) {
  const cleanPath = pathname.replace(/^\/+/, '');
  const candidatePaths = [
    path.join(__dirname, 'dist', cleanPath),
    path.join(__dirname, cleanPath),
    path.join(__dirname, 'public', cleanPath),
  ];

  for (const p of candidatePaths) {
    if (fs.existsSync(p) && fs.statSync(p).isFile()) {
      return p;
    }
  }

  // Check index.html fallback
  if (!path.extname(cleanPath)) {
    const indexPath = path.join(__dirname, 'dist', 'index.html');
    if (fs.existsSync(indexPath)) return indexPath;
    const rootIndex = path.join(__dirname, 'index.html');
    if (fs.existsSync(rootIndex)) return rootIndex;
  }

  return null;
}

const server = http.createServer((req, res) => {
  // Global CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const parsedUrl = url.parse(req.url);
  const pathname = decodeURIComponent(parsedUrl.pathname || '/');

  // 1. API Reverse Proxy
  if (pathname.startsWith('/api')) {
    proxyRequest(req, res, LOCAL_API_TARGET);
    return;
  }

  // 2. Static File Resolution
  const filePath = resolveStaticFile(pathname === '/' ? 'index.html' : pathname);

  if (filePath) {
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=31536000, immutable',
    });
    fs.createReadStream(filePath).pipe(res);
  } else {
    // 3. SPA Fallback
    const fallbackHtml = path.join(__dirname, 'dist', 'index.html');
    const indexToServe = fs.existsSync(fallbackHtml) ? fallbackHtml : path.join(__dirname, 'index.html');

    if (fs.existsSync(indexToServe)) {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      fs.createReadStream(indexToServe).pipe(res);
    } else {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 Not Found');
    }
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`\n======================================================`);
  console.log(`🚑 Life Route Emergency Admin Hospital Command Center`);
  console.log(`======================================================`);
  console.log(`✅ Web Portal: http://localhost:${PORT}`);
  console.log(`🔗 API Proxy:  ${LOCAL_API_TARGET}`);
  console.log(`📦 Status:     Zero node_modules required!`);
  console.log(`======================================================\n`);
});
