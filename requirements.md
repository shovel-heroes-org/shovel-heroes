# 權限管理系統 - Requirements Document

實作完整的使用者權限管理系統，包含三層權限（Admin、User、訪客），垃圾桶功能（軟刪除），CSV匯入匯出，以及管理後台UI權限控制

## Core Features

### 1. 三層權限系統
- **Admin（管理員）**：擁有完整系統權限，可管理所有資料
- **User（一般用戶）**：有限功能，只能管理自己創建的資料
- **Guest（訪客）**：未登入用戶，只能瀏覽公開資訊

### 2. 管理後台功能
- 用戶權限管理頁面（獨立分頁）
- 災區管理
  - 災區清單顯示
  - 災區操作選單（齒輪圖示）
    - 編輯災區資訊
    - 刪除災區
- 需求網格管理（地區需求調整）
  - 網格卡片多選功能（checkbox）
  - 批量操作按鈕（新增網格旁）
- 志工管理
- 物資管理
- 管理權限分頁（新增）

### 3. 垃圾桶功能（軟刪除）
- 網格軟刪除（移至垃圾桶）
- 垃圾桶檢視與管理（獨立視圖）
- 批量操作功能
  - 多選網格（checkbox）
  - 批量移至垃圾桶按鈕
  - 批量還原
  - 批量永久刪除
- 永久刪除功能（需二次確認）

### 4. CSV 匯入/匯出
- 匯出網格資料為 CSV
- 匯出志工資料為 CSV
- 匯入 CSV 資料建立網格
- 提供 CSV 範本下載

### 5. 初始管理員設定
- 透過 .env 設定初始管理員 LINE ID
- 首次登入自動設為管理員

## User Stories

### 管理員故事
- As an **admin**, I want to **manage user roles**, so that **I can control access permissions**
- As an **admin**, I want to **delete any grid**, so that **I can maintain data quality**
- As an **admin**, I want to **edit disaster areas**, so that **I can update information**
- As an **admin**, I want to **delete disaster areas**, so that **I can remove outdated data**
- As an **admin**, I want to **access disaster area actions via gear icon**, so that **I can quickly perform operations**
- As an **admin**, I want to **export data to CSV**, so that **I can analyze data offline**
- As an **admin**, I want to **import CSV data**, so that **I can bulk create grids**
- As an **admin**, I want to **view trash**, so that **I can recover accidentally deleted items**
- As an **admin**, I want to **permanently delete items**, so that **I can free up storage**

### 一般用戶故事
- As a **user**, I want to **create grids**, so that **I can request help**
- As a **user**, I want to **edit my own grids**, so that **I can update information**
- As a **user**, I want to **register as volunteer**, so that **I can help others**
- As a **user**, I want to **donate supplies**, so that **I can contribute resources**

### 訪客故事
- As a **guest**, I want to **view public grids**, so that **I can see where help is needed**
- As a **guest**, I want to **view disaster areas**, so that **I can understand the situation**
- As a **guest**, I want to **login**, so that **I can access more features**

## Acceptance Criteria

### 權限系統
- [x] 管理員可以看到管理後台選單
- [x] 管理員可以修改用戶角色
- [x] 用戶角色變更立即生效
- [x] 一般用戶無法看到管理功能
- [x] 訪客無法看到管理後台

### 垃圾桶功能
- [x] 管理員可以將網格移至垃圾桶
- [x] 垃圾桶中的網格不顯示在主列表
- [x] 可以從垃圾桶還原網格
- [x] 可以永久刪除垃圾桶中的網格
- [x] 支援批量操作（選擇多個網格）
- [x] 批量移至垃圾桶
- [x] 批量還原
- [x] 批量永久刪除

### CSV 功能
- [x] 管理員可以匯出網格資料為 CSV
- [x] 管理員可以匯出志工資料為 CSV
- [x] 管理員可以下載 CSV 範本
- [x] 管理員可以匯入 CSV 建立網格
- [x] CSV 匯入支援重複檢查

### UI/UX 要求
- [x] 權限相關操作有確認對話框
- [x] 永久刪除有警告提示
- [x] 選中的網格有視覺反饋（藍色邊框）
- [x] 垃圾桶視圖有不同顏色標示
- [x] 空狀態有友善提示
- [x] 響應式設計（支援手機、平板、桌面）
- [ ] 災區清單每列顯示齒輪圖示（操作選單）
- [ ] 點擊齒輪顯示下拉選單（編輯、刪除）
- [ ] 編輯選項開啟編輯對話框/頁面
- [ ] 刪除選項需要確認對話框

## Non-functional Requirements

### 效能要求
- 管理後台載入時間 < 3 秒
- 批量操作回應時間 < 1 秒
- CSV 匯出處理 1000 筆資料 < 5 秒
- 全選操作 < 500ms

### 安全要求
- JWT Token 驗證
- 管理員操作需要雙重確認
- 敏感資料（LINE ID）不顯示在前端
- API 端點權限檢查
- 防止 CSRF 攻擊

### 相容性要求
- 支援 Chrome 90+
- 支援 Firefox 88+
- 支援 Safari 14+
- 支援 Edge 90+
- 響應式設計（最小寬度 436px）

### 可維護性要求
- 模組化程式碼結構
- 清晰的錯誤訊息
- 完整的 API 文件
- Playwright 自動化測試
