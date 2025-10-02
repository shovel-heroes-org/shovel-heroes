// Lightweight REST client to replace @base44/sdk usage.
// Uses fetch; can be swapped for axios easily.

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8787";

async function request(
  path,
  { method = "GET", headers: extraHeaders = {}, body } = {}
) {
  const options = {
    method,
    headers: {
      "Content-Type": "application/json",
      // Add Authorization only if explicitly provided via env
      // Never default to a token to avoid accidental leakage
      ...(() => {
        const token = import.meta.env.VITE_AUTH_TOKEN;
        if (!token) return {};
        return {
          Authorization: token.startsWith("Bearer ")
            ? token
            : `Bearer ${token}`,
        };
      })(),
      ...extraHeaders,
    },
  };
  if (body !== undefined)
    options.body = typeof body === "string" ? body : JSON.stringify(body);
  const res = await fetch(`${API_BASE}${path}`, options);
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`API ${method} ${path} failed ${res.status}: ${text}`);
  }
  const contentType = res.headers.get("content-type") || "";
  if (contentType.includes("application/json")) return res.json();
  return res.text();
}

export const http = {
  get: (p) => request(p),
  post: (p, b) => request(p, { method: "POST", body: b }),
  put: (p, b) => request(p, { method: "PUT", body: b }),
  patch: (p, b) => request(p, { method: "PATCH", body: b }),
  delete: (p) => request(p, { method: "DELETE" }),
};
