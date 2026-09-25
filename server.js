// SageSyncs static server. No dependencies: Railway runs `npm start`.
"use strict";

const http = require("http");
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "public");
const PORT = Number(process.env.PORT) || 3000;
const HOST = "0.0.0.0";

// Bump with each release; shown in the footer and at /health.
const VERSION = "v10";

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".ico": "image/x-icon",
  ".json": "application/json; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".woff2": "font/woff2",
};

function resolve(urlPath) {
  let clean;
  try {
    clean = decodeURIComponent(urlPath.split("?")[0]);
  } catch {
    return null;
  }
  if (clean.endsWith("/")) clean += "index.html";
  const full = path.normalize(path.join(ROOT, clean));
  if (!full.startsWith(ROOT)) return null;
  if (fs.existsSync(full) && fs.statSync(full).isFile()) return full;
  // Clean URLs: /services serves services.html
  if (!path.extname(full) && fs.existsSync(full + ".html")) return full + ".html";
  return null;
}

function send(res, status, file) {
  const ext = path.extname(file).toLowerCase();
  // HTML, CSS and JS are re-checked on every visit so updates show at once.
  // Pages link CSS/JS with a ?v= content hash, so each change is a new URL anyway.
  const cache = [".html", ".css", ".js"].includes(ext) ? "no-cache" : "public, max-age=604800";
  res.writeHead(status, {
    "Content-Type": TYPES[ext] || "application/octet-stream",
    "Cache-Control": cache,
    "X-Content-Type-Options": "nosniff",
  });
  fs.createReadStream(file).pipe(res);
}

http
  .createServer((req, res) => {
    if ((req.url || "").split("?")[0] === "/health") {
      // Shows which release and commit are live.
      res.writeHead(200, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
      return res.end(JSON.stringify({
        status: "ok",
        version: VERSION,
        commit: String(process.env.RAILWAY_GIT_COMMIT_SHA || "").slice(0, 7) || "unknown",
        form: "formsubmit",
      }, null, 2));
    }
    if (req.method !== "GET" && req.method !== "HEAD") {
      res.writeHead(405, { Allow: "GET, HEAD" });
      return res.end();
    }
    const file = resolve(req.url || "/");
    if (file) return send(res, 200, file);
    send(res, 404, path.join(ROOT, "404.html"));
  })
  .listen(PORT, HOST, () => {
    console.log(`SageSyncs running at http://localhost:${PORT}`);
  });
