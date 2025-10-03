// Lightweight REST client to replace @base44/sdk usage.
// Uses fetch; can be swapped for axios easily.

export const API_BASE = import.meta.env.VITE_API_BASE || 'https://your.api.server';

async function request(path, { method = 'GET', headers = {}, body } = {}) {
  const authToken = typeof localStorage !== 'undefined' ? localStorage.getItem('sh_token') : null;
  const actingRole = typeof localStorage !== 'undefined' ? localStorage.getItem('sh-acting-role') : null;
  const extraHeaders = {};
  // Only send acting role header when intentionally limiting to user perspective.
  if (actingRole === 'user') {
    extraHeaders['X-Acting-Role'] = 'user';
  }
  const options = { method, headers: { 'Content-Type': 'application/json', ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}), ...extraHeaders, ...headers } };
  if (body !== undefined) options.body = typeof body === 'string' ? body : JSON.stringify(body);
  const res = await fetch(`${API_BASE}${path}`, options);
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`API ${method} ${path} failed ${res.status}: ${text}`);
  }
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) return res.json();
  return res.text();
}

export const http = {
  get: (p) => request(p),
  post: (p, b) => request(p, { method: 'POST', body: b }),
  put: (p, b) => request(p, { method: 'PUT', body: b }),
  patch: (p, b) => request(p, { method: 'PATCH', body: b }),
  delete: (p) => request(p, { method: 'DELETE' })
};
