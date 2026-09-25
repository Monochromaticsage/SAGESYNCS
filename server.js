// SageSyncs static server. No dependencies: Railway runs `npm start`.
"use strict";

const http = require("http");
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "public");
const PORT = Number(process.env.PORT) || 3000;
const HOST = "0.0.0.0";

// Contact form: messages are forwarded to Web3Forms, which emails them on.
// Set WEB3FORMS_KEY in Railway (Service → Variables). Never commit the key.
const WEB3FORMS_KEY = process.env.WEB3FORMS_KEY || "";
const MAX_BODY = 10 * 1024;
const recent = new Map();

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

function json(res, status, data) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
  res.end(JSON.stringify(data));
}

function tooMany(ip) {
  const now = Date.now();
  const hits = (recent.get(ip) || []).filter((t) => now - t < 10 * 60 * 1000);
  hits.push(now);
  recent.set(ip, hits);
  return hits.length > 5;
}

function clean(v, max) {
  return String(v == null ? "" : v).trim().slice(0, max);
}

function handleContact(req, res) {
  const ip = String(req.headers["x-forwarded-for"] || req.socket.remoteAddress || "").split(",")[0].trim();
  let raw = "";
  let tooBig = false;
  req.on("data", (chunk) => {
    if (tooBig) return;
    raw += chunk;
    if (raw.length > MAX_BODY) tooBig = true;
  });
  req.on("end", async () => {
    if (tooBig) return json(res, 413, { ok: false, error: "too_large" });
    let body;
    try {
      body = JSON.parse(raw || "{}");
    } catch {
      return json(res, 400, { ok: false, error: "bad_request" });
    }
    // Hidden field only bots fill in: pretend success, send nothing.
    if (clean(body.company, 200)) return json(res, 200, { ok: true });

    const name = clean(body.name, 120);
    const email = clean(body.email, 200);
    const type = clean(body.type, 60);
    const week = clean(body.week, 4000);
    if (!name || !week || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return json(res, 400, { ok: false, error: "invalid" });
    }
    if (tooMany(ip)) return json(res, 429, { ok: false, error: "rate_limited" });
    if (!WEB3FORMS_KEY) return json(res, 503, { ok: false, error: "not_configured" });

    try {
      const r = await fetch("https://api.web3forms.com/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          access_key: WEB3FORMS_KEY,
          subject: `New SageSyncs enquiry from ${name} (${type})`,
          from_name: "SageSyncs website",
          name,
          email,
          replyto: email,
          business_type: type,
          message: week,
        }),
      });
      const data = await r.json().catch(() => ({}));
      if (r.ok && data.success) return json(res, 200, { ok: true });
      console.error("Web3Forms error", r.status, data && data.message);
      return json(res, 502, { ok: false, error: "send_failed" });
    } catch (err) {
      console.error("Web3Forms unreachable", err && err.message);
      return json(res, 502, { ok: false, error: "send_failed" });
    }
  });
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
    if (req.method === "POST" && (req.url || "").split("?")[0] === "/api/contact") {
      return handleContact(req, res);
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
