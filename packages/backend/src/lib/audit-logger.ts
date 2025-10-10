/**
 * 管理員操作審計日誌工具
 * 用於記錄所有管理員的重要操作，確保系統安全與可追蹤性
 */

import type { FastifyInstance, FastifyRequest } from 'fastify';
import { randomUUID } from 'crypto';

/**
 * 審計日誌資料結構
 */
export interface AdminAuditLogData {
  user_id?: string;           // 使用者 ID
  user_role: string;          // 使用者角色 (user, grid_manager, admin, super_admin, guest)
  line_id?: string;           // LINE ID
  line_name?: string;         // LINE 名稱
  action: string;             // 操作描述（中文）
  action_type: string;        // 操作類型 (CREATE, UPDATE, DELETE, LOGIN, EXPORT, etc.)
  resource_type?: string;     // 資源類型 (user, grid, area, volunteer, supply, etc.)
  resource_id?: string;       // 資源 ID
  details?: any;              // 詳細資訊（會被轉為 JSON）
  ip_address?: string;        // IP 位址
  user_agent?: string;        // User Agent
}

/**
 * 建立管理員審計日誌
 *
 * @param app - Fastify 實例
 * @param data - 審計日誌資料
 * @returns Promise<void>
 *
 * @example
 * ```typescript
 * await createAdminAuditLog(app, {
 *   user_id: request.user.id,
 *   user_role: request.user.role,
 *   action: '更新使用者角色',
 *   action_type: 'UPDATE',
 *   resource_type: 'user',
 *   resource_id: userId,
 *   details: { from: 'user', to: 'admin' },
 *   ip_address: request.ip,
 *   user_agent: request.headers['user-agent']
 * });
 * ```
 */
export async function createAdminAuditLog(
  app: FastifyInstance,
  data: AdminAuditLogData
): Promise<void> {
  // 檢查資料庫是否可用
  if (!app.hasDecorator('db')) {
    app.log.warn('[audit] Database not available, skipping audit log');
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

    app.log.info({ audit: data }, '[audit] Admin audit log created successfully');
  } catch (err: any) {
    app.log.error({ err, data }, '[audit] Failed to create admin audit log');
    // 不拋出錯誤，避免影響主要業務邏輯
  }
}

/**
 * 從 FastifyRequest 自動提取使用者資訊建立審計日誌
 *
 * @param app - Fastify 實例
 * @param request - Fastify 請求物件
 * @param data - 部分審計日誌資料（會自動補充使用者資訊）
 * @returns Promise<void>
 *
 * @example
 * ```typescript
 * await createAdminAuditLogFromRequest(app, request, {
 *   action: '刪除網格',
 *   action_type: 'DELETE',
 *   resource_type: 'grid',
 *   resource_id: gridId
 * });
 * ```
 */
export async function createAdminAuditLogFromRequest(
  app: FastifyInstance,
  request: FastifyRequest,
  data: Omit<AdminAuditLogData, 'user_id' | 'user_role' | 'ip_address' | 'user_agent'>
): Promise<void> {
  const user = (request as any).user;

  await createAdminAuditLog(app, {
    user_id: user?.id,
    user_role: user?.role || 'guest',
    line_id: user?.line_sub,
    line_name: user?.name,
    ip_address: request.ip,
    user_agent: request.headers['user-agent'],
    ...data
  });
}

/**
 * 常用的操作類型常數
 */
export const AuditActionType = {
  CREATE: 'CREATE',
  UPDATE: 'UPDATE',
  DELETE: 'DELETE',
  LOGIN: 'LOGIN',
  LOGOUT: 'LOGOUT',
  EXPORT: 'EXPORT',
  IMPORT: 'IMPORT',
  BATCH_UPDATE: 'BATCH_UPDATE',
  BATCH_DELETE: 'BATCH_DELETE',
  RESET: 'RESET',
  CLEAR: 'CLEAR'
} as const;

/**
 * 常用的資源類型常數
 */
export const AuditResourceType = {
  USER: 'user',
  GRID: 'grid',
  AREA: 'disaster_area',
  VOLUNTEER: 'volunteer_registration',
  SUPPLY: 'supply_donation',
  ANNOUNCEMENT: 'announcement',
  BLACKLIST: 'blacklist',
  ROLE_PERMISSION: 'role_permission',
  AUDIT_LOG: 'audit_log'
} as const;
