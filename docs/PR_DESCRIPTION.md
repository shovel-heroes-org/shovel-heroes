# 完整權限管理系統與上游整合 - 保留隱私保護機制

## 📋 概述

本 PR 整合上游最新更新，同時引入完整的**角色權限管理系統（RBAC）**與**管理後台功能**，提供細緻的權限控制、隱私保護機制、審計日誌、CSV 匯入匯出等企業級管理功能。

### 整合範圍
- ✅ 整合上游 main 分支最新更新（commit 84e2965）
- ✅ 保留完整的權限管理系統
- ✅ 保留完整的隱私保護機制
- ✅ 合併上游業務邏輯變更
- ✅ 無衝突合併

**統計資料：**
- 總變更檔案：82 個
- 新增程式碼：23,482 行
- 修改程式碼：1,263 行
- 新增檔案：50 個
- 修改檔案：32 個

---

## 🎯 主要功能

### 1. 角色權限管理系統 (RBAC)

#### 1.1 角色定義

系統支援 5 種角色，權限從低到高：

| 角色 | 英文名稱 | 說明 | 主要權限 |
|------|---------|------|---------|
| 訪客 | `guest` | 未登入使用者 | 僅檢視公開資訊 |
| 一般用戶 | `user` | 已登入使用者 | 建立/編輯自己的資源 |
| 網格管理員 | `grid_manager` | 網格負責人 | 管理網格相關資源 |
| 管理員 | `admin` | 系統管理員 | 完整管理權限（除系統設定外） |
| 超級管理員 | `super_admin` | 最高權限 | 所有權限包含系統設定 |

#### 1.2 權限項目分類

權限項目依功能分為 6 大類別：

| 分類 | 權限項目數量 | 說明 |
|------|-------------|------|
| **系統管理** | 4 項 | 後台訪問、日誌管理、權限設定、黑名單管理 |
| **基礎管理** | 2 項 | 災區管理、網格管理 |
| **資源管理** | 2 項 | 物資管理、物資狀態管理 |
| **人員管理** | 4 項 | 使用者管理、志工報名、志工管理、志工狀態管理 |
| **隱私權限** | 3 項 | 檢視捐贈者/網格/志工聯絡資訊 |
| **垃圾桶管理** | 4 項 | 公告/災區/網格/物資垃圾桶 |
| **內容管理** | 1 項 | 公告管理 |

**總計：20 個權限項目**

#### 1.3 權限動作類型

每個權限項目包含 5 種動作：

| 動作 | 欄位名稱 | 說明 |
|------|---------|------|
| 檢視 | `can_view` | 可以查看資料 |
| 建立 | `can_create` | 可以新增資料 |
| 編輯 | `can_edit` | 可以修改資料 |
| 刪除 | `can_delete` | 可以刪除資料 |
| 管理 | `can_manage` | 完整管理權限（包含狀態變更等） |

---

## 📊 權限設定詳細表格

### 權限管理 > 系統管理 > 後台訪問

| 角色 | 檢視 | 建立 | 編輯 | 刪除 | 管理 | 說明 |
|------|------|------|------|------|------|------|
| 訪客 | ❌ | ❌ | ❌ | ❌ | ❌ | 無後台訪問權限 |
| 一般用戶 | ✅ | ❌ | ❌ | ❌ | ❌ | 可訪問管理後台但功能受限 |
| 網格管理員 | ✅ | ❌ | ❌ | ❌ | ❌ | 可訪問管理後台檢視網格相關資料 |
| 管理員 | ✅ | ✅ | ✅ | ✅ | ✅ | 完整後台管理權限 |
| 超級管理員 | ✅ | ✅ | ✅ | ✅ | ✅ | 完整後台管理權限 |

### 權限管理 > 內容管理 > 公告管理

| 角色 | 檢視 | 建立 | 編輯 | 刪除 | 管理 | 說明 |
|------|------|------|------|------|------|------|
| 訪客 | ❌ | ❌ | ❌ | ❌ | ❌ | 無公告管理權限 |
| 一般用戶 | ❌ | ❌ | ❌ | ❌ | ❌ | 無公告管理權限 |
| 網格管理員 | ✅ | ❌ | ❌ | ❌ | ❌ | 可檢視公告但不可建立或編輯 |
| 管理員 | ✅ | ✅ | ✅ | ✅ | ✅ | 完整公告管理權限 |
| 超級管理員 | ✅ | ✅ | ✅ | ✅ | ✅ | 完整公告管理權限 |

### 權限管理 > 基礎管理 > 災區管理

| 角色 | 檢視 | 建立 | 編輯 | 刪除 | 管理 | 說明 |
|------|------|------|------|------|------|------|
| 訪客 | ✅ | ❌ | ❌ | ❌ | ❌ | 可檢視災區列表和詳細資訊 |
| 一般用戶 | ✅ | ❌ | ❌ | ❌ | ❌ | 可檢視災區列表和詳細資訊 |
| 網格管理員 | ✅ | ❌ | ✅ | ❌ | ❌ | 可檢視和編輯災區資訊 |
| 管理員 | ✅ | ✅ | ✅ | ✅ | ✅ | 完整災區管理權限 |
| 超級管理員 | ✅ | ✅ | ✅ | ✅ | ✅ | 完整災區管理權限 |

### 權限管理 > 基礎管理 > 網格管理

| 角色 | 檢視 | 建立 | 編輯 | 刪除 | 管理 | 說明 |
|------|------|------|------|------|------|------|
| 訪客 | ✅ | ❌ | ❌ | ❌ | ❌ | 可檢視網格資訊 |
| 一般用戶 | ✅ | ✅ | ✅ | ❌ | ❌ | 可檢視、建立並編輯自己的網格 |
| 網格管理員 | ✅ | ✅ | ✅ | ✅ | ❌ | 可檢視、建立、編輯和刪除網格 |
| 管理員 | ✅ | ✅ | ✅ | ✅ | ✅ | 完整網格管理權限 |
| 超級管理員 | ✅ | ✅ | ✅ | ✅ | ✅ | 完整網格管理權限 |

### 權限管理 > 資源管理 > 物資管理

| 角色 | 檢視 | 建立 | 編輯 | 刪除 | 管理 | 說明 |
|------|------|------|------|------|------|------|
| 訪客 | ✅ | ❌ | ❌ | ❌ | ❌ | 可檢視物資資訊 |
| 一般用戶 | ✅ | ✅ | ✅ | ❌ | ❌ | 可檢視、建立需求並編輯自己的物資 |
| 網格管理員 | ✅ | ✅ | ✅ | ❌ | ❌ | 可檢視、建立和編輯物資需求 |
| 管理員 | ✅ | ✅ | ✅ | ✅ | ❌ | 可檢視、建立、編輯和刪除物資 |
| 超級管理員 | ✅ | ✅ | ✅ | ✅ | ✅ | 完整物資管理權限 |

### 權限管理 > 資源管理 > 物資狀態管理

| 角色 | 檢視 | 建立 | 編輯 | 刪除 | 管理 | 說明 |
|------|------|------|------|------|------|------|
| 訪客 | ❌ | ❌ | ❌ | ❌ | ❌ | 不可管理物資狀態 |
| 一般用戶 | ✅ | ❌ | ❌ | ❌ | ❌ | 可檢視物資狀態 |
| 網格管理員 | ✅ | ❌ | ❌ | ❌ | ❌ | 可檢視物資狀態 |
| 管理員 | ✅ | ❌ | ❌ | ❌ | ❌ | 可檢視物資狀態 |
| 超級管理員 | ✅ | ❌ | ❌ | ❌ | ✅ | 可完整管理物資狀態 |

### 權限管理 > 人員管理 > 使用者管理

| 角色 | 檢視 | 建立 | 編輯 | 刪除 | 管理 | 說明 |
|------|------|------|------|------|------|------|
| 訪客 | ❌ | ❌ | ❌ | ❌ | ❌ | 無使用者管理權限 |
| 一般用戶 | ❌ | ❌ | ❌ | ❌ | ❌ | 無使用者管理權限 |
| 網格管理員 | ❌ | ❌ | ❌ | ❌ | ❌ | 無使用者管理權限 |
| 管理員 | ✅ | ✅ | ✅ | ✅ | ✅ | 完整使用者管理權限 |
| 超級管理員 | ✅ | ✅ | ✅ | ✅ | ✅ | 完整使用者管理權限 |

### 權限管理 > 人員管理 > 志工報名

| 角色 | 檢視 | 建立 | 編輯 | 刪除 | 管理 | 說明 |
|------|------|------|------|------|------|------|
| 訪客 | ❌ | ❌ | ❌ | ❌ | ❌ | 無志工報名權限 |
| 一般用戶 | ✅ | ✅ | ✅ | ❌ | ❌ | 可檢視、建立並編輯自己的報名 |
| 網格管理員 | ✅ | ✅ | ✅ | ❌ | ❌ | 可檢視、建立和編輯志工報名 |
| 管理員 | ✅ | ✅ | ✅ | ❌ | ✅ | 可檢視、建立、編輯和管理志工報名 |
| 超級管理員 | ✅ | ✅ | ✅ | ❌ | ✅ | 可檢視、建立、編輯和管理志工報名 |

### 權限管理 > 人員管理 > 志工管理

| 角色 | 檢視 | 建立 | 編輯 | 刪除 | 管理 | 說明 |
|------|------|------|------|------|------|------|
| 訪客 | ❌ | ❌ | ❌ | ❌ | ❌ | 無志工管理權限 |
| 一般用戶 | ✅ | ❌ | ❌ | ❌ | ❌ | 可檢視志工列表 |
| 網格管理員 | ✅ | ❌ | ❌ | ❌ | ✅ | 可完整管理志工 |
| 管理員 | ✅ | ❌ | ❌ | ❌ | ✅ | 可完整管理志工 |
| 超級管理員 | ✅ | ❌ | ❌ | ❌ | ✅ | 可完整管理志工 |

### 權限管理 > 人員管理 > 志工狀態管理

| 角色 | 檢視 | 建立 | 編輯 | 刪除 | 管理 | 說明 |
|------|------|------|------|------|------|------|
| 訪客 | ❌ | ❌ | ❌ | ❌ | ❌ | 不可管理志工狀態 |
| 一般用戶 | ✅ | ❌ | ❌ | ❌ | ❌ | 可檢視志工狀態 |
| 網格管理員 | ✅ | ❌ | ❌ | ❌ | ✅ | 可完整管理志工狀態 |
| 管理員 | ✅ | ❌ | ❌ | ❌ | ✅ | 可完整管理志工狀態 |
| 超級管理員 | ✅ | ❌ | ❌ | ❌ | ✅ | 可完整管理志工狀態 |

### 權限管理 > 隱私權限 > 檢視捐贈者聯絡資訊

| 角色 | 檢視 | 說明 |
|------|------|------|
| 訪客 | ❌ | 不可檢視捐贈者聯絡資訊 |
| 一般用戶 | ✅ | 可檢視捐贈者聯絡資訊 |
| 網格管理員 | ✅ | 可檢視捐贈者聯絡資訊 |
| 管理員 | ✅ | 可檢視捐贈者聯絡資訊 |
| 超級管理員 | ✅ | 可檢視捐贈者聯絡資訊 |

### 權限管理 > 隱私權限 > 檢視網格聯絡資訊

| 角色 | 檢視 | 說明 |
|------|------|------|
| 訪客 | ✅ | 可檢視網格聯絡資訊 |
| 一般用戶 | ✅ | 可檢視網格聯絡資訊 |
| 網格管理員 | ✅ | 可檢視網格聯絡資訊 |
| 管理員 | ✅ | 可檢視網格聯絡資訊 |
| 超級管理員 | ✅ | 可檢視網格聯絡資訊 |

### 權限管理 > 隱私權限 > 檢視志工聯絡資訊

| 角色 | 檢視 | 說明 |
|------|------|------|
| 訪客 | ❌ | 不可檢視志工聯絡資訊 |
| 一般用戶 | ✅ | 可檢視志工聯絡資訊 |
| 網格管理員 | ✅ | 可檢視志工聯絡資訊 |
| 管理員 | ✅ | 可檢視志工聯絡資訊 |
| 超級管理員 | ✅ | 可檢視志工聯絡資訊 |

### 權限管理 > 垃圾桶管理 > 公告垃圾桶

| 角色 | 檢視 | 還原 | 永久刪除 | 說明 |
|------|------|------|---------|------|
| 訪客 | ❌ | ❌ | ❌ | 無權限存取公告垃圾桶 |
| 一般用戶 | ❌ | ❌ | ❌ | 無權限存取公告垃圾桶 |
| 網格管理員 | ✅ | ✅ | ❌ | 可檢視公告垃圾桶並還原 |
| 管理員 | ✅ | ✅ | ❌ | 可檢視公告垃圾桶並還原 |
| 超級管理員 | ✅ | ✅ | ✅ | 可檢視、還原和永久刪除公告 |

### 權限管理 > 垃圾桶管理 > 災區垃圾桶

| 角色 | 檢視 | 還原 | 永久刪除 | 管理 | 說明 |
|------|------|------|---------|------|------|
| 訪客 | ❌ | ❌ | ❌ | ❌ | 無權限存取災區垃圾桶 |
| 一般用戶 | ❌ | ❌ | ❌ | ❌ | 無權限存取災區垃圾桶 |
| 網格管理員 | ✅ | ✅ | ❌ | ❌ | 可檢視災區垃圾桶並還原 |
| 管理員 | ✅ | ✅ | ❌ | ✅ | 可檢視、還原和管理災區垃圾桶 |
| 超級管理員 | ✅ | ✅ | ✅ | ✅ | 完整災區垃圾桶管理權限 |

### 權限管理 > 垃圾桶管理 > 網格垃圾桶

| 角色 | 檢視 | 還原 | 永久刪除 | 管理 | 說明 |
|------|------|------|---------|------|------|
| 訪客 | ❌ | ❌ | ❌ | ❌ | 無權限存取網格垃圾桶 |
| 一般用戶 | ❌ | ❌ | ❌ | ❌ | 無權限存取網格垃圾桶 |
| 網格管理員 | ✅ | ✅ | ❌ | ❌ | 可檢視網格垃圾桶並還原 |
| 管理員 | ✅ | ✅ | ❌ | ✅ | 可檢視、還原和管理網格垃圾桶 |
| 超級管理員 | ✅ | ✅ | ✅ | ✅ | 完整網格垃圾桶管理權限 |

### 權限管理 > 垃圾桶管理 > 物資垃圾桶

| 角色 | 檢視 | 還原 | 永久刪除 | 管理 | 說明 |
|------|------|------|---------|------|------|
| 訪客 | ❌ | ❌ | ❌ | ❌ | 無權限存取物資垃圾桶 |
| 一般用戶 | ✅ | ✅ (僅自己的) | ❌ | ❌ | 可檢視垃圾桶並還原自己的物資 |
| 網格管理員 | ✅ | ✅ | ❌ | ❌ | 可檢視物資垃圾桶並還原 |
| 管理員 | ✅ | ✅ | ❌ | ✅ | 可檢視、還原和管理物資垃圾桶 |
| 超級管理員 | ✅ | ✅ | ✅ | ✅ | 完整物資垃圾桶管理權限 |

### 權限管理 > 系統管理 > 日誌管理

| 角色 | 檢視 | 管理 | 說明 |
|------|------|------|------|
| 訪客 | ❌ | ❌ | 無日誌存取權限 |
| 一般用戶 | ❌ | ❌ | 無日誌存取權限 |
| 網格管理員 | ❌ | ❌ | 無日誌存取權限 |
| 管理員 | ❌ | ❌ | 無日誌存取權限 |
| 超級管理員 | ✅ | ✅ | 可檢視和管理日誌 |

### 權限管理 > 系統管理 > 黑名單管理

| 角色 | 檢視 | 刪除 | 管理 | 說明 |
|------|------|------|------|------|
| 訪客 | ❌ | ❌ | ❌ | 無黑名單管理權限 |
| 一般用戶 | ❌ | ❌ | ❌ | 無黑名單管理權限 |
| 網格管理員 | ❌ | ❌ | ❌ | 無黑名單管理權限 |
| 管理員 | ✅ | ✅ | ✅ | 可檢視、刪除和管理黑名單 |
| 超級管理員 | ✅ | ✅ | ✅ | 完整黑名單管理權限 |

### 權限管理 > 系統管理 > 權限設定

| 角色 | 檢視 | 編輯 | 管理 | 說明 |
|------|------|------|------|------|
| 訪客 | ❌ | ❌ | ❌ | 無權限設定存取權 |
| 一般用戶 | ❌ | ❌ | ❌ | 無權限設定存取權 |
| 網格管理員 | ❌ | ❌ | ❌ | 無權限設定存取權 |
| 管理員 | ✅ | ❌ | ❌ | 可檢視但不可修改權限設定 |
| 超級管理員 | ✅ | ✅ | ✅ | 可檢視、編輯和管理權限設定 |

---

## 🗄️ 資料庫結構

### 新增資料表

#### 1. `role_permissions` - 角色權限設定表

**用途：** 儲存各角色對各功能的權限設定

**欄位說明：**

| 欄位名稱 | 資料型態 | 必填 | 預設值 | 說明 |
|---------|---------|-----|-------|------|
| `id` | SERIAL | ✅ | AUTO | 主鍵 |
| `role` | TEXT | ✅ | - | 角色名稱 (`guest`, `user`, `grid_manager`, `admin`, `super_admin`) |
| `permission_key` | TEXT | ✅ | - | 權限鍵值（如 `grids`, `supplies`） |
| `permission_name` | TEXT | ✅ | - | 權限顯示名稱 |
| `permission_category` | TEXT | ✅ | - | 權限分類 |
| `can_view` | INTEGER | ✅ | 0 | 檢視權限 (0/1) |
| `can_create` | INTEGER | ✅ | 0 | 建立權限 (0/1) |
| `can_edit` | INTEGER | ✅ | 0 | 編輯權限 (0/1) |
| `can_delete` | INTEGER | ✅ | 0 | 刪除權限 (0/1) |
| `can_manage` | INTEGER | ✅ | 0 | 管理權限 (0/1) |
| `description` | TEXT | ❌ | NULL | 權限說明 |
| `created_at` | TIMESTAMPTZ | ✅ | NOW() | 建立時間 |
| `updated_at` | TIMESTAMPTZ | ✅ | NOW() | 更新時間 |

**索引：**
- `idx_role_permissions_role` - 角色索引
- `idx_role_permissions_key` - 權限鍵值索引
- `idx_role_permissions_role_key` - 角色+權限鍵值複合索引
- `UNIQUE(role, permission_key)` - 唯一約束

**初始資料：** 797 行 SQL，包含所有角色的完整權限設定

#### 2. `http_audit_logs` - HTTP 請求審計日誌表

**用途：** 記錄所有 API 請求供技術除錯和效能分析

**欄位說明：**

| 欄位名稱 | 資料型態 | 說明 |
|---------|---------|------|
| `id` | SERIAL | 主鍵 |
| `timestamp` | TIMESTAMPTZ | 請求時間 |
| `method` | TEXT | HTTP 方法 |
| `url` | TEXT | 請求 URL |
| `status_code` | INTEGER | 回應狀態碼 |
| `response_time` | INTEGER | 回應時間（毫秒） |
| `user_id` | TEXT | 使用者 ID |
| `user_role` | TEXT | 使用者角色 |
| `ip_address` | TEXT | IP 位址 |
| `user_agent` | TEXT | User Agent |
| `request_body` | TEXT | 請求內容 |
| `response_body` | TEXT | 回應內容 |
| `error_message` | TEXT | 錯誤訊息 |

### 現有資料表修改

#### 1. `users` 表新增欄位

| 欄位名稱 | 資料型態 | 預設值 | 說明 |
|---------|---------|-------|------|
| `role` | TEXT | `'user'` | 使用者角色 |
| `is_blacklisted` | BOOLEAN | FALSE | 是否被加入黑名單 |
| `updated_at` | TIMESTAMPTZ | NOW() | 更新時間 |

#### 2. `grids` 表新增欄位

| 欄位名稱 | 資料型態 | 預設值 | 說明 |
|---------|---------|-------|------|
| `is_deleted` | BOOLEAN | FALSE | 軟刪除標記 |
| `deleted_at` | TIMESTAMPTZ | NULL | 刪除時間 |
| `deleted_by_id` | TEXT | NULL | 刪除者 ID |
| `updated_at` | TIMESTAMPTZ | NOW() | 更新時間 |

#### 3. `disaster_areas` 表新增欄位

| 欄位名稱 | 資料型態 | 預設值 | 說明 |
|---------|---------|-------|------|
| `is_deleted` | BOOLEAN | FALSE | 軟刪除標記 |
| `deleted_at` | TIMESTAMPTZ | NULL | 刪除時間 |
| `deleted_by_id` | TEXT | NULL | 刪除者 ID |
| `updated_at` | TIMESTAMPTZ | NOW() | 更新時間 |

#### 4. `announcements` 表新增欄位

| 欄位名稱 | 資料型態 | 預設值 | 說明 |
|---------|---------|-------|------|
| `is_deleted` | BOOLEAN | FALSE | 軟刪除標記 |
| `deleted_at` | TIMESTAMPTZ | NULL | 刪除時間 |
| `status` | TEXT | `'active'` | 狀態（active/archived） |

#### 5. `supply_donations` 表新增欄位

| 欄位名稱 | 資料型態 | 預設值 | 說明 |
|---------|---------|-------|------|
| `is_deleted` | BOOLEAN | FALSE | 軟刪除標記 |
| `deleted_at` | TIMESTAMPTZ | NULL | 刪除時間 |
| `deleted_by_id` | TEXT | NULL | 刪除者 ID |
| `status` | TEXT | `'pending'` | 物資狀態 |
| `donor_name` | TEXT | NULL | 捐贈者姓名 |
| `donor_phone` | TEXT | NULL | 捐贈者電話 |
| `donor_contact_info` | TEXT | NULL | 捐贈者聯絡資訊 |
| `notes` | TEXT | NULL | 備註 |

---

## 🔧 後端新增功能

### 1. 中介軟體 (Middlewares)

#### `AuthMiddleware.ts` (226 行)
- `requireAuth()` - 要求使用者登入
- `requireAdmin()` - 要求管理員權限
- `requireSuperAdmin()` - 要求超級管理員權限
- `requireOwnerOrAdmin()` - 要求資源擁有者或管理員
- `requirePermission()` - 靈活的權限檢查
- `checkResourcePermission()` - 從資料庫檢查權限
- `canModifyResource()` - 檢查是否可修改資源
- `canDeleteResource()` - 檢查是否可刪除資源

#### `PermissionMiddleware.ts` (203 行)
- 提供權限檢查的輔助函數
- 整合資料庫權限查詢

#### `AuditLogMiddleware.ts` (升級版，138 行)
- HTTP 請求審計日誌
- 自動記錄所有 API 請求
- 記錄請求/回應內容、效能指標
- 用於技術除錯和效能分析

### 2. API 路由

#### `routes/permissions.ts` (712 行)
**權限管理 API**

- `GET /api/permissions` - 取得所有權限設定
- `GET /api/permissions/role/:role` - 取得特定角色權限
- `GET /api/permissions/categories` - 取得權限分類
- `GET /api/permissions/check` - 檢查特定權限
- `GET /api/permissions/for-role` - 批量取得角色權限
- `PATCH /api/permissions/:id` - 更新單一權限
- `POST /api/permissions/batch-update` - 批次更新權限
- `POST /api/permissions/reset-role` - 重置角色權限
- `GET /api/permissions/export` - 匯出權限 CSV
- `POST /api/permissions/import` - 匯入權限 CSV

#### `routes/admin.ts` (1,343 行)
**管理後台 API**

- 使用者管理
- 黑名單管理
- 公告管理（含垃圾桶）
- 災區管理（含垃圾桶）
- 網格管理（含垃圾桶）
- 物資管理（含垃圾桶）
- 志工管理
- CSV 匯入匯出

#### `routes/csv.ts` (2,213 行)
**CSV 匯入匯出功能**

- 災區 CSV 匯入/匯出
- 網格 CSV 匯入/匯出
- 物資 CSV 匯入/匯出
- 使用者 CSV 匯入/匯出
- 志工 CSV 匯入/匯出
- 公告 CSV 匯入/匯出
- 黑名單 CSV 匯入/匯出

#### `routes/http-audit-logs.ts` (377 行)
**HTTP 審計日誌 API**

- `GET /admin/http-audit-logs` - 取得日誌列表（支援分頁、篩選）
- `GET /admin/http-audit-logs/:id` - 取得日誌詳情
- `GET /admin/http-audit-logs/export` - 匯出日誌 CSV
- `DELETE /admin/http-audit-logs/clear` - 清除舊日誌
- `GET /admin/http-audit-logs/stats` - 取得統計資訊

#### `routes/audit-log.ts` (217 行)
**操作審計日誌 API**

- 記錄使用者操作行為
- 提供日誌查詢和分析

### 3. 隱私過濾系統

#### `lib/privacy-filter.ts` (408 行)
**隱私資訊過濾功能**

根據角色權限自動過濾敏感資訊：

- `filterVolunteerPrivacy()` - 過濾志工隱私資訊
- `filterVolunteersPrivacy()` - 批量過濾志工隱私
- `filterGridPrivacy()` - 過濾網格隱私資訊
- `filterSupplyPrivacy()` - 過濾物資隱私資訊

**過濾邏輯：**
- 有 `view_volunteer_contact` 權限 → 顯示完整聯絡資訊
- 無權限 → 隱藏電話、Email 等敏感資訊

### 4. 審計日誌系統

#### `lib/audit-logger.ts` (155 行)
**操作審計日誌記錄器**

- 記錄使用者操作（建立、修改、刪除）
- 追蹤資料變更歷史
- 提供合規性審計功能

---

## 🎨 前端新增功能

### 1. 權限管理介面

#### `components/admin/PermissionManagement.jsx` (709 行)
**權限設定管理介面**

功能：
- 視覺化權限矩陣表格
- 按角色/分類篩選權限
- 批量編輯權限
- 重置角色權限
- 匯入/匯出權限 CSV
- 即時權限預覽

#### `components/admin/EditPermissionModal.jsx` (212 行)
**權限編輯對話框**

- 編輯單一權限設定
- 5 種權限動作切換（檢視/建立/編輯/刪除/管理）
- 權限說明編輯

### 2. HTTP 審計日誌介面

#### `components/admin/HttpAuditLogs.jsx` (558 行)
**HTTP 審計日誌管理介面**

功能：
- 日誌列表展示（支援分頁）
- 多條件篩選（方法、狀態碼、使用者、時間範圍）
- 日誌詳情查看
- 統計資訊圖表
- 匯出 CSV
- 清除舊日誌

### 3. 管理後台升級

#### `pages/Admin.jsx` (大幅擴充，2,788 行)
**完整管理後台系統**

新增管理功能：
- ✅ 公告管理（含垃圾桶）
- ✅ 災區管理（含垃圾桶）
- ✅ 網格管理（含垃圾桶）
- ✅ 物資管理（含垃圾桶）
- ✅ 使用者管理
- ✅ 志工管理
- ✅ 權限設定
- ✅ HTTP 審計日誌
- ✅ 黑名單管理

#### `components/admin/AnnouncementManagement.jsx` (594 行)
**公告管理模組**

- 公告列表/新增/編輯/刪除
- 公告垃圾桶
- CSV 匯入/匯出

#### `components/admin/SupplyManagement.jsx` (1,739 行)
**物資管理模組**

功能：
- 物資列表展示（支援篩選、排序）
- 我的物資優先顯示
- 物資狀態管理（pending/in_progress/completed/cancelled）
- 捐贈資訊管理
- 隱私資訊過濾
- 物資垃圾桶
- CSV 匯入/匯出
- 詳細檢視模態框

### 4. 權限控制元件

#### `components/common/PermissionGate.jsx` (144 行)
**權限門控元件**

使用方式：
```jsx
<PermissionGate permission="grids" action="create">
  <button>建立網格</button>
</PermissionGate>
```

功能：
- 根據使用者權限顯示/隱藏元件
- 支援所有權限項目和動作
- 自動從後端取得權限設定

#### `components/common/UnauthorizedAccess.jsx` (69 行)
**無權限提示頁面**

- 友善的無權限提示訊息
- 引導使用者回到首頁或聯絡管理員

#### `components/common/LoginRequiredDialog.jsx` (58 行)
**登入要求對話框**

- 提示使用者登入才能使用功能
- 導向 LINE 登入

### 5. Hooks

#### `hooks/usePermission.js` (228 行)
**權限檢查 Hook**

使用方式：
```javascript
const { can, hasPermission, permissions, loading } = usePermission();

if (can('grids', 'create')) {
  // 顯示建立網格按鈕
}
```

功能：
- 從後端取得使用者權限
- 快取權限資料
- 提供便捷的權限檢查函數

#### `hooks/useRequireLogin.js` (40 行)
**登入檢查 Hook**

- 檢查使用者登入狀態
- 未登入時顯示登入對話框

### 6. API 整合

#### `src/api/permissions.js` (152 行)
**權限 API 客戶端**

- 包裝所有權限相關 API
- 提供權限查詢、更新、匯入匯出功能

#### `src/api/admin.js` (624 行)
**管理後台 API 客戶端**

- 包裝所有管理後台 API
- CSV 匯入匯出功能

#### `src/api/http-audit-logs.js` (55 行)
**HTTP 審計日誌 API 客戶端**

- 日誌查詢
- 統計資訊
- CSV 匯出

### 7. 視覺化元件

#### ViewModal 元件系列
- `GridViewModal.jsx` (326 行) - 網格詳細資訊檢視
- `SupplyDonationViewModal.jsx` (490 行) - 物資捐贈詳情檢視
- `SupplyRequestViewModal.jsx` (477 行) - 物資需求詳情檢視

#### 匯入匯出按鈕元件
- `AnnouncementImportExportButtons.jsx` (104 行)
- `AreaImportExportButtons.jsx` (111 行)
- `GridImportExportButtons.jsx` (71 行)
- `SupplyImportExportButtons.jsx` (98 行)
- `UserImportExportButtons.jsx` (98 行)
- `VolunteerImportExportButtons.jsx` (99 行)
- `BlacklistImportExportButtons.jsx` (98 行)

#### 編輯模態框元件
- `EditAreaModal.jsx` (183 行) - 災區編輯
- `EditSupplyRequestModal.jsx` (304 行) - 物資需求編輯
- `EditSupplyDonationModal.jsx` (350 行) - 物資捐贈編輯
- `EditVolunteerModal.jsx` (333 行) - 志工編輯

---

## 📁 檔案結構

### 後端新增/修改檔案

```
packages/backend/src/
├── lib/
│   ├── migrations/
│   │   ├── 006-role-permissions.sql          (新增, 797 行) - 權限設定 migration
│   │   ├── 007-add-announcements-status.sql  (新增, 13 行) - 公告狀態欄位
│   │   └── add-supply-donations-fields.ts    (新增, 48 行) - 物資欄位擴充
│   ├── audit-logger.ts                        (新增, 155 行) - 審計日誌記錄器
│   ├── privacy-filter.ts                      (新增, 408 行) - 隱私過濾系統
│   └── db-init.ts                             (修改) - 新增 role_permissions 表
├── middlewares/
│   ├── AuthMiddleware.ts                      (新增, 226 行) - 認證權限中介軟體
│   ├── PermissionMiddleware.ts                (新增, 203 行) - 權限檢查中介軟體
│   └── AuditLogMiddleware.ts                  (升級, 138 行) - HTTP 審計日誌
├── routes/
│   ├── permissions.ts                         (新增, 712 行) - 權限管理 API
│   ├── admin.ts                               (新增, 1,343 行) - 管理後台 API
│   ├── csv.ts                                 (新增, 2,213 行) - CSV 匯入匯出
│   ├── http-audit-logs.ts                     (新增, 377 行) - HTTP 日誌 API
│   ├── audit-log.ts                           (新增, 217 行) - 操作日誌 API
│   ├── auth-line.ts                           (修改, +37/-0) - 加入 role 支援
│   ├── grids.ts                               (修改, +343/-0) - 加入權限和垃圾桶
│   ├── supply-donations.ts                    (修改, +379/-0) - 加入隱私過濾
│   ├── volunteers.ts                          (修改, +260/-0) - 加入隱私過濾
│   └── volunteer-registrations.ts             (修改, +265/-0) - 加入隱私過濾
└── index.ts                                   (修改) - 註冊新路由
```

### 前端新增/修改檔案

```
src/
├── api/
│   ├── permissions.js                         (新增, 152 行) - 權限 API
│   ├── admin.js                               (新增, 624 行) - 管理 API
│   ├── http-audit-logs.js                     (新增, 55 行) - 日誌 API
│   └── rest/client.js                         (修改) - 加入 X-Acting-Role header
├── components/
│   ├── admin/
│   │   ├── PermissionManagement.jsx           (新增, 709 行)
│   │   ├── EditPermissionModal.jsx            (新增, 212 行)
│   │   ├── HttpAuditLogs.jsx                  (新增, 558 行)
│   │   ├── AnnouncementManagement.jsx         (新增, 594 行)
│   │   ├── SupplyManagement.jsx               (新增, 1,739 行)
│   │   ├── GridViewModal.jsx                  (新增, 326 行)
│   │   ├── SupplyDonationViewModal.jsx        (新增, 490 行)
│   │   ├── SupplyRequestViewModal.jsx         (新增, 477 行)
│   │   ├── EditAreaModal.jsx                  (新增, 183 行)
│   │   ├── EditSupplyRequestModal.jsx         (新增, 304 行)
│   │   ├── EditSupplyDonationModal.jsx        (新增, 350 行)
│   │   ├── EditVolunteerModal.jsx             (新增, 333 行)
│   │   ├── *ImportExportButtons.jsx           (新增, 7 個檔案)
│   │   ├── INTEGRATION-EXAMPLE.jsx            (新增, 438 行) - 整合範例
│   │   └── README-ViewModals.md               (新增, 442 行) - ViewModal 文件
│   ├── common/
│   │   ├── PermissionGate.jsx                 (新增, 144 行)
│   │   ├── UnauthorizedAccess.jsx             (新增, 69 行)
│   │   └── LoginRequiredDialog.jsx            (新增, 58 行)
│   └── examples/
│       └── PermissionExample.jsx              (新增, 212 行) - 權限使用範例
├── hooks/
│   ├── usePermission.js                       (新增, 228 行)
│   └── useRequireLogin.js                     (新增, 40 行)
├── pages/
│   ├── Admin.jsx                              (大幅擴充, +2,788 行)
│   ├── Supplies.jsx                           (修改, +392 行) - 加入權限控制
│   ├── Volunteers.jsx                         (修改, +212 行) - 加入權限控制
│   ├── Map.jsx                                (修改, +217 行) - 加入權限檢查
│   ├── Layout.jsx                             (修改, +206 行) - 加入角色顯示
│   └── RequestHelp.jsx                        (修改, +116 行) - 加入登入檢查
├── context/
│   └── AuthContext.jsx                        (修改, +123 行) - 加入角色管理
└── utils/
    └── importErrorHandler.js                  (新增, 62 行) - CSV 錯誤處理
```

---

## 🧪 測試

新增 Playwright 測試配置：

```
playwright.config.js                            (新增, 72 行)
tests/                                          (測試目錄)
```

---

## ✨ 主要改進

### 1. 安全性提升

- ✅ 完整的角色權限管理系統（RBAC）
- ✅ 細緻的操作權限控制（檢視/建立/編輯/刪除/管理）
- ✅ 隱私資訊過濾（根據角色自動過濾敏感資訊）
- ✅ HTTP 請求審計日誌（所有 API 請求追蹤）
- ✅ 操作審計日誌（使用者行為追蹤）
- ✅ 黑名單管理

### 2. 管理功能增強

- ✅ 視覺化權限管理介面
- ✅ 垃圾桶功能（軟刪除機制）
- ✅ CSV 批量匯入/匯出
- ✅ 完整的管理後台系統
- ✅ 物資狀態管理
- ✅ 志工狀態管理

### 3. 使用者體驗改善

- ✅ 權限門控元件（根據權限自動顯示/隱藏功能）
- ✅ 友善的無權限提示
- ✅ 詳細的資訊檢視模態框
- ✅ 批量操作支援
- ✅ 搜尋、篩選、排序功能

### 4. 開發者體驗

- ✅ 權限 Hook（`usePermission`）
- ✅ 登入檢查 Hook（`useRequireLogin`）
- ✅ 完整的 API 客戶端封裝
- ✅ 詳細的程式碼註解
- ✅ 範例程式碼（INTEGRATION-EXAMPLE.jsx）

---

## 🔍 向後相容性

本 PR 保持與上游 main 分支的完全相容：

- ✅ 不影響現有功能
- ✅ 預設權限設定寬鬆（訪客可檢視公開資訊）
- ✅ 現有使用者自動獲得 `user` 角色
- ✅ 可透過環境變數設定初始管理員

---

## 🚀 部署說明

### 環境變數

```bash
# 設定初始管理員（使用 LINE ID）
INITIAL_ADMIN_LINE_ID=line_U1234567890abcdef

# JWT Secret（必須設定）
AUTH_JWT_SECRET=your-secure-jwt-secret
```

### 資料庫 Migration

系統會自動執行以下 migrations：

1. `006-role-permissions.sql` - 建立權限表並設定初始權限
2. `007-add-announcements-status.sql` - 新增公告狀態欄位
3. `add-supply-donations-fields.ts` - 擴充物資欄位

### 首次啟動

1. 設定 `INITIAL_ADMIN_LINE_ID` 環境變數
2. 使用該 LINE 帳號登入
3. 系統自動賦予 `admin` 角色
4. 進入管理後台設定其他使用者角色


## 🎓 使用範例

### 前端權限檢查

```javascript
import { usePermission } from '@/hooks/usePermission';
import PermissionGate from '@/components/common/PermissionGate';

function MyComponent() {
  const { can } = usePermission();

  return (
    <div>
      {/* 方法 1: 使用 Hook */}
      {can('grids', 'create') && (
        <button>建立網格</button>
      )}

      {/* 方法 2: 使用 PermissionGate 元件 */}
      <PermissionGate permission="grids" action="edit">
        <button>編輯網格</button>
      </PermissionGate>
    </div>
  );
}
```

### 後端權限檢查

```typescript
import { requirePermission } from '../middlewares/AuthMiddleware.js';

// 使用中介軟體
app.post('/grids',
  { preHandler: requirePermission('grids', 'create') },
  async (req, reply) => {
    // 建立網格邏輯
  }
);

// 或手動檢查
import { checkResourcePermission } from '../middlewares/AuthMiddleware.js';

const hasPermission = await checkResourcePermission(
  app,
  userRole,
  'grids',
  'create'
);
```

---

## 🔄 與上游同步

### 最新整合狀態

本分支已整合上游 main 分支的最新更新（**commit 84e2965** - 2025-10-07），包括：

#### 上游新增功能
- ✅ **PR #98**: 物資過期時間顯示功能
  - 在 `GridDetailModal` 中顯示建立時間
  - 新增時間圖示展示
  - 檔案：`src/components/map/GridDetailModal.jsx`

- ✅ **PR #112**: AWS 部署流程優化
  - ES modules 匯入修復（加上 `.js` 副檔名）
  - GitHub Actions 部署工作流程改進
  - 參數化部署配置，使用 GitHub Secrets
  - 條件式跳過無 AWS 憑證的部署

#### 整合策略
1. **完整保留本地權限系統** - 所有 RBAC 功能不受影響
2. **完整保留隱私保護機制** - 所有隱私過濾邏輯完整整合
3. **合併上游業務邏輯** - 成功整合物資過期顯示功能
4. **無衝突合併** - 所有變更已成功合併，無遺留衝突

### 整合統計
- **總變更**: 79 個檔案
- **新增程式碼**: 21,032 行
- **刪除程式碼**: 1,270 行
- **整合基礎**: upstream/main @ 84e2965
- **整合分支**: merged/upstream-integration-20251006

### 差異分析報告
完整的整合分析請參閱：`docs/integration-analysis.md`

包含：
- 詳細功能差異列表
- 高風險衝突檔案分析
- 整合策略說明
- 測試計畫
- 風險評估與緩解措施

---

## 🔧 額外修正

### 1. 登入導航路徑統一 (commit 1bfd73e)

**問題：** `LoginRequiredDialog` 元件使用錯誤的登入路徑 `/api/auth/line/login`，導致 404 錯誤

**修正：**
- 統一使用 `User.login()` 方法，確保與右上角登入按鈕使用相同的 `${API_BASE}/auth/line/login` 路徑
- 修改檔案：`src/components/common/LoginRequiredDialog.jsx`

**影響範圍：**
- 所有使用 `LoginRequiredDialog` 的頁面（物資管理、志工中心、救援地圖等）
- 確保使用者點擊「前往登入」按鈕時能正確導向 LINE 登入頁面

### 2. 物資管理中心刪除功能調整

**變更：** 移除物資管理中心（`/supplies`）的刪除功能，僅保留在管理後台

**修正內容：**
- 移除 `Trash2` 圖示 import
- 移除刪除按鈕 UI 和權限邏輯
- 註解 `handleDeleteDonation` 函數
- 修改檔案：`src/pages/Supplies.jsx`

**設計考量：**
- 一般使用者在物資管理中心只能編輯物資
- 刪除功能僅限管理後台（需要 admin/super_admin 權限）
- 提升資料安全性，避免誤刪

---

## ✅ 檢查清單

### 整合狀態
- [x] 備份當前版本到 myfork
- [x] 更新上游最新程式碼
- [x] 比對衝突的檔案
- [x] 分析 diff 檔案差異
- [x] 完成整合分析報告 (`docs/integration-analysis.md`)
- [x] TypeScript 編譯無錯誤
- [x] Backend 建置成功
- [x] Frontend 建置成功
- [x] 無遺留衝突

### 功能測試
- [x] 資料庫 migration 測試
- [x] 權限系統測試
- [x] 隱私過濾測試
- [x] CSV 匯入匯出測試
- [x] 向後相容性確認

### 程式碼品質
- [x] 程式碼審查完成
- [x] 文件完整
- [x] 整合分析報告完成

### 待驗證項目
- [ ] Backend 單元測試
- [ ] Frontend E2E 測試 (Playwright)
- [ ] 生產環境部署測試
- [ ] 資料庫遷移驗證
- [ ] 效能測試

---

## 👥 相關 Issue

此 PR 解決/實現以下功能需求：

- 完整的權限管理系統
- 管理後台功能
- 垃圾桶機制（軟刪除）
- CSV 批量操作
- 審計日誌
- 隱私保護
- 角色管理

---

## 📧 聯絡方式

如有任何問題或建議，請聯絡專案維護者。

---

## 🚫 新增功能：黑名單系統 (2025-10-07)

### 概要

在上游整合的基礎上,額外實作完整的黑名單系統與隱私保護機制。

**當前版本**: `5db285e` - feat: 實作黑名單功能與隱私保護
**上游版本**: `84e2965` (已同步)

### 主要功能

#### 1. 🔒 全域黑名單攔截

**Backend 全域 Hook** (`packages/backend/src/index.ts`)
```typescript
app.addHook('preHandler', async (req, reply) => {
  const url = req.url.split('?')[0];
  if (req.user && (req.user as any).is_blacklisted && url !== '/me') {
    return reply.status(403).send({
      message: 'Access denied: Account has been blacklisted',
      error: 'ACCOUNT_BLACKLISTED'
    });
  }
});
```

**特性**:
- ✅ 攔截所有 API 端點 (除 `/me`)
- ✅ 回傳明確的 403 Forbidden 錯誤
- ✅ 適用於所有角色 (包含 super_admin)

#### 2. 🔐 隱私保護機制

**最小資訊回傳** (`packages/backend/src/routes/users.ts`)
```typescript
// 黑名單使用者只回傳最少資訊
if ((user as any).is_blacklisted) {
  req.log.warn({
    event: 'blacklisted_user_access',
    user_id: user.id,
    user_email: (user as any).email,
    user_name: (user as any).name,
    timestamp: new Date().toISOString()
  }, 'Blacklisted user accessed /me endpoint');

  return reply.send({ is_blacklisted: true });
}
```

**特性**:
- ✅ API 回傳: `{"is_blacklisted": true}` (不洩漏個人資料)
- ✅ Backend log: 記錄完整使用者資訊供審計
- ✅ 符合最小權限原則

#### 3. 🎯 Frontend 路由守衛

**Layout 層級攔截** (`src/pages/Layout.jsx`)
```javascript
// 黑名單檢查：優先於所有其他檢查
if (!authLoading && isBlacklisted) {
  return <BlacklistedAccess />;
}

// 黑名單使用者不載入任何資料
React.useEffect(() => {
  if (!isBlacklisted) {
    DisasterArea.list().then(setDisasterAreas).catch(()=>setDisasterAreas([]));
  }
}, [isBlacklisted]);
```

**特性**:
- ✅ 優先級最高,先於所有其他檢查
- ✅ 不載入任何系統資料
- ✅ 立即顯示黑名單專用頁面

#### 4. 📱 黑名單使用者頁面

**專用頁面** (`src/components/common/BlacklistedAccess.jsx`)

功能:
- ✅ 顯示帳號停用訊息
- ✅ 列出可能的停用原因
- ✅ 提供 Google Form 申訴連結
- ✅ 提供登出功能

#### 5. 🔧 Bug 修復

**Admin 頁面訪客載入問題**
- **檔案**: `src/pages/Admin.jsx`
- **問題**: 訪客存取 `/admin` 時無限載入
- **修復**: 使用 `authLoading` 取代本地 `loading` 狀態
- **結果**: 未登入使用者立即顯示「無權限訪問」頁面

**登入按鈕 SVG 圖示**
- **檔案**: `src/components/admin/AddGridModal.jsx`
- **問題**: 登入按鈕遺失 SVG 圖示
- **修復**: 新增 `LogIn` icon 並使用響應式設計
- **結果**: 按鈕正確顯示圖示且支援 RWD

### 三層防護架構

```
┌─────────────────────────────────────────┐
│  Layer 1: Frontend 路由守衛             │
│  - Layout.jsx 檢查 isBlacklisted        │
│  - 優先於所有其他檢查                   │
│  - 不載入任何資料                       │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│  Layer 2: Backend 全域攔截              │
│  - index.ts preHandler hook             │
│  - 攔截所有 API (除 /me)                │
│  - 回傳 403 Forbidden                   │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│  Layer 3: 隱私保護                      │
│  - /me 端點只回傳最少資訊               │
│  - Backend log 記錄審計資訊             │
│  - 不洩漏個人資料                       │
└─────────────────────────────────────────┘
```

### 資料庫結構

**users 表新增欄位**:
```sql
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS is_blacklisted BOOLEAN DEFAULT FALSE;
```

### 檔案變更清單

#### 新增檔案
- `src/components/common/BlacklistedAccess.jsx` (141 行) - 黑名單頁面
- `docs/blacklist-implementation.md` - 實作說明
- `docs/test-blacklist.md` - 測試文件
- `docs/blacklist-privacy-update.md` - 隱私更新說明
- `docs/current-diff-with-upstream.md` - 差異報告

#### 修改檔案

**Backend**:
- `packages/backend/src/index.ts` - 新增全域黑名單檢查 hook
- `packages/backend/src/routes/users.ts` - 新增隱私保護機制

**Frontend**:
- `src/context/AuthContext.jsx` - 新增 `isBlacklisted` 狀態
- `src/pages/Layout.jsx` - 新增黑名單攔截與資料載入控制
- `src/pages/Admin.jsx` - 修復訪客載入問題
- `src/components/admin/AddGridModal.jsx` - 修復登入按鈕圖示

### 測試步驟

詳細測試步驟請參考: `docs/test-blacklist.md`

#### 核心測試項目
1. **Backend 重啟**: 確保修改生效
2. **設定黑名單**: 使用管理後台或直接修改資料庫
3. **登入攔截**: 黑名單使用者登入後立即顯示黑名單頁面
4. **API 攔截**: 所有 API (除 `/me`) 回傳 403 Forbidden
5. **隱私保護**: `/me` 只回傳 `{"is_blacklisted": true}`
6. **資料不載入**: Network 不應有其他資料請求
7. **登出功能**: 可正常登出並切換帳號

#### 預期行為
```
Network 請求:
GET /me              → {"is_blacklisted": true}
GET /disaster-areas  → 403 Forbidden (ACCOUNT_BLACKLISTED)
GET /grids           → 403 Forbidden (ACCOUNT_BLACKLISTED)
GET /announcements   → 403 Forbidden (ACCOUNT_BLACKLISTED)

Backend Log:
{
  "level": "warn",
  "event": "blacklisted_user_access",
  "user_id": "xxx",
  "user_email": "xxx@example.com",
  "user_name": "xxx"
}
```

### 安全特性

#### 1. 最小權限原則
- 黑名單使用者只能取得 `is_blacklisted` 狀態
- 不回傳 id, name, email, role, avatar_url 等資訊

#### 2. 審計追蹤
- Backend log 記錄所有黑名單使用者的存取嘗試
- 包含完整的使用者識別資訊
- 使用 `req.log.warn` 記錄 `blacklisted_user_access` 事件

#### 3. 全角色適用
- 即使是 `super_admin` 也會被攔截
- 確保黑名單功能的絕對優先級
- 避免權限漏洞

### 部署注意事項

#### 必做事項
1. **Backend 重啟**: 修改 `index.ts` 後必須重啟
2. **資料庫 Migration**: 確保 `is_blacklisted` 欄位已建立
3. **測試驗證**: 執行完整的黑名單功能測試

#### 風險評估
- **低風險**: 黑名單功能是新增功能,不影響現有流程
- **注意事項**:
  - 確保至少有一個 super_admin 不在黑名單中
  - 移除黑名單後需要重新登入才生效

### 相關文件

- **實作說明**: `docs/blacklist-implementation.md`
- **測試步驟**: `docs/test-blacklist.md`
- **隱私更新**: `docs/blacklist-privacy-update.md`
- **差異報告**: `docs/current-diff-with-upstream.md`

### 統計資訊

```
總修改: 80 檔案
Backend: 30 檔案
Frontend: 47 檔案
文件: 3 檔案

新增: +21,255 行
刪除: -1,263 行
淨增加: +19,992 行

核心功能:
- 黑名單系統 ✅
- 隱私保護 ✅
- 全域攔截 ✅
- 審計日誌 ✅
- Bug 修復 ✅
```

### Checklist

#### 黑名單功能
- [x] Backend 全域攔截已實作
- [x] Frontend 路由守衛已實作
- [x] 隱私保護機制已實作
- [x] 審計日誌已實作
- [x] 黑名單頁面已建立
- [x] 測試文件已完成
- [x] 實作說明已完成

#### Bug 修復
- [x] Admin 頁面訪客載入問題已修復
- [x] 登入按鈕 SVG 圖示已修復

#### 文件
- [x] blacklist-implementation.md 已建立
- [x] test-blacklist.md 已建立
- [x] blacklist-privacy-update.md 已建立
- [x] current-diff-with-upstream.md 已建立
- [x] PR_DESCRIPTION.md 已更新

---

## 🔧 UI/UX 優化：物資管理顯示修復 (2025-10-07)

### 概要

**當前版本**: `7ef493d` - fix: 修復物資管理顯示問題
**基於版本**: `5db285e` (黑名單功能)
**上游版本**: `84e2965` (已同步)

### 修復內容

#### 1. 📍 物資捐贈地址顯示錯誤修復

**問題描述**:
- 管理後台 > 物資捐贈列表 > 卡片中的地址顯示為「未知地點」
- 實際資料庫中有正確的地址資料(例如: 武昌街276號)

**檔案**: `src/components/admin/SupplyManagement.jsx` (line 1567)

**錯誤原因**:
```javascript
// 使用了錯誤的欄位 area_name
{relatedGrid.area_name ? relatedGrid.area_name : '未知地點'}
```

**修復方案**:
```javascript
// 改用正確的 meeting_point 欄位
{relatedGrid.meeting_point ? relatedGrid.meeting_point : '未知地點'}
```

**驗證**:
- 檢查 `packages/backend/src/routes/grids.ts` - 確認 schema 使用 `meeting_point`
- 檢查 `SupplyDonationViewModal.jsx` - 確認 modal 使用 `meeting_point`
- 確保資料結構一致性

#### 2. 🕐 時間顯示格式統一

**需求**:
- 物資列表的卡片、物資捐贈列表的顯示時間方式
- 統一為「物資管理 > 急需物資」頁面的顯示樣式
- 使用 CalendarClock icon + formatCreatedDate 函數

**檔案**: `src/components/admin/SupplyManagement.jsx`

**新增 imports** (lines 48, 52):
```javascript
import {
  Package,
  PackagePlus,
  // ...
  CalendarClock,  // 新增
} from "lucide-react";

import { formatCreatedDate } from "@/lib/utils";  // 新增
```

**物資列表時間顯示更新** (lines 1265-1268):
```javascript
// 修改前
<div className="flex items-center gap-2 text-xs text-gray-500 mb-3">
  <Clock className="w-3 h-3" />
  <span>{formatDate(grid.created_at)}</span>
</div>

// 修改後
<div className="flex items-center gap-2 text-sm mb-3">
  <CalendarClock className="w-4 h-4 text-teal-700" />
  <span className="font-medium">{formatCreatedDate(grid.created_at)}</span>
</div>
```

**物資捐贈列表時間顯示更新** (lines 1595-1598):
```javascript
// 修改前
<div className="flex items-center gap-2 text-xs text-gray-500 mb-3">
  <Clock className="w-3 h-3" />
  <span>{formatDate(donation.created_at)}</span>
</div>

// 修改後
<div className="flex items-center gap-2 text-sm mb-3">
  <CalendarClock className="w-4 h-4 text-teal-700" />
  <span className="font-medium">{formatCreatedDate(donation.created_at)}</span>
</div>
```

#### 3. ⏰ 時間格式化函數說明

**函數**: `formatCreatedDate` (src/lib/utils.js)

**顯示效果**:
- 今天創建: **「今天 14:30:25」**
- 昨天創建: **「昨天 09:15:42」**
- 前天創建: **「前天 18:45:10」**
- 更早日期: **「1/5 12:00:00」**

**樣式統一**:
- Icon: CalendarClock (w-4 h-4 text-teal-700)
- 文字: text-sm font-medium
- 與 Map.jsx 頁面保持一致

### 技術細節

#### 變更檔案清單

**主要修改**:
- `src/components/admin/SupplyManagement.jsx` (+9/-11)
  - 修復地址顯示欄位 (meeting_point)
  - 統一時間顯示格式 (CalendarClock + formatCreatedDate)
  - 更新樣式 (text-teal-700, font-medium)

**參考實作**:
- `src/pages/Map.jsx` (lines 940-946) - 時間顯示參考範例
- `src/lib/utils.js` - formatCreatedDate 函數定義
- `src/components/admin/SupplyDonationViewModal.jsx` (line 345) - meeting_point 使用範例

#### 資料結構驗證

**Grid 資料結構** (packages/backend/src/routes/grids.ts):
```typescript
{
  meeting_point: z.string().optional(),  // ✅ 正確欄位
  area_name: undefined                   // ❌ 不存在此欄位
}
```

### 影響範圍

#### 影響元件
- ✅ 物資管理列表卡片
- ✅ 物資捐贈列表卡片
- ✅ 時間顯示樣式
- ✅ 地址顯示內容

#### 不影響功能
- ❌ 物資 CRUD 操作
- ❌ 權限檢查
- ❌ 資料庫查詢
- ❌ API 端點

### 測試驗證

#### 測試項目
1. ✅ 物資捐贈地址正確顯示 (例: 武昌街276號)
2. ✅ 時間顯示使用 CalendarClock icon
3. ✅ 時間格式化正確 (今天/昨天/前天)
4. ✅ 樣式與急需物資頁面一致
5. ✅ 未知地點的 fallback 正常運作

#### 預期結果
```
物資捐贈卡片:
├─ 📍 地址: 武昌街276號          (正確顯示 meeting_point)
├─ 🗓️ 時間: 今天 14:30:25        (CalendarClock + formatCreatedDate)
└─ 🎨 樣式: teal-700, font-medium (與急需物資一致)
```

### 統計資訊

```
總修改: 80 檔案 (無變化)
核心修改: 1 檔案
  - src/components/admin/SupplyManagement.jsx (+9/-11)

程式碼統計:
  新增: +21,253 行
  刪除: -1,263 行
  淨增加: +19,990 行

commit 歷史:
  7ef493d - fix: 修復物資管理顯示問題 (2025-10-07)
  5db285e - feat: 實作黑名單功能與隱私保護 (2025-10-07)
  f24eb75 - merge: 完成上游整合 - 解決所有衝突 (2025-10-06)
```

### Checklist

#### 修復完成狀態
- [x] 地址顯示欄位修正 (area_name → meeting_point)
- [x] 時間 icon 更新 (Clock → CalendarClock)
- [x] 時間函數更新 (formatDate → formatCreatedDate)
- [x] 樣式統一 (text-teal-700, font-medium)
- [x] 物資列表時間修正
- [x] 物資捐贈列表時間修正

#### 驗證完成狀態
- [x] 地址顯示測試通過
- [x] 時間顯示測試通過
- [x] 樣式一致性驗證
- [x] 資料結構檢查
- [x] 參考實作比對

#### 文件更新狀態
- [x] docs/current-diff-summary.md 已建立
- [x] PR_DESCRIPTION.md 已更新

---

## 🔧 最新修正：志工電話權限與物資管理優化 (2025-10-07)

### 概要

**當前版本**: `a30bfb5` - fix: 修正志工電話顯示權限和物資管理功能
**基於版本**: `7ef493d` (物資管理顯示修復)
**上游版本**: `84e2965` (已同步)

### 修正內容

#### 1. 🔐 志工電話顯示權限修正

**問題描述**:
- 高權限角色（super_admin/admin/grid_manager）應只能看到自己建立的網格的所有志工電話
- 無法區分「電話未提供」和「無權限查看」兩種狀態

**檔案變更**:

##### Backend 修改

**`packages/backend/src/lib/privacy-filter.ts`** (lines 170-220):
```typescript
// 檢查是否為高權限角色（實際角色 OR 視角角色）
const isHighPrivilegeActual = (user?.role === 'super_admin' || user?.role === 'admin' || user?.role === 'grid_manager');
const isHighPrivilegeActing = (actingRole === 'super_admin' || actingRole === 'admin' || actingRole === 'grid_manager');
const isHighPrivilegeRole = isHighPrivilegeActual || isHighPrivilegeActing;

// 檢查是否為網格建立者
const isCreator = user && gridCreatorId && user.id === gridCreatorId;

// 規則：高權限角色 + 是網格建立者 = 可以看到該網格所有志工的聯絡資訊
if (isHighPrivilegeRole && isCreator) {
  return registration;
}

// 規則：一般使用者和訪客只能看到自己的聯絡資訊
if (isVolunteerSelf(user, registration)) {
  return registration;
}

// 其他情況：使用特殊字串標記無權限
return {
  ...registration,
  volunteer_phone: (registration.volunteer_phone && registration.volunteer_phone.trim() !== '')
    ? 'NO_ACCESS_PERMISSION'
    : registration.volunteer_phone,
  volunteer_email: (registration.volunteer_email && registration.volunteer_email.trim() !== '')
    ? 'NO_ACCESS_PERMISSION'
    : registration.volunteer_email,
};
```

**`packages/backend/src/routes/volunteers.ts`** (line 281):
```typescript
// 傳遞實際角色給隱私過濾器
const filtered = filterVolunteerPrivacy(
  registration,
  user || null,
  r.grid_creator_id || undefined,
  {
    gridManagerId: r.grid_manager_id,
    actingRole,
    userActualRole: user?.role,  // 新增：傳遞實際角色
    canViewContact: hasContactViewPermission,
  }
);
```

**`packages/backend/src/routes/volunteer-registrations.ts`** (lines 94-99, 129-136):
```typescript
// 兩處都加入 userActualRole 參數
const filtered = filterVolunteersPrivacy(rows, user, gridCreatorId, {
  gridManagerId,
  actingRole,
  userActualRole: user?.role,  // 新增
  canViewContact: hasContactPermission,
});
```

##### Frontend 修改

**`src/pages/Volunteers.jsx`** (lines 134-139, 456-467):
```javascript
// 資料對應：保留原始 volunteer_phone 值
volunteer_phone: r.volunteer_phone,

// 顯示邏輯：
{(() => {
  // 檢查特殊字串 NO_ACCESS_PERMISSION
  if (registration.volunteer_phone === 'NO_ACCESS_PERMISSION') {
    return <span className="text-gray-400 italic text-xs">
      (需要隱私權限且為管理員/相關格主/志工本人才能查看聯絡資訊)
    </span>;
  }
  // 有值：顯示電話
  if (registration.volunteer_phone && typeof registration.volunteer_phone === 'string' && registration.volunteer_phone.trim() !== '') {
    return <span>{registration.volunteer_phone}</span>;
  }
  // null 或空字串：使用者沒填電話
  return <span className="text-gray-400 italic text-xs">未提供</span>;
})()}
```

**權限矩陣** (詳見 `docs/volunteer-phone-permission-logic.md`):

| 角色 | view_volunteer_contact | 額外條件 | 可見範圍 |
|------|----------------------|---------|---------|
| **super_admin/admin/grid_manager** | ✅ 開啟 | ✅ 是網格建立者 | 該網格所有電話 |
| **super_admin/admin/grid_manager** | ✅ 開啟 | ❌ 不是網格建立者 | 僅自己 |
| **user** | ✅ 開啟 | - | 僅自己 |
| **guest** | ✅ 開啟 | - | 僅自己 |

#### 2. 📦 物資管理功能優化

##### 2.1 按鈕順序調整

**檔案**: `src/components/admin/SupplyManagement.jsx` (lines 1018-1065)

**修改前**:
```
[新增物資需求] [匯出CSV] [匯入CSV]
```

**修改後**:
```
[匯出CSV] [匯入CSV] [新增物資需求]
```

##### 2.2 物資需求 CSV 匯出修正

**問題**: 物資需求（Grid）匯出顯示「待實作」

**修改檔案**: `src/components/admin/SupplyManagement.jsx`

**新增導入** (lines 71-72):
```javascript
import {
  // ...
  exportGridsToCSV,
  importGridsFromCSV,
} from "@/api/admin";
```

**修正匯出函數** (line 706-707):
```javascript
// 修改前
showMessage("物資需求匯出功能待實作", "warning");

// 修改後
await exportGridsToCSV();
showMessage("物資需求匯出成功", "success");
```

**修正匯入函數** (line 741):
```javascript
// 修改前
showMessage("物資需求匯入功能待實作", "warning");
return;

// 修改後
result = await importGridsFromCSV(csvContent, true);
```

##### 2.3 物資捐贈 CSV 匯入重複檢查修正

**問題**: CSV 匯入時無法正確跳過重複記錄

**檔案**: `packages/backend/src/routes/csv.ts` (lines 1100-1122)

**修改邏輯**:
```typescript
// 如果有 ID，嘗試更新現有記錄
if (recordId) {
  const { rows: existing } = await app.db.query(
    'SELECT id FROM supply_donations WHERE id = $1',
    [recordId]
  );

  if (existing.length > 0) {
    // 如果 skipDuplicates 為 true，跳過已存在的記錄
    if (body.skipDuplicates) {
      skipped++;
      continue;
    }

    // 否則更新現有記錄
    await app.db.query(/* UPDATE ... */);
    imported++;
    continue;
  }
}
```

**行為變化**:
- **之前**: 匯出再匯入，所有記錄都會被更新（imported）
- **現在**: 匯出再匯入，所有記錄會被跳過（skipped），符合預期

##### 2.4 單點操作後選取狀態清除

**問題**: 勾選項目後單點刪除/還原，批量操作按鈕仍顯示

**檔案**: `src/components/admin/SupplyManagement.jsx`

**修正 6 個函數**:

**物資捐贈** (3個):
- `handleDeleteDonation` (line 558-559)
- `handleRestoreDonation` (line 572-573)
- `handlePermanentDeleteDonation` (line 588-589)

**物資需求** (3個):
- `handleDeleteNeed` (line 311-312)
- `handleRestoreNeed` (line 360-361)
- `handlePermanentDeleteNeed` (line 474-475)

**清除邏輯**:
```javascript
// 清除該項目的選取狀態
setSelectedDonationsItems(prev => prev.filter(id => id !== donationId));
setSelectedNeedsItems(prev => prev.filter(id => id !== gridId));
```

### 新增文件

**`docs/volunteer-phone-permission-logic.md`** (338 行):
- 完整的權限矩陣說明
- 實作細節與程式碼範例
- 測試案例 (8個)
- 除錯方法
- Frontend/Backend 實作對照

### 影響範圍

#### Backend 變更
- ✅ `privacy-filter.ts` - 加強權限檢查邏輯
- ✅ `volunteers.ts` - 傳遞實際角色參數
- ✅ `volunteer-registrations.ts` - 傳遞實際角色參數
- ✅ `csv.ts` - 修正 CSV 匯入重複檢查

#### Frontend 變更
- ✅ `Volunteers.jsx` - 三狀態顯示邏輯
- ✅ `SupplyManagement.jsx` - 按鈕順序、CSV功能、選取狀態

### 測試項目

#### 志工電話權限測試
- [x] 超級管理員 + 是網格建立者：可看該網格所有電話
- [x] 超級管理員 + 不是網格建立者：只能看自己的
- [x] 一般使用者：只能看自己的
- [x] 電話未提供：顯示「未提供」
- [x] 有電話但無權限：顯示權限提示

#### 物資管理測試
- [x] 按鈕順序正確
- [x] 物資需求 CSV 匯出成功
- [x] 物資需求 CSV 匯入成功
- [x] 物資捐贈 CSV 重複跳過正確
- [x] 單點刪除後選取狀態清除
- [x] 單點還原後選取狀態清除

### 統計資訊

```
總修改: 80 檔案
核心修改: 6 檔案
  Backend:
    - packages/backend/src/lib/privacy-filter.ts (+23/-11)
    - packages/backend/src/routes/volunteers.ts (+2/-1)
    - packages/backend/src/routes/volunteer-registrations.ts (+4/-2)
    - packages/backend/src/routes/csv.ts (+9/-5)
  Frontend:
    - src/pages/Volunteers.jsx (+14/-7)
    - src/components/admin/SupplyManagement.jsx (+31/-18)
  文件:
    - docs/volunteer-phone-permission-logic.md (+338)

程式碼統計:
  新增: +21,307 行
  刪除: -1,263 行
  淨增加: +20,044 行

commit 歷史:
  a30bfb5 - fix: 修正志工電話顯示權限和物資管理功能 (2025-10-07)
  7ef493d - fix: 修復物資管理顯示問題 (2025-10-07)
  5db285e - feat: 實作黑名單功能與隱私保護 (2025-10-07)
```

### Checklist

#### 志工電話權限
- [x] Backend 權限檢查邏輯修正
- [x] 支援實際角色 + 視角角色雙重檢查
- [x] 隱私過濾函數正確處理三種狀態
- [x] Frontend 正確顯示三種情況
- [x] 電話未提供顯示「未提供」
- [x] 所有呼叫點都傳遞 userActualRole 參數
- [x] 文件已完成 (volunteer-phone-permission-logic.md)

#### 物資管理優化
- [x] 按鈕順序調整完成
- [x] 物資需求 CSV 匯出功能實作
- [x] 物資需求 CSV 匯入功能實作
- [x] 物資捐贈 CSV 重複檢查修正
- [x] 單點刪除後選取狀態清除
- [x] 單點還原後選取狀態清除
- [x] 單點永久刪除後選取狀態清除

---

## 🔧 最新修正：志工中心編輯按鈕權限控制 (2025-10-07)

### 📋 問題描述

志工中心的編輯按鈕需要根據不同權限顯示：
- **編輯自己的報名**：需要 `volunteer_registrations` 的 `can_edit` 權限
- **編輯別人的報名**：需要 `volunteer_registrations` 的 `can_manage` 權限
- **建立報名**：需要 `volunteer_registrations` 的 `can_create` 權限控制表單是否 disable

### 🛠️ 修正內容

#### Backend 修改

##### 1. `packages/backend/src/routes/volunteers.ts`

**修改位置**: Line 169-174, 335-337

```typescript
// 新增 can_create 權限查詢
const { rows: editPermRows } = await app.db.query(
  `SELECT can_create, can_edit, can_manage FROM role_permissions WHERE role = $1 AND permission_key = 'volunteer_registrations'`,
  [actingRole]
);
const hasCreatePermission = editPermRows.length > 0 && (editPermRows[0].can_create === 1 || editPermRows[0].can_create === true || editPermRows[0].can_create === '1');
const hasEditPermission = editPermRows.length > 0 && (editPermRows[0].can_edit === 1 || editPermRows[0].can_edit === true || editPermRows[0].can_edit === '1');
const hasManagePermission = editPermRows.length > 0 && (editPermRows[0].can_manage === 1 || editPermRows[0].can_manage === true || editPermRows[0].can_manage === '1');

// API 回傳新增 can_create
return {
  data,
  can_view_phone: canViewPhones,
  can_create: hasCreatePermission,  // 建立報名的權限
  can_edit: hasEditPermission,      // 編輯自己報名的權限
  can_manage: hasManagePermission,  // 編輯別人報名的權限
  user_id: user?.id || null,
  // ...
};
```

##### 2. `packages/backend/src/routes/volunteer-registrations.ts`

**修改位置**: Line 57-62, 111-113, 145-147

```typescript
// 新增 can_create 權限查詢
const { rows: editPermRows } = await app.db.query(
  `SELECT can_create, can_edit, can_manage FROM role_permissions WHERE role = $1 AND permission_key = 'volunteer_registrations'`,
  [actingRole]
);
const hasCreatePermission = editPermRows.length > 0 && (editPermRows[0].can_create === 1 || editPermRows[0].can_create === true || editPermRows[0].can_create === '1');
const hasEditPermission = editPermRows.length > 0 && (editPermRows[0].can_edit === 1 || editPermRows[0].can_edit === true || editPermRows[0].can_edit === '1');
const hasManagePermission = editPermRows.length > 0 && (editPermRows[0].can_manage === 1 || editPermRows[0].can_manage === true || editPermRows[0].can_manage === '1');

// 兩個 return 語句都新增 can_create
return {
  data: filtered,
  can_view_phone: canViewPhones,
  can_create: hasCreatePermission,  // 建立報名的權限
  can_edit: hasEditPermission,      // 編輯自己報名的權限
  can_manage: hasManagePermission,  // 編輯別人報名的權限
  user_id: user?.id
};
```

#### Frontend 狀態確認

##### 1. `src/components/map/GridDetailModal.jsx` (已實作完成)

**位置**: Line 43, 559-638, 650, 652

- 使用 `hasPermission('volunteer_registrations', 'create')` 檢查建立權限
- 所有表單欄位都有 `disabled={!canCreateVolunteerReg}`
- 提交按鈕根據 `canCreateVolunteerReg` 控制 disabled 狀態
- 按鈕文字根據權限顯示「確認報名」或「無建立權限」

##### 2. `src/pages/Volunteers.jsx` (已實作完成)

**位置**: Line 114-117, 524

- 從 API 回應中取得 `can_edit` 和 `can_manage` 權限
- 編輯按鈕邏輯：`(canEditSelf && isSelf) || (canEditOthers && !isSelf)`
- 已正確區分「編輯自己」和「編輯別人」的權限

### 📊 權限矩陣

#### 檢視權限 (View) - 志工報名分頁可見性

| 身份 | volunteer_registrations 檢視權限 | 結果 |
|------|-------|----------------------|
| 超級管理員/管理員/網格管理員/一般用戶/訪客 | ✅ 啟用 | ✅ 可以看到網格裡面的志工報名分頁 |
| 超級管理員/管理員/網格管理員/一般用戶/訪客 | ❌ 關閉 | ❌ 看不到網格裡面的志工報名分頁 |

#### 建立權限 (Create) - 志工報名功能

| 身份 | volunteer_registrations 建立權限 | 結果 |
|------|-------|----------------------|
| 超級管理員/管理員/網格管理員/一般用戶/訪客 | ✅ 啟用 | ✅ 可以使用網格裡面的志工報名功能 |
| 超級管理員/管理員/網格管理員/一般用戶/訪客 | ❌ 關閉 | ❌ 報名功能全部 disable |

#### 編輯權限 (Edit) - 編輯自己的志工報名

| 身份 | volunteer_registrations 編輯權限 | 結果 |
|------|-------|----------------------|
| 超級管理員/管理員/網格管理員/一般用戶/訪客 | ✅ 啟用 | ✅ 可以編輯**自己**的志工報名 |
| 超級管理員/管理員/網格管理員/一般用戶/訪客 | ❌ 關閉 | ❌ 看不到編輯按鈕 |

#### 管理權限 (Manage) - 編輯別人的志工報名

| 身份 | volunteer_registrations 管理權限 | 結果 |
|------|-------|----------------------|
| 超級管理員/管理員/網格管理員/一般用戶/訪客 | ✅ 啟用 | ✅ 可以編輯**別人**的志工報名 |
| 超級管理員/管理員/網格管理員/一般用戶/訪客 | ❌ 關閉 | ❌ 看不到編輯按鈕 |

### 📝 文件新增

**新增文件**: `docs/volunteer-center-permission-requirements.md` (272 行)

包含內容：
- 完整的權限矩陣（檢視、建立、編輯、管理、刪除）
- 詳細實作說明與程式碼片段
- 9 個測試案例
- 權限檢查流程圖
- 實作檢查清單

### 📈 程式碼統計

```
總修改: 3 檔案
  Backend:
    - packages/backend/src/routes/volunteers.ts (+4/-3)
    - packages/backend/src/routes/volunteer-registrations.ts (+6/-4)
  文件:
    - docs/volunteer-center-permission-requirements.md (+272)

commit 歷史:
  9d9be25 - feat: 新增志工中心編輯按鈕權限控制 (2025-10-07)
```

### Checklist

- [x] Backend: `/volunteers` API 回傳 `can_create` 權限
- [x] Backend: `/volunteer-registrations` API 回傳 `can_create` 權限
- [x] Backend: 確認 `can_edit` 和 `can_manage` 正確回傳
- [x] Frontend: 編輯按鈕顯示邏輯已正確實作（區分自己/別人）
- [x] Frontend: 報名功能 disable 邏輯已正確實作
- [x] Frontend: UI 提示訊息已正確顯示
- [x] 文件已完成 (volunteer-center-permission-requirements.md)
- [ ] 測試所有角色的編輯權限
- [ ] 測試所有角色的建立權限

---

## 📊 整體統計與上游同步狀態

### 與上游同步狀態

```bash
上游版本: 84e2965 (Merge pull request #98 from champsing/expiration)
當前分支: merged/upstream-integration-20251006
備份分支: myfork-volunteer-permission-20251007
同步狀態: ✅ Already up to date (無衝突)
```

### 總體變更統計

```
總修改: 80 檔案
新增程式碼: +21,312 行
刪除程式碼: -1,263 行
淨增加: +20,049 行

主要新增功能:
  1. 完整 RBAC 權限管理系統
  2. 管理後台 (20 個權限項目)
  3. 隱私保護機制
  4. 審計日誌系統
  5. CSV 匯入/匯出功能
  6. 黑名單功能
  7. 志工電話權限控制
  8. 志工中心編輯按鈕權限控制
```

### 最近 Commit 歷史

```
3910a00 - refactor: 移除物資捐贈檢視中重複的網格建立者資訊 (2025-10-07)
736afdb - fix: 修正物資需求檢視志工聯絡資訊顯示邏輯 (2025-10-07)
c65ebba - debug: 新增志工中心視角權限 debug 日誌 (2025-10-07)
9baf168 - fix: 修正志工中心視角切換權限檢查邏輯 (2025-10-07)
d5f1ec9 - docs: 更新 PR_DESCRIPTION.md - 新增志工中心編輯按鈕權限控制說明 (2025-10-07)
9d9be25 - feat: 新增志工中心編輯按鈕權限控制 (2025-10-07)
a30bfb5 - fix: 修正志工電話顯示權限和物資管理功能 (2025-10-07)
```

---

## 🔧 最新修正：視角切換與物資檢視優化 (2025-10-07 下午)

### 1. 修正志工中心視角切換權限檢查

#### 問題描述
當使用者切換到一般用戶視角時，會出現 "Forbidden - No permission to view volunteers" 錯誤。

**原因**: 後端使用視角角色（actingRole）檢查基礎訪問權限，導致實際有權限的使用者無法訪問。

#### 修正方案

**檔案**: `packages/backend/src/routes/volunteers.ts`

區分兩種權限檢查：
1. **基礎訪問權限**：使用實際角色（actualRole）- 決定能否進入頁面
2. **功能權限**：使用視角角色（actingRole）- 決定可執行的操作

```typescript
// 新增實際角色變數
const actualRole = user?.role || 'guest';

// 基礎訪問權限使用實際角色
const { rows: permRows } = await app.db.query(
  `SELECT can_view FROM role_permissions WHERE role = $1 AND permission_key = 'volunteers'`,
  [actualRole]  // 使用 actualRole
);

// 功能權限使用視角角色
const { rows: editPermRows } = await app.db.query(
  `SELECT can_create, can_edit, can_manage FROM role_permissions WHERE role = $1 AND permission_key = 'volunteer_registrations'`,
  [actingRole]  // 使用 actingRole
);
```

#### 測試場景

| 實際角色 | 視角角色 | 訪問志工中心 | 編輯權限 |
|---------|---------|------------|---------|
| user | guest | ✅ 可以 | ❌ 只能看自己的 |
| user | user | ✅ 可以 | ✅ 可以編輯自己的 |
| admin | user | ✅ 可以 | ✅ 只有 user 的權限 |

### 2. 新增視角權限 Debug 日誌

**檔案**:
- `packages/backend/src/routes/volunteers.ts`
- `src/pages/Volunteers.jsx`

**後端 Log**:
```javascript
app.log.info({
  actualRole,
  actingRole,
  hasEditPermission,
  hasManagePermission,
  editPermRows
}, 'Volunteers permission check');
```

**前端 Console**:
```javascript
console.log('🔍 [Volunteers] 權限資訊:', {
  canEditSelf,
  canEditOthers,
  canCreate,
  currentUserId,
  actingRole
});
```

### 3. 修正物資需求檢視志工聯絡資訊顯示

#### 問題描述
在管理後台 > 物資管理 > 物資列表 > 檢視時，志工電話/Email 顯示為 `NO_ACCESS_PERMISSION` 時沒有顯示正確的權限提示。

#### 修正內容

**檔案**: `src/components/admin/SupplyRequestViewModal.jsx`

新增三種狀態處理：

| 後端回傳值 | 前端顯示 | 說明 |
|-----------|---------|------|
| `'NO_ACCESS_PERMISSION'` | (需要隱私權限且為管理員/相關格主/志工本人才能查看聯絡資訊) | 有填但無權限 |
| `'0912-345-678'` | 0912-345-678 | 有值且有權限 |
| `null` 或 `''` | 未提供 | 使用者沒填 |

```jsx
{(() => {
  // 檢查是否為 NO_ACCESS_PERMISSION
  if (volunteer.volunteer_phone === 'NO_ACCESS_PERMISSION') {
    return (
      <span className="text-gray-400 italic text-xs flex items-center gap-1">
        <EyeOff className="w-3 h-3" />
        (需要隱私權限且為管理員/相關格主/志工本人才能查看聯絡資訊)
      </span>
    );
  }
  // 有值且有權限
  if (volunteer.volunteer_phone && typeof volunteer.volunteer_phone === 'string' && volunteer.volunteer_phone.trim() !== '') {
    return <span className="text-gray-700">{volunteer.volunteer_phone}</span>;
  }
  // null 或空字串：使用者沒填電話
  return <span className="text-gray-400 italic text-xs">未提供</span>;
})()}
```

### 4. 小幅重構

**檔案**: `src/components/admin/SupplyDonationViewModal.jsx`

移除重複顯示的網格建立者資訊區塊。

---

## 📊 最終統計與上游同步狀態

### 與上游同步狀態

```bash
上游版本: 84e2965 (Merge pull request #98 from champsing/expiration)
當前分支: merged/upstream-integration-20251006
備份分支: myfork-final-20251007
同步狀態: ✅ Already up to date (無衝突)
```

### 總體變更統計

```
總修改: 82 檔案
新增程式碼: +23,482 行
刪除程式碼: -1,263 行
淨增加: +22,219 行

主要新增功能:
  1. 完整 RBAC 權限管理系統
  2. 管理後台 (20 個權限項目)
  3. 隱私保護機制（含視角切換支援）
  4. 審計日誌系統
  5. CSV 匯入/匯出功能
  6. 黑名單功能
  7. 志工電話權限控制
  8. 志工中心編輯按鈕權限控制
  9. 視角切換權限檢查修正
  10. 物資檢視聯絡資訊顯示優化
  11. 權限管理 API 權限檢查優化（view/edit/manage 分離）
```

---

## 🔧 最新修改 (2025-10-07)

### 權限管理 API 權限檢查優化

**問題描述**：
- 所有權限管理 API 端點都需要 `can_manage` 權限才能訪問
- 導致 admin 角色無法訪問權限管理頁面載入列表
- 即使資料庫中 admin 有 `can_manage = 1`，仍出現 403 錯誤

**解決方案**：

1. **API 權限分級** - 根據操作類型使用不同權限檢查：
   ```typescript
   // 檢視類 API - 需要 view 權限
   GET /api/permissions                    // can_view
   GET /api/permissions/role/:role         // can_view
   GET /api/permissions/categories         // can_view

   // 編輯類 API - 需要 edit 權限
   PATCH /api/permissions/:id              // can_edit

   // 管理類 API - 需要 manage 權限
   POST /api/permissions/batch-update      // can_manage
   POST /api/permissions/reset-role        // can_manage
   GET /api/permissions/export             // can_manage
   POST /api/permissions/import            // can_manage
   ```

2. **Middleware 支援視角切換**：
   ```typescript
   // PermissionMiddleware.ts
   const actingRoleHeader = (request.headers['x-acting-role'] ||
                             request.headers['X-Acting-Role']) as string | undefined;
   const userRole = actingRoleHeader || user.role || 'guest';
   ```

3. **Migration 檔案更新**：
   - 為 guest 角色添加 `role_permissions` 權限設定（預設全部關閉）
   - 確保所有角色都有完整的權限設定

**權限邏輯**：
| 角色 | can_view | can_edit | can_manage | 說明 |
|------|----------|----------|------------|------|
| guest | 0 | 0 | 0 | 預設無權限（可透過管理後台開啟） |
| user | 0 | 0 | 0 | 預設無權限（可透過管理後台開啟） |
| grid_manager | 0 | 0 | 0 | 預設無權限（可透過管理後台開啟） |
| admin | 1 | 1 | 1 | 可檢視、編輯、管理權限設定 |
| super_admin | 1 | 1 | 1 | 可檢視、編輯、管理所有權限 |

**修改檔案**：
- `packages/backend/src/routes/permissions.ts` - API 權限檢查調整
- `packages/backend/src/middlewares/PermissionMiddleware.ts` - 支援視角切換
- `packages/backend/src/lib/migrations/006-role-permissions.sql` - 添加 guest 權限設定

**測試結果**：
- ✅ Admin 角色可以正常訪問權限管理頁面
- ✅ 視角切換功能正常運作
- ✅ 權限檢查邏輯符合預期（view/edit/manage 分離）
- ✅ 所有角色權限設定完整

---

**最後更新**: 2025-10-07
**功能狀態**: ✅ 所有功能實作完成並修正
**上游同步**: ✅ 已與 upstream/main@84e2965 同步，無衝突
**總變更**: 82 檔案, +23,482/-1,263 行
**備份分支**: myfork-permission-fix-20251007
