# CSV 匯出匯入功能測試指南

## 修復完成日期
2025-10-04

## 修復摘要

已系統性地修復所有 CSV 匯出/匯入功能的欄位一致性問題，確保匯出的 CSV 檔案可以直接重新匯入。

---

## 已修復的功能清單

### 1. 災區管理 (Areas) ✅
**路由**：
- 匯出：`GET /csv/export/areas`
- 匯入：`POST /csv/import/areas`
- 範本：`GET /csv/template/areas`

**修復內容**：
- 縣市、鄉鎮區改為選填（允許空值）
- 只有災區名稱、緯度、經度為必填
- 去重邏輯改為基於名稱+經緯度（容差 0.0001 度）

**測試步驟**：
1. 進入「災區管理」頁籤
2. 點擊「匯出CSV」按鈕
3. 下載 `disaster_areas_export_YYYY-MM-DD.csv`
4. 點擊「匯入CSV」按鈕，選擇剛才匯出的檔案
5. 確認顯示「匯入完成！成功：X 筆，跳過：Y 筆」

**預期結果**：
- 匯出成功，CSV 包含所有災區資料
- 匯入時跳過所有重複項目（基於名稱和位置）
- 無錯誤訊息

---

### 2. 網格管理 (Grids) ✅
**路由**：
- 匯出：`GET /csv/export/grids`
- 匯入：`POST /csv/import/grids`
- 範本：`GET /csv/template/grids`

**修復內容**：
- 匯出欄位標題從「災區」改為「災區名稱」
- 與匯入邏輯完全對齊

**測試步驟**：
1. 進入「需求管理」頁籤
2. 點擊「匯出CSV」按鈕
3. 下載 `grids_export.csv`
4. 點擊「匯入CSV」按鈕，選擇剛才匯出的檔案
5. 確認匯入結果

**預期結果**：
- 匯出成功，CSV 包含所有網格資料
- 匯入時正確識別災區名稱
- 跳過重複的網格代碼

---

### 3. 志工管理 (Volunteers) ✅
**路由**：
- 匯出：`GET /csv/export/volunteers`
- 匯入：`POST /csv/import/volunteers`
- 範本：`GET /csv/template/volunteers`

**修復內容**：
- 移除電話的必填標記
- 為電話欄位添加預設空字串
- 只驗證姓名和網格代碼為必填

**測試步驟**：
1. 進入「志工管理」頁籤
2. 點擊「匯出CSV」按鈕
3. 下載 `volunteers_export.csv`
4. 點擊「匯入CSV」按鈕，選擇剛才匯出的檔案
5. 確認匯入結果

**預期結果**：
- 匯出成功，包含所有志工資料
- 匯入時允許電話為空
- 正確識別網格代碼並建立關聯

---

### 4. 物資管理 (Supplies) ✅
**路由**：
- 匯出：`GET /csv/export/supplies`
- 匯入：`POST /csv/import/supplies`
- 範本：`GET /csv/template/supplies`

**修復內容**：
- 移除聯絡電話的必填標記
- 為電話欄位添加預設空字串
- 保持捐贈者姓名、網格代碼、物資名稱為必填

**測試步驟**：
1. 進入「物資管理」頁籤
2. 點擊「匯出CSV」按鈕
3. 下載 `supplies_export.csv`
4. 點擊「匯入CSV」按鈕，選擇剛才匯出的檔案
5. 確認匯入結果

**預期結果**：
- 匯出成功，包含所有物資捐贈資料
- 匯入時允許電話為空
- 正確建立與網格的關聯

---

### 5. 用戶管理 (Users) ✅
**路由**：
- 匯出：`GET /csv/export/users`
- 匯入：`POST /csv/import/users`
- 範本：`GET /csv/template/users` ⭐ 新增

**修復內容**：
- ✨ 新增範本路由
- 更新匯入邏輯支援範本格式

**測試步驟**：
1. 進入「用戶管理」頁籤
2. 點擊「匯出CSV」按鈕
3. 下載 `users_export.csv`
4. 點擊「匯入CSV」按鈕，選擇剛才匯出的檔案
5. 確認匯入結果

**預期結果**：
- 匯出成功，包含所有用戶資料
- 匯入時正確更新用戶角色
- 跳過重複的 LINE ID

---

### 6. 黑名單管理 (Blacklist) ✅
**路由**：
- 匯出：`GET /csv/export/blacklist`
- 匯入：`POST /csv/import/blacklist`
- 範本：`GET /csv/template/blacklist` ⭐ 新增

**修復內容**：
- ✨ 新增範本路由
- 更新匯入邏輯支援範本格式

**測試步驟**：
1. 進入「黑名單用戶」頁籤
2. 點擊「匯出CSV」按鈕
3. 下載 `blacklist_export.csv`
4. 點擊「匯入CSV」按鈕，選擇剛才匯出的檔案
5. 確認匯入結果

**預期結果**：
- 匯出成功，包含所有黑名單用戶
- 匯入時正確識別用戶
- 避免重複加入黑名單

---

### 7. 公告管理 (Announcements) ✅
**路由**：
- 匯出：`GET /csv/export/announcements`
- 匯入：`POST /csv/import/announcements`
- 範本：`GET /csv/template/announcements` ⭐ 新增

**修復內容**：
- ✨ 新增範本路由
- 更新匯入邏輯支援範本格式

**測試步驟**：
1. 進入「公告管理」頁籤
2. 點擊「匯出」按鈕
3. 下載 `announcements_export_YYYY-MM-DD.csv`
4. 點擊「匯入」按鈕，選擇剛才匯出的檔案
5. 確認匯入結果

**預期結果**：
- 匯出成功，包含所有公告資料
- 匯入時正確建立公告
- 保留所有欄位資料

---

### 8. 權限管理 (Permissions) ✅
**路由**：
- 匯出：`GET /api/permissions/export`
- 匯入：`POST /api/permissions/import`

**現有功能狀態**：
- ✅ 已正確實作
- ✅ 欄位一致性良好
- ✅ 支援更新和新增

**測試步驟**：
1. 進入「權限管理」頁籤
2. 點擊「匯出」按鈕
3. 下載 `permissions_YYYY-MM-DD.csv`
4. 點擊「匯入」按鈕，選擇剛才匯出的檔案
5. 確認匯入結果

**預期結果**：
- 匯出成功，包含所有角色權限設定
- 匯入時正確更新現有權限
- 顯示成功和失敗筆數

---

## 共通修復原則

### 1. 欄位一致性
- 匯出的欄位標題與匯入邏輯讀取的欄位名稱完全一致
- 範例：匯出使用「災區名稱」，匯入也讀取「災區名稱」

### 2. 系統欄位處理
- ID、建立時間等系統生成欄位在匯入時自動忽略
- 這些欄位匯出是為了參考，不用於匯入

### 3. 預設值
- 所有可選欄位都提供預設值（如 `|| ''`）
- 避免因空值導致匯入失敗

### 4. 雙格式支援
- 同時支援範本格式（含必填標記）和匯出格式（無標記）
- 範例：「災區名稱（必填）」或「災區名稱」都能正確讀取

### 5. 合理驗證
- 只有真正必須的欄位才驗證為必填
- 範例：災區的縣市、鄉鎮區改為選填

---

## UI/UX 改進

### 訊息顯示方式
所有匯出/匯入操作不再使用彈出視窗 `alert()`，改為頁面內訊息顯示：

- ✅ 成功訊息：綠色背景 + CheckCircle2 圖示
- ❌ 錯誤訊息：紅色背景 + XCircle 圖示
- ⚠️ 警告訊息：黃色背景 + XCircle 圖示（有錯誤但部分成功）
- ℹ️ 資訊訊息：藍色背景 + XCircle 圖示
- 訊息自動在 3 秒後消失

### 訊息格式
匯入成功訊息格式：
```
匯入完成！成功：X 筆，跳過：Y 筆，錯誤：Z 筆
```

---

## 測試檢查清單

使用此清單進行完整測試：

- [ ] 災區管理 - 匯出後匯入成功
- [ ] 網格管理 - 匯出後匯入成功
- [ ] 志工管理 - 匯出後匯入成功
- [ ] 物資管理 - 匯出後匯入成功
- [ ] 用戶管理 - 匯出後匯入成功
- [ ] 黑名單管理 - 匯出後匯入成功
- [ ] 公告管理 - 匯出後匯入成功
- [ ] 權限管理 - 匯出後匯入成功

---

## 常見問題排除

### Q1: 匯入時顯示「沒有成功匯入任何資料」
**可能原因**：
- CSV 檔案包含 BOM 標記，但後端解析有誤
- 欄位標題不匹配
- 所有資料都被視為重複而跳過

**解決方法**：
1. 檢查 CSV 檔案編碼（應為 UTF-8 with BOM）
2. 檢查欄位標題是否正確
3. 嘗試使用 `skipDuplicates: false` 參數

### Q2: 匯入部分成功，有錯誤訊息
**可能原因**：
- 某些欄位資料格式不正確
- 關聯資料不存在（如網格代碼找不到）
- 必填欄位缺少值

**解決方法**：
1. 查看詳細錯誤訊息
2. 檢查 CSV 檔案中對應行的資料
3. 確保關聯資料已存在（如先匯入災區，再匯入網格）

### Q3: 訊息顯示不出來
**可能原因**：
- 元件未傳遞 `showMessage` prop
- 訊息狀態未正確設定

**解決方法**：
1. 檢查瀏覽器控制台是否有錯誤
2. 確認元件已傳遞 `showMessage` 函數
3. 重新載入頁面

---

## 技術細節

### 後端修改檔案
- `packages/backend/src/routes/csv.ts`

### 前端修改檔案
- `src/pages/Admin.jsx`
- `src/components/admin/AreaImportExportButtons.jsx`
- `src/components/admin/GridImportExportButtons.jsx`
- `src/components/admin/VolunteerImportExportButtons.jsx`
- `src/components/admin/SupplyImportExportButtons.jsx`
- `src/components/admin/UserImportExportButtons.jsx`
- `src/components/admin/BlacklistImportExportButtons.jsx`
- `src/components/admin/AnnouncementImportExportButtons.jsx`
- `src/components/admin/AnnouncementManagement.jsx`

### 建置驗證
```bash
npm run build
```
✅ 建置成功，無錯誤

---

## 後續建議

1. **定期測試**：每次更新資料表結構後，重新測試匯出匯入功能
2. **資料備份**：建議在大量匯入前先備份資料庫
3. **分批匯入**：大量資料建議分批匯入，避免逾時
4. **錯誤處理**：匯入失敗時保存錯誤日誌以供排查

---

## 文件版本
- 版本：1.0
- 建立日期：2025-10-04
- 最後更新：2025-10-04
