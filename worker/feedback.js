/**
 * Obras del País — feedback worker
 *
 * Receives POST /feedback {message, email?, page?, lang?, hp}
 * Appends a sanitized row to data/feedback.csv in the GitHub repo
 * defined by GITHUB_REPO (env var) using a fine-grained PAT
 * stored as the GITHUB_TOKEN secret.
 *
 * Deploy:
 *   cd worker
 *   npx wrangler login
 *   npx wrangler secret put GITHUB_TOKEN     # paste your fine-grained PAT
 *   npx wrangler deploy
 *
 * Test:
 *   curl -X POST https://feedback.obrasdelpais.workers.dev/feedback \
 *        -H "Content-Type: application/json" \
 *        -d '{"message":"hello from curl","page":"/","lang":"es"}'
 */

const MAX_MESSAGE = 4000;
const MAX_EMAIL = 200;
const MAX_PAGE = 500;
const MAX_LANG = 5;
const MAX_UA = 200;
const RATE_LIMIT_PER_HOUR = 10; // per IP

const CSV_HEADER = "timestamp,page,lang,message,email,user_agent,country\n";

const corsHeaders = (origin) => ({
  "Access-Control-Allow-Origin": origin || "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Max-Age": "86400",
  "Vary": "Origin",
});

const json = (data, status, origin) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", ...corsHeaders(origin) },
  });

function csvEscape(s) {
  const v = String(s ?? "");
  if (v.includes(",") || v.includes('"') || v.includes("\n") || v.includes("\r")) {
    return `"${v.replace(/"/g, '""')}"`;
  }
  return v;
}

function utf8ToBase64(str) {
  // btoa doesn't handle multi-byte UTF-8; use TextEncoder.
  const bytes = new TextEncoder().encode(str);
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

function base64ToUtf8(b64) {
  const bin = atob(b64.replace(/\s+/g, ""));
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

async function ghFetchFile(env) {
  const r = await fetch(
    `https://api.github.com/repos/${env.GITHUB_REPO}/contents/${env.CSV_PATH}`,
    {
      headers: {
        Authorization: `token ${env.GITHUB_TOKEN}`,
        "User-Agent": "odp-feedback-worker",
        Accept: "application/vnd.github.v3+json",
      },
    }
  );
  if (r.status === 404) return { sha: null, content: CSV_HEADER };
  if (!r.ok) throw new Error(`gh GET ${r.status}: ${await r.text()}`);
  const data = await r.json();
  return { sha: data.sha, content: base64ToUtf8(data.content) };
}

async function ghCommitFile(env, sha, content, commitMessage) {
  const body = {
    message: commitMessage,
    content: utf8ToBase64(content),
    branch: env.BRANCH || "main",
  };
  if (sha) body.sha = sha;
  return fetch(`https://api.github.com/repos/${env.GITHUB_REPO}/contents/${env.CSV_PATH}`, {
    method: "PUT",
    headers: {
      Authorization: `token ${env.GITHUB_TOKEN}`,
      "User-Agent": "odp-feedback-worker",
      Accept: "application/vnd.github.v3+json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

async function rateLimitOK(env, ip) {
  if (!env.RATE_KV) return true; // optional; skip if no KV bound
  const key = `rl:${ip}`;
  const now = Math.floor(Date.now() / 1000);
  const windowStart = now - 3600;
  const raw = await env.RATE_KV.get(key);
  let stamps = raw ? JSON.parse(raw) : [];
  stamps = stamps.filter((t) => t > windowStart);
  if (stamps.length >= RATE_LIMIT_PER_HOUR) return false;
  stamps.push(now);
  await env.RATE_KV.put(key, JSON.stringify(stamps), { expirationTtl: 7200 });
  return true;
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "*";

    // Allow only the configured origins (defense in depth — CORS is the gate)
    if (env.ALLOWED_ORIGINS) {
      const allow = env.ALLOWED_ORIGINS.split(",").map((s) => s.trim());
      if (origin !== "*" && !allow.includes(origin)) {
        return json({ error: "origin not allowed" }, 403, "*");
      }
    }

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }
    if (request.method === "GET") {
      return json({ ok: true, service: "obras-del-pais-feedback" }, 200, origin);
    }
    if (request.method !== "POST") {
      return json({ error: "method not allowed" }, 405, origin);
    }

    const url = new URL(request.url);
    if (url.pathname !== "/feedback" && url.pathname !== "/") {
      return json({ error: "not found" }, 404, origin);
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: "invalid json" }, 400, origin);
    }

    // Honeypot — silently accept (so bots think they succeeded)
    if (body.hp) return json({ ok: true }, 200, origin);

    const message = String(body.message || "").trim().slice(0, MAX_MESSAGE);
    if (message.length < 2) return json({ error: "message required" }, 400, origin);

    const ip = request.headers.get("CF-Connecting-IP") || "";
    if (!(await rateLimitOK(env, ip))) {
      return json({ error: "rate limit exceeded — try again in an hour" }, 429, origin);
    }

    const ts = new Date().toISOString();
    const page = String(body.page || "").slice(0, MAX_PAGE);
    const lang = String(body.lang || "").slice(0, MAX_LANG);
    const email = String(body.email || "").trim().slice(0, MAX_EMAIL);
    const ua = (request.headers.get("User-Agent") || "").slice(0, MAX_UA);
    const country = request.cf && request.cf.country ? request.cf.country : "";

    const row = [ts, page, lang, message, email, ua, country].map(csvEscape).join(",") + "\n";

    // Append with conflict retry (in case two writes race)
    let lastError = null;
    for (let attempt = 0; attempt < 4; attempt++) {
      try {
        const { sha, content } = await ghFetchFile(env);
        const next = (content.endsWith("\n") ? content : content + "\n") + row;
        const safeMessage = (message.split("\n")[0] || "feedback").slice(0, 60).replace(/[`<>]/g, "");
        const res = await ghCommitFile(env, sha, next, `feedback: ${safeMessage}`);
        if (res.ok) return json({ ok: true }, 200, origin);
        if (res.status === 409 || res.status === 422) {
          // sha mismatch — refetch and retry
          await new Promise((r) => setTimeout(r, 200 * (attempt + 1)));
          continue;
        }
        lastError = `gh PUT ${res.status}: ${await res.text()}`;
        break;
      } catch (e) {
        lastError = e && e.message ? e.message : String(e);
        await new Promise((r) => setTimeout(r, 200 * (attempt + 1)));
      }
    }
    console.error("feedback persist failed:", lastError);
    return json({ error: "persist failed", detail: lastError }, 502, origin);
  },
};
