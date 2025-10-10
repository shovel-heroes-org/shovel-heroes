import type { FastifyInstance, FastifyRequest } from 'fastify';
import { stringify } from 'csv-stringify/sync';
import { createAdminAuditLogFromRequest, AuditActionType, AuditResourceType } from '../lib/audit-logger.js';
import { requireManagePermission } from '../middlewares/PermissionMiddleware.js';

/**
 * 格式化日期時間為可讀格式 (YYYY-MM-DD HH:MM:SS)
 * @param date - Date 物件或時間戳
 * @returns 格式化的日期時間字串,如果無效則返回空字串
 */
function formatDateTime(date: Date | string | number | null | undefined): string {
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
}

export function registerAuditLogRoutes(app: FastifyInstance) {
  // 查詢審計日誌
  app.get('/admin/audit-logs', { preHandler: requireManagePermission('audit_logs') }, async (req, reply) => {
    if (!app.hasDecorator('db')) {
      return reply.status(503).send({ message: 'Database not available' });
    }

    try {
      const query = req.query as {
        limit?: string;
        offset?: string;
        user_role?: string;
        action_type?: string;
        start_date?: string;
        end_date?: string;
      };

      const limit = parseInt(query.limit || '100');
      const offset = parseInt(query.offset || '0');

      let whereClause = 'WHERE 1=1';
      const params: any[] = [];
      let paramCount = 0;

      if (query.user_role) {
        params.push(query.user_role);
        whereClause += ` AND user_role = $${++paramCount}`;
      }

      if (query.action_type) {
        params.push(query.action_type);
        whereClause += ` AND action_type = $${++paramCount}`;
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
        `SELECT COUNT(*) as total FROM admin_audit_logs ${whereClause}`,
        params
      );
      const total = parseInt(countRows[0]?.total || '0');

      // 查詢日誌
      params.push(limit, offset);
      const { rows } = await app.db.query(
        `SELECT
          id, user_id, user_role, line_id, line_name,
          action, action_type, resource_type, resource_id,
          details, ip_address, user_agent, created_at
        FROM admin_audit_logs
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
      app.log.error({ err }, '[audit-log] Failed to fetch audit logs');
      return reply.status(500).send({ message: 'Failed to fetch audit logs' });
    }
  });

  // 匯出審計日誌為 CSV
  app.get('/admin/audit-logs/export', { preHandler: requireManagePermission('audit_logs') }, async (req, reply) => {
    if (!app.hasDecorator('db')) {
      return reply.status(503).send({ message: 'Database not available' });
    }

    try {
      const query = req.query as {
        user_role?: string;
        action_type?: string;
        start_date?: string;
        end_date?: string;
      };

      let whereClause = 'WHERE 1=1';
      const params: any[] = [];
      let paramCount = 0;

      if (query.user_role) {
        params.push(query.user_role);
        whereClause += ` AND user_role = $${++paramCount}`;
      }

      if (query.action_type) {
        params.push(query.action_type);
        whereClause += ` AND action_type = $${++paramCount}`;
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
          user_role, line_id, line_name, action, action_type,
          resource_type, resource_id, ip_address, created_at
        FROM admin_audit_logs
        ${whereClause}
        ORDER BY created_at DESC`,
        params
      );

      // 格式化時間欄位
      const formattedRows = rows.map(row => ({
        ...row,
        created_at: formatDateTime(row.created_at)
      }));

      const csv = stringify(formattedRows, {
        header: true,
        columns: {
          user_role: '權限等級',
          line_id: 'LINE ID',
          line_name: 'LINE 名稱',
          action: '操作',
          action_type: '操作類型',
          resource_type: '資源類型',
          resource_id: '資源ID',
          ip_address: 'IP位址',
          created_at: '日期時間'
        }
      });

      // 記錄匯出操作到審計日誌
      await createAdminAuditLogFromRequest(app, req, {
        action: `匯出 ${rows.length} 筆管理操作日誌為 CSV`,
        action_type: AuditActionType.EXPORT,
        resource_type: AuditResourceType.AUDIT_LOG,
        details: { count: rows.length }
      });

      const csvWithBOM = '\uFEFF' + csv;
      reply.type('text/csv; charset=utf-8');
      reply.header('Content-Disposition', 'attachment; filename="audit_logs_export.csv"');
      return csvWithBOM;
    } catch (err: any) {
      app.log.error({ err }, '[audit-log] Failed to export audit logs');
      return reply.status(500).send({ message: 'Failed to export audit logs' });
    }
  });

  // 清除審計日誌
  app.delete('/admin/audit-logs/clear', { preHandler: requireManagePermission('audit_logs') }, async (req, reply) => {
    if (!app.hasDecorator('db')) {
      return reply.status(503).send({ message: 'Database not available' });
    }

    try {
      await app.db.query('DELETE FROM admin_audit_logs');

      // 記錄清除操作
      await createAdminAuditLogFromRequest(app, req, {
        action: '清除所有審計日誌',
        action_type: AuditActionType.CLEAR,
        resource_type: AuditResourceType.AUDIT_LOG
      });

      return { message: 'Audit logs cleared successfully' };
    } catch (err: any) {
      app.log.error({ err }, '[audit-log] Failed to clear audit logs');
      return reply.status(500).send({ message: 'Failed to clear audit logs' });
    }
  });
}
