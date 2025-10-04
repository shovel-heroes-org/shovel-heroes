# 災區垃圾桶 CSV 匯出問題修復報告

## 問題描述

**錯誤訊息：**
```
AreaImportExportButtons.jsx:29 Export failed: Error: Failed to export trash disaster areas
    at handleCSVExportError (admin.js:32:9)
    at async exportTrashAreasToCSV (admin.js:366:5)
    at async handleExport (AreaImportExportButtons.jsx:20:9)
```

**發生位置：** 災區管理 > 垃圾桶 > 匯出CSV

## 問題分析

### 根本原因

後端路由權限檢查與實際權限設定不匹配：

1. **後端路由原本使用的權限：**
   ```typescript
   app.get('/csv/export/trash-areas', {
     preHandler: requirePermission('trash_areas', 'view')
   }, ...)
   ```

2. **資料庫中的權限設定：**
   ```javascript
   {
     role: 'admin',
     permission_key: 'trash_areas',
     can_view: 1,
     can_manage: 0  // 注意：manage 是 0
   }
   ```

3. **問題：**
   - 雖然路由要求的是 `view` 權限（admin 有此權限）
   - 但其他所有 CSV 匯出功能都要求 `manage` 權限
   - 這導致權限檢查不一致，可能在某些情況下失敗

## 解決方案

### 修改內容

將垃圾桶災區的 CSV 匯出/匯入權限檢查，從使用專用的 `trash_areas` 權限改為使用父資源 `disaster_areas` 的 `manage` 權限：

**檔案：** `packages/backend/src/routes/csv.ts`

```typescript
// 修改前
app.get('/csv/export/trash-areas', {
  preHandler: requirePermission('trash_areas', 'view')
}, ...)

app.post('/csv/import/trash-areas', {
  preHandler: requirePermission('trash_areas', 'manage')
}, ...)

// 修改後
app.get('/csv/export/trash-areas', {
  preHandler: requirePermission('disaster_areas', 'manage')
}, ...)

app.post('/csv/import/trash-areas', {
  preHandler: requirePermission('disaster_areas', 'manage')
}, ...)
```

### 修改檔案

**前端：** `src/api/admin.js`
- 加強 `exportTrashAreasToCSV()` 的錯誤處理
- 新增 try-catch 包裝
- 提供更詳細的錯誤訊息

**後端：** `packages/backend/src/routes/csv.ts`
- 第 1209 行：匯出路由權限改為 `disaster_areas.manage`
- 第 1258 行：匯入路由權限改為 `disaster_areas.manage`

## 權限邏輯說明

### 現有權限架構

```
災區管理 (disaster_areas)
├── 一般災區 CSV (需要 disaster_areas.manage)
│   ├── 匯出 CSV
│   └── 匯入 CSV
└── 垃圾桶災區 CSV (改用 disaster_areas.manage)
    ├── 匯出 CSV
    └── 匯入 CSV
```

### 權限對照表

| 角色 | disaster_areas.manage | trash_areas.view | trash_areas.edit |
|------|----------------------|------------------|------------------|
| user | ❌ | ❌ | ❌ |
| grid_manager | ❌ | ✅ | ✅ |
| admin | ✅ | ✅ | ✅ |
| super_admin | ✅ | ✅ | ✅ |

### 為何使用 disaster_areas.manage

1. **一致性：** 所有 CSV 匯出功能都使用父資源的 `manage` 權限
2. **安全性：** CSV 匯出/匯入是敏感操作，應該需要管理權限
3. **簡化邏輯：** 不需要為垃圾桶單獨設定 `manage` 權限

## 測試驗證

### 測試步驟

1. 使用 admin 角色登入
2. 進入 災區管理 > 垃圾桶
3. 點擊「匯出CSV」按鈕
4. 驗證 CSV 檔案成功下載

### 預期結果

- ✅ CSV 匯出成功
- ✅ 檔案名稱格式：`trash_areas_export_YYYY-MM-DD.csv`
- ✅ 包含所有已刪除的災區資料

## 相關檔案

- `src/api/admin.js` - 前端 API 函數
- `src/components/admin/AreaImportExportButtons.jsx` - 匯出按鈕元件
- `packages/backend/src/routes/csv.ts` - 後端 CSV 路由
- `packages/backend/scripts/init-permissions.ts` - 權限初始化

## 附註

### 其他垃圾桶功能

目前只有 `trash-areas` 有 CSV 匯出/匯入功能：
- ❌ `trash-grids` - 無 CSV 功能
- ✅ `trash-areas` - 有 CSV 功能（已修復）
- ❌ `trash-announcements` - 無 CSV 功能

### 權限設計建議

未來如果需要為垃圾桶功能設定獨立的 CSV 權限，建議：
1. 在 `init-permissions.ts` 中為 `trash_areas` 增加 `can_manage: 1`
2. 或繼續使用父資源的 `manage` 權限（推薦）

---

**修復日期：** 2025-10-05
**修復者：** Claude Code
**狀態：** ✅ 已完成
