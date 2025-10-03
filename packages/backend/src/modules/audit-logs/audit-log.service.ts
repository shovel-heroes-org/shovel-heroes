import type { Pool } from "pg";
import type { AuditLog } from "./audit-log.types";
import { insertAuditLog } from "./audit-log.repo";

export class AuditLogService {
  constructor(private pool: Pool) {}

  async save(log: Partial<AuditLog>): Promise<void> {
    const normalized: AuditLog = {
      ...log,
      createdAt: log.createdAt || new Date().toISOString(),
      query: log.query ?? {},
      headers: log.headers ?? {},
    } as AuditLog;

    await insertAuditLog(this.pool, normalized);
  }
}
