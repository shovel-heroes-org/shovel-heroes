# 權限 Middleware 遷移指南

## 目標
將硬編碼的權限檢查改為從資料庫讀取權限設定，實現真正的動態權限管理。

## 新的 Permission Middleware

已建立 `packages/backend/src/middlewares/PermissionMiddleware.ts`，提供以下函數：

### 1. `requirePermission(permissionKey, action)`
主要的權限檢查函數，從資料庫讀取權限設定。

**參數：**
- `permissionKey`: 權限鍵值 (如 `'grids'`, `'users'`, `'admin_panel'`)
- `action`: 操作類型 (`'view'` | `'create'` | `'edit'` | `'delete'` | `'manage'`)

**使用範例：**
```typescript
import { requirePermission } from '../middlewares/PermissionMiddleware.js';

// 檢查檢視權限
app.get('/api/grids', {
  preHandler: requirePermission('grids', 'view')
}, async (request, reply) => {
  // 處理請求
});

// 檢查建立權限
app.post('/api/grids', {
  preHandler: requirePermission('grids', 'create')
}, async (request, reply) => {
  // 處理請求
});

// 檢查刪除權限
app.delete('/api/grids/:id', {
  preHandler: requirePermission('grids', 'delete')
}, async (request, reply) => {
  // 處理請求
});
```

### 2. `requireAdminPanel()`
快捷方式：檢查管理後台訪問權限。

**使用範例：**
```typescript
import { requireAdminPanel } from '../middlewares/PermissionMiddleware.js';

app.get('/admin/users', {
  preHandler: requireAdminPanel()
}, async (request, reply) => {
  // 只有有管理後台檢視權限的角色才能訪問
});
```

### 3. `requireManagePermission(permissionKey)`
快捷方式：檢查管理權限。

**使用範例：**
```typescript
import { requireManagePermission } from '../middlewares/PermissionMiddleware.js';

app.post('/api/permissions/batch-update', {
  preHandler: requireManagePermission('role_permissions')
}, async (request, reply) => {
  // 只有有權限管理權限的角色才能訪問
});
```

### 4. `requireAnyPermission(permissions)`
檢查多個權限，滿足任一條件即可。

**使用範例：**
```typescript
import { requireAnyPermission } from '../middlewares/PermissionMiddleware.js';

app.get('/api/admin/dashboard', {
  preHandler: requireAnyPermission([
    { key: 'admin_panel', action: 'view' },
    { key: 'users', action: 'manage' }
  ])
}, async (request, reply) => {
  // 有管理後台檢視權限 OR 使用者管理權限的人都可以訪問
});
```

## 遷移步驟

### 舊寫法 → 新寫法對照表

#### 1. requireAdmin → requireAdminPanel()

**舊寫法：**
```typescript
import { requireAdmin } from '../middlewares/AuthMiddleware.js';

app.get('/admin/users', {
  preHandler: requireAdmin
}, async (request, reply) => { ... });
```

**新寫法：**
```typescript
import { requireAdminPanel } from '../middlewares/PermissionMiddleware.js';

app.get('/admin/users', {
  preHandler: requireAdminPanel()
}, async (request, reply) => { ... });
```

#### 2. requireSuperAdmin → requireManagePermission()

**舊寫法：**
```typescript
import { requireSuperAdmin } from '../middlewares/AuthMiddleware.js';

app.get('/api/permissions', {
  preHandler: requireSuperAdmin
}, async (request, reply) => { ... });
```

**新寫法：**
```typescript
import { requireManagePermission } from '../middlewares/PermissionMiddleware.js';

app.get('/api/permissions', {
  preHandler: requireManagePermission('role_permissions')
}, async (request, reply) => { ... });
```

#### 3. 程式碼內的角色檢查 → requirePermission()

**舊寫法：**
```typescript
if (user.role !== 'admin' && user.role !== 'super_admin') {
  return reply.status(403).send({ message: 'Forbidden' });
}
```

**新寫法：**
```typescript
// 在路由定義時就使用 preHandler
app.post('/api/some-endpoint', {
  preHandler: requirePermission('resource_name', 'action')
}, async (request, reply) => {
  // 不需要再檢查角色，middleware 已經處理
});
```

## 遷移範例

### 範例 1：Admin 路由

**檔案：** `packages/backend/src/routes/admin.ts`

**舊寫法：**
```typescript
import { requireAdmin, requireSuperAdmin } from '../middlewares/AuthMiddleware.js';

export function registerAdminRoutes(app: FastifyInstance) {
  // 使用者管理
  app.get('/admin/users', { preHandler: requireAdmin }, async (req, reply) => { ... });

  // 角色變更
  app.post('/admin/users/:id/role', { preHandler: requireAdmin }, async (req, reply) => {
    // 還有額外的角色檢查
    if (req.user!.role !== 'super_admin' && req.user!.role !== 'admin') {
      return reply.status(403).send({ message: 'Forbidden' });
    }
    ...
  });
}
```

**新寫法：**
```typescript
import {
  requireAdminPanel,
  requirePermission,
  requireManagePermission
} from '../middlewares/PermissionMiddleware.js';

export function registerAdminRoutes(app: FastifyInstance) {
  // 使用者管理 - 檢視
  app.get('/admin/users', {
    preHandler: requirePermission('users', 'view')
  }, async (req, reply) => { ... });

  // 使用者管理 - 角色變更（需要管理權限）
  app.post('/admin/users/:id/role', {
    preHandler: requirePermission('users', 'manage')
  }, async (req, reply) => {
    // 不需要額外檢查，middleware 已處理
    ...
  });
}
```

### 範例 2：Grid 路由

**檔案：** `packages/backend/src/routes/grids.ts`

**舊寫法：**
```typescript
export function registerGridRoutes(app: FastifyInstance) {
  // 列表
  app.get('/grids', async (req, reply) => {
    // 沒有權限檢查，所有人都可以看
    ...
  });

  // 新增
  app.post('/grids', async (req, reply) => {
    if (!req.user) {
      return reply.status(401).send({ message: 'Unauthorized' });
    }
    ...
  });

  // 刪除
  app.delete('/grids/:id', async (req, reply) => {
    // 程式碼內檢查角色
    if (req.user!.role !== 'admin' && req.user!.role !== 'grid_manager') {
      return reply.status(403).send({ message: 'Forbidden' });
    }
    ...
  });
}
```

**新寫法：**
```typescript
import { requirePermission } from '../middlewares/PermissionMiddleware.js';

export function registerGridRoutes(app: FastifyInstance) {
  // 列表 - 檢視權限
  app.get('/grids', {
    preHandler: requirePermission('grids', 'view')
  }, async (req, reply) => {
    ...
  });

  // 新增 - 建立權限
  app.post('/grids', {
    preHandler: requirePermission('grids', 'create')
  }, async (req, reply) => {
    ...
  });

  // 刪除 - 刪除權限
  app.delete('/grids/:id', {
    preHandler: requirePermission('grids', 'delete')
  }, async (req, reply) => {
    ...
  });
}
```

## 資源鍵值對照表

根據 `init-permissions.ts`，以下是可用的權限鍵值：

| 權限鍵值 | 中文名稱 | 分類 |
|---------|---------|------|
| `disaster_areas` | 災區管理 | 基礎管理 |
| `grids` | 網格管理 | 基礎管理 |
| `volunteers` | 志工管理 | 人員管理 |
| `volunteer_registrations` | 志工報名 | 人員管理 |
| `supplies` | 物資管理 | 資源管理 |
| `announcements` | 公告管理 | 資訊管理 |
| `users` | 使用者管理 | 系統管理 |
| `blacklist` | 黑名單管理 | 系統管理 |
| `role_permissions` | 權限設定 | 系統管理 |
| `audit_logs` | 稽核日誌 | 系統管理 |
| `system_settings` | 系統設定 | 系統管理 |
| `admin_panel` | 管理後台 | 系統管理 |

## 動作類型說明

- **view**: 檢視/查詢資料
- **create**: 建立新資料
- **edit**: 編輯/更新資料
- **delete**: 刪除資料
- **manage**: 完整管理權限（通常包含所有操作）

## 優點

### 1. 動態權限管理
- ✅ 可以透過管理後台即時調整權限，無需修改程式碼
- ✅ 不同環境可以有不同的權限設定

### 2. 細粒度控制
- ✅ 每個資源的每個操作都可以獨立控制
- ✅ 可以為不同角色設定不同的權限組合

### 3. 可追蹤性
- ✅ 所有權限檢查都有日誌記錄
- ✅ 權限變更會記錄在 audit logs

### 4. 易於維護
- ✅ 權限邏輯集中在一個地方
- ✅ 新增資源時只需在資料庫新增權限設定

## 注意事項

1. **效能考量**
   - 每次請求都會查詢資料庫
   - 建議未來可以加入快取機制

2. **向後相容性**
   - 舊的 `requireAdmin` 和 `requireSuperAdmin` 仍然可用
   - 建議逐步遷移，不需要一次全改

3. **資料庫依賴**
   - 確保 `role_permissions` 表已正確初始化
   - 如果資料庫連線失敗，所有權限檢查都會失敗

## 測試建議

遷移後，請測試以下場景：

1. **訪客 (guest)** - 只能檢視，無法操作
2. **一般使用者 (user)** - 可以建立和編輯自己的資源
3. **網格管理員 (grid_manager)** - 可以管理網格和公告
4. **管理員 (admin)** - 可以訪問管理後台
5. **超級管理員 (super_admin)** - 可以修改權限設定

## 遷移清單

以下是需要遷移的檔案：

- [ ] `packages/backend/src/routes/admin.ts`
- [ ] `packages/backend/src/routes/csv.ts`
- [ ] `packages/backend/src/routes/audit-log.ts`
- [ ] `packages/backend/src/routes/permissions.ts`
- [ ] `packages/backend/src/routes/grids.ts`
- [ ] `packages/backend/src/routes/volunteers.ts`
- [ ] `packages/backend/src/routes/announcements.ts`

---

**最後更新：** 2025-10-04
