import { http } from './rest/client.js';

/**
 * HTTP 審計日誌 API 函數
 */

// 取得 HTTP 審計日誌列表
export async function getHttpAuditLogs(params = {}) {
  const queryString = new URLSearchParams(params).toString();
  return http.get(`/admin/http-audit-logs${queryString ? '?' + queryString : ''}`);
}

// 取得單一 HTTP 審計日誌詳情
export async function getHttpAuditLogDetail(id) {
  return http.get(`/admin/http-audit-logs/${id}`);
}

// 匯出 HTTP 審計日誌為 CSV
export async function exportHttpAuditLogsToCSV(params = {}) {
  const queryString = new URLSearchParams(params).toString();
  const response = await fetch(
    `${import.meta.env.VITE_API_BASE || 'http://localhost:8787'}/admin/http-audit-logs/export${queryString ? '?' + queryString : ''}`,
    {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('sh_token')}`
      }
    }
  );

  if (!response.ok) {
    throw new Error('Failed to export HTTP audit logs CSV');
  }

  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `http_audit_logs_${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}

// 清除 HTTP 審計日誌
export async function clearHttpAuditLogs(days) {
  const params = days ? { days } : {};
  const queryString = new URLSearchParams(params).toString();
  return http.delete(`/admin/http-audit-logs/clear${queryString ? '?' + queryString : ''}`);
}

// 取得 HTTP 審計日誌統計資訊
export async function getHttpAuditLogsStats(params = {}) {
  const queryString = new URLSearchParams(params).toString();
  return http.get(`/admin/http-audit-logs/stats${queryString ? '?' + queryString : ''}`);
}
