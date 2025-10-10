import type { FastifyRequest, FastifyReply } from 'fastify';

/**
 * 從資料庫檢查權限的 Middleware
 *
 * @param permissionKey - 權限鍵值 (如 'grids', 'users', 'admin_panel')
 * @param action - 操作類型 ('view' | 'create' | 'edit' | 'delete' | 'manage')
 * @returns Fastify preHandler function
 *
 * @example
 * ```typescript
 * app.get('/api/grids', {
 *   preHandler: requirePermission('grids', 'view')
 * }, async (request, reply) => {
 *   // 處理請求
 * });
 * ```
 */
export function requirePermission(
  permissionKey: string,
  action: 'view' | 'create' | 'edit' | 'delete' | 'manage'
) {
  return async function (request: FastifyRequest, reply: FastifyReply) {
    // 檢查使用者是否已登入
    if (!(request as any).user) {
      return reply.status(401).send({ message: 'Unauthorized - Login required' });
    }

    const user = (request as any).user;
    // 支援視角切換：優先使用 X-Acting-Role header，否則使用真實角色
    const actingRoleHeader = (request.headers['x-acting-role'] || (request.headers as any)['X-Acting-Role']) as string | undefined;
    const userRole = actingRoleHeader || user.role || 'guest';

    // 取得 Fastify app 實例以訪問資料庫
    const app = request.server as any;

    if (!app.hasDecorator('db')) {
      request.log.error('[permission] Database not available');
      return reply.status(503).send({ message: 'Service temporarily unavailable' });
    }

    try {
      // 從資料庫查詢權限
      const { rows } = await app.db.query(`
        SELECT can_view, can_create, can_edit, can_delete, can_manage
        FROM role_permissions
        WHERE role = $1 AND permission_key = $2
      `, [userRole, permissionKey]);

      // 如果找不到權限設定，拒絕訪問
      if (rows.length === 0) {
        request.log.warn({
          role: userRole,
          permission: permissionKey,
          action
        }, '[permission] Permission not found in database');
        return reply.status(403).send({
          message: 'Forbidden - Permission not configured',
          detail: `Role '${userRole}' does not have permission '${permissionKey}' configured`
        });
      }

      const permission = rows[0];
      let hasPermission = false;

      // 檢查對應的操作權限
      switch (action) {
        case 'view':
          hasPermission = permission.can_view === 1;
          break;
        case 'create':
          hasPermission = permission.can_create === 1;
          break;
        case 'edit':
          hasPermission = permission.can_edit === 1;
          break;
        case 'delete':
          hasPermission = permission.can_delete === 1;
          break;
        case 'manage':
          hasPermission = permission.can_manage === 1;
          break;
        default:
          hasPermission = false;
      }

      if (!hasPermission) {
        request.log.warn({
          userId: user.id,
          role: userRole,
          permission: permissionKey,
          action,
          required: true,
          actual: false
        }, '[permission] Access denied');

        return reply.status(403).send({
          message: `Forbidden - ${action} access denied`,
          detail: `Your role '${userRole}' does not have '${action}' permission for '${permissionKey}'`
        });
      }

      // 權限檢查通過
      request.log.debug({
        userId: user.id,
        role: userRole,
        permission: permissionKey,
        action
      }, '[permission] Access granted');

    } catch (error: any) {
      request.log.error({ error }, '[permission] Failed to check permission');
      return reply.status(500).send({
        message: 'Internal server error while checking permissions'
      });
    }
  };
}

/**
 * 檢查管理後台訪問權限
 * 替代舊的 requireAdmin
 */
export function requireAdminPanel() {
  return requirePermission('admin_panel', 'view');
}

/**
 * 檢查特定資源的管理權限
 * 替代舊的 requireSuperAdmin
 */
export function requireManagePermission(permissionKey: string) {
  return requirePermission(permissionKey, 'manage');
}

/**
 * 快捷方式：檢查多個權限（需滿足任一條件）
 */
export function requireAnyPermission(
  permissions: Array<{ key: string; action: 'view' | 'create' | 'edit' | 'delete' | 'manage' }>
) {
  return async function (request: FastifyRequest, reply: FastifyReply) {
    if (!(request as any).user) {
      return reply.status(401).send({ message: 'Unauthorized - Login required' });
    }

    const user = (request as any).user;
    // 支援視角切換：優先使用 X-Acting-Role header，否則使用真實角色
    const actingRoleHeader = (request.headers['x-acting-role'] || (request.headers as any)['X-Acting-Role']) as string | undefined;
    const userRole = actingRoleHeader || user.role || 'guest';
    const app = request.server as any;

    if (!app.hasDecorator('db')) {
      return reply.status(503).send({ message: 'Service temporarily unavailable' });
    }

    try {
      // 檢查每個權限，只要有一個通過就允許訪問
      for (const perm of permissions) {
        const { rows } = await app.db.query(`
          SELECT can_view, can_create, can_edit, can_delete, can_manage
          FROM role_permissions
          WHERE role = $1 AND permission_key = $2
        `, [userRole, perm.key]);

        if (rows.length > 0) {
          const permission = rows[0];
          let hasPermission = false;

          switch (perm.action) {
            case 'view':
              hasPermission = permission.can_view === 1;
              break;
            case 'create':
              hasPermission = permission.can_create === 1;
              break;
            case 'edit':
              hasPermission = permission.can_edit === 1;
              break;
            case 'delete':
              hasPermission = permission.can_delete === 1;
              break;
            case 'manage':
              hasPermission = permission.can_manage === 1;
              break;
          }

          if (hasPermission) {
            // 找到一個符合的權限，允許訪問
            return;
          }
        }
      }

      // 所有權限都不符合
      return reply.status(403).send({
        message: 'Forbidden - Insufficient permissions'
      });

    } catch (error: any) {
      request.log.error({ error }, '[permission] Failed to check any permission');
      return reply.status(500).send({
        message: 'Internal server error while checking permissions'
      });
    }
  };
}
