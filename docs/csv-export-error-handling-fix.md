# CSV 匯出錯誤處理修復報告

## 問題描述

所有 CSV 匯出功能都失敗，並顯示以下錯誤：

```
Export failed: Error: Failed to export XXX CSV
```

主要問題包括：
1. **錯誤訊息不夠詳細**：只顯示 "Failed to export XXX CSV"，沒有顯示後端實際的錯誤原因
2. **權限匯出 API 路徑錯誤**：使用相對路徑 `/api/permissions/export` 而非完整 URL
3. **認證問題**：可能是 token 過期或無效

## 根本原因分析

### 問題 1：錯誤處理不足

**原始程式碼**：
```javascript
if (!response.ok) {
  throw new Error('Failed to export grids CSV');
}
```

**問題**：
- 沒有讀取後端返回的實際錯誤訊息
- 無法區分 401（未登入）、403（無權限）、500（伺服器錯誤）等不同狀況
- 使用者只看到通用錯誤訊息，無法判斷問題原因

### 問題 2：API 路徑不完整

**permissions.js 原始程式碼**：
```javascript
const response = await fetch('/api/permissions/export', {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
```

**問題**：
- 使用相對路徑，在某些情況下可能無法正確解析
- 沒有使用 `VITE_API_BASE` 環境變數

## 修復方案

### 修復 1：新增 CSV 匯出錯誤處理輔助函數

在 `src/api/admin.js` 開頭新增：

```javascript
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
```

**優點**：
- ✅ 嘗試從後端回應中提取實際錯誤訊息
- ✅ 支援 JSON 和純文字錯誤回應
- ✅ 針對 401/403 提供明確的錯誤訊息
- ✅ 統一錯誤處理邏輯，易於維護

### 修復 2：更新所有 CSV 匯出函數

將所有匯出函數的錯誤處理從：

```javascript
if (!response.ok) {
  throw new Error('Failed to export XXX CSV');
}
```

更新為：

```javascript
if (!response.ok) {
  await handleCSVExportError(response, 'XXX');
}
```

**已更新的函數**：
1. `exportGridsToCSV()` - 網格
2. `exportVolunteersToCSV()` - 志工
3. `exportSuppliesToCSV()` - 物資
4. `exportUsersToCSV()` - 用戶
5. `exportBlacklistToCSV()` - 黑名單
6. `exportAreasToCSV()` - 災區
7. `exportAuditLogsToCSV()` - 審計日誌
8. `exportAnnouncementsCSV()` - 公告

### 修復 3：修正權限匯出 API 路徑

**修改前** (`src/api/permissions.js`):
```javascript
const response = await fetch('/api/permissions/export', {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
```

**修改後**:
```javascript
const response = await fetch(
  `${import.meta.env.VITE_API_BASE || 'http://localhost:8787'}/api/permissions/export`,
  {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  }
);
```

## 修改檔案清單

1. **src/api/admin.js** (admin.js:8-33)
   - ✅ 新增 `handleCSVExportError()` 輔助函數

2. **src/api/admin.js** - 更新錯誤處理
   - ✅ `exportGridsToCSV()` (line 115)
   - ✅ `exportVolunteersToCSV()` (line 147)
   - ✅ `exportSuppliesToCSV()` (line 179)
   - ✅ `exportUsersToCSV()` (line 211)
   - ✅ `exportBlacklistToCSV()` (line 243)
   - ✅ `exportAreasToCSV()` (line 307)
   - ✅ `exportAuditLogsToCSV()` (line 397)
   - ✅ `exportAnnouncementsCSV()` (line 426)

3. **src/api/permissions.js** (permissions.js:76-84)
   - ✅ 修正 `exportPermissions()` API 路徑

## 預期改善效果

### 修復前
```
Export failed: Error: Failed to export grids CSV
```
❌ 使用者不知道是什麼原因導致失敗

### 修復後

**情況 1：未登入**
```
Export failed: Error: 未登入或登入已過期，請重新登入
```
✅ 明確告知需要重新登入

**情況 2：無權限**
```
Export failed: Error: 無權限匯出網格資料
```
✅ 明確告知權限不足

**情況 3：後端錯誤**
```
Export failed: Error: Database connection failed
```
✅ 顯示後端返回的實際錯誤訊息

## 測試建議

1. **測試正常情況**：
   - 以超級管理員身份測試所有模組的 CSV 匯出
   - 確認檔案下載正常

2. **測試未登入情況**：
   - 清除 localStorage 中的 token
   - 嘗試匯出 CSV
   - 應顯示：「未登入或登入已過期，請重新登入」

3. **測試權限不足情況**：
   - 以一般使用者身份登入
   - 嘗試匯出管理員功能的 CSV
   - 應顯示：「無權限匯出XXX資料」

4. **測試 Token 過期情況**：
   - 等待 token 過期（或手動設定過期的 token）
   - 嘗試匯出 CSV
   - 應顯示：「未登入或登入已過期，請重新登入」

## 完成時間
2025-10-04

## 相關文件
- [CSV 匯出功能修復報告](./csv-export-fix-report.md)
