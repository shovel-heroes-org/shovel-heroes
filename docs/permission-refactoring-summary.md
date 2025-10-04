# 權限系統重構總結

## 目標
移除所有硬編碼的權限檢查，確保所有權限判斷都透過 `usePermission` hook 和資料庫的 `role_permissions` 表來控制，實現**權限授權設定是絕對的權限控制中心**。

## 已完成的修正

### 1. Admin.jsx 重構

#### 移除的硬編碼檢查
- 第 90 行: 移除 `isRealSuperAdmin = user && user.role === 'super_admin'` 硬編碼角色檢查
- 第 206 行: 改用 `canView('users')` 取代 `isAdmin` 判斷載入管理員用戶列表
- 第 240 行: 改用 `canView('blacklist')` 取代 `isSuperAdmin` 判斷載入黑名單用戶
- 第 485 行: 改用 `canView('audit_logs')` 取代 `isSuperAdmin` 判斷載入審計日誌
- 第 567 行: 使用 `canDeleteGrid(grid)` 函數取代 `isAdmin` 硬編碼檢查

#### 保留的權限檢查函數
以下函數繼續使用 `usePermission` hook：
- `canView()` - 檢視權限
- `canCreate()` - 建立權限
- `canEdit()` - 編輯權限
- `canDelete()` - 刪除權限
- `canManage()` - 管理權限
- `canEditGrid(grid)` - 網格編輯權限（考慮資源所有權）
- `canDeleteGrid(grid)` - 網格刪除權限（考慮資源所有權）

### 2. GridDetailModal.jsx 檢查

#### 保留的角色顯示
- 第 753-756 行: 角色標籤顯示（純 UI，可接受）
  - 顯示「超級管理員」、「管理員」、「格主」、「志工」等標籤
  - 這些是顯示性內容，不涉及功能權限控制

#### 保留的資料欄位
- 第 274 行: `author_role: user?.role || 'volunteer'`
  - 這是存儲到資料庫的欄位，而非權限判斷

### 3. Layout.jsx 檢查

#### 保留的 UI 控制
- 第 87 行: `actingRole !== 'guest'` - 控制導航選單顯示
- 第 170-209 行: 角色相關的 UI 顯示
  - 頭像光環顏色
  - 視角切換器
  - 角色標籤顯示

#### 說明
Layout.jsx 的角色檢查都是用於 UI 顯示控制，而非功能性權限判斷，因此可以接受。

## 已定義的權限鍵值

**基礎管理**
- `disaster_areas` - 災區管理
- `grids` - 網格管理

**人員管理**
- `volunteers` - 志工管理
- `volunteer_registrations` - 志工報名

**資源管理**
- `supplies` - 物資管理

**資訊管理**
- `announcements` - 公告管理

**系統管理**
- `users` - 使用者管理
- `blacklist` - 黑名單管理
- `role_permissions` - 權限設定
- `audit_logs` - 稽核日誌
- `system_settings` - 系統設定
- `admin_panel` - 管理後台

**垃圾桶管理**
- `trash_grids` - 網格垃圾桶
- `trash_areas` - 災區垃圾桶

**個人管理**
- `profile` - 個人資料
- `my_resources` - 我的資源（用於檢查資源所有權）

## 權限檢查原則

### 功能性權限檢查（必須使用 usePermission）
- 資料載入判斷
- 操作按鈕顯示/隱藏
- API 呼叫前的權限驗證
- 頁籤/區塊的顯示控制
- 批量操作權限

### 顯示性內容（可以使用角色判斷）
- 標籤文字（如「超級管理員」、「管理員」）
- 標籤顏色
- 圖示樣式
- UI 裝飾（如頭像光環）
- 統計數字顯示

## 總結

本次重構成功實現了**權限授權設定是絕對的權限控制中心**的目標：

1. 移除所有硬編碼的角色檢查
2. 統一使用 `usePermission` hook 進行權限判斷
3. 保留合理的 UI 顯示性角色判斷
4. 實現資源所有權的細緻化控制
5. 確保前後端權限定義一致

現在所有功能性權限都由資料庫的 `role_permissions` 表控制，管理員可以透過「權限設定」頁面動態調整權限，無需修改程式碼。
