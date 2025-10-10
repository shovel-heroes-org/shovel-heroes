// Lightweight REST client to replace @base44/sdk usage.
// Uses fetch; can be swapped for axios easily.

export const API_BASE = import.meta.env.VITE_API_BASE || 'https://your.api.server';

/**
 * 生成標準的請求 headers（包含 Authorization 和 X-Acting-Role）
 * @param {Object} additionalHeaders - 額外的 headers
 * @returns {Object} 完整的 headers 物件
 */
export function getStandardHeaders(additionalHeaders = {}) {
  let authToken = typeof localStorage !== 'undefined' ? localStorage.getItem('sh_token') : null;
  // 清理無效的 token 值
  if (authToken === 'null' || authToken === 'undefined' || !authToken) {
    authToken = null;
  }

  let actingRole = typeof localStorage !== 'undefined' ? localStorage.getItem('sh-acting-role') : null;
  // 清理無效的 actingRole 值
  if (actingRole === 'null' || actingRole === 'undefined' || !actingRole) {
    actingRole = null;
  }

  const headers = {
    'Content-Type': 'application/json',
    ...additionalHeaders
  };

  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  // 傳送 acting role header 給所有角色（包括 guest, user, grid_manager, admin, super_admin）
  if (actingRole) {
    headers['X-Acting-Role'] = actingRole;
  }

  return headers;
}
async function request(path, { method = 'GET', headers = {}, body } = {}) {
  let authToken = typeof localStorage !== 'undefined' ? localStorage.getItem('sh_token') : null;
  // 清理無效的 token 值
  if (authToken === 'null' || authToken === 'undefined' || !authToken) {
    authToken = null;
  }

  let actingRole = typeof localStorage !== 'undefined' ? localStorage.getItem('sh-acting-role') : null;
  // 清理無效的 actingRole 值
  if (actingRole === 'null' || actingRole === 'undefined' || !actingRole) {
    actingRole = null;
  }

  const extraHeaders = {};
  // 傳送 acting role header 給所有角色（包括 guest, user, grid_manager, admin, super_admin）
  if (actingRole) {
    extraHeaders['X-Acting-Role'] = actingRole;
  }
  const options = { method, headers: { 'Content-Type': 'application/json', ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}), ...extraHeaders, ...headers } };
  if (body !== undefined) options.body = typeof body === 'string' ? body : JSON.stringify(body);
    const res = await fetch(`${API_BASE}${path}`, options);
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    const error = new Error(`API ${method} ${path} failed ${res.status}: ${text}`);
    error.status = res.status;
    throw error;
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
