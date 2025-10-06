import { http, getStandardHeaders } from './rest/client.js';

/**
 * 管理員 API 功能
 */

// CSV 匯出輔助函數：處理錯誤並提供詳細訊息
async function handleCSVExportError(response, resourceName) {
  let errorMessage = `匯出${resourceName} CSV 失敗`;

  try {
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      const errorData = await response.json();
      errorMessage = errorData.message || errorData.error || errorMessage;
    } else {
      const errorText = await response.text();
      if (errorText) {
        errorMessage = errorText;
      }
    }
  } catch (e) {
    // 無法解析錯誤訊息，使用預設訊息
  }

  if (response.status === 401) {
    errorMessage = '未登入或登入已過期，請重新登入';
  } else if (response.status === 403) {
    errorMessage = `無權限匯出${resourceName}資料`;
  }

  throw new Error(errorMessage);
}

// 取得所有使用者（管理員權限）
export async function getAdminUsers() {
  return http.get('/admin/users');
}

// 更新使用者角色（管理員權限）
export async function updateUserRole(userId, role) {
  return http.patch(`/admin/users/${userId}/role`, { role });
}

// 軟刪除網格（移至垃圾桶）
export async function moveGridToTrash(gridId) {
  return http.patch(`/admin/grids/${gridId}/trash`, {});
}

// 從垃圾桶還原網格
export async function restoreGridFromTrash(gridId) {
  return http.patch(`/admin/grids/${gridId}/restore`, {});
}

// 永久刪除網格
export async function permanentlyDeleteGrid(gridId) {
  return http.delete(`/admin/grids/${gridId}`);
}

// 取得垃圾桶中的網格
export async function getTrashGrids() {
  return http.get('/admin/trash/grids');
}

// 批量移動網格至垃圾桶
export async function batchMoveGridsToTrash(gridIds) {
  return http.post('/admin/grids/batch-trash', { gridIds });
}

// 批量永久刪除網格
export async function batchDeleteGrids(gridIds) {
  return http.post('/admin/grids/batch-delete', { gridIds });
}

// 下載 CSV 範本
export async function downloadGridsTemplate() {
  const response = await fetch(
    `${import.meta.env.VITE_API_BASE || 'http://localhost:8787'}/csv/template/grids`,
    {
      method: 'GET',
      headers: getStandardHeaders()
    }
  );

  if (!response.ok) {
    throw new Error('Failed to download template');
  }

  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'grids_template.csv';
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}

// 匯出網格 CSV
export async function exportGridsToCSV() {
  const response = await fetch(
    `${import.meta.env.VITE_API_BASE || 'http://localhost:8787'}/csv/export/grids`,
    {
      method: 'GET',
      headers: getStandardHeaders()
    }
  );

  if (!response.ok) {
    await handleCSVExportError(response, '網格');
  }

  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `grids_export_${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}

// CSV 匯入功能
export async function importGridsFromCSV(csvData, skipDuplicates = true) {
  return http.post('/csv/import/grids', { csv: csvData, skipDuplicates });
}

// 匯出志工 CSV
export async function exportVolunteersToCSV() {
  const response = await fetch(
    `${import.meta.env.VITE_API_BASE || 'http://localhost:8787'}/csv/export/volunteers`,
    {
      method: 'GET',
      headers: getStandardHeaders()
    }
  );

  if (!response.ok) {
    await handleCSVExportError(response, '志工');
  }

  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `volunteers_export_${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}

// CSV 匯入志工功能
export async function importVolunteersFromCSV(csvData, skipDuplicates = true) {
  return http.post('/csv/import/volunteers', { csv: csvData, skipDuplicates });
}

// 匯出物資 CSV
export async function exportSuppliesToCSV() {
  const response = await fetch(
    `${import.meta.env.VITE_API_BASE || 'http://localhost:8787'}/csv/export/supplies`,
    {
      method: 'GET',
      headers: getStandardHeaders()
    }
  );

  if (!response.ok) {
    await handleCSVExportError(response, '物資');
  }

  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `supplies_export_${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}

// CSV 匯入物資功能
export async function importSuppliesFromCSV(csvData, skipDuplicates = true) {
  return http.post('/csv/import/supplies', { csv: csvData, skipDuplicates });
}

// 匯出用戶 CSV
export async function exportUsersToCSV() {
  const response = await fetch(
    `${import.meta.env.VITE_API_BASE || 'http://localhost:8787'}/csv/export/users`,
    {
      method: 'GET',
      headers: getStandardHeaders()
    }
  );

  if (!response.ok) {
    await handleCSVExportError(response, '用戶');
  }

  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `users_export_${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}

// CSV 匯入用戶功能
export async function importUsersFromCSV(csvData, skipDuplicates = true) {
  return http.post('/csv/import/users', { csv: csvData, skipDuplicates });
}

// 匯出黑名單 CSV
export async function exportBlacklistToCSV() {
  const response = await fetch(
    `${import.meta.env.VITE_API_BASE || 'http://localhost:8787'}/csv/export/blacklist`,
    {
      method: 'GET',
      headers: getStandardHeaders()
    }
  );

  if (!response.ok) {
    await handleCSVExportError(response, '黑名單');
  }

  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `blacklist_export_${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}

// CSV 匯入黑名單功能
export async function importBlacklistFromCSV(csvData) {
  return http.post('/csv/import/blacklist', { csv: csvData });
}

// ==================== 災區管理 API ====================

// 軟刪除災區（移至垃圾桶）
export async function moveAreaToTrash(areaId) {
  return http.patch(`/admin/areas/${areaId}/trash`, {});
}

// 從垃圾桶還原災區
export async function restoreAreaFromTrash(areaId) {
  return http.patch(`/admin/areas/${areaId}/restore`, {});
}

// 永久刪除災區
export async function permanentlyDeleteArea(areaId) {
  return http.delete(`/admin/areas/${areaId}`);
}

// 取得垃圾桶中的災區
export async function getTrashAreas() {
  return http.get('/admin/trash/areas');
}

// 批量移動災區至垃圾桶
export async function batchMoveAreasToTrash(areaIds) {
  return http.post('/admin/areas/batch-trash', { areaIds });
}

// 批量永久刪除災區
export async function batchDeleteAreas(areaIds) {
  return http.post('/admin/areas/batch-delete', { areaIds });
}

// 匯出災區 CSV
export async function exportAreasToCSV() {
  const response = await fetch(
    `${import.meta.env.VITE_API_BASE || 'http://localhost:8787'}/csv/export/areas`,
    {
      method: 'GET',
      headers: getStandardHeaders()
    }
  );

  if (!response.ok) {
    await handleCSVExportError(response, '災區');
  }

  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `disaster_areas_export_${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}

// 下載災區 CSV 範本
export async function downloadAreasTemplate() {
  const response = await fetch(
    `${import.meta.env.VITE_API_BASE || 'http://localhost:8787'}/csv/template/areas`,
    {
      method: 'GET',
      headers: getStandardHeaders()
    }
  );

  if (!response.ok) {
    throw new Error('Failed to download template');
  }

  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'disaster_areas_template.csv';
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}

// CSV 匯入災區功能
export async function importAreasFromCSV(csvData, skipDuplicates = true) {
  return http.post('/csv/import/areas', { csv: csvData, skipDuplicates });
}

// 匯出垃圾桶災區 CSV
export async function exportTrashAreasToCSV() {
  try {
    const response = await fetch(
      `${import.meta.env.VITE_API_BASE || 'http://localhost:8787'}/csv/export/trash-areas`,
      {
        method: 'GET',
        headers: getStandardHeaders()
      }
    );

    if (!response.ok) {
      await handleCSVExportError(response, '垃圾桶災區');
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `trash_areas_export_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  } catch (error) {
    console.error('Export trash areas failed:', error);
    throw new Error(`Failed to export trash disaster areas: ${error.message}`);
  }
}

// CSV 匯入垃圾桶災區功能
export async function importTrashAreasFromCSV(csvData, skipDuplicates = true) {
  return http.post('/csv/import/trash-areas', { csv: csvData, skipDuplicates });
}

// ==================== 黑名單管理（僅超級管理員）====================

// 取得黑名單用戶列表
export async function getBlacklistedUsers() {
  return http.get('/admin/blacklist');
}

// 將用戶加入黑名單
export async function addUserToBlacklist(userId) {
  return http.patch(`/admin/users/${userId}/blacklist`, {});
}

// 將用戶移出黑名單
export async function removeUserFromBlacklist(userId) {
  return http.patch(`/admin/users/${userId}/unblacklist`, {});
}

// 批量刪除黑名單用戶（永久刪除）
export async function batchDeleteBlacklistedUsers(userIds) {
  return http.post('/admin/blacklist/batch-delete', { userIds });
}

// ==================== 審計日誌管理（僅超級管理員）====================

// 取得審計日誌列表
export async function getAuditLogs(params = {}) {
  const queryString = new URLSearchParams(params).toString();
  return http.get(`/admin/audit-logs${queryString ? '?' + queryString : ''}`);
}

// 匯出垃圾桶網格 CSV
export async function exportTrashGridsToCSV() {
  try {
    const response = await fetch(
      `${import.meta.env.VITE_API_BASE || 'http://localhost:8787'}/csv/export/trash-grids`,
      {
        method: 'GET',
        headers: getStandardHeaders()
      }
    );

    if (!response.ok) {
      await handleCSVExportError(response, '垃圾桶網格');
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `trash_grids_export_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  } catch (error) {
    console.error('Export trash grids failed:', error);
    throw error;
  }
}

// 匯入垃圾桶網格 CSV
export async function importTrashGridsFromCSV(csvData, skipDuplicates = true) {
  return http.post('/csv/import/trash-grids', { csv: csvData, skipDuplicates });
}

// 匯出審計日誌為 CSV
export async function exportAuditLogsToCSV(params = {}) {
  const queryString = new URLSearchParams(params).toString();
  const response = await fetch(
    `${import.meta.env.VITE_API_BASE || 'http://localhost:8787'}/admin/audit-logs/export${queryString ? '?' + queryString : ''}`,
    {
      method: 'GET',
      headers: getStandardHeaders()
    }
  );

  if (!response.ok) {
    await handleCSVExportError(response, '審計日誌');
  }

  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `audit_logs_export_${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}

// ==================== 公告管理 API ====================

// 匯出公告 CSV
export async function exportAnnouncementsCSV() {
  const response = await fetch(
    `${import.meta.env.VITE_API_BASE || 'http://localhost:8787'}/csv/export/announcements`,
    {
      method: 'GET',
      headers: getStandardHeaders()
    }
  );

  if (!response.ok) {
    return await handleCSVExportError(response, '公告');
  }

  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `announcements_export_${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
  return true;
}

// 匯出垃圾桶公告 CSV
export async function exportTrashAnnouncementsCSV() {
  const response = await fetch(
    `${import.meta.env.VITE_API_BASE || 'http://localhost:8787'}/csv/export/trash-announcements`,
    {
      method: 'GET',
      headers: getStandardHeaders()
    }
  );

  if (!response.ok) {
    return await handleCSVExportError(response, '垃圾桶公告');
  }

  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `trash_announcements_export_${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
  return true;
}

// CSV 匯入公告功能
export async function importAnnouncementsCSV(data) {
  return http.post('/csv/import/announcements', { csv: data.csvContent, skipDuplicates: true });
}

// CSV 匯入垃圾桶公告功能
export async function importTrashAnnouncementsCSV(data) {
  return http.post('/csv/import/trash-announcements', { csv: data.csvContent, skipDuplicates: true });
}

// ==================== 公告垃圾桶管理 ====================

// 軟刪除公告（移至垃圾桶）
export async function moveAnnouncementToTrash(announcementId) {
  return http.patch(`/admin/announcements/${announcementId}/trash`, {});
}

// 從垃圾桶還原公告
export async function restoreAnnouncementFromTrash(announcementId) {
  return http.patch(`/admin/announcements/${announcementId}/restore`, {});
}

// 永久刪除公告
export async function permanentlyDeleteAnnouncement(announcementId) {
  return http.delete(`/admin/announcements/${announcementId}`);
}

// 取得垃圾桶中的公告
export async function getTrashAnnouncements() {
  return http.get('/admin/trash/announcements');
}

// 批量移動公告至垃圾桶
export async function batchMoveAnnouncementsToTrash(announcementIds) {
  return http.post('/admin/announcements/batch-trash', { announcementIds });
}

// 批量永久刪除公告
export async function batchDeleteAnnouncements(announcementIds) {
  return http.post('/admin/announcements/batch-delete', { announcementIds });
}

// ==================== 物資垃圾桶管理 ====================

// 軟刪除物資（移至垃圾桶）
export async function moveSupplyToTrash(supplyId) {
  return http.patch(`/admin/supplies/${supplyId}/trash`, {});
}

// 從垃圾桶還原物資
export async function restoreSupplyFromTrash(supplyId) {
  return http.patch(`/admin/supplies/${supplyId}/restore`, {});
}

// 永久刪除物資
export async function permanentlyDeleteSupply(supplyId) {
  return http.delete(`/admin/supplies/${supplyId}`);
}

// 取得垃圾桶中的物資
export async function getTrashSupplies() {
  return http.get('/admin/trash/supplies');
}

// 批量移動物資至垃圾桶
export async function batchMoveSuppliesToTrash(supplyIds) {
  return http.post('/admin/supplies/batch-trash', { supplyIds });
}

// 批量永久刪除物資
export async function batchDeleteSupplies(supplyIds) {
  return http.post('/admin/supplies/batch-delete', { supplyIds });
}

// 匯出垃圾桶物資 CSV
export async function exportTrashSuppliesToCSV() {
  try {
    const response = await fetch(
      `${import.meta.env.VITE_API_BASE || 'http://localhost:8787'}/csv/export/trash-supplies`,
      {
        method: 'GET',
        headers: getStandardHeaders()
      }
    );

    if (!response.ok) {
      await handleCSVExportError(response, '垃圾桶物資');
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `trash_supplies_export_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  } catch (error) {
    console.error('Export trash supplies failed:', error);
    throw new Error(`Failed to export trash supplies: ${error.message}`);
  }
}

// CSV 匯入垃圾桶物資功能
export async function importTrashSuppliesFromCSV(csvData, skipDuplicates = true) {
  return http.post('/csv/import/trash-supplies', { csv: csvData, skipDuplicates });
}