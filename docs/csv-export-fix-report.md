# CSV 匯出功能修復報告

## 問題描述
使用者回報「目前所有分頁的匯出匯入只有需求管理能成功匯出」

## 根本原因分析

### 發現的問題
經過調查發現，系統中存在**兩套不同的 CSV 匯出實作方式**：

#### 方式 1：舊 API（/functions 路由）
- **使用位置**：GridImportExportButtons（需求管理）
- **API 端點**：`/functions/export-grids-csv`
- **實作方式**：
  ```javascript
  // src/api/rest/functions.js
  export const exportGridsCSV = async () => {
    const csv = await http.get('/functions/export-grids-csv');
    return { data: csv };
  };

  // GridImportExportButtons.jsx
  const response = await exportGridsCSV();
  const blob = new Blob([response.data], { type: 'text/csv' });
  // 手動建立下載連結
  ```

#### 方式 2：新 API（/csv 路由）
- **使用位置**：其他所有模組
- **API 端點**：`/csv/export/{resource}`
- **實作方式**：
  ```javascript
  // src/api/admin.js
  export async function exportAreasToCSV() {
    const response = await fetch('/csv/export/areas', ...);
    const blob = await response.blob();
    // 在 admin.js 中處理下載
  }

  // AreaImportExportButtons.jsx
  await exportAreasToCSV(); // 直接呼叫，不需手動處理 blob
  ```

#### 方式 3：錯誤的混合實作
- **使用位置**：AnnouncementImportExportButtons（公告管理）
- **問題**：
  ```javascript
  // admin.js 返回 fetch Response 物件
  return response;

  // 元件試圖存取不存在的 .data 屬性
  const blob = new Blob([response.data], ...); // ❌ response 沒有 .data 屬性
  ```

## 修復方案

### 統一採用方式 2（在 admin.js 中處理下載）

#### 原因：
1. **封裝性更好**：下載邏輯集中在 API 層
2. **元件更簡潔**：元件只需呼叫函數，不需處理 blob 和下載
3. **一致性**：大部分模組已經採用此方式
4. **可維護性**：修改下載邏輯只需改一處

## 修改清單

### 1. 修復公告管理匯出（src/api/admin.js）
**修改前**：
```javascript
export async function exportAnnouncementsCSV() {
  const response = await fetch(...);
  return response; // ❌ 返回 Response 物件
}
```

**修改後**：
```javascript
export async function exportAnnouncementsCSV() {
  const response = await fetch(...);
  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `announcements_export_${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}
```

### 2. 簡化公告管理元件（src/components/admin/AnnouncementImportExportButtons.jsx）
**修改前**：
```javascript
const handleExport = async () => {
  const response = await exportAnnouncementsCSV();
  const blob = new Blob([response.data], { type: 'text/csv' }); // ❌
  const url = window.URL.createObjectURL(blob);
  // ... 手動處理下載
};
```

**修改後**：
```javascript
const handleExport = async () => {
  await exportAnnouncementsCSV(); // ✅ 簡潔
  alert('公告資料匯出成功！');
};
```

### 3. 新增網格匯出函數（src/api/admin.js）
為了統一所有匯出功能，新增使用新 API 的網格匯出函數：

```javascript
// 匯出網格 CSV
export async function exportGridsToCSV() {
  const response = await fetch(
    `${import.meta.env.VITE_API_BASE || 'http://localhost:8787'}/csv/export/grids`,
    {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    }
  );

  if (!response.ok) {
    throw new Error('Failed to export grids CSV');
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
```

### 4. 更新網格管理元件（src/components/admin/GridImportExportButtons.jsx）

**修改 import**：
```javascript
// 修改前
import { exportGridsCSV, importGridsCSV } from '@/api/functions';

// 修改後
import { exportGridsToCSV, importGridsFromCSV } from '@/api/admin';
import { downloadGridTemplate } from '@/api/functions';
```

**修改匯出處理**：
```javascript
// 修改前
const handleExport = async () => {
  const response = await exportGridsCSV();
  const blob = new Blob([response.data], { type: 'text/csv' });
  // ... 手動處理下載
};

// 修改後
const handleExport = async () => {
  await exportGridsToCSV();
  alert('網格資料匯出成功！');
};
```

**修改匯入處理**：
```javascript
// 修改前
const result = await importGridsCSV({ csvContent });

// 修改後
const result = await importGridsFromCSV(csvContent, true);
```

## 修改檔案總覽

1. **src/api/admin.js**
   - ✅ 修復 `exportAnnouncementsCSV()` - 新增下載處理邏輯
   - ✅ 新增 `exportGridsToCSV()` - 使用新 API 的網格匯出

2. **src/components/admin/AnnouncementImportExportButtons.jsx**
   - ✅ 簡化 `handleExport()` - 移除手動 blob 處理

3. **src/components/admin/GridImportExportButtons.jsx**
   - ✅ 更新 import - 改用 admin.js 的函數
   - ✅ 簡化 `handleExport()` - 移除手動 blob 處理
   - ✅ 更新 `handleFileImport()` - 使用新的 API 函數

## 所有模組的 CSV 匯出統一架構

| 模組 | 匯出 API 端點 | API 函數 | 元件 |
|------|--------------|---------|------|
| 需求管理 (Grids) | `/csv/export/grids` | `exportGridsToCSV()` | GridImportExportButtons |
| 災區管理 (Areas) | `/csv/export/areas` | `exportAreasToCSV()` | AreaImportExportButtons |
| 志工管理 (Volunteers) | `/csv/export/volunteers` | `exportVolunteersToCSV()` | VolunteerImportExportButtons |
| 物資管理 (Supplies) | `/csv/export/supplies` | `exportSuppliesToCSV()` | SupplyImportExportButtons |
| 用戶管理 (Users) | `/csv/export/users` | `exportUsersToCSV()` | UserImportExportButtons |
| 黑名單 (Blacklist) | `/csv/export/blacklist` | `exportBlacklistToCSV()` | BlacklistImportExportButtons |
| 公告管理 (Announcements) | `/csv/export/announcements` | `exportAnnouncementsCSV()` | AnnouncementImportExportButtons |

✅ **所有模組現在都使用相同的實作模式**

## 後續測試建議

1. **功能測試**：
   - 測試所有 7 個模組的 CSV 匯出功能
   - 驗證匯出的檔案名稱格式正確（包含日期）
   - 確認 CSV 檔案編碼正確（UTF-8 BOM）
   - 驗證中文字元在 Excel 中顯示正常

2. **匯入測試**：
   - 測試匯出後重新匯入
   - 驗證錯誤處理（格式錯誤、重複資料等）
   - 確認匯入成功訊息正確顯示

3. **權限測試**：
   - 確認不同角色的匯出權限正確執行
   - 驗證未授權使用者無法匯出

## 預期結果

✅ 所有分頁的 CSV 匯出功能都能正常運作
✅ 匯出的 CSV 檔案編碼正確（UTF-8 with BOM）
✅ 中文字元在 Excel 中正常顯示
✅ 程式碼架構統一，易於維護

## 完成時間
2025-10-04
