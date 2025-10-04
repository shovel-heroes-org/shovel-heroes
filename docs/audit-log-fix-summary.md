# Audit Log 記錄修正總結

## 問題描述
權限設定頁面的 LOG 儲存功能無法正確記錄以下資訊：
- LINE 名稱
- LINE ID
- IP 位址

## 解決方案

### 1. 建立統一的 Audit Logger 工具
建立了 `packages/backend/src/lib/audit-logger.ts` 檔案，提供統一的審計日誌記錄功能：

**主要功能：**
- `createAdminAuditLog()` - 手動建立審計日誌
- `createAdminAuditLogFromRequest()` - 自動從 request 提取使用者資訊建立日誌

**自動提取的欄位：**
```typescript
{
  user_id: user?.id,           // 使用者 ID
  user_role: user?.role,       // 使用者角色
  line_id: user?.line_sub,     // LINE ID (從 user 的 line_sub 欄位)
  line_name: user?.name,       // LINE 名稱 (從 user 的 name 欄位)
  ip_address: request.ip,      // 客戶端 IP 位址
  user_agent: request.headers['user-agent']  // User Agent
}
```

### 2. 更新權限路由
已更新 `packages/backend/src/routes/permissions.ts` 的所有 audit log 記錄點：

#### 2.1 單一權限更新 (Line 165)
```typescript
await createAdminAuditLogFromRequest(app, request, {
  action: '更新權限設定',
  action_type: AuditActionType.UPDATE,
  resource_type: AuditResourceType.ROLE_PERMISSION,
  resource_id: id,
  details: { before: existing[0], after: updated[0] }
});
```

#### 2.2 批次權限更新 (Line 271)
```typescript
await createAdminAuditLogFromRequest(app, request, {
  action: '批次更新權限設定',
  action_type: AuditActionType.BATCH_UPDATE,
  resource_type: AuditResourceType.ROLE_PERMISSION,
  details: { count: permissions.length }
});
```

#### 2.3 重置角色權限 (Line 308)
```typescript
await createAdminAuditLogFromRequest(app, request, {
  action: '重置角色權限',
  action_type: AuditActionType.RESET,
  resource_type: AuditResourceType.ROLE_PERMISSION,
  details: { role }
});
```

### 3. 更新其他路由
同時也更新了 `packages/backend/src/routes/audit-log.ts`：

#### 3.1 清除審計日誌 (Line 171)
```typescript
await createAdminAuditLogFromRequest(app, req, {
  action: '清除所有審計日誌',
  action_type: AuditActionType.CLEAR,
  resource_type: AuditResourceType.AUDIT_LOG
});
```

## 驗證方法

### 方法 1：使用測試腳本
執行測試腳本來驗證修正：
```bash
node test-permission-audit-log.js
```

**注意：** 需要替換腳本中的 `session=your-session-cookie` 為實際的 session cookie。

### 方法 2：手動測試
1. 登入系統
2. 進入管理後台 → 權限授權設定
3. 修改任一權限設定
4. 點擊「儲存變更」
5. 檢查 `admin_audit_logs` 表的最新記錄

**SQL 查詢：**
```sql
SELECT
  user_id,
  user_role,
  line_id,        -- 應顯示 LINE ID (如: line_U1234...)
  line_name,      -- 應顯示 LINE 名稱
  action,
  action_type,
  resource_type,
  ip_address,     -- 應顯示客戶端 IP
  user_agent,     -- 應顯示瀏覽器資訊
  created_at
FROM admin_audit_logs
ORDER BY created_at DESC
LIMIT 1;
```

## 資料庫欄位對應

### admin_audit_logs 表結構
```sql
CREATE TABLE admin_audit_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT,              -- 使用者 ID (line_U1234...)
  user_role TEXT NOT NULL,   -- 角色 (super_admin, admin, etc.)
  line_id TEXT,              -- LINE 子 ID (從 users.line_sub)
  line_name TEXT,            -- LINE 顯示名稱
  action TEXT NOT NULL,      -- 操作描述（中文）
  action_type TEXT NOT NULL, -- 操作類型 (UPDATE, DELETE, etc.)
  resource_type TEXT,        -- 資源類型
  resource_id TEXT,          -- 資源 ID
  details JSONB,             -- 詳細資訊
  ip_address TEXT,           -- IP 位址
  user_agent TEXT,           -- User Agent
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### users 表相關欄位
```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY,       -- 使用者 ID (line_U1234...)
  line_sub TEXT UNIQUE,      -- LINE 子 ID (原始 LINE ID)
  name TEXT,                 -- 使用者名稱 (LINE 顯示名稱)
  email TEXT,
  avatar_url TEXT,
  role TEXT DEFAULT 'user',
  ...
);
```

## 注意事項

1. **LINE ID 來源**
   - `line_id` 欄位儲存的是 `users.line_sub`，這是 LINE 登入時的原始 ID
   - `user_id` 欄位儲存的是 `line_` + LINE ID 的組合

2. **IP 位址**
   - 從 Fastify 的 `request.ip` 取得
   - 若使用反向代理，請確保正確設定 `trust proxy`

3. **User Agent**
   - 從 `request.headers['user-agent']` 取得
   - 記錄瀏覽器和作業系統資訊

## 修正檔案清單

✅ 已修正的檔案：
- `packages/backend/src/lib/audit-logger.ts` (新建)
- `packages/backend/src/routes/permissions.ts` (更新)
- `packages/backend/src/routes/audit-log.ts` (更新)

## 測試檔案

📝 測試工具：
- `test-permission-audit-log.js` - 權限更新 audit log 測試腳本

## 完成時間
2025-10-04

---

✅ **修正完成！現在所有權限設定的操作都會正確記錄 LINE ID、LINE 名稱和 IP 位址。**
