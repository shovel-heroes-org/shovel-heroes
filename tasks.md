# 權限管理系統 - Task List

## Implementation Tasks

- [ ] 1. **後端權限系統基礎建設**
    - [ ] 1.1. 建立 AuthMiddleware 中介軟體
        - *Goal*: 實現權限驗證中介軟體，保護需要管理員權限的 API 端點
        - *Details*:
          - 建立 `packages/backend/src/middlewares/AuthMiddleware.ts`
          - 實作 `requireAdmin` 函數驗證管理員權限
          - 實作 `requireLogin` 函數驗證登入狀態
          - 從 JWT token 解析使用者資訊並附加到 request.user
          - 回傳 401/403 錯誤當權限不足
        - *Requirements*: REQ-1.1, REQ-1.2

    - [ ] 1.2. 更新 auth-line.ts 支援初始管理員設定
        - *Goal*: 允許透過環境變數設定第一位管理員
        - *Details*:
          - 讀取 `.env` 中的 `INITIAL_ADMIN_LINE_ID`
          - 在使用者首次登入時檢查 LINE ID 是否匹配
          - 若匹配則將 role 設為 'admin'
          - 記錄管理員設定日誌
        - *Requirements*: REQ-1.3

    - [ ] 1.3. 更新 users 資料表 Schema
        - *Goal*: 確保資料庫支援角色欄位
        - *Details*:
          - 檢查 users 表是否有 role 欄位
          - 若無則執行 migration 新增 `role VARCHAR(50) DEFAULT 'user'`
          - 確認 role 可接受值：'admin', 'user', 'guest'
        - *Requirements*: REQ-1.1

- [ ] 2. **管理員 API 端點實作**
    - [ ] 2.1. 建立使用者管理 API
        - *Goal*: 提供管理員管理使用者角色的 API
        - *Details*:
          - 建立 `packages/backend/src/routes/admin.ts`
          - 實作 `GET /admin/users` 取得所有使用者列表
          - 實作 `PATCH /admin/users/:userId/role` 更新使用者角色
          - 驗證角色值必須為 'admin', 'user', 'guest'
          - 所有端點都需要 requireAdmin 中介軟體保護
        - *Requirements*: REQ-2.1, REQ-2.2

    - [ ] 2.2. 建立網格垃圾桶 API
        - *Goal*: 實作軟刪除與恢復功能
        - *Details*:
          - 實作 `PATCH /admin/grids/:gridId/trash` 將網格移至垃圾桶（設 status='deleted'）
          - 實作 `PATCH /admin/grids/:gridId/restore` 從垃圾桶恢復（設 status='active'）
          - 實作 `DELETE /admin/grids/:gridId/permanent` 永久刪除網格
          - 實作 `GET /admin/grids/trash` 取得垃圾桶中的網格列表
          - 所有操作需要 requireAdmin 保護
        - *Requirements*: REQ-3.1, REQ-3.2, REQ-3.3

    - [ ] 2.3. 建立批量操作 API
        - *Goal*: 支援批量刪除網格
        - *Details*:
          - 實作 `POST /admin/grids/batch-delete` 接收 gridIds 陣列
          - 使用資料庫交易確保原子性操作
          - 批量更新 status='deleted'
          - 回傳成功刪除的數量
        - *Requirements*: REQ-4.2

    - [ ] 2.4. 在 index.ts 註冊 admin 路由
        - *Goal*: 將管理員路由整合到主應用程式
        - *Details*:
          - 在 `packages/backend/src/index.ts` 引入 admin routes
          - 使用 `app.register(adminRoutes)` 註冊路由
          - 確保路由前綴為 `/admin`

- [ ] 3. **CSV 匯入匯出功能**
    - [ ] 3.1. 安裝 CSV 處理套件
        - *Goal*: 安裝必要的 CSV 處理依賴
        - *Details*:
          - 執行 `npm install csv-parse csv-stringify`
          - 更新 package.json
        - *Requirements*: REQ-5.1, REQ-5.2

    - [ ] 3.2. 實作網格 CSV 匯出
        - *Goal*: 提供網格資料匯出為 CSV 檔案
        - *Details*:
          - 建立 `packages/backend/src/routes/csv.ts`
          - 實作 `GET /csv/export/grids` 端點
          - 支援 `includeDeleted` 查詢參數
          - 從資料庫查詢網格資料
          - 使用 csv-stringify 產生 CSV
          - 設定 Content-Type 為 text/csv
          - 設定 Content-Disposition 檔名包含時間戳
          - 需要 requireAdmin 保護
        - *Requirements*: REQ-5.1

    - [ ] 3.3. 實作志願者 CSV 匯出
        - *Goal*: 提供志願者資料匯出為 CSV 檔案
        - *Details*:
          - 實作 `GET /csv/export/volunteers` 端點
          - 匯出欄位：id, line_id, name, created_at
          - 使用 csv-stringify 產生 CSV
          - 設定適當的 HTTP headers
          - 需要 requireAdmin 保護
        - *Requirements*: REQ-5.1

    - [ ] 3.4. 實作網格 CSV 匯入
        - *Goal*: 支援批量匯入網格資料
        - *Details*:
          - 實作 `POST /csv/import/grids` 端點
          - 接收 multipart/form-data 檔案上傳
          - 使用 csv-parse 解析 CSV
          - 驗證必填欄位：grid_name, region, latitude, longitude
          - 累積錯誤訊息（不中斷整個匯入）
          - 回傳成功匯入數量和錯誤列表
          - 需要 requireAdmin 保護
        - *Requirements*: REQ-5.2

    - [ ] 3.5. 實作 CSV 範本下載
        - *Goal*: 提供標準 CSV 範本給使用者參考
        - *Details*:
          - 實作 `GET /csv/template/grids` 端點
          - 產生包含標題列的空白 CSV
          - 欄位：grid_name, region, latitude, longitude, status
          - 設定適當的檔名
        - *Requirements*: REQ-5.2

    - [ ] 3.6. 在 index.ts 註冊 CSV 路由
        - *Goal*: 將 CSV 路由整合到主應用程式
        - *Details*:
          - 在 `packages/backend/src/index.ts` 引入 csv routes
          - 使用 `app.register(csvRoutes)` 註冊路由

- [ ] 4. **前端 API Client 實作**
    - [ ] 4.1. 建立 Admin API Client
        - *Goal*: 提供前端呼叫管理員 API 的函數
        - *Details*:
          - 建立 `src/api/admin.js`
          - 實作 `getAdminUsers()` 取得使用者列表
          - 實作 `updateUserRole(userId, role)` 更新角色
          - 實作 `moveGridToTrash(gridId)` 移至垃圾桶
          - 實作 `restoreGrid(gridId)` 恢復網格
          - 實作 `permanentDeleteGrid(gridId)` 永久刪除
          - 實作 `getTrashGrids()` 取得垃圾桶列表
          - 實作 `batchDeleteGrids(gridIds)` 批量刪除
          - 使用現有的 http client (`src/rest/client.js`)
        - *Requirements*: REQ-2.1, REQ-2.2, REQ-3.1, REQ-3.2, REQ-4.2

    - [ ] 4.2. 建立 CSV API Client
        - *Goal*: 提供前端呼叫 CSV API 的函數
        - *Details*:
          - 在 `src/api/admin.js` 中新增 CSV 相關函數
          - 實作 `exportGridsCSV(includeDeleted)` 下載網格 CSV
          - 實作 `exportVolunteersCSV()` 下載志願者 CSV
          - 實作 `importGridsCSV(file)` 上傳 CSV 檔案
          - 實作 `downloadGridsTemplate()` 下載範本
          - 處理 Blob 下載和 FormData 上傳
        - *Requirements*: REQ-5.1, REQ-5.2

- [ ] 5. **管理後台 UI 實作**
    - [ ] 5.1. 新增管理權限分頁
        - *Goal*: 在管理後台新增使用者權限管理介面
        - *Details*:
          - 修改 `src/pages/Admin.jsx`
          - 新增 'permissions' 分頁到 tabs 陣列
          - 實作使用者列表表格顯示
          - 每個使用者顯示：ID, 名稱, LINE ID, 角色
          - 角色欄位使用下拉選單（select）
          - 角色變更時即時呼叫 `updateUserRole` API
          - 只有管理員可見此分頁（使用 `isAdmin` 檢查）
        - *Requirements*: REQ-2.1, REQ-2.2

    - [ ] 5.1a. 災區清單新增操作選單（齒輪圖示）
        - *Goal*: 在災區清單每一列新增操作選單，提供編輯和刪除功能
        - *Details*:
          - 在災區清單的每一列右側或適當位置新增齒輪圖示按鈕
          - 實作下拉選單元件（可使用 Headless UI 或自訂）
          - 選單包含兩個選項：「編輯」和「刪除」
          - 點擊「編輯」開啟編輯對話框或導向編輯頁面
          - 點擊「刪除」顯示確認對話框
          - 確認刪除後呼叫刪除 API
          - 只在管理員模式下顯示齒輪圖示
          - 使用 lucide-react 的 Settings 或 MoreVertical 圖示
        - *Requirements*: 災區管理需求

    - [ ] 5.2. 實作網格多選功能
        - *Goal*: 在地區需求分頁新增網格多選 checkbox
        - *Details*:
          - 在網格卡片左上角新增 checkbox
          - 建立 `selectedGrids` state 儲存選中的網格 ID
          - 實作 `handleGridSelect` 函數切換選擇狀態
          - 選中時卡片顯示藍色邊框（border-blue-500）
          - checkbox 只在管理員模式下顯示
        - *Requirements*: REQ-4.1

    - [ ] 5.3. 新增批量刪除按鈕
        - *Goal*: 在「新增網格」按鈕旁新增批量刪除按鈕
        - *Details*:
          - 在地區需求分頁右上角新增「批量刪除」按鈕
          - 按鈕位置：「新增網格」按鈕右側
          - 未選擇網格時按鈕為禁用狀態
          - 點擊時顯示確認對話框（包含選中數量）
          - 確認後呼叫 `batchDeleteGrids` API
          - 完成後清空 selectedGrids 並重新載入列表
          - 只在管理員模式下顯示
        - *Requirements*: REQ-4.2

    - [ ] 5.4. 實作垃圾桶檢視切換
        - *Goal*: 新增垃圾桶/正常檢視切換功能
        - *Details*:
          - 新增 `isTrashView` state
          - 在地區需求分頁上方新增切換按鈕
          - 按鈕文字：「垃圾桶」/「正常檢視」
          - 切換時呼叫不同的 API（getGrids / getTrashGrids）
          - 垃圾桶檢視顯示「恢復」和「永久刪除」按鈕
          - 正常檢視顯示「移至垃圾桶」按鈕
          - 只在管理員模式下顯示垃圾桶功能
        - *Requirements*: REQ-3.1, REQ-3.2, REQ-3.3

    - [ ] 5.5. 實作 CSV 匯入匯出 UI
        - *Goal*: 在管理後台新增 CSV 匯入匯出按鈕
        - *Details*:
          - 在地區需求分頁新增「匯出 CSV」按鈕
          - 在志願者分頁新增「匯出 CSV」按鈕
          - 新增「匯入 CSV」按鈕和隱藏的 file input
          - 點擊匯出時呼叫對應 API 並觸發下載
          - 匯入時驗證檔案格式（必須是 .csv）
          - 匯入完成顯示成功/錯誤訊息
          - 新增「下載範本」按鈕
          - 只在管理員模式下顯示
        - *Requirements*: REQ-5.1, REQ-5.2

    - [ ] 5.6. 實作錯誤處理與載入狀態
        - *Goal*: 改善使用者體驗，提供適當的錯誤訊息和載入提示
        - *Details*:
          - 新增 `isLoading` state
          - 所有 API 呼叫包裹在 try-catch 中
          - 錯誤時顯示 alert 提示
          - 載入時顯示 loading spinner 或禁用按鈕
          - 成功操作後顯示成功訊息
        - *Requirements*: 所有功能需求

- [ ] 6. **測試實作**
    - [ ] 6.1. 建立 Playwright E2E 測試
        - *Goal*: 建立端對端測試驗證完整使用者流程
        - *Details*:
          - 建立 `tests/e2e/admin-permissions.spec.js`
          - 測試訪客無法存取管理功能
          - 測試一般使用者看不到管理權限分頁
          - 測試管理員可以管理使用者角色
          - 測試管理員可以使用垃圾桶功能
          - 測試管理員可以批量刪除網格
          - 測試管理員可以匯出/匯入 CSV
          - 準備測試資料（valid/invalid CSV 檔案）
        - *Requirements*: 所有功能需求

    - [ ] 6.2. 執行測試並修正錯誤
        - *Goal*: 確保所有測試通過
        - *Details*:
          - 執行 `npx playwright test`
          - 檢視測試報告
          - 修正失敗的測試
          - 確保測試覆蓋率達標
        - *Requirements*: 所有功能需求

- [ ] 7. **文檔更新與部署準備**
    - [ ] 7.1. 更新 .env.example
        - *Goal*: 記錄新的環境變數
        - *Details*:
          - 在 `.env.example` 新增 `INITIAL_ADMIN_LINE_ID` 說明
          - 加入註解說明用途
        - *Requirements*: REQ-1.3

    - [ ] 7.2. 建立資料庫 Migration（如需要）
        - *Goal*: 提供資料庫結構更新腳本
        - *Details*:
          - 若 users 表需要新增 role 欄位，建立 migration 腳本
          - 確保現有資料不受影響
          - 測試 migration 可正常執行
        - *Requirements*: REQ-1.1

    - [ ] 7.3. 更新 README.md（選擇性）
        - *Goal*: 記錄新功能使用方式
        - *Details*:
          - 說明如何設定初始管理員
          - 說明權限系統運作方式
          - 說明 CSV 匯入格式要求
        - *Requirements*: 所有功能需求

## Task Dependencies

### 關鍵路徑
1. **Phase 1 - 後端基礎（必須先完成）**
   - Task 1.1 (AuthMiddleware) → Task 1.2 (初始管理員) → Task 1.3 (資料表)
   - 必須依序完成，因為後續所有功能都依賴權限驗證

2. **Phase 2 - 後端 API（可部分並行）**
   - Task 2.1, 2.2, 2.3 可在 Phase 1 完成後並行開發
   - Task 2.4 必須等待 2.1-2.3 完成
   - Task 3.1-3.6 可與 Task 2 並行開發

3. **Phase 3 - 前端整合（需等待後端 API）**
   - Task 4.1, 4.2 需要 Task 2 和 Task 3 完成
   - Task 5.1-5.6 需要 Task 4 完成
   - Task 5.1-5.6 內部可部分並行

4. **Phase 4 - 測試與部署**
   - Task 6 需要 Phase 1-3 全部完成
   - Task 7 可與 Task 6 並行進行

### 並行開發建議
- **可並行組合 1**：Task 2.1-2.3（管理員 API）與 Task 3.1-3.5（CSV API）
- **可並行組合 2**：Task 5.1（管理權限分頁）與 Task 5.2-5.4（網格操作）
- **可並行組合 3**：Task 7.1-7.2（文檔）與 Task 6.2（測試修正）

## Estimated Timeline

### 按階段估算

**Phase 1: 後端基礎建設**
- Task 1.1: AuthMiddleware - 2 小時
- Task 1.2: 初始管理員設定 - 1 小時
- Task 1.3: 資料表 Schema - 1 小時
- **Phase 1 小計: 4 小時**

**Phase 2: 後端 API 開發**
- Task 2.1: 使用者管理 API - 2 小時
- Task 2.2: 網格垃圾桶 API - 3 小時
- Task 2.3: 批量操作 API - 2 小時
- Task 2.4: 註冊路由 - 0.5 小時
- Task 3.1: 安裝 CSV 套件 - 0.5 小時
- Task 3.2: 網格 CSV 匯出 - 2 小時
- Task 3.3: 志願者 CSV 匯出 - 1 小時
- Task 3.4: 網格 CSV 匯入 - 3 小時
- Task 3.5: CSV 範本下載 - 0.5 小時
- Task 3.6: 註冊 CSV 路由 - 0.5 小時
- **Phase 2 小計: 15 小時**

**Phase 3: 前端開發**
- Task 4.1: Admin API Client - 2 小時
- Task 4.2: CSV API Client - 1.5 小時
- Task 5.1: 管理權限分頁 - 3 小時
- Task 5.1a: 災區清單操作選單 - 2.5 小時
- Task 5.2: 網格多選功能 - 2 小時
- Task 5.3: 批量刪除按鈕 - 1.5 小時
- Task 5.4: 垃圾桶檢視切換 - 2.5 小時
- Task 5.5: CSV 匯入匯出 UI - 3 小時
- Task 5.6: 錯誤處理與載入狀態 - 2 小時
- **Phase 3 小計: 20 小時**

**Phase 4: 測試與文檔**
- Task 6.1: 建立 E2E 測試 - 4 小時
- Task 6.2: 執行測試並修正 - 3 小時
- Task 7.1: 更新 .env.example - 0.5 小時
- Task 7.2: 資料庫 Migration - 1 小時
- Task 7.3: 更新 README - 1 小時
- **Phase 4 小計: 9.5 小時**

### 總時程估算
- **總開發時數: 48.5 小時**
- **建議工期: 6-7 個工作天**（每天 7-8 小時）
- **如採並行開發: 5 個工作天**（2 位開發者協作）

### 里程碑
1. **Day 1-2**: 完成 Phase 1 + Phase 2 前半（基礎建設與主要 API）
2. **Day 3-4**: 完成 Phase 2 後半 + Phase 3 前半（CSV 功能與前端基礎）
3. **Day 5-6**: 完成 Phase 3 後半 + Phase 4（UI 完善與測試）
4. **Day 7**: 測試修正與部署準備

### 風險與緩衝
- **高風險項目**: Task 3.4（CSV 匯入）和 Task 5.4（垃圾桶切換）- 建議額外預留 20% 時間
- **測試時間**: 實際測試與除錯可能需要額外 4-6 小時
- **建議總時程**: 52-58 小時（包含緩衝時間）
