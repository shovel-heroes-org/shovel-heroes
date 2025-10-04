# 審計日誌系統最終分析報告

## 發現：兩種不同的日誌系統

經過深入分析，專案中實際上有**兩種不同用途的日誌系統**：

### 1. HTTP 請求日誌（Technical Audit Logs）
- **資料表**：`audit_logs`
- **用途**：記錄所有 HTTP API 請求和回應（技術層面）
- **實作方式**：透過 Fastify 中介軟體自動記錄
- **中介軟體**：`AuditLogMiddleware`
- **資料內容**：
  - HTTP method, path, query
  - Request/Response body
  - Headers, IP, status code
  - Duration, error message
- **應用場景**：
  - API 除錯
  - 效能分析
  - 請求追蹤
  - 系統監控

### 2. 管理操作日誌（Business Audit Logs）
- **資料表**：`admin_audit_logs`
- **用途**：記錄管理員的重要業務操作（業務層面）
- **實作方式**：手動呼叫函數記錄特定操作
- **工具函數**：`createAdminAuditLog()`
- **資料內容**：
  - 使用者資訊（user_id, user_role, LINE ID/name）
  - 操作描述（中文）
  - 操作類型（CREATE, UPDATE, DELETE 等）
  - 資源類型和 ID
  - 詳細資訊（JSON）
- **應用場景**：
  - 稽核追蹤
  - 安全監控
  - 合規性要求
  - 責任歸屬

## 當前狀態

### audit_logs（HTTP 請求日誌）
- ❌ **中介軟體已註解**：`index.ts:77-83` 中被註解掉
- ❌ **依賴已刪除**：`AuditLogService` 和相關模組已被刪除
- ❌ **無法使用**：目前無法記錄 HTTP 請求
- ⚠️ **資料表存在**：但已被 `admin_audit_logs` 覆蓋（在 db-init.ts 中）

### admin_audit_logs（管理操作日誌）
- ✅ **已標準化**：表定義已加入 `db-init.ts`
- ✅ **統一工具**：建立了 `audit-logger.ts` 工具函數
- ✅ **正在使用**：權限管理等功能正在記錄日誌
- ✅ **完整索引**：已建立效能索引

## 決策建議

### 方案 A：兩種日誌系統並存（推薦）

**適用場景**：
- 需要完整的系統監控和除錯能力
- 需要追蹤所有 API 請求
- 需要效能分析和請求追蹤

**實作步驟**：

#### 1. 恢復 `audit_logs` 表定義

在 `db-init.ts` 中加入：
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

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_path ON audit_logs(path);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_status_code ON audit_logs(status_code);
```

#### 2. 簡化 AuditLogMiddleware（直接寫入資料庫）

修改 `middlewares/AuditLogMiddleware.ts`：
```typescript
import { FastifyReply, FastifyRequest, FastifyInstance } from "fastify";
import { randomUUID } from 'crypto';

export function createAuditLogMiddleware(app: FastifyInstance) {
  async function saveAuditLog(logData: any) {
    if (!app.hasDecorator('db')) return;

    try {
      await app.db.query(
        `INSERT INTO audit_logs (
          id, method, path, query, ip, headers, status_code, error,
          duration_ms, request_body, response_body, user_id, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())`,
        [
          randomUUID(),
          logData.method,
          logData.path,
          JSON.stringify(logData.query),
          logData.ip,
          JSON.stringify(logData.headers),
          logData.statusCode,
          logData.error || null,
          logData.durationMs,
          logData.requestBody ? JSON.stringify(logData.requestBody) : null,
          logData.responseBody ? JSON.stringify(logData.responseBody) : null,
          logData.userId
        ]
      );
    } catch (err) {
      app.log.error({ err }, "[AUDIT][SAVE_FAILED]");
    }
  }

  function start(req: FastifyRequest, _: FastifyReply, done: () => void) {
    req.startTime = Date.now();
    done();
  }

  async function onResponse(req: FastifyRequest, reply: FastifyReply) {
    if (reply.statusCode >= 400) return;

    const { authorization, cookie, "set-cookie": setCookie, ...filteredHeaders } = req.headers;

    await saveAuditLog({
      userId: (req.user as any)?.id || null,
      method: req.method,
      path: req.url,
      query: req.query,
      ip: (req.headers["cf-connecting-ip"] as string) || req.ip,
      headers: filteredHeaders,
      requestBody: req.body ?? null,
      responseBody: reply.locals?.responseBody ?? null,
      statusCode: reply.statusCode,
      durationMs: req.startTime ? Date.now() - req.startTime : 0,
    });
  }

  async function onError(req: FastifyRequest, reply: FastifyReply, error: Error) {
    const { authorization, cookie, "set-cookie": setCookie, ...filteredHeaders } = req.headers;

    await saveAuditLog({
      userId: (req.user as any)?.id || null,
      method: req.method,
      path: req.url,
      query: req.query,
      ip: (req.headers["cf-connecting-ip"] as string) || req.ip,
      headers: filteredHeaders,
      requestBody: req.body ?? null,
      responseBody: reply.locals?.responseBody ?? null,
      statusCode: reply.statusCode || 500,
      durationMs: req.startTime ? Date.now() - req.startTime : 0,
      error: error.message,
    });
  }

  return { start, onResponse, onError };
}
```

#### 3. 啟用中介軟體

在 `index.ts` 中取消註解並修改：
```typescript
import { createAuditLogMiddleware } from "./middlewares/AuditLogMiddleware.js";

// ... 在 initDb 之後
const AuditLogMiddleware = createAuditLogMiddleware(app);
app.addHook("onRequest", AuditLogMiddleware.start);
app.addHook("onResponse", AuditLogMiddleware.onResponse);
app.addHook("onError", AuditLogMiddleware.onError);
```

---

### 方案 B：只保留管理操作日誌（簡化）

**適用場景**：
- 只需要稽核管理員操作
- 不需要完整的 API 請求追蹤
- 希望減少資料庫負載

**實作步驟**：

#### 1. 刪除相關檔案
```bash
rm packages/backend/src/middlewares/AuditLogMiddleware.ts
```

#### 2. 清理 index.ts
從 `index.ts` 移除已註解的程式碼（第 77-83 行）

#### 3. 完全移除 audit_logs 表
在資料庫中執行：
```sql
DROP TABLE IF EXISTS audit_logs;
```

---

## 兩種日誌的資料量對比

### audit_logs（HTTP 請求日誌）
- **寫入頻率**：每個 API 請求都會寫入
- **資料量**：高（假設每天 10,000 個請求）
- **保留期限**：建議 7-30 天（定期清理）
- **儲存需求**：較大

### admin_audit_logs（管理操作日誌）
- **寫入頻率**：只有管理操作才寫入
- **資料量**：低（假設每天 10-100 筆）
- **保留期限**：建議永久保留或 1-2 年
- **儲存需求**：較小

## 資料保留策略建議

### audit_logs（如果使用）
```sql
-- 每週清理 30 天前的日誌
DELETE FROM audit_logs
WHERE created_at < NOW() - INTERVAL '30 days';
```

### admin_audit_logs
```sql
-- 每年歸檔 1 年前的日誌（可選）
-- 建議永久保留或根據合規要求設定
```

## 最終建議

### 立即執行（必要）
1. ✅ **決定使用哪個方案**
   - 方案 A：兩種日誌並存（功能完整）
   - 方案 B：只保留管理日誌（簡化版）

2. ✅ **更新文件**
   - 說明兩種日誌的用途
   - 提供使用指南

### 後續優化（可選）
1. 建立日誌查詢 API（針對 `audit_logs`）
2. 實作自動清理機制
3. 加入日誌分析和報表功能
4. 考慮使用專業日誌系統（如 ELK Stack）

## 總結

| 特性 | audit_logs | admin_audit_logs |
|------|-----------|------------------|
| 用途 | HTTP 請求追蹤 | 業務操作稽核 |
| 資料量 | 大 | 小 |
| 自動記錄 | ✅ 是 | ❌ 否 |
| 業務語意 | ❌ 無 | ✅ 有 |
| 效能影響 | 中 | 低 |
| 合規需求 | 可選 | 必要 |
| 保留期限 | 短期（7-30天） | 長期（1-2年） |

**建議**：
- 開發/測試環境：使用方案 A（完整監控）
- 生產環境（小型）：使用方案 B（簡化版）
- 生產環境（大型）：使用方案 A + 專業日誌系統
