# CSV 匯出/匯入欄位一致性修復報告

## 修復日期
2025-10-04

## 修復範圍
packages/backend/src/routes/csv.ts

## 修復概述
系統性檢查並修復所有 CSV 匯出/匯入功能的欄位一致性問題，確保匯出的 CSV 檔案能夠成功重新匯入。

---

## 功能別修復詳情

### 1. 網格 (Grids) ✅

**問題**
- 匯出欄位使用「災區」，但匯入讀取「災區名稱」- 欄位名稱不一致

**修復**
- 將匯出欄位從「災區」改為「災區名稱」，與匯入邏輯保持一致

**修復後的欄位對應**
```
匯出欄位: ID, 網格代碼, 類型, 災區名稱, 需求人數, 已登記人數, 集合點, 風險備註, 聯絡資訊, 狀態, 緯度, 經度, 建立時間
匯入讀取: 網格代碼, 類型, 災區名稱, 需求人數, 集合點, 風險備註, 聯絡資訊, 緯度, 經度
```

**必填欄位**
- 網格代碼 ✓
- 類型 ✓
- 災區名稱 ✓
- 緯度 ✓
- 經度 ✓

---

### 2. 災區 (Areas) ✅

**狀態**: 無需修復

**欄位對應**
```
匯出欄位: ID, 災區名稱, 縣市, 鄉鎮區, 描述, 狀態, 緯度, 經度, 建立時間
匯入讀取: 災區名稱, 縣市, 鄉鎮區, 描述, 緯度, 經度
```

**必填欄位**
- 災區名稱 ✓
- 緯度 ✓
- 經度 ✓

**備註**
- 縣市和鄉鎮區已正確設定為選填（有預設空字串）

---

### 3. 志工 (Volunteers) ✅

**問題**
- 範本中「電話」標記為必填，但實際上電話不應該是必填欄位
- 匯入邏輯沒有為電話提供預設值

**修復**
1. 移除範本中「電話（必填）」的必填標記，改為「電話」
2. 為電話欄位添加預設空字串：`record['電話'] || ''`
3. 修改必填驗證，只檢查姓名和網格代碼

**修復後的欄位對應**
```
匯出欄位: ID, 志工姓名, 電話, Email, 可服務時間, 狀態, 網格代碼, 災區, 報名時間
匯入讀取: 志工姓名, 電話, Email, 可服務時間, 網格代碼
範本欄位: 志工姓名（必填）, 電話, Email, 可服務時間, 網格代碼（必填）
```

**必填欄位**
- 志工姓名 ✓
- 網格代碼 ✓

---

### 4. 物資 (Supplies) ✅

**問題**
- 範本中「聯絡電話」標記為必填，但實際上電話不應該是必填欄位
- 匯入邏輯沒有為電話提供預設值

**修復**
1. 移除範本中「聯絡電話（必填）」的必填標記，改為「聯絡電話」
2. 為電話欄位添加預設空字串：`record['聯絡電話'] || ''`
3. 保持必填驗證：只檢查捐贈者姓名、網格代碼和物資名稱

**修復後的欄位對應**
```
匯出欄位: ID, 網格代碼, 災區, 物資名稱, 數量, 單位, 捐贈者姓名, 聯絡電話, Email, 配送方式, 送達地址, 預計送達時間, 備註, 狀態, 捐贈時間
匯入讀取: 網格代碼, 物資名稱, 數量, 單位, 捐贈者姓名, 聯絡電話, Email, 配送方式, 送達地址, 預計送達時間, 備註
範本欄位: 網格代碼（必填）, 物資名稱（必填）, 數量, 單位, 捐贈者姓名（必填）, 聯絡電話, Email, 配送方式, 送達地址, 預計送達時間, 備註
```

**必填欄位**
- 捐贈者姓名 ✓
- 網格代碼 ✓
- 物資名稱 ✓

---

### 5. 用戶 (Users) ✅

**問題**
- 缺少範本 (template) 路由
- 匯入邏輯沒有支援範本格式（含必填標記）

**修復**
1. 新增 `/csv/template/users` 路由
2. 更新匯入邏輯支援兩種格式：
   - 範本格式：`姓名（必填）`, `Email（必填）`, `角色（user/admin/moderator）`
   - 匯出格式：`姓名`, `Email`, `角色`

**新增的範本路由**
```typescript
app.get('/csv/template/users', { preHandler: requirePermission('users', 'manage') }, async (req, reply) => {
  const template = stringify([{
    name: '王小明',
    email: 'user@example.com',
    role: 'user'
  }], {
    header: true,
    columns: {
      name: '姓名（必填）',
      email: 'Email（必填）',
      role: '角色（user/admin/moderator）'
    }
  });
  // ...
});
```

**欄位對應**
```
匯出欄位: ID, 姓名, Email, 角色, 黑名單, 註冊時間
匯入讀取: 姓名, Email, 角色
範本欄位: 姓名（必填）, Email（必填）, 角色（user/admin/moderator）
```

**必填欄位**
- 姓名 ✓
- Email ✓

---

### 6. 黑名單 (Blacklist) ✅

**問題**
- 缺少範本 (template) 路由
- 匯入邏輯沒有支援範本格式（含必填標記）

**修復**
1. 新增 `/csv/template/blacklist` 路由
2. 更新匯入邏輯支援兩種格式：
   - 範本格式：`Email（必填）`
   - 匯出格式：`Email`

**新增的範本路由**
```typescript
app.get('/csv/template/blacklist', { preHandler: requirePermission('blacklist', 'manage') }, async (req, reply) => {
  const template = stringify([{
    email: 'blacklisted@example.com'
  }], {
    header: true,
    columns: {
      email: 'Email（必填）'
    }
  });
  // ...
});
```

**欄位對應**
```
匯出欄位: ID, 姓名, Email, 角色, 加入黑名單時間
匯入讀取: Email
範本欄位: Email（必填）
```

**必填欄位**
- Email ✓

**備註**
- 黑名單匯入的邏輯是將既有用戶標記為黑名單，因此只需要 Email 即可

---

### 7. 公告 (Announcements) ✅

**問題**
- 缺少範本 (template) 路由
- 匯入邏輯沒有支援範本格式（含必填標記）

**修復**
1. 新增 `/csv/template/announcements` 路由
2. 更新匯入邏輯支援兩種格式：
   - 範本格式：`標題（必填）`, `內容`, `優先級（low/normal/high）`, `狀態（active/inactive）`
   - 匯出格式：`標題`, `內容`, `優先級`, `狀態`

**新增的範本路由**
```typescript
app.get('/csv/template/announcements', { preHandler: requirePermission('announcements', 'manage') }, async (req, reply) => {
  const template = stringify([{
    title: '緊急公告',
    body: '公告內容',
    priority: 'normal',
    status: 'active'
  }], {
    header: true,
    columns: {
      title: '標題（必填）',
      body: '內容',
      priority: '優先級（low/normal/high）',
      status: '狀態（active/inactive）'
    }
  });
  // ...
});
```

**欄位對應**
```
匯出欄位: ID, 標題, 內容, 優先級, 狀態, 建立時間, 更新時間
匯入讀取: 標題, 內容, 優先級, 狀態
範本欄位: 標題（必填）, 內容, 優先級（low/normal/high）, 狀態（active/inactive）
```

**必填欄位**
- 標題 ✓

**備註**
- 內容 (body) 為選填，預設空字串
- 優先級預設 'normal'
- 狀態預設 'active'

---

## 修復原則總結

### 1. 欄位一致性
- ✅ 匯出的欄位標題必須與匯入邏輯讀取的欄位名稱完全一致
- ✅ 範本格式與匯出格式都能被匯入邏輯正確識別

### 2. 系統自動生成欄位
以下欄位在匯入時應該忽略（由系統自動生成）：
- ID（所有資料表）
- 建立時間 / 註冊時間 / 報名時間 / 捐贈時間
- 更新時間
- 狀態（部分資料表）
- 已登記人數（網格）
- 黑名單標記（用戶匯出時包含，但匯入時不處理）

### 3. 可選欄位預設值
所有可選欄位都提供預設值（通常是空字串 `''` 或預設數值）：
- 電話 → ''
- Email → ''
- 描述/備註 → ''
- 縣市/鄉鎮區 → ''
- 數量 → 1
- 優先級 → 'normal'
- 狀態 → 'active'
- 角色 → 'user'

### 4. 必填欄位驗證
只有真正必須的欄位才驗證為必填：

| 功能 | 必填欄位 |
|------|---------|
| 網格 | 網格代碼, 類型, 災區名稱, 緯度, 經度 |
| 災區 | 災區名稱, 緯度, 經度 |
| 志工 | 志工姓名, 網格代碼 |
| 物資 | 捐贈者姓名, 網格代碼, 物資名稱 |
| 用戶 | 姓名, Email |
| 黑名單 | Email |
| 公告 | 標題 |

### 5. 範本路由完整性
所有功能都提供範本路由，方便使用者下載正確格式的 CSV 範本：

| 功能 | 範本路由 | 狀態 |
|------|---------|------|
| 網格 | GET /csv/template/grids | ✅ 已存在 |
| 災區 | GET /csv/template/areas | ✅ 已存在 |
| 志工 | GET /csv/template/volunteers | ✅ 已存在 |
| 物資 | GET /csv/template/supplies | ✅ 已存在 |
| 用戶 | GET /csv/template/users | ✅ 新增 |
| 黑名單 | GET /csv/template/blacklist | ✅ 新增 |
| 公告 | GET /csv/template/announcements | ✅ 新增 |

---

## 建置驗證

```bash
cd packages/backend
npm run build
```

**結果**: ✅ 建置成功，無錯誤

---

## 測試建議

### 1. 網格測試
```bash
# 1. 匯出網格資料
GET /csv/export/grids

# 2. 將匯出的 CSV 直接匯入（應該成功，略過重複）
POST /csv/import/grids
{
  "csv": "[匯出的內容]",
  "skipDuplicates": true
}
```

### 2. 災區測試
```bash
# 1. 匯出災區資料
GET /csv/export/areas

# 2. 將匯出的 CSV 直接匯入（應該成功，略過重複）
POST /csv/import/areas
{
  "csv": "[匯出的內容]",
  "skipDuplicates": true
}
```

### 3. 志工測試
```bash
# 1. 匯出志工資料
GET /csv/export/volunteers

# 2. 將匯出的 CSV 直接匯入（應該成功，略過重複）
POST /csv/import/volunteers
{
  "csv": "[匯出的內容]",
  "skipDuplicates": true
}
```

### 4. 物資測試
```bash
# 1. 匯出物資資料
GET /csv/export/supplies

# 2. 將匯出的 CSV 直接匯入（應該成功，略過重複）
POST /csv/import/supplies
{
  "csv": "[匯出的內容]",
  "skipDuplicates": true
}
```

### 5. 用戶測試
```bash
# 1. 下載範本
GET /csv/template/users

# 2. 匯出用戶資料
GET /csv/export/users

# 3. 將匯出的 CSV 直接匯入（應該成功，略過重複）
POST /csv/import/users
{
  "csv": "[匯出的內容]",
  "skipDuplicates": true
}
```

### 6. 黑名單測試
```bash
# 1. 下載範本
GET /csv/template/blacklist

# 2. 匯出黑名單資料
GET /csv/export/blacklist

# 3. 將匯出的 CSV 直接匯入（應該成功，略過重複）
POST /csv/import/blacklist
{
  "csv": "[匯出的內容]"
}
```

### 7. 公告測試
```bash
# 1. 下載範本
GET /csv/template/announcements

# 2. 匯出公告資料
GET /csv/export/announcements

# 3. 將匯出的 CSV 直接匯入（應該成功，略過重複）
POST /csv/import/announcements
{
  "csv": "[匯出的內容]",
  "skipDuplicates": true
}
```

---

## 修復檔案清單

- `packages/backend/src/routes/csv.ts`

---

## 相關文件

- API 路由：`packages/backend/src/routes/csv.ts`
- 權限中介軟體：`packages/backend/src/middlewares/PermissionMiddleware.ts`
- 審計日誌：`packages/backend/src/lib/audit-logger.ts`
