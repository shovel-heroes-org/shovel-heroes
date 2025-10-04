# 審計日誌資料表分析報告

## 概述

目前專案中存在兩個審計日誌相關的資料表：
1. **`audit_logs`** - 一般 API 請求日誌（未被使用，建議廢棄）
2. **`admin_audit_logs`** - 管理員操作日誌（正在使用中）

## 資料表比較

### 1. audit_logs（建議廢棄）

#### 定義位置
- `packages/backend/src/lib/db-init.ts` (第 124-139 行)

#### 資料表結構
```sql
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  method TEXT NOT NULL,
  path TEXT NOT NULL,
  query JSONB,
  ip TEXT,
  headers JSONB,
  status_code INT,
  error TEXT,
  duration_ms INT,
  request_body JSONB,
  response_body JSONB,
  user_id TEXT,
  resource_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

#### 用途
- 設計用於記錄所有 HTTP API 請求
- 包含請求/回應的完整資訊
- 技術層面的日誌（HTTP method, path, headers 等）

#### 使用情況
**唯一使用位置**：
- `packages/backend/src/modules/audit-logs/audit-log.repo.ts`
  - 定義了 `insertAuditLog()` 函數
  - **但此函數從未被呼叫**

**結論**：此表完全未被使用，資料庫中應該是空的。

---

### 2. admin_audit_logs（正在使用）

#### 定義位置
- **未在 db-init.ts 中定義**
- 應該是透過腳本或遷移檔案建立
- 需要檢查 `packages/backend/scripts/create-audit-log-table.ts`

#### 推測的資料表結構
根據程式碼推測，應該包含以下欄位：
```sql
CREATE TABLE IF NOT EXISTS admin_audit_logs (
  id TEXT PRIMARY KEY,                    -- UUID
  user_id TEXT,                           -- 使用者 ID
  user_role TEXT,                         -- 使用者角色
  line_id TEXT,                           -- LINE ID
  line_name TEXT,                         -- LINE 名稱
  action TEXT,                            -- 操作描述
  action_type TEXT,                       -- 操作類型 (CREATE, UPDATE, DELETE, etc.)
  resource_type TEXT,                     -- 資源類型
  resource_id TEXT,                       -- 資源 ID
  details JSONB,                          -- 詳細資訊
  ip_address TEXT,                        -- IP 位址
  user_agent TEXT,                        -- User Agent
  created_at TIMESTAMPTZ DEFAULT NOW()    -- 建立時間
);
```

#### 用途
- 記錄管理員的操作行為
- 業務層面的日誌（誰做了什麼事）
- 用於稽核追蹤和安全監控

#### 使用情況

**主要路由**：`packages/backend/src/routes/audit-log.ts`
- `GET /admin/audit-logs` - 查詢審計日誌
- `GET /admin/audit-logs/export` - 匯出 CSV
- `DELETE /admin/audit-logs/clear` - 清除日誌

**寫入位置**：`packages/backend/src/routes/permissions.ts`
1. **更新單一權限設定** (第 164-178 行)
   ```typescript
   INSERT INTO admin_audit_logs (id, user_id, user_role, action, action_type, resource_type, resource_id, details)
   VALUES (gen_random_uuid()::text, $1, $2, $3, $4, $5, $6, $7)
   ```

2. **批次更新權限設定** (第 273-284 行)
   ```typescript
   INSERT INTO admin_audit_logs (id, user_id, user_role, action, action_type, resource_type, resource_id, details)
   VALUES (gen_random_uuid()::text, $1, $2, $3, $4, $5, $6, $7)
   ```

3. **重置角色權限** (第 314-325 行)
   ```typescript
   INSERT INTO admin_audit_logs (id, user_id, user_role, action, action_type, resource_type, resource_id, details)
   VALUES (gen_random_uuid()::text, $1, $2, $3, $4, $5, $6, $7)
   ```

4. **清除日誌操作** (`audit-log.ts` 第 171-181 行)
   - 使用 `createAuditLog()` 函數記錄清除操作

**前端使用**：`src/api/admin.js`
- `getAuditLogs()` - 取得日誌列表 (第 354-357 行)
- `exportAuditLogsToCSV()` - 匯出 CSV (第 360-385 行)

---

## 檔案引用清單

### audit_logs 引用檔案（建議清理）

1. **定義位置**
   - ✅ `packages/backend/src/lib/db-init.ts` (資料表定義)

2. **程式碼引用**
   - ✅ `packages/backend/src/modules/audit-logs/audit-log.repo.ts` (未使用的函數)

3. **文件引用**
   - ✅ `docs/permission-usage-example.md` (文件說明)

4. **腳本檔案**
   - ✅ `packages/backend/scripts/init-permissions.ts`
   - ✅ `packages/backend/scripts/recreate-audit-logs-table.ts`
   - ✅ `packages/backend/scripts/check-audit-logs-structure.ts`
   - ✅ `packages/backend/scripts/verify-admin-audit-logs.ts`
   - ✅ `packages/backend/scripts/create-audit-log-table.ts`
   - ✅ `packages/backend/scripts/check-correct-audit-logs.ts`
   - ✅ `packages/backend/scripts/check-audit-log-table.ts`

5. **遷移檔案**
   - ✅ `packages/backend/src/lib/migrations/006-role-permissions.sql` (提及但未使用)

### admin_audit_logs 引用檔案（正在使用）

1. **主要路由**
   - ✅ `packages/backend/src/routes/audit-log.ts` (CRUD 操作)
   - ✅ `packages/backend/src/routes/permissions.ts` (寫入日誌)

2. **前端 API**
   - ✅ `src/api/admin.js` (呼叫 API)

3. **腳本檔案**
   - ✅ `packages/backend/scripts/create-audit-log-table.ts`
   - ✅ `packages/backend/scripts/verify-admin-audit-logs.ts`

---

## 問題與建議

### 問題 1：audit_logs 表完全未使用

**現象**：
- 資料表已建立但沒有任何資料
- `insertAuditLog()` 函數定義但從未被呼叫
- 沒有任何路由或中介軟體寫入此表

**影響**：
- 佔用資料庫空間
- 造成開發者困惑
- 維護成本

**建議**：
1. **廢棄 `audit_logs` 表**
2. **移除相關程式碼**：
   - 刪除 `packages/backend/src/modules/audit-logs/audit-log.repo.ts`
   - 從 `db-init.ts` 移除資料表定義
   - 清理相關腳本檔案

### 問題 2：admin_audit_logs 表未在 db-init.ts 中定義

**現象**：
- 正在使用但未在主要的 schema 初始化檔案中定義
- 可能依賴腳本檔案建立

**影響**：
- 新環境初始化可能失敗
- Schema 不一致

**建議**：
1. **將 `admin_audit_logs` 表定義加入 `db-init.ts`**
2. **確保遷移檔案正確執行**

### 問題 3：欄位不一致

**現象**：
- `permissions.ts` 中使用的欄位：
  - `id`, `user_id`, `user_role`, `action`, `action_type`, `resource_type`, `resource_id`, `details`

- `audit-log.ts` 中使用的欄位（createAuditLog 函數）：
  - `id`, `user_id`, `user_role`, `line_id`, `line_name`, `action`, `action_type`, `resource_type`, `resource_id`, `details`, `ip_address`, `user_agent`

**影響**：
- 欄位使用不一致
- 資料完整性問題

**建議**：
1. **統一欄位使用**
2. **建立標準的日誌寫入函數**

---

## 建議的清理步驟

### 步驟 1：廢棄 audit_logs 表

```sql
-- 1. 備份資料（如果有）
-- 2. 刪除資料表
DROP TABLE IF EXISTS audit_logs;
```

### 步驟 2：移除相關程式碼

需要刪除或修改的檔案：
- ✅ `packages/backend/src/modules/audit-logs/audit-log.repo.ts` - 刪除
- ✅ `packages/backend/src/lib/db-init.ts` - 移除 audit_logs 定義（第 124-139 行）
- ✅ 清理腳本檔案（如果只處理 audit_logs）

### 步驟 3：標準化 admin_audit_logs

#### 3.1 在 db-init.ts 中加入定義

```sql
CREATE TABLE IF NOT EXISTS admin_audit_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  user_role TEXT NOT NULL,
  line_id TEXT,
  line_name TEXT,
  action TEXT NOT NULL,
  action_type TEXT NOT NULL,
  resource_type TEXT,
  resource_id TEXT,
  details JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_user_id ON admin_audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_user_role ON admin_audit_logs(user_role);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_action_type ON admin_audit_logs(action_type);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_created_at ON admin_audit_logs(created_at);
```

#### 3.2 建立統一的日誌寫入函數

在 `packages/backend/src/lib/audit-logger.ts` 建立：
```typescript
import type { FastifyInstance } from 'fastify';
import { randomUUID } from 'crypto';

export async function createAdminAuditLog(
  app: FastifyInstance,
  data: {
    user_id?: string;
    user_role: string;
    line_id?: string;
    line_name?: string;
    action: string;
    action_type: string;
    resource_type?: string;
    resource_id?: string;
    details?: any;
    ip_address?: string;
    user_agent?: string;
  }
) {
  if (!app.hasDecorator('db')) {
    return;
  }

  try {
    const id = randomUUID();
    await app.db.query(
      `INSERT INTO admin_audit_logs (
        id, user_id, user_role, line_id, line_name, action, action_type,
        resource_type, resource_id, details, ip_address, user_agent
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [
        id,
        data.user_id || null,
        data.user_role,
        data.line_id || null,
        data.line_name || null,
        data.action,
        data.action_type,
        data.resource_type || null,
        data.resource_id || null,
        data.details ? JSON.stringify(data.details) : null,
        data.ip_address || null,
        data.user_agent || null
      ]
    );
    app.log.info({ audit: data }, '[audit] Created admin audit log');
  } catch (err: any) {
    app.log.error({ err, data }, '[audit] Failed to create admin audit log');
  }
}
```

#### 3.3 更新 permissions.ts 使用統一函數

```typescript
import { createAdminAuditLog } from '../lib/audit-logger.js';

// 更新權限設定時
await createAdminAuditLog(app, {
  user_id: request.user!.id,
  user_role: request.user!.role,
  action: '更新權限設定',
  action_type: 'UPDATE',
  resource_type: 'role_permission',
  resource_id: id,
  details: {
    before: existing[0],
    after: updated[0]
  },
  ip_address: request.ip,
  user_agent: request.headers['user-agent']
});
```

---

## 測試檢查清單

完成清理後，請確認：

- [ ] `audit_logs` 表已從資料庫刪除
- [ ] `audit_logs` 相關程式碼已移除
- [ ] `admin_audit_logs` 表已在 `db-init.ts` 中定義
- [ ] 所有寫入 `admin_audit_logs` 的地方都使用統一函數
- [ ] 審計日誌功能正常運作（查詢、匯出、清除）
- [ ] 權限更新操作有正確記錄到日誌
- [ ] 前端可以正常查看和匯出審計日誌

---

## 總結

### audit_logs
- ❌ **未使用**
- ❌ **無資料**
- ✅ **建議廢棄**
- 📝 **需要刪除定義和相關程式碼**

### admin_audit_logs
- ✅ **正在使用**
- ✅ **有實際資料**
- ⚠️ **需要標準化**
- 📝 **需要加入 db-init.ts**
- 📝 **需要統一寫入函數**

### 優先順序
1. **高優先**：將 `admin_audit_logs` 加入 `db-init.ts`
2. **中優先**：建立統一的日誌寫入函數
3. **低優先**：清理 `audit_logs` 相關程式碼（不影響功能）
