import { http, getStandardHeaders } from './rest/client.js';

/**
 * 取得所有權限設定
 */
export async function getAllPermissions() {
  return await http.get('/api/permissions');
}

/**
 * 取得特定角色的權限設定
 * @param {string} role - 角色名稱
 */
export async function getRolePermissions(role) {
  return await http.get(`/api/permissions/role/${role}`);
}

/**
 * 取得權限分類列表
 */
export async function getPermissionCategories() {
  return await http.get('/api/permissions/categories');
}

/**
 * 更新單一權限設定
 * @param {number} id - 權限設定 ID
 * @param {Object} data - 更新資料
 * @param {number} [data.can_view] - 可檢視
 * @param {number} [data.can_create] - 可建立
 * @param {number} [data.can_edit] - 可編輯
 * @param {number} [data.can_delete] - 可刪除
 * @param {number} [data.can_manage] - 可管理
 */
export async function updatePermission(id, data) {
  return await http.patch(`/api/permissions/${id}`, data);
}

/**
 * 批次更新權限設定
 * @param {Array} permissions - 權限設定陣列
 */
export async function batchUpdatePermissions(permissions) {
  return await http.post('/api/permissions/batch-update', { permissions });
}

/**
 * 重置角色權限為預設值
 * @param {string} role - 角色名稱
 */
export async function resetRolePermissions(role) {
  return await http.post('/api/permissions/reset-role', { role });
}

/**
 * 檢查特定角色是否有特定權限
 * @param {string} role - 角色名稱
 * @param {string} permissionKey - 權限鍵值
 * @param {string} action - 動作類型 (view/create/edit/delete/manage)
 */
export async function checkPermission(role, permissionKey, action) {
  return await http.get(`/api/permissions/check?role=${role}&permission_key=${permissionKey}&action=${action}`);
}

/**
 * 取得角色的所有權限（批量獲取，減少API請求）
 * @param {string} role - 角色名稱
 * @returns {Promise<{role: string, permissions: Object}>} 角色的所有權限
 */
export async function getAllPermissionsForRole(role) {
  return await http.get(`/api/permissions/for-role?role=${role}`);
}

/**
 * 匯出權限設定為 CSV
 */
export async function exportPermissions() {
  // console.log('[Export] 開始匯出權限設定');

  const token = localStorage.getItem('sh_token');
  if (!token) {
    throw new Error('未登入，請先登入系統');
  }

  const response = await fetch(
    `${import.meta.env.VITE_API_BASE || 'http://localhost:8787'}/api/permissions/export`,
    {
      method: 'GET',
      headers: getStandardHeaders()
    }
  );

  // console.log('[Export] 回應狀態:', response.status);
  // console.log('[Export] 回應類型:', response.headers.get('content-type'));

  if (!response.ok) {
    let errorMessage = '匯出失敗';
    try {
      const error = await response.json();
      errorMessage = error.message || errorMessage;
    } catch (e) {
      errorMessage = `HTTP ${response.status}: ${response.statusText}`;
    }
    console.error('[Export] 錯誤:', errorMessage);
    throw new Error(errorMessage);
  }

  const blob = await response.blob();
  // console.log('[Export] Blob 大小:', blob.size, 'bytes');
  // console.log('[Export] Blob 類型:', blob.type);

  if (blob.size === 0) {
    throw new Error('匯出的檔案是空的，請檢查權限設定');
  }

  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `permissions_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);

  // console.log('[Export] 匯出完成');
}

/**
 * 匯入權限設定從 CSV 檔案
 * @param {File} file - CSV 檔案
 */
export async function importPermissions(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = async (e) => {
      try {
        const csvData = e.target.result;
        const result = await http.post('/api/permissions/import', { csvData });
        resolve(result);
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => {
      reject(new Error('讀取檔案失敗'));
    };

    reader.readAsText(file, 'UTF-8');
  });
}
