import ADMIN_HTML from "./admin.html";

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });

const error = (message, status = 400) => json({ error: message }, status);

function config(env) {
  return {
    owner: env.GITHUB_OWNER,
    repo: env.GITHUB_REPO,
    branch: env.GITHUB_BRANCH || "main",
    path: env.CMS_PATH || "cms/content.json",
    token: env.GITHUB_TOKEN,
    allowedEmails: String(env.ALLOWED_EMAILS || "")
      .split(",")
      .map((x) => x.trim().toLowerCase())
      .filter(Boolean),
  };
}

function currentEmail(request) {
  return (
    request.headers.get("Cf-Access-Authenticated-User-Email") ||
    request.headers.get("X-Auth-Email") ||
    ""
  ).toLowerCase();
}

function authorize(request, env) {
  const cfg = config(env);
  const email = currentEmail(request);

  if (!email) {
    return { ok: false, response: error("Cloudflare Access認証が必要です。", 401) };
  }

  if (cfg.allowedEmails.length && !cfg.allowedEmails.includes(email)) {
    return { ok: false, response: error("このアカウントには管理権限がありません。", 403) };
  }

  return { ok: true, email, cfg };
}

async function github(env, path, options = {}) {
  const cfg = config(env);
  if (!cfg.token) throw new Error("GITHUB_TOKENが設定されていません。");

  const response = await fetch(`https://api.github.com${path}`, {
    ...options,
    headers: {
      authorization: `Bearer ${cfg.token}`,
      accept: "application/vnd.github+json",
      "x-github-api-version": "2022-11-28",
      "user-agent": "Vi-Lain-CMS",
      ...(options.headers || {}),
    },
  });

  const body = await response.text();
  let data = null;
  try {
    data = body ? JSON.parse(body) : null;
  } catch {
    data = body;
  }

  if (!response.ok) {
    throw new Error(data?.message || `GitHub API error: ${response.status}`);
  }

  return data;
}

async function readCms(env) {
  const cfg = config(env);
  const data = await github(
    env,
    `/repos/${cfg.owner}/${cfg.repo}/contents/${cfg.path}?ref=${encodeURIComponent(cfg.branch)}`
  );

  const content = decodeURIComponent(
    Array.prototype.map
      .call(atob(data.content.replace(/\n/g, "")), (c) =>
        "%" + c.charCodeAt(0).toString(16).padStart(2, "0")
      )
      .join("")
  );

  return {
    sha: data.sha,
    data: JSON.parse(content),
  };
}

async function writeCms(env, cms, sha, message) {
  const cfg = config(env);
  const utf8 = unescape(encodeURIComponent(JSON.stringify(cms, null, 2) + "\n"));
  const content = btoa(utf8);

  await github(
    env,
    `/repos/${cfg.owner}/${cfg.repo}/contents/${cfg.path}`,
    {
      method: "PUT",
      body: JSON.stringify({
        message,
        content,
        sha,
        branch: cfg.branch,
      }),
    }
  );
}

function itemId(prefix) {
  return `${prefix}-${Date.now()}-${crypto.randomUUID().slice(0, 6)}`;
}

function youtubeId(url) {
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes("youtu.be")) return parsed.pathname.split("/")[1];
    if (parsed.pathname === "/watch") return parsed.searchParams.get("v");
    const parts = parsed.pathname.split("/").filter(Boolean);
    if (["shorts", "live", "embed"].includes(parts[0])) return parts[1];
  } catch {}
  return "";
}

function normalizeItem(type, input, existing = {}) {
  const item = { ...existing, ...input };

  if (!item.id) item.id = itemId(type.replace(/s$/, ""));
  if (item.published === undefined) item.published = true;

  if (type === "music") {
    const id = youtubeId(item.url || "");
    if (!id) throw new Error("正しいYouTube URLを入力してください。");
    item.youtubeId = id;
    item.url = `https://www.youtube.com/watch?v=${id}`;
  }

  return item;
}

async function rebuildContent(env) {
  const cfg = config(env);
  try {
    await github(
      env,
      `/repos/${cfg.owner}/${cfg.repo}/actions/workflows/cms-scheduled-publish.yml/dispatches`,
      {
        method: "POST",
        body: JSON.stringify({ ref: cfg.branch }),
      }
    );
  } catch {
    // The content commit still succeeds even if dispatch is unavailable.
  }
}

async function handleApi(request, env, url) {
  const auth = authorize(request, env);
  if (!auth.ok) return auth.response;

  if (url.pathname === "/api/me") {
    return json({ email: auth.email });
  }

  if (url.pathname === "/api/content" && request.method === "GET") {
    const cms = await readCms(env);
    return json(cms.data);
  }

  const match = url.pathname.match(/^\/api\/items\/(news|music|goods|events)(?:\/([^/]+))?$/);
  if (!match) return error("Not found", 404);

  const type = match[1];
  const id = match[2] ? decodeURIComponent(match[2]) : "";
  const { sha, data } = await readCms(env);
  data[type] ||= [];

  if (request.method === "POST" && !id) {
    const input = await request.json();
    const item = normalizeItem(type, input);
    data[type].unshift(item);
    await writeCms(env, data, sha, `CMS: add ${type} ${item.id}`);
    await rebuildContent(env);
    return json(item, 201);
  }

  const index = data[type].findIndex((item) => item.id === id);
  if (index === -1) return error("対象が見つかりません。", 404);

  if (request.method === "PATCH") {
    const input = await request.json();
    data[type][index] = normalizeItem(type, input, data[type][index]);
    await writeCms(env, data, sha, `CMS: update ${type} ${id}`);
    await rebuildContent(env);
    return json(data[type][index]);
  }

  if (request.method === "DELETE") {
    const [removed] = data[type].splice(index, 1);
    await writeCms(env, data, sha, `CMS: delete ${type} ${id}`);
    await rebuildContent(env);
    return json(removed);
  }

  return error("Method not allowed", 405);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    try {
      if (url.pathname.startsWith("/api/")) {
        return await handleApi(request, env, url);
      }

      const auth = authorize(request, env);
      if (!auth.ok) return auth.response;

      return new Response(ADMIN_HTML, {
        headers: {
          "content-type": "text/html; charset=utf-8",
          "cache-control": "no-store",
          "content-security-policy":
            "default-src 'self'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; connect-src 'self'; img-src 'self' data: https:;",
        },
      });
    } catch (err) {
      return error(err instanceof Error ? err.message : "Unexpected error", 500);
    }
  },
};
