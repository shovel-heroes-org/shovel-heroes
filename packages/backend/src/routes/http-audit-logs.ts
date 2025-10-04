/**
 * HTTP 請求審計日誌 API
 * 提供查詢、匯出、清除等功能供管理員使用
 */

import type { FastifyInstance, FastifyRequest } from 'fastify';
import { stringify } from 'csv-stringify/sync';
import { createAdminAuditLogFromRequest, AuditActionType, AuditResourceType } from '../lib/audit-logger.js';

// Middleware to ensure only super_admin can access
const requireSuperAdmin = async (request: FastifyRequest, reply: any) => {
  if (!request.user || request.user.role !== 'super_admin') {
    return reply.status(403).send({ message: 'Only super admin can access HTTP audit logs' });
  }
};

export function registerHttpAuditLogRoutes(app: FastifyInstance) {
  // 查詢 HTTP 審計日誌
  app.get('/admin/http-audit-logs', { preHandler: requireSuperAdmin }, async (req, reply) => {
    if (!app.hasDecorator('db')) {
      return reply.status(503).send({ message: 'Database not available' });
    }

    try {
      const query = req.query as {
        limit?: string;
        offset?: string;
        method?: string;
        path?: string;
        status_code?: string;
        user_id?: string;
        start_date?: string;
        end_date?: string;
      };

      const limit = parseInt(query.limit || '100');
      const offset = parseInt(query.offset || '0');

      let whereClause = 'WHERE 1=1';
      const params: any[] = [];
      let paramCount = 0;

      if (query.method) {
        params.push(query.method);
        whereClause += ` AND method = $${++paramCount}`;
      }

      if (query.path) {
        params.push(`%${query.path}%`);
        whereClause += ` AND path LIKE $${++paramCount}`;
      }

      if (query.status_code) {
        params.push(parseInt(query.status_code));
        whereClause += ` AND status_code = $${++paramCount}`;
      }

      if (query.user_id) {
        params.push(query.user_id);
        whereClause += ` AND user_id = $${++paramCount}`;
      }

      if (query.start_date) {
        params.push(query.start_date);
        whereClause += ` AND created_at >= $${++paramCount}`;
      }

      if (query.end_date) {
        params.push(query.end_date);
        whereClause += ` AND created_at <= $${++paramCount}`;
      }

      // 查詢總數
      const { rows: countRows } = await app.db.query(
        `SELECT COUNT(*) as total FROM audit_logs ${whereClause}`,
        params
      );
      const total = parseInt(countRows[0]?.total || '0');

      // 查詢日誌
      params.push(limit, offset);
      const { rows } = await app.db.query(
        `SELECT
          id, method, path, query, ip, status_code, error,
          duration_ms, user_id, created_at
        FROM audit_logs
        ${whereClause}
        ORDER BY created_at DESC
        LIMIT $${++paramCount} OFFSET $${++paramCount}`,
        params
      );

      return {
        logs: rows,
        total,
        limit,
        offset
      };
    } catch (err: any) {
      app.log.error({ err }, '[http-audit-log] Failed to fetch HTTP audit logs');
      return reply.status(500).send({ message: 'Failed to fetch HTTP audit logs' });
    }
  });

  // 查詢單一 HTTP 審計日誌詳情（包含完整的 request/response body）
  app.get('/admin/http-audit-logs/:id', { preHandler: requireSuperAdmin }, async (req, reply) => {
    if (!app.hasDecorator('db')) {
      return reply.status(503).send({ message: 'Database not available' });
    }

    try {
      const { id } = req.params as { id: string };

      const { rows } = await app.db.query(
        `SELECT * FROM audit_logs WHERE id = $1`,
        [id]
      );

      if (rows.length === 0) {
        return reply.status(404).send({ message: 'HTTP audit log not found' });
      }

      return rows[0];
    } catch (err: any) {
      app.log.error({ err }, '[http-audit-log] Failed to fetch HTTP audit log detail');
      return reply.status(500).send({ message: 'Failed to fetch HTTP audit log detail' });
    }
  });

  // 匯出 HTTP 審計日誌為 CSV
  app.get('/admin/http-audit-logs/export', { preHandler: requireSuperAdmin }, async (req, reply) => {
    if (!app.hasDecorator('db')) {
      return reply.status(503).send({ message: 'Database not available' });
    }

    try {
      const query = req.query as {
        method?: string;
        path?: string;
        status_code?: string;
        user_id?: string;
        start_date?: string;
        end_date?: string;
      };

      let whereClause = 'WHERE 1=1';
      const params: any[] = [];
      let paramCount = 0;

      if (query.method) {
        params.push(query.method);
        whereClause += ` AND method = $${++paramCount}`;
      }

      if (query.path) {
        params.push(`%${query.path}%`);
        whereClause += ` AND path LIKE $${++paramCount}`;
      }

      if (query.status_code) {
        params.push(parseInt(query.status_code));
        whereClause += ` AND status_code = $${++paramCount}`;
      }

      if (query.user_id) {
        params.push(query.user_id);
        whereClause += ` AND user_id = $${++paramCount}`;
      }

      if (query.start_date) {
        params.push(query.start_date);
        whereClause += ` AND created_at >= $${++paramCount}`;
      }

      if (query.end_date) {
        params.push(query.end_date);
        whereClause += ` AND created_at <= $${++paramCount}`;
      }

      const { rows } = await app.db.query(
        `SELECT
          method, path, ip, status_code, error, duration_ms, user_id, created_at
        FROM audit_logs
        ${whereClause}
        ORDER BY created_at DESC`,
        params
      );

      // 格式化時間欄位
      const formatDateTime = (date: Date | string | number | null | undefined): string => {
        if (!date) return '';

        try {
          const d = new Date(date);
          if (isNaN(d.getTime())) return '';

          const year = d.getFullYear();
          const month = String(d.getMonth() + 1).padStart(2, '0');
          const day = String(d.getDate()).padStart(2, '0');
          const hours = String(d.getHours()).padStart(2, '0');
          const minutes = String(d.getMinutes()).padStart(2, '0');
          const seconds = String(d.getSeconds()).padStart(2, '0');

          return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
        } catch {
          return '';
        }
      };

      const formattedRows = rows.map(row => ({
        ...row,
        created_at: formatDateTime(row.created_at)
      }));

      const csv = stringify(formattedRows, {
        header: true,
        columns: {
          method: 'HTTP 方法',
          path: '路徑',
          ip: 'IP 位址',
          status_code: '狀態碼',
          error: '錯誤訊息',
          duration_ms: '耗時 (ms)',
          user_id: '使用者 ID',
          created_at: '建立時間'
        }
      });

      // 記錄審計日誌
      await createAdminAuditLogFromRequest(app, req, {
        action: `匯出 ${rows.length} 筆 HTTP 審計日誌為 CSV`,
        action_type: AuditActionType.EXPORT,
        resource_type: 'http_audit_logs',
        details: { count: rows.length }
      });

      // 添加 UTF-8 BOM 以確保 Excel 正確識別編碼
      const csvWithBOM = '\uFEFF' + csv;

      reply.type('text/csv; charset=utf-8');
      reply.header('Content-Disposition', `attachment; filename="http_audit_logs_${new Date().toISOString().split('T')[0]}.csv"`);
      return csvWithBOM;
    } catch (err: any) {
      app.log.error({ err }, '[http-audit-log] Failed to export HTTP audit logs');
      return reply.status(500).send({ message: 'Failed to export HTTP audit logs' });
    }
  });

  // 清除 HTTP 審計日誌
  app.delete('/admin/http-audit-logs/clear', { preHandler: requireSuperAdmin }, async (req, reply) => {
    if (!app.hasDecorator('db')) {
      return reply.status(503).send({ message: 'Database not available' });
    }

    try {
      const query = req.query as {
        days?: string;
      };

      let deleteQuery = 'DELETE FROM audit_logs';
      const params: any[] = [];

      // 如果指定天數，只刪除 N 天前的資料
      if (query.days) {
        const days = parseInt(query.days);
        deleteQuery += ' WHERE created_at < NOW() - INTERVAL \'$1 days\'';
        params.push(days);
      }

      const { rows } = await app.db.query(deleteQuery, params);
      const deletedCount = rows.length;

      // 記錄清除操作到管理日誌
      await createAdminAuditLogFromRequest(app, req, {
        action: query.days ? `清除 ${query.days} 天前的 HTTP 審計日誌` : '清除所有 HTTP 審計日誌',
        action_type: AuditActionType.CLEAR,
        resource_type: 'http_audit_logs',
        details: { days: query.days, deletedCount }
      });

      return {
        message: 'HTTP audit logs cleared successfully',
        deletedCount
      };
    } catch (err: any) {
      app.log.error({ err }, '[http-audit-log] Failed to clear HTTP audit logs');
      return reply.status(500).send({ message: 'Failed to clear HTTP audit logs' });
    }
  });

  // 取得統計資訊
  app.get('/admin/http-audit-logs/stats', { preHandler: requireSuperAdmin }, async (req, reply) => {
    if (!app.hasDecorator('db')) {
      return reply.status(503).send({ message: 'Database not available' });
    }

    try {
      const query = req.query as {
        start_date?: string;
        end_date?: string;
      };

      let whereClause = 'WHERE 1=1';
      const params: any[] = [];
      let paramCount = 0;

      if (query.start_date) {
        params.push(query.start_date);
        whereClause += ` AND created_at >= $${++paramCount}`;
      }

      if (query.end_date) {
        params.push(query.end_date);
        whereClause += ` AND created_at <= $${++paramCount}`;
      }

      // 總請求數
      const { rows: totalRows } = await app.db.query(
        `SELECT COUNT(*) as total FROM audit_logs ${whereClause}`,
        params
      );

      // 按狀態碼統計
      const { rows: statusRows } = await app.db.query(
        `SELECT
          CASE
            WHEN status_code < 200 THEN '1xx'
            WHEN status_code < 300 THEN '2xx'
            WHEN status_code < 400 THEN '3xx'
            WHEN status_code < 500 THEN '4xx'
            ELSE '5xx'
          END as status_group,
          COUNT(*) as count
        FROM audit_logs ${whereClause}
        GROUP BY status_group
        ORDER BY status_group`,
        params
      );

      // 按 HTTP 方法統計
      const { rows: methodRows } = await app.db.query(
        `SELECT method, COUNT(*) as count
        FROM audit_logs ${whereClause}
        GROUP BY method
        ORDER BY count DESC`,
        params
      );

      // 平均回應時間
      const { rows: avgDurationRows } = await app.db.query(
        `SELECT AVG(duration_ms) as avg_duration
        FROM audit_logs ${whereClause}`,
        params
      );

      // 最慢的請求
      const { rows: slowestRows } = await app.db.query(
        `SELECT path, method, duration_ms, created_at
        FROM audit_logs ${whereClause}
        ORDER BY duration_ms DESC
        LIMIT 10`,
        params
      );

      return {
        total: parseInt(totalRows[0]?.total || '0'),
        byStatus: statusRows,
        byMethod: methodRows,
        avgDuration: parseFloat(avgDurationRows[0]?.avg_duration || '0'),
        slowestRequests: slowestRows
      };
    } catch (err: any) {
      app.log.error({ err }, '[http-audit-log] Failed to fetch HTTP audit log stats');
      return reply.status(500).send({ message: 'Failed to fetch HTTP audit log stats' });
    }
  });
}
