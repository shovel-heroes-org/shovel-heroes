# 垃圾桶權限更新指南

## 問題說明

根據前端程式碼分析，垃圾桶功能實際只使用以下權限：
- **can_view**: 控制顯示垃圾桶按鈕和標籤頁
- **can_edit**: 控制還原功能（restore）
- **can_delete**: 控制永久刪除功能

**不使用的權限**：
- ❌ **can_create**: 垃圾桶沒有「建立」功能
- ❌ **can_manage**: 垃圾桶沒有使用此權限

## 修改內容

### 1. 更新 init-permissions.ts

已修改以下檔案：
- `packages/backend/scripts/init-permissions.ts`

**修改項目**：
- admin 角色的 trash_* 權限：`can_manage: 1` → `can_manage: 0`
- super_admin 角色的 trash_* 權限：`can_manage: 1` → `can_manage: 0`

### 2. 更新資料庫

有兩種方式可以更新資料庫：

#### 方式 1：使用 SQL 腳本（推薦）

1. 打開 pgAdmin 或連接到 PostgreSQL
2. 執行以下 SQL 腳本：

```sql
-- 更新垃圾桶權限：移除 can_manage 權限
UPDATE role_permissions
SET
  can_manage = 0,
  description = CASE permission_key
    WHEN 'trash_grids' THEN
      CASE role
        WHEN 'admin' THEN '可檢視、還原和永久刪除網格垃圾桶項目'
        WHEN 'super_admin' THEN '可檢視、還原和永久刪除網格垃圾桶項目'
        WHEN 'grid_manager' THEN '可檢視和還原網格垃圾桶項目（edit=還原）'
        ELSE description
      END
    WHEN 'trash_areas' THEN
      CASE role
        WHEN 'admin' THEN '可檢視、還原和永久刪除災區垃圾桶項目'
        WHEN 'super_admin' THEN '可檢視、還原和永久刪除災區垃圾桶項目'
        WHEN 'grid_manager' THEN '可檢視和還原災區垃圾桶項目（edit=還原）'
        ELSE description
      END
    WHEN 'trash_announcements' THEN
      CASE role
        WHEN 'admin' THEN '可檢視、還原和永久刪除公告垃圾桶項目'
        WHEN 'super_admin' THEN '可檢視、還原和永久刪除公告垃圾桶項目'
        WHEN 'grid_manager' THEN '可檢視和還原公告垃圾桶項目（edit=還原）'
        ELSE description
      END
    ELSE description
  END
WHERE permission_key IN ('trash_grids', 'trash_areas', 'trash_announcements');
```

3. 驗證結果：

```sql
SELECT
  role,
  permission_key,
  permission_name,
  can_view,
  can_create,
  can_edit,
  can_delete,
  can_manage,
  description
FROM role_permissions
WHERE permission_key IN ('trash_grids', 'trash_areas', 'trash_announcements')
ORDER BY role, permission_key;
```

#### 方式 2：使用命令列

```bash
# 在 packages/backend/scripts 目錄下
psql -U postgres -d shovelheroes -f update-trash-permissions.sql
```

或使用提供的 bat 腳本：
```bash
# 在 packages/backend/scripts 目錄下
run-update-trash-permissions.bat
```

## 預期結果

更新後，各角色的垃圾桶權限應該如下：

### user（一般使用者）
| 權限 | 檢視 | 建立 | 編輯(還原) | 刪除(永久) | 管理 |
|------|------|------|-----------|-----------|------|
| trash_grids | ❌ | ❌ | ❌ | ❌ | ❌ |
| trash_areas | ❌ | ❌ | ❌ | ❌ | ❌ |
| trash_announcements | ❌ | ❌ | ❌ | ❌ | ❌ |

### grid_manager（網格管理員）
| 權限 | 檢視 | 建立 | 編輯(還原) | 刪除(永久) | 管理 |
|------|------|------|-----------|-----------|------|
| trash_grids | ✅ | ❌ | ✅ | ❌ | ❌ |
| trash_areas | ✅ | ❌ | ✅ | ❌ | ❌ |
| trash_announcements | ✅ | ❌ | ✅ | ❌ | ❌ |

### admin（管理員）
| 權限 | 檢視 | 建立 | 編輯(還原) | 刪除(永久) | 管理 |
|------|------|------|-----------|-----------|------|
| trash_grids | ✅ | ❌ | ✅ | ✅ | ❌ |
| trash_areas | ✅ | ❌ | ✅ | ✅ | ❌ |
| trash_announcements | ✅ | ❌ | ✅ | ✅ | ❌ |

### super_admin（超級管理員）
| 權限 | 檢視 | 編輯(還原) | 刪除(永久) | 建立 | 管理 |
|------|------|-----------|-----------|------|------|
| trash_grids | ✅ | ✅ | ✅ | ❌ | ❌ |
| trash_areas | ✅ | ✅ | ✅ | ❌ | ❌ |
| trash_announcements | ✅ | ✅ | ✅ | ❌ | ❌ |

## 權限對應說明

### 前端檢查
- `canView('trash_*')` → `can_view = 1`
  - 顯示垃圾桶按鈕和標籤頁
  - 還原功能（搭配 edit）
  - 批量還原功能
  - 全選功能

- `canDelete('trash_*')` → `can_delete = 1`
  - 永久刪除按鈕
  - 批量永久刪除功能

### 後端檢查
- `requirePermission('trash_*', 'view')` → `can_view = 1`
  - 查看垃圾桶列表

- `requirePermission('trash_*', 'edit')` → `can_edit = 1`
  - 移至垃圾桶
  - 還原功能

- `requirePermission('trash_*', 'delete')` → `can_delete = 1`
  - 永久刪除

## 相關檔案

- `packages/backend/scripts/init-permissions.ts` - 權限定義（已更新）
- `packages/backend/scripts/update-trash-permissions.ts` - TypeScript 更新腳本
- `packages/backend/scripts/update-trash-permissions.sql` - SQL 更新腳本
- `packages/backend/scripts/run-update-trash-permissions.bat` - Windows 批次檔

## 完成時間
2025-10-04
