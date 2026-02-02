/**
 * Simple static server + Bilibili proxy to bypass browser CORS.
 * Run: node server.js
 * Then open: http://localhost:5500/
 */
const http = require("http");
const https = require("https");
const fs = require("fs");
const path = require("path");
const { URL } = require("url");

const PORT = process.env.PORT ? Number(process.env.PORT) : 5500;
const ROOT = __dirname;

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".kt": "text/plain; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

function send(res, code, body, headers = {}) {
  res.writeHead(code, {
    "Cache-Control": "no-store",
    ...headers,
  });
  res.end(body);
}

function proxyJson(res, targetUrl) {
  const u = new URL(targetUrl);
  const req = https.request(
    {
      method: "GET",
      hostname: u.hostname,
      path: u.pathname + u.search,
      headers: {
        // Some endpoints behave better with a browser-like UA
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36",
        "Accept": "application/json,text/plain,*/*",
        "Referer": "https://www.bilibili.com/",
      },
    },
    (r) => {
      let data = "";
      r.setEncoding("utf8");
      r.on("data", (chunk) => (data += chunk));
      r.on("end", () => {
        // Forward status and body
        send(res, 200, data, { "Content-Type": "application/json; charset=utf-8" });
      });
    }
  );
  req.on("error", (e) => {
    send(res, 502, JSON.stringify({ ok: false, message: String(e) }), {
      "Content-Type": "application/json; charset=utf-8",
    });
  });
  req.end();
}

function safePath(p) {
  const decoded = decodeURIComponent(p.split("?")[0]);
  const joined = path.join(ROOT, decoded);
  const normalized = path.normalize(joined);
  if (!normalized.startsWith(ROOT)) return null;
  return normalized;
}

const server = http.createServer((req, res) => {
  try {
    const urlObj = new URL(req.url, `http://${req.headers.host}`);
    const pathname = urlObj.pathname;

    // API proxy
    if (pathname === "/api/bili/stat") {
      const vmid = urlObj.searchParams.get("vmid") || "291397844";
      const target = `https://api.bilibili.com/x/relation/stat?vmid=${encodeURIComponent(vmid)}`;
      return proxyJson(res, target);
    }
    if (pathname === "/api/bili/acc") {
      const mid = urlObj.searchParams.get("mid") || "291397844";
      const target = `https://api.bilibili.com/x/space/acc/info?mid=${encodeURIComponent(mid)}`;
      return proxyJson(res, target);
    }

    // Static files
    let filePath = pathname === "/" ? path.join(ROOT, "index.html") : safePath(pathname);
    if (!filePath) return send(res, 400, "Bad path");

    // If directory, try index.html
    if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
      filePath = path.join(filePath, "index.html");
    }
    if (!fs.existsSync(filePath)) return send(res, 404, "Not Found");

    const ext = path.extname(filePath).toLowerCase();
    const mime = MIME[ext] || "application/octet-stream";
    const buf = fs.readFileSync(filePath);

    send(res, 200, buf, { "Content-Type": mime });
  } catch (e) {
    send(res, 500, "Server error: " + String(e));
  }
});

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}/`);
});
