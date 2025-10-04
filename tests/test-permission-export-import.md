# 權限匯出匯入功能測試文件

## 功能說明

已為權限管理系統新增匯出匯入功能：

### 後端 API

1. **匯出權限** - `GET /api/permissions/export`
   - 需要 `role_permissions` 的 `can_manage` 權限
   - 回傳 CSV 格式的權限資料
   - 包含 UTF-8 BOM 以支援 Excel 中文顯示
   - 自動記錄稽核日誌

2. **匯入權限** - `POST /api/permissions/import`
   - 需要 `role_permissions` 的 `can_manage` 權限
   - 接收 CSV 資料並更新權限
   - 支援新增和更新權限
   - 回傳匯入結果（成功筆數、失敗筆數、錯誤訊息）
   - 自動記錄稽核日誌

### 前端功能

1. **匯出按鈕**
   - 位於權限管理頁面右上角
   - 點擊後下載 CSV 檔案
   - 檔名格式：`permissions_YYYY-MM-DD.csv`

2. **匯入按鈕**
   - 位於權限管理頁面右上角
   - 點擊選擇 CSV 檔案
   - 顯示匯入進度和結果
   - 匯入完成後自動重新載入權限資料

## 權限控制

根據 `init-permissions.ts` 的設定：

- **super_admin**: can_manage = 1 ✅ 可使用匯出匯入功能
- **admin**: can_manage = 0 ❌ 預設無法使用（可在權限管理頁面手動調整）
- **grid_manager**: can_manage = 0 ❌ 無法使用
- **user**: can_manage = 0 ❌ 無法使用
- **guest**: can_manage = 0 ❌ 無法使用

## CSV 格式

### 欄位說明

```csv
ID,角色,權限鍵值,權限名稱,權限分類,可檢視,可建立,可編輯,可刪除,可管理,說明
1,super_admin,disaster_areas,"災區管理","基礎管理",1,1,1,1,1,"完整災區管理權限"
```

### 欄位對應

| 欄位 | 說明 | 範例 |
|------|------|------|
| ID | 權限 ID | 1 |
| 角色 | 使用者角色 | super_admin, admin, grid_manager, user, guest |
| 權限鍵值 | 權限識別碼 | disaster_areas, grids, volunteers |
| 權限名稱 | 中文名稱 | 災區管理, 網格管理 |
| 權限分類 | 分類名稱 | 基礎管理, 系統管理 |
| 可檢視 | 0 或 1 | 1 |
| 可建立 | 0 或 1 | 1 |
| 可編輯 | 0 或 1 | 1 |
| 可刪除 | 0 或 1 | 1 |
| 可管理 | 0 或 1 | 1 |
| 說明 | 權限描述 | 完整災區管理權限 |

## 測試步驟

### 1. 準備工作

確保以 super_admin 角色登入系統。

### 2. 測試匯出功能

1. 進入管理後台 → 權限管理
2. 點擊右上角「匯出」按鈕
3. 檢查下載的 CSV 檔案：
   - 檔案名稱包含當前日期
   - 使用 Excel 開啟時中文顯示正常
   - 包含所有權限資料

### 3. 測試匯入功能

1. 修改匯出的 CSV 檔案（例如：調整某個權限的 can_edit 值）
2. 在權限管理頁面點擊「匯入」按鈕
3. 選擇修改過的 CSV 檔案
4. 檢查匯入結果訊息
5. 確認權限已更新

### 4. 驗證稽核日誌

1. 進入管理後台 → 日誌管理
2. 查看最近的稽核記錄：
   - 匯出操作記錄（action_type: EXPORT）
   - 匯入操作記錄（action_type: IMPORT）
   - 記錄包含操作詳情（筆數、錯誤等）

### 5. 測試權限控制

1. 以 admin 角色登入（預設無 can_manage 權限）
2. 進入權限管理頁面
3. 確認匯出匯入按鈕存在但可能受權限限制
4. 以 super_admin 調整 admin 的 role_permissions 權限
5. 重新測試 admin 是否能使用匯出匯入功能

## 已實作的檔案

### 後端
- `packages/backend/src/routes/permissions.ts` - 新增匯出匯入路由
- `packages/backend/src/lib/audit-logger.ts` - 已包含 EXPORT/IMPORT 稽核類型

### 前端
- `src/components/admin/PermissionManagement.jsx` - 新增匯出匯入按鈕和功能
- `src/api/permissions.js` - 新增 exportPermissions 和 importPermissions API

## 注意事項

1. **權限驗證**：匯出匯入功能受 `can_manage` 權限控制
2. **稽核記錄**：所有匯出匯入操作都會記錄到稽核日誌
3. **資料驗證**：匯入時會驗證角色和欄位格式
4. **錯誤處理**：匯入失敗會回傳詳細錯誤訊息
5. **快取更新**：匯入後會觸發權限更新事件，清除前端快取

## 可能的問題與解決方案

### 問題 1：無法下載 CSV 檔案
- 檢查是否有 `role_permissions` 的 `can_manage` 權限
- 檢查瀏覽器控制台是否有錯誤訊息

### 問題 2：匯入後權限未更新
- 重新整理頁面
- 檢查匯入的 CSV 格式是否正確
- 查看稽核日誌中的錯誤訊息

### 問題 3：Excel 開啟 CSV 中文亂碼
- 已加入 UTF-8 BOM，應該不會有此問題
- 如果仍有問題，可使用文字編輯器確認編碼為 UTF-8

## 功能擴充建議

1. **範本下載**：提供標準權限 CSV 範本
2. **批次操作**：支援多檔案匯入
3. **版本控制**：記錄權限變更歷史
4. **差異比對**：匯入前顯示變更預覽
5. **備份還原**：自動備份權限設定
