import type { Pool } from "pg";
import type { AuditLog } from "./audit-log.types.js";

export async function insertAuditLog(pool: Pool, log: AuditLog): Promise<void> {
  await pool.query(
    `
    INSERT INTO audit_logs (
      method, path, query, ip, headers, status_code, error, duration_ms,
      request_body, response_body, user_id, resource_id, created_at
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
    `,
    [
      log.method,
      log.path,
      log.query ? JSON.stringify(log.query) : null,
      log.ip,
      log.headers ? JSON.stringify(log.headers) : null,
      log.statusCode,
      log.error,
      log.durationMs,
      log.requestBody ? JSON.stringify(log.requestBody) : null,
      log.responseBody ? JSON.stringify(log.responseBody) : null,
      log.userId,
      log.resourceId,
      log.createdAt,
    ]
  );
}
