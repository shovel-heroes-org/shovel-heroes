import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

/**
 * 權限檢查中間件
 * 檢查使用者是否有必要的權限來執行操作
 */
export function requireAuth(request: FastifyRequest, reply: FastifyReply, done: () => void) {
  if (!request.user) {
    return reply.status(401).send({ message: 'Unauthorized - Login required' });
  }
  done();
}

/**
 * 管理員權限檢查
 * 確認使用者有管理員或超級管理員角色
 */
export function requireAdmin(request: FastifyRequest, reply: FastifyReply, done: () => void) {
  if (!request.user) {
    return reply.status(401).send({ message: 'Unauthorized - Login required' });
  }

  if (request.user.role !== 'admin' && request.user.role !== 'super_admin') {
    return reply.status(403).send({ message: 'Forbidden - Admin access required' });
  }

  done();
}

/**
 * 超級管理員權限檢查
 * 僅允許超級管理員訪問
 */
export function requireSuperAdmin(request: FastifyRequest, reply: FastifyReply, done: () => void) {
  if (!request.user) {
    return reply.status(401).send({ message: 'Unauthorized - Login required' });
  }

  if (request.user.role !== 'super_admin') {
    return reply.status(403).send({ message: 'Forbidden - Super admin access required' });
  }

  done();
}

/**
 * 資源擁有者或管理員權限檢查
 * 允許資源擁有者或管理員進行操作
 */
export function requireOwnerOrAdmin(ownerField: string = 'created_by_id') {
  return async function(request: FastifyRequest, reply: FastifyReply) {
    if (!request.user) {
      return reply.status(401).send({ message: 'Unauthorized - Login required' });
    }

    // Admin always has access
    if (request.user.role === 'admin') {
      return;
    }

    // Check if user is owner
    const resourceId = (request.params as any)?.id;
    if (!resourceId) {
      return reply.status(400).send({ message: 'Resource ID not provided' });
    }

    // This would need to be customized based on the resource type
    // For now, we'll pass through and let the route handler check ownership
    return;
  };
}

/**
 * 檢查使用者是否可以修改資源
 * 超級管理員和管理員可以修改所有資源
 * 一般使用者只能修改自己創建的資源
 */
export function canModifyResource(userId: string, resource: any, userRole: string): boolean {
  // Super admin and admin can modify everything
  if (userRole === 'super_admin' || userRole === 'admin') return true;

  // Check if user is the creator
  if (resource.created_by_id === userId) return true;

  // Check if user is assigned as manager (for grids)
  if (resource.grid_manager_id && resource.grid_manager_id === userId) return true;

  return false;
}

/**
 * 檢查使用者是否可以刪除資源
 * 超級管理員可以永久刪除所有資源
 * 管理員可以將資源移至垃圾桶
 * 一般使用者只能刪除自己創建的資源
 */
export function canDeleteResource(userId: string, resource: any, userRole: string, isPermanent: boolean = false): boolean {
  // Only super admin can permanently delete
  if (isPermanent && userRole !== 'super_admin') return false;

  // Super admin and admin can delete everything
  if (userRole === 'super_admin' || userRole === 'admin') return true;

  // Check if user is the creator
  if (resource.created_by_id === userId) return true;

  // For grids, also allow grid manager to delete
  if (resource.grid_manager_id && resource.grid_manager_id === userId) return true;

  return false;
}

/**
 * 檢查特定資源的操作權限
 * @param permissionKey - 權限鍵值 (如: 'grids', 'announcements')
 * @param action - 操作類型 ('view'|'create'|'edit'|'delete'|'manage')
 */
export function requirePermission(permissionKey: string, action: 'view' | 'create' | 'edit' | 'delete' | 'manage') {
  return async function(request: FastifyRequest, reply: FastifyReply) {
    if (!request.user) {
      return reply.status(401).send({ message: 'Unauthorized - Login required' });
    }

    // 取得作用中的角色
    const actingRoleHeader = (request.headers['x-acting-role'] || (request.headers as any)['X-Acting-Role']) as string | undefined;
    const actingRole = actingRoleHeader === 'user' ? 'user' : (request.user?.role || 'user');

    // 檢查權限
    const hasAccess = await checkResourcePermission(request.server, actingRole, permissionKey, action);

    if (!hasAccess) {
      return reply.status(403).send({
        message: `Forbidden - You don't have permission to ${action} ${permissionKey}`
      });
    }
  };
}

/**
 * 從資料庫檢查資源權限
 * @export
 */
export async function checkResourcePermission(
  app: FastifyInstance,
  role: string,
  permissionKey: string,
  action: 'view' | 'create' | 'edit' | 'delete' | 'manage'
): Promise<boolean> {
  // 超級管理員有所有權限
  if (role === 'super_admin') {
    return true;
  }

  // 如果沒有 DB，使用預設權限邏輯
  if (!app.hasDecorator('db')) {
    return getDefaultPermission(role, permissionKey, action);
  }

  try {
    // 從資料庫查詢權限
    const actionColumn = `can_${action}`;
    const { rows } = await app.db.query(
      `SELECT ${actionColumn} FROM role_permissions WHERE role = $1 AND permission_key = $2`,
      [role, permissionKey]
    );

    if (rows.length > 0) {
      return rows[0][actionColumn] === 1 || rows[0][actionColumn] === true;
    }

    // 如果資料庫中沒有記錄，使用預設權限
    return getDefaultPermission(role, permissionKey, action);
  } catch (error) {
    console.error('檢查權限失敗:', error);
    // 錯誤時降級到預設權限
    return getDefaultPermission(role, permissionKey, action);
  }
}

/**
 * 預設權限邏輯（當資料庫不可用時使用）
 * @private
 */
function getDefaultPermission(role: string, permissionKey: string, action: string): boolean {
  // 備份分支政策：預設完全開放，讓資料庫的 role_permissions 表決定實際權限
  // 如果資料庫沒有記錄，則採用這裡的寬鬆預設值
  const permissions: Record<string, Record<string, Record<string, boolean>>> = {
    guest: {
      announcements: { view: true },
      users: { view: true, create: false, edit: false, delete: false, manage: false },
      grids: { view: true, create: false, edit: false, delete: false, manage: false },
      volunteers: { view: true, create: false, edit: false, delete: false, manage: false },
      'disaster-areas': { view: true, create: false, edit: false, delete: false, manage: false }
    },
    user: {
      announcements: { view: true },
      users: { view: true, create: true, edit: true, delete: false, manage: false },
      grids: { view: true, create: true, edit: true, delete: false, manage: false },
      volunteers: { view: true, create: true, edit: true, delete: false, manage: false },
      'disaster-areas': { view: true, create: true, edit: true, delete: false, manage: false }
    },
    grid_manager: {
      announcements: { view: true, create: true, edit: true, delete: true },
      users: { view: true, create: true, edit: true, delete: true, manage: false },
      grids: { view: true, create: true, edit: true, delete: true, manage: true },
      volunteers: { view: true, create: true, edit: true, delete: true, manage: true },
      'disaster-areas': { view: true, create: true, edit: true, delete: true, manage: false }
    },
    admin: {
      announcements: { view: true, create: true, edit: true, delete: true, manage: true },
      users: { view: true, create: true, edit: true, delete: true, manage: true },
      grids: { view: true, create: true, edit: true, delete: true, manage: true },
      volunteers: { view: true, create: true, edit: true, delete: true, manage: true },
      'disaster-areas': { view: true, create: true, edit: true, delete: true, manage: true }
    },
    super_admin: {
      announcements: { view: true, create: true, edit: true, delete: true, manage: true },
      users: { view: true, create: true, edit: true, delete: true, manage: true },
      grids: { view: true, create: true, edit: true, delete: true, manage: true },
      volunteers: { view: true, create: true, edit: true, delete: true, manage: true },
      'disaster-areas': { view: true, create: true, edit: true, delete: true, manage: true }
    }
  };

  return permissions[role]?.[permissionKey]?.[action] || false;
}