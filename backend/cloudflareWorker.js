/**
 * Cloudflare Worker: CORS Proxy
 *
 * Usage:
 *   https://your-worker.workers.dev/?url=https://example.com/api/data
 *
 * Optional: restrict to specific origins via ALLOWED_ORIGINS below.
 */

// Set to ["*"] to allow all origins, or list specific ones:
// e.g. ["https://myapp.com", "https://staging.myapp.com"]
const ALLOWED_ORIGINS = ["*"];

// Optional: restrict which target hosts can be proxied
// Set to [] to allow all targets
const ALLOWED_TARGET_HOSTS = [];

// Max response size to proxy (10 MB)
const MAX_RESPONSE_BYTES = 10 * 1024 * 1024;

export default {
  async fetch(req) {
    const origin = req.headers.get("Origin") ?? "*";

    // Handle CORS preflight
    if (req.method === "OPTIONS") {
      return corsResponse(null, 204, origin);
    }

    const { searchParams } = new URL(req.url);
    const targetUrl = searchParams.get("url");

    if (!targetUrl) {
      return corsResponse("Missing ?url= query parameter", 400, origin);
    }

    // Validate target URL
    let parsed;
    try {
      parsed = new URL(targetUrl);
    } catch {
      return corsResponse("Invalid URL", 400, origin);
    }

    if (!["http:", "https:"].includes(parsed.protocol)) {
      return corsResponse("Only http/https URLs are allowed", 400, origin);
    }

    // Optional host allowlist
    if (
      ALLOWED_TARGET_HOSTS.length > 0 &&
      !ALLOWED_TARGET_HOSTS.includes(parsed.hostname)
    ) {
      return corsResponse(`Host "${parsed.hostname}" is not allowed`, 403, origin);
    }

    // Check origin allowlist
    if (!ALLOWED_ORIGINS.includes("*") && !ALLOWED_ORIGINS.includes(origin)) {
      return corsResponse("Origin not allowed", 403, origin);
    }

    // Forward the request, stripping hop-by-hop headers
    const proxyReq = new Request(targetUrl, {
      method: req.method,
      headers: stripHopByHop(req.headers),
      body: ["GET", "HEAD"].includes(req.method) ? undefined : req.body,
      redirect: "follow",
    });

    let res;
    try {
      res = await fetch(proxyReq);
    } catch (err) {
      return corsResponse(`Failed to fetch target: ${err.message}`, 502, origin);
    }

    // Guard against huge responses
    const contentLength = Number(res.headers.get("content-length") ?? 0);
    if (contentLength > MAX_RESPONSE_BYTES) {
      return corsResponse("Response too large", 413, origin);
    }

    // Build response headers, inject CORS headers
    const resHeaders = new Headers(stripHopByHop(res.headers));
    setCorsHeaders(resHeaders, origin);
    resHeaders.set("X-Proxied-By", "cf-cors-proxy");

    return new Response(res.body, {
      status: res.status,
      statusText: res.statusText,
      headers: resHeaders,
    });
  },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function setCorsHeaders(headers, origin) {
  headers.set("Access-Control-Allow-Origin", ALLOWED_ORIGINS.includes("*") ? "*" : origin);
  headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
  headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With");
  headers.set("Access-Control-Max-Age", "86400");
}

function corsResponse(body, status, origin) {
  const headers = new Headers({ "Content-Type": "text/plain" });
  setCorsHeaders(headers, origin);
  return new Response(body, { status, headers });
}

const HOP_BY_HOP = new Set([
  "connection", "keep-alive", "proxy-authenticate", "proxy-authorization",
  "te", "trailers", "transfer-encoding", "upgrade",
  // Avoid forwarding the original host
  "host",
]);

function stripHopByHop(headers) {
  const out = new Headers();
  for (const [k, v] of headers) {
    if (!HOP_BY_HOP.has(k.toLowerCase())) out.set(k, v);
  }
  return out;
}
