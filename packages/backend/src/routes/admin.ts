import type { FastifyInstance } from 'fastify';
import { requireAdminPanel, requireManagePermission, requirePermission } from '../middlewares/PermissionMiddleware.js';
import { createAdminAuditLog } from '../lib/audit-logger.js';

export function registerAdminRoutes(app: FastifyInstance) {
  // Get all users (admin only)
  app.get('/admin/users', { preHandler: requirePermission('users', 'view') }, async (req, reply) => {
    if (!app.hasDecorator('db')) return [];

    try {
      const { rows } = await app.db.query(
        `SELECT id, name, email, line_sub, avatar_url, role, is_blacklisted, created_at
         FROM users
         ORDER BY created_at DESC`
      );

      // Hide LINE IDs for privacy
      const sanitizedUsers = rows.map(user => ({
        ...user,
        line_sub: user.line_sub ? 'HIDDEN' : null,
        full_name: user.name
      }));

      return sanitizedUsers;
    } catch (err: any) {
      app.log.error({ err }, '[admin] Failed to get users');
      return reply.status(500).send({ message: 'Failed to fetch users' });
    }
  });

  // Update user role (admin only)
  app.patch('/admin/users/:userId/role', { preHandler: requirePermission('users', 'manage') }, async (req, reply) => {
    if (!app.hasDecorator('db')) {
      return reply.status(503).send({ message: 'Database not available' });
    }

    const { userId } = req.params as { userId: string };
    const { role } = req.body as { role: string };

    // Validate role - super_admin can set any role, admin can only set user/admin/grid_manager
    const isSuperAdmin = req.user?.role === 'super_admin';
    const allowedRoles = isSuperAdmin ? ['super_admin', 'admin', 'grid_manager', 'user'] : ['admin', 'grid_manager', 'user'];

    if (!allowedRoles.includes(role)) {
      return reply.status(400).send({
        message: `Invalid role. Must be one of: ${allowedRoles.join(', ')}`
      });
    }

    // Prevent changing own role
    if (req.user?.id === userId) {
      return reply.status(400).send({ message: 'Cannot change your own role' });
    }

    // Only super_admin can set super_admin role
    if (role === 'super_admin' && !isSuperAdmin) {
      return reply.status(403).send({
        message: 'Only super admin can assign super admin role'
      });
    }

    try {
      const { rows } = await app.db.query(
        `UPDATE users SET role = $1 WHERE id = $2 RETURNING id, name, role, line_sub`,
        [role, userId]
      );

      if (rows.length === 0) {
        return reply.status(404).send({ message: 'User not found' });
      }

      // 記錄審計日誌
      await createAdminAuditLog(app, {
        user_id: req.user?.id,
        user_role: req.user?.role || 'unknown',
        line_id: req.user?.id || '',
        line_name: req.user?.name || '',
        action: `變更用戶 ${rows[0].name} 的角色為 ${role}`,
        action_type: 'update',
        resource_type: 'user',
        resource_id: userId,
        details: { old_role: req.user?.role, new_role: role },
        ip_address: req.ip,
        user_agent: req.headers['user-agent']
      });

      app.log.info(`[admin] Role updated for user ${userId}: ${role}`);
      return { message: 'Role updated successfully', user: rows[0] };
    } catch (err: any) {
      app.log.error({ err }, '[admin] Failed to update user role');
      return reply.status(500).send({ message: 'Failed to update user role' });
    }
  });

  // Soft delete grid (move to trash)
  app.patch('/admin/grids/:gridId/trash', { preHandler: requirePermission('trash_grids', 'edit') }, async (req, reply) => {
    if (!app.hasDecorator('db')) {
      return reply.status(503).send({ message: 'Database not available' });
    }

    const { gridId } = req.params as { gridId: string };

    try {
      // Update grid status to 'deleted' (soft delete)
      const { rows } = await app.db.query(
        `UPDATE grids
         SET status = 'deleted', updated_at = NOW()
         WHERE id = $1 AND status != 'deleted'
         RETURNING id, code, status`,
        [gridId]
      );

      if (rows.length === 0) {
        return reply.status(404).send({ message: 'Grid not found or already deleted' });
      }

      // 記錄審計日誌
      await createAdminAuditLog(app, {
        user_id: req.user?.id,
        user_role: req.user?.role || 'unknown',
        line_id: req.user?.id || '',
        line_name: req.user?.name || '',
        action: `將網格 ${rows[0].code} 移至垃圾桶`,
        action_type: 'delete',
        resource_type: 'grid',
        resource_id: gridId,
        ip_address: req.ip,
        user_agent: req.headers['user-agent']
      });

      app.log.info(`[admin] Grid soft deleted: ${gridId}`);
      return { message: 'Grid moved to trash', grid: rows[0] };
    } catch (err: any) {
      app.log.error({ err }, '[admin] Failed to delete grid');
      return reply.status(500).send({ message: 'Failed to delete grid' });
    }
  });

  // Restore grid from trash
  app.patch('/admin/grids/:gridId/restore', { preHandler: requirePermission('trash_grids', 'edit') }, async (req, reply) => {
    if (!app.hasDecorator('db')) {
      return reply.status(503).send({ message: 'Database not available' });
    }

    const { gridId } = req.params as { gridId: string };

    try {
      const { rows } = await app.db.query(
        `UPDATE grids
         SET status = 'open', updated_at = NOW()
         WHERE id = $1 AND status = 'deleted'
         RETURNING id, code, status`,
        [gridId]
      );

      if (rows.length === 0) {
        return reply.status(404).send({ message: 'Grid not found in trash' });
      }

      // 記錄審計日誌
      await createAdminAuditLog(app, {
        user_id: req.user?.id,
        user_role: req.user?.role || 'unknown',
        line_id: req.user?.id || '',
        line_name: req.user?.name || '',
        action: `還原網格 ${rows[0].code} 從垃圾桶`,
        action_type: 'restore',
        resource_type: 'grid',
        resource_id: gridId,
        ip_address: req.ip,
        user_agent: req.headers['user-agent']
      });

      app.log.info(`[admin] Grid restored: ${gridId}`);
      return { message: 'Grid restored from trash', grid: rows[0] };
    } catch (err: any) {
      app.log.error({ err }, '[admin] Failed to restore grid');
      return reply.status(500).send({ message: 'Failed to restore grid' });
    }
  });

  // Permanently delete grid
  app.delete('/admin/grids/:gridId', { preHandler: requirePermission('trash_grids', 'delete') }, async (req, reply) => {
    if (!app.hasDecorator('db')) {
      return reply.status(503).send({ message: 'Database not available' });
    }

    const { gridId } = req.params as { gridId: string };

    try {
      // Only allow permanent delete if grid is already in trash
      const { rows: checkRows } = await app.db.query(
        `SELECT status FROM grids WHERE id = $1`,
        [gridId]
      );

      if (checkRows.length === 0) {
        return reply.status(404).send({ message: 'Grid not found' });
      }

      if (checkRows[0].status !== 'deleted') {
        return reply.status(400).send({ message: 'Grid must be in trash before permanent deletion' });
      }

      // Get grid info before deletion
      const { rows: gridInfo } = await app.db.query('SELECT code FROM grids WHERE id = $1', [gridId]);

      // Delete related records first
      await app.db.query('DELETE FROM volunteer_registrations WHERE grid_id = $1', [gridId]);
      await app.db.query('DELETE FROM supply_donations WHERE grid_id = $1', [gridId]);
      await app.db.query('DELETE FROM grid_discussions WHERE grid_id = $1', [gridId]);

      // Delete the grid
      await app.db.query('DELETE FROM grids WHERE id = $1', [gridId]);

      // 記錄審計日誌
      await createAdminAuditLog(app, {
        user_id: req.user?.id,
        user_role: req.user?.role || 'unknown',
        line_id: req.user?.id || '',
        line_name: req.user?.name || '',
        action: `永久刪除網格 ${gridInfo[0]?.code || gridId}`,
        action_type: 'permanent_delete',
        resource_type: 'grid',
        resource_id: gridId,
        ip_address: req.ip,
        user_agent: req.headers['user-agent']
      });

      app.log.info(`[admin] Grid permanently deleted: ${gridId}`);
      return { message: 'Grid permanently deleted' };
    } catch (err: any) {
      app.log.error({ err }, '[admin] Failed to permanently delete grid');
      return reply.status(500).send({ message: 'Failed to delete grid' });
    }
  });

  // Get trash (deleted grids)
  app.get('/admin/trash/grids', { preHandler: requirePermission('trash_grids', 'view') }, async (req, reply) => {
    if (!app.hasDecorator('db')) return [];

    try {
      const { rows } = await app.db.query(
        `SELECT g.*, da.name as area_name
         FROM grids g
         LEFT JOIN disaster_areas da ON g.disaster_area_id = da.id
         WHERE g.status = 'deleted'
         ORDER BY g.updated_at DESC`
      );

      return rows;
    } catch (err: any) {
      app.log.error({ err }, '[admin] Failed to get trash');
      return reply.status(500).send({ message: 'Failed to fetch trash' });
    }
  });

  // Batch move grids to trash
  app.post('/admin/grids/batch-trash', { preHandler: requirePermission('trash_grids', 'edit') }, async (req, reply) => {
    if (!app.hasDecorator('db')) {
      return reply.status(503).send({ message: 'Database not available' });
    }

    const { gridIds } = req.body as { gridIds: string[] };

    if (!Array.isArray(gridIds) || gridIds.length === 0) {
      return reply.status(400).send({ message: 'No grid IDs provided' });
    }

    try {
      const placeholders = gridIds.map((_, i) => `$${i + 1}`).join(',');
      const { rows } = await app.db.query(
        `UPDATE grids
         SET status = 'deleted', updated_at = NOW()
         WHERE id IN (${placeholders}) AND status != 'deleted'
         RETURNING id, code`,
        gridIds
      );

      // 記錄審計日誌
      await createAdminAuditLog(app, {
        user_id: req.user?.id,
        user_role: req.user?.role || 'unknown',
        line_id: req.user?.id || '',
        line_name: req.user?.name || '',
        action: `批量移動 ${rows.length} 個網格至垃圾桶`,
        action_type: 'batch_delete',
        resource_type: 'grid',
        details: { grid_codes: rows.map(r => r.code) },
        ip_address: req.ip,
        user_agent: req.headers['user-agent']
      });

      app.log.info(`[admin] Batch deleted ${rows.length} grids`);
      return { message: `${rows.length} grids moved to trash`, grids: rows };
    } catch (err: any) {
      app.log.error({ err }, '[admin] Failed to batch delete grids');
      return reply.status(500).send({ message: 'Failed to batch delete grids' });
    }
  });

  // ==================== Disaster Areas Management ====================

  // Soft delete disaster area (move to trash)
  app.patch('/admin/areas/:areaId/trash', { preHandler: requirePermission('trash_areas', 'edit') }, async (req, reply) => {
    if (!app.hasDecorator('db')) {
      return reply.status(503).send({ message: 'Database not available' });
    }

    const { areaId } = req.params as { areaId: string };

    try {
      // Update disaster area status to 'deleted' (soft delete)
      const { rows } = await app.db.query(
        `UPDATE disaster_areas
         SET status = 'deleted', updated_at = NOW()
         WHERE id = $1 AND status != 'deleted'
         RETURNING id, name, status`,
        [areaId]
      );

      if (rows.length === 0) {
        return reply.status(404).send({ message: 'Disaster area not found or already deleted' });
      }

      // 記錄審計日誌
      await createAdminAuditLog(app, {
        user_id: req.user?.id,
        user_role: req.user?.role || 'unknown',
        line_id: req.user?.id || '',
        line_name: req.user?.name || '',
        action: `將災區 ${rows[0].name} 移至垃圾桶`,
        action_type: 'delete',
        resource_type: 'disaster_area',
        resource_id: areaId,
        ip_address: req.ip,
        user_agent: req.headers['user-agent']
      });

      app.log.info(`[admin] Disaster area soft deleted: ${areaId}`);
      return { message: 'Disaster area moved to trash', area: rows[0] };
    } catch (err: any) {
      app.log.error({ err }, '[admin] Failed to delete disaster area');
      return reply.status(500).send({ message: 'Failed to delete disaster area' });
    }
  });

  // Restore disaster area from trash
  app.patch('/admin/areas/:areaId/restore', { preHandler: requirePermission('trash_areas', 'edit') }, async (req, reply) => {
    if (!app.hasDecorator('db')) {
      return reply.status(503).send({ message: 'Database not available' });
    }

    const { areaId } = req.params as { areaId: string };

    try {
      const { rows } = await app.db.query(
        `UPDATE disaster_areas
         SET status = 'active', updated_at = NOW()
         WHERE id = $1 AND status = 'deleted'
         RETURNING id, name, status`,
        [areaId]
      );

      if (rows.length === 0) {
        return reply.status(404).send({ message: 'Disaster area not found in trash' });
      }

      // 記錄審計日誌
      await createAdminAuditLog(app, {
        user_id: req.user?.id,
        user_role: req.user?.role || 'unknown',
        line_id: req.user?.id || '',
        line_name: req.user?.name || '',
        action: `還原災區 ${rows[0].name} 從垃圾桶`,
        action_type: 'restore',
        resource_type: 'disaster_area',
        resource_id: areaId,
        ip_address: req.ip,
        user_agent: req.headers['user-agent']
      });

      app.log.info(`[admin] Disaster area restored: ${areaId}`);
      return { message: 'Disaster area restored from trash', area: rows[0] };
    } catch (err: any) {
      app.log.error({ err }, '[admin] Failed to restore disaster area');
      return reply.status(500).send({ message: 'Failed to restore disaster area' });
    }
  });

  // Permanently delete disaster area
  app.delete('/admin/areas/:areaId', { preHandler: requirePermission('trash_areas', 'delete') }, async (req, reply) => {
    if (!app.hasDecorator('db')) {
      return reply.status(503).send({ message: 'Database not available' });
    }

    const { areaId } = req.params as { areaId: string };

    try {
      // Only allow permanent delete if area is already in trash
      const { rows: checkRows } = await app.db.query(
        `SELECT status FROM disaster_areas WHERE id = $1`,
        [areaId]
      );

      if (checkRows.length === 0) {
        return reply.status(404).send({ message: 'Disaster area not found' });
      }

      if (checkRows[0].status !== 'deleted') {
        return reply.status(400).send({ message: 'Disaster area must be in trash before permanent deletion' });
      }

      // Get area info before deletion
      const { rows: areaInfo } = await app.db.query('SELECT name FROM disaster_areas WHERE id = $1', [areaId]);

      // Check if area has grids
      const { rows: gridsCheck } = await app.db.query(
        'SELECT COUNT(*) as count FROM grids WHERE disaster_area_id = $1',
        [areaId]
      );

      const gridCount = parseInt(gridsCheck[0].count);

      // Delete all grids associated with this disaster area (including trash grids)
      if (gridCount > 0) {
        await app.db.query(
          'DELETE FROM grids WHERE disaster_area_id = $1',
          [areaId]
        );
        app.log.info(`[admin] Deleted ${gridCount} grids associated with disaster area ${areaId}`);
      }

      // Delete the disaster area
      await app.db.query('DELETE FROM disaster_areas WHERE id = $1', [areaId]);

      // 記錄審計日誌
      await createAdminAuditLog(app, {
        user_id: req.user?.id,
        user_role: req.user?.role || 'unknown',
        line_id: req.user?.id || '',
        line_name: req.user?.name || '',
        action: `永久刪除災區 ${areaInfo[0]?.name || areaId}${gridCount > 0 ? ` (含 ${gridCount} 個網格)` : ''}`,
        action_type: 'permanent_delete',
        resource_type: 'disaster_area',
        resource_id: areaId,
        details: { gridCount },
        ip_address: req.ip,
        user_agent: req.headers['user-agent']
      });

      app.log.info(`[admin] Disaster area permanently deleted: ${areaId}${gridCount > 0 ? ` with ${gridCount} grids` : ''}`);
      return {
        message: 'Disaster area permanently deleted',
        deletedGrids: gridCount
      };
    } catch (err: any) {
      app.log.error({ err }, '[admin] Failed to permanently delete disaster area');
      return reply.status(500).send({ message: 'Failed to delete disaster area' });
    }
  });

  // Get trash (deleted disaster areas)
  app.get('/admin/trash/areas', { preHandler: requirePermission('trash_areas', 'view') }, async (req, reply) => {
    if (!app.hasDecorator('db')) return [];

    try {
      const { rows } = await app.db.query(
        `SELECT *
         FROM disaster_areas
         WHERE status = 'deleted'
         ORDER BY updated_at DESC`
      );

      return rows;
    } catch (err: any) {
      app.log.error({ err }, '[admin] Failed to get trash areas');
      return reply.status(500).send({ message: 'Failed to fetch trash areas' });
    }
  });

  // Batch move disaster areas to trash
  app.post('/admin/areas/batch-trash', { preHandler: requirePermission('trash_areas', 'edit') }, async (req, reply) => {
    if (!app.hasDecorator('db')) {
      return reply.status(503).send({ message: 'Database not available' });
    }

    const { areaIds } = req.body as { areaIds: string[] };

    if (!Array.isArray(areaIds) || areaIds.length === 0) {
      return reply.status(400).send({ message: 'No area IDs provided' });
    }

    try {
      const placeholders = areaIds.map((_, i) => `$${i + 1}`).join(',');
      const { rows } = await app.db.query(
        `UPDATE disaster_areas
         SET status = 'deleted', updated_at = NOW()
         WHERE id IN (${placeholders}) AND status != 'deleted'
         RETURNING id, name`,
        areaIds
      );

      // 記錄審計日誌
      await createAdminAuditLog(app, {
        user_id: req.user?.id,
        user_role: req.user?.role || 'unknown',
        line_id: req.user?.id || '',
        line_name: req.user?.name || '',
        action: `批量移動 ${rows.length} 個災區至垃圾桶`,
        action_type: 'batch_delete',
        resource_type: 'disaster_area',
        details: { area_names: rows.map(r => r.name) },
        ip_address: req.ip,
        user_agent: req.headers['user-agent']
      });

      app.log.info(`[admin] Batch deleted ${rows.length} disaster areas`);
      return { message: `${rows.length} disaster areas moved to trash`, areas: rows };
    } catch (err: any) {
      app.log.error({ err }, '[admin] Failed to batch delete disaster areas');
      return reply.status(500).send({ message: 'Failed to batch delete disaster areas' });
    }
  });

  // Batch permanently delete disaster areas
  app.post('/admin/areas/batch-delete', { preHandler: requirePermission('trash_areas', 'delete') }, async (req, reply) => {
    if (!app.hasDecorator('db')) {
      return reply.status(503).send({ message: 'Database not available' });
    }

    const { areaIds } = req.body as { areaIds: string[] };

    if (!Array.isArray(areaIds) || areaIds.length === 0) {
      return reply.status(400).send({ message: 'No area IDs provided' });
    }

    try {
      // Check all areas are in trash
      const placeholders = areaIds.map((_, i) => `$${i + 1}`).join(',');
      const { rows: checkRows } = await app.db.query(
        `SELECT id FROM disaster_areas WHERE id IN (${placeholders}) AND status != 'deleted'`,
        areaIds
      );

      if (checkRows.length > 0) {
        return reply.status(400).send({
          message: 'Some disaster areas are not in trash. Move them to trash first.',
          notInTrash: checkRows.map(r => r.id)
        });
      }

      // Get area names before deletion
      const { rows: areaNames } = await app.db.query(
        `SELECT name FROM disaster_areas WHERE id IN (${placeholders})`,
        areaIds
      );

      // Count total grids to be deleted
      const { rows: gridsCountResult } = await app.db.query(
        `SELECT COUNT(*) as count FROM grids WHERE disaster_area_id IN (${placeholders})`,
        areaIds
      );
      const totalGrids = parseInt(gridsCountResult[0]?.count || '0');

      // Delete all grids associated with these disaster areas (including trash grids)
      if (totalGrids > 0) {
        await app.db.query(
          `DELETE FROM grids WHERE disaster_area_id IN (${placeholders})`,
          areaIds
        );
        app.log.info(`[admin] Deleted ${totalGrids} grids associated with ${areaIds.length} disaster areas`);
      }

      // Delete disaster areas
      await app.db.query(
        `DELETE FROM disaster_areas WHERE id IN (${placeholders})`,
        areaIds
      );

      // 記錄審計日誌
      await createAdminAuditLog(app, {
        user_id: req.user?.id,
        user_role: req.user?.role || 'unknown',
        line_id: req.user?.id || '',
        line_name: req.user?.name || '',
        action: `批量永久刪除 ${areaIds.length} 個災區${totalGrids > 0 ? ` (含 ${totalGrids} 個網格)` : ''}`,
        action_type: 'batch_permanent_delete',
        resource_type: 'disaster_area',
        details: { area_names: areaNames.map(r => r.name), gridCount: totalGrids },
        ip_address: req.ip,
        user_agent: req.headers['user-agent']
      });

      app.log.info(`[admin] Permanently deleted ${areaIds.length} disaster areas${totalGrids > 0 ? ` with ${totalGrids} grids` : ''}`);
      return {
        message: `${areaIds.length} disaster areas permanently deleted`,
        deletedGrids: totalGrids
      };
    } catch (err: any) {
      app.log.error({ err }, '[admin] Failed to batch delete disaster areas');
      return reply.status(500).send({ message: 'Failed to permanently delete disaster areas' });
    }
  });

  // ==================== Grid Management (existing) ====================

  // Batch permanently delete grids
  app.post('/admin/grids/batch-delete', { preHandler: requirePermission('trash_grids', 'delete') }, async (req, reply) => {
    if (!app.hasDecorator('db')) {
      return reply.status(503).send({ message: 'Database not available' });
    }

    const { gridIds } = req.body as { gridIds: string[] };

    if (!Array.isArray(gridIds) || gridIds.length === 0) {
      return reply.status(400).send({ message: 'No grid IDs provided' });
    }

    try {
      // Check all grids are in trash
      const placeholders = gridIds.map((_, i) => `$${i + 1}`).join(',');
      const { rows: checkRows } = await app.db.query(
        `SELECT id FROM grids WHERE id IN (${placeholders}) AND status != 'deleted'`,
        gridIds
      );

      if (checkRows.length > 0) {
        return reply.status(400).send({
          message: 'Some grids are not in trash. Move them to trash first.',
          notInTrash: checkRows.map(r => r.id)
        });
      }

      // Get grid codes before deletion
      const { rows: gridCodes } = await app.db.query(
        `SELECT code FROM grids WHERE id IN (${placeholders})`,
        gridIds
      );

      // Delete related records
      await app.db.query(`DELETE FROM volunteer_registrations WHERE grid_id IN (${placeholders})`, gridIds);
      await app.db.query(`DELETE FROM supply_donations WHERE grid_id IN (${placeholders})`, gridIds);
      await app.db.query(`DELETE FROM grid_discussions WHERE grid_id IN (${placeholders})`, gridIds);

      // Delete grids
      const { rows: deleteResult } = await app.db.query(
        `DELETE FROM grids WHERE id IN (${placeholders})`,
        gridIds
      );

      // 記錄審計日誌
      await createAdminAuditLog(app, {
        user_id: req.user?.id,
        user_role: req.user?.role || 'unknown',
        line_id: req.user?.id || '',
        line_name: req.user?.name || '',
        action: `批量永久刪除 ${deleteResult.length} 個網格`,
        action_type: 'batch_permanent_delete',
        resource_type: 'grid',
        details: { grid_codes: gridCodes.map(r => r.code) },
        ip_address: req.ip,
        user_agent: req.headers['user-agent']
      });

      app.log.info(`[admin] Permanently deleted ${deleteResult.length} grids`);
      return { message: `${deleteResult.length} grids permanently deleted` };
    } catch (err: any) {
      app.log.error({ err }, '[admin] Failed to batch delete grids');
      return reply.status(500).send({ message: 'Failed to permanently delete grids' });
    }
  });

  // ==================== Blacklist Management (Super Admin Only) ====================

  // Get all blacklisted users
  app.get('/admin/blacklist', { preHandler: requirePermission('blacklist', 'view') }, async (req, reply) => {
    if (!app.hasDecorator('db')) return [];

    try {
      const { rows } = await app.db.query(
        `SELECT id, name, email, avatar_url, role, is_blacklisted, created_at
         FROM users
         WHERE is_blacklisted = true
         ORDER BY created_at DESC`
      );

      // Hide LINE IDs for privacy
      const sanitizedUsers = rows.map(user => ({
        ...user,
        line_sub: 'HIDDEN'
      }));

      return sanitizedUsers;
    } catch (err: any) {
      app.log.error({ err }, '[admin] Failed to get blacklisted users');
      return reply.status(500).send({ message: 'Failed to fetch blacklisted users' });
    }
  });

  // Add user to blacklist
  app.patch('/admin/users/:userId/blacklist', { preHandler: requirePermission('blacklist', 'manage') }, async (req, reply) => {
    if (!app.hasDecorator('db')) {
      return reply.status(503).send({ message: 'Database not available' });
    }

    const { userId } = req.params as { userId: string };

    // Prevent super admin from blacklisting themselves
    if (req.user?.id === userId) {
      return reply.status(400).send({ message: 'Cannot blacklist yourself' });
    }

    try {
      const { rows } = await app.db.query(
        `UPDATE users SET is_blacklisted = true WHERE id = $1 RETURNING id, name, is_blacklisted, line_sub`,
        [userId]
      );

      if (rows.length === 0) {
        return reply.status(404).send({ message: 'User not found' });
      }

      // 記錄審計日誌
      await createAdminAuditLog(app, {
        user_id: req.user?.id,
        user_role: req.user?.role || 'unknown',
        line_id: req.user?.id || '',
        line_name: req.user?.name || '',
        action: `將用戶 ${rows[0].name} 加入黑名單`,
        action_type: 'blacklist',
        resource_type: 'user',
        resource_id: userId,
        ip_address: req.ip,
        user_agent: req.headers['user-agent']
      });

      app.log.info(`[admin] User blacklisted: ${userId}`);
      return { message: 'User added to blacklist', user: rows[0] };
    } catch (err: any) {
      app.log.error({ err }, '[admin] Failed to blacklist user');
      return reply.status(500).send({ message: 'Failed to blacklist user' });
    }
  });

  // Remove user from blacklist
  app.patch('/admin/users/:userId/unblacklist', { preHandler: requirePermission('blacklist', 'manage') }, async (req, reply) => {
    if (!app.hasDecorator('db')) {
      return reply.status(503).send({ message: 'Database not available' });
    }

    const { userId } = req.params as { userId: string };

    try {
      const { rows } = await app.db.query(
        `UPDATE users SET is_blacklisted = false WHERE id = $1 RETURNING id, name, is_blacklisted, line_sub`,
        [userId]
      );

      if (rows.length === 0) {
        return reply.status(404).send({ message: 'User not found' });
      }

      // 記錄審計日誌
      await createAdminAuditLog(app, {
        user_id: req.user?.id,
        user_role: req.user?.role || 'unknown',
        line_id: req.user?.id || '',
        line_name: req.user?.name || '',
        action: `將用戶 ${rows[0].name} 從黑名單移除`,
        action_type: 'unblacklist',
        resource_type: 'user',
        resource_id: userId,
        ip_address: req.ip,
        user_agent: req.headers['user-agent']
      });

      app.log.info(`[admin] User removed from blacklist: ${userId}`);
      return { message: 'User removed from blacklist', user: rows[0] };
    } catch (err: any) {
      app.log.error({ err }, '[admin] Failed to remove user from blacklist');
      return reply.status(500).send({ message: 'Failed to remove user from blacklist' });
    }
  });

  // Batch delete blacklisted users (permanent delete)
  app.post('/admin/blacklist/batch-delete', { preHandler: requirePermission('blacklist', 'delete') }, async (req, reply) => {
    if (!app.hasDecorator('db')) {
      return reply.status(503).send({ message: 'Database not available' });
    }

    const { userIds } = req.body as { userIds: string[] };

    if (!Array.isArray(userIds) || userIds.length === 0) {
      return reply.status(400).send({ message: 'No user IDs provided' });
    }

    // Prevent super admin from deleting themselves
    if (userIds.includes(req.user?.id || '')) {
      return reply.status(400).send({ message: 'Cannot delete yourself' });
    }

    try {
      // Only allow deletion of blacklisted users
      const placeholders = userIds.map((_, i) => `$${i + 1}`).join(',');
      const { rows: checkRows } = await app.db.query(
        `SELECT id FROM users WHERE id IN (${placeholders}) AND is_blacklisted = false`,
        userIds
      );

      if (checkRows.length > 0) {
        return reply.status(400).send({
          message: 'Some users are not blacklisted. Only blacklisted users can be deleted.',
          notBlacklisted: checkRows.map(r => r.id)
        });
      }

      // Get user names before deletion
      const { rows: userNames } = await app.db.query(
        `SELECT name FROM users WHERE id IN (${placeholders})`,
        userIds
      );

      // Delete users
      const { rows: deleteResult } = await app.db.query(
        `DELETE FROM users WHERE id IN (${placeholders})`,
        userIds
      );

      // 記錄審計日誌
      await createAdminAuditLog(app, {
        user_id: req.user?.id,
        user_role: req.user?.role || 'unknown',
        line_id: req.user?.id || '',
        line_name: req.user?.name || '',
        action: `批量永久刪除 ${deleteResult.length} 個黑名單用戶`,
        action_type: 'batch_permanent_delete',
        resource_type: 'blacklist_user',
        details: { user_names: userNames.map(r => r.name) },
        ip_address: req.ip,
        user_agent: req.headers['user-agent']
      });

      app.log.info(`[admin] Permanently deleted ${deleteResult.length} blacklisted users`);
      return { message: `${deleteResult.length} blacklisted users permanently deleted` };
    } catch (err: any) {
      app.log.error({ err }, '[admin] Failed to batch delete blacklisted users');
      return reply.status(500).send({ message: 'Failed to delete blacklisted users' });
    }
  });

  // ==================== 公告垃圾桶管理 ====================

  // Soft delete announcement (move to trash)
  app.patch('/admin/announcements/:announcementId/trash', { preHandler: requirePermission('trash_announcements', 'edit') }, async (req, reply) => {
    if (!app.hasDecorator('db')) {
      return reply.status(503).send({ message: 'Database not available' });
    }

    const { announcementId } = req.params as { announcementId: string };

    try {
      const { rows } = await app.db.query(
        `UPDATE announcements SET status = 'deleted', updated_date = NOW() WHERE id = $1 AND status != 'deleted' RETURNING id, title`,
        [announcementId]
      );

      if (rows.length === 0) {
        return reply.status(404).send({ message: 'Announcement not found or already deleted' });
      }

      // 記錄審計日誌
      await createAdminAuditLog(app, {
        user_id: req.user?.id,
        user_role: req.user?.role || 'unknown',
        line_id: req.user?.id || '',
        line_name: req.user?.name || '',
        action: `將公告「${rows[0].title}」移至垃圾桶`,
        action_type: 'delete',
        resource_type: 'announcement',
        resource_id: announcementId,
        details: { announcement_title: rows[0].title },
        ip_address: req.ip,
        user_agent: req.headers['user-agent']
      });

      app.log.info(`[admin] Announcement ${announcementId} moved to trash`);
      return { message: 'Announcement moved to trash', announcement: rows[0] };
    } catch (err: any) {
      app.log.error({ err }, '[admin] Failed to move announcement to trash');
      return reply.status(500).send({ message: 'Failed to move announcement to trash' });
    }
  });

  // Restore announcement from trash
  app.patch('/admin/announcements/:announcementId/restore', { preHandler: requirePermission('trash_announcements', 'edit') }, async (req, reply) => {
    if (!app.hasDecorator('db')) {
      return reply.status(503).send({ message: 'Database not available' });
    }

    const { announcementId } = req.params as { announcementId: string };

    try {
      const { rows } = await app.db.query(
        `UPDATE announcements SET status = 'active', updated_date = NOW() WHERE id = $1 AND status = 'deleted' RETURNING id, title`,
        [announcementId]
      );

      if (rows.length === 0) {
        return reply.status(404).send({ message: 'Announcement not found in trash' });
      }

      // 記錄審計日誌
      await createAdminAuditLog(app, {
        user_id: req.user?.id,
        user_role: req.user?.role || 'unknown',
        line_id: req.user?.id || '',
        line_name: req.user?.name || '',
        action: `還原公告「${rows[0].title}」`,
        action_type: 'update',
        resource_type: 'announcement',
        resource_id: announcementId,
        details: { announcement_title: rows[0].title },
        ip_address: req.ip,
        user_agent: req.headers['user-agent']
      });

      app.log.info(`[admin] Announcement ${announcementId} restored from trash`);
      return { message: 'Announcement restored successfully', announcement: rows[0] };
    } catch (err: any) {
      app.log.error({ err }, '[admin] Failed to restore announcement');
      return reply.status(500).send({ message: 'Failed to restore announcement' });
    }
  });

  // Permanently delete announcement
  app.delete('/admin/announcements/:announcementId', { preHandler: requirePermission('trash_announcements', 'delete') }, async (req, reply) => {
    if (!app.hasDecorator('db')) {
      return reply.status(503).send({ message: 'Database not available' });
    }

    const { announcementId } = req.params as { announcementId: string };

    try {
      const { rows } = await app.db.query(
        `DELETE FROM announcements WHERE id = $1 AND status = 'deleted' RETURNING id, title`,
        [announcementId]
      );

      if (rows.length === 0) {
        return reply.status(404).send({ message: 'Announcement not found in trash' });
      }

      // 記錄審計日誌
      await createAdminAuditLog(app, {
        user_id: req.user?.id,
        user_role: req.user?.role || 'unknown',
        line_id: req.user?.id || '',
        line_name: req.user?.name || '',
        action: `永久刪除公告「${rows[0].title}」`,
        action_type: 'delete',
        resource_type: 'announcement',
        resource_id: announcementId,
        details: { announcement_title: rows[0].title, permanent: true },
        ip_address: req.ip,
        user_agent: req.headers['user-agent']
      });

      app.log.info(`[admin] Announcement ${announcementId} permanently deleted`);
      return { message: 'Announcement permanently deleted' };
    } catch (err: any) {
      app.log.error({ err }, '[admin] Failed to permanently delete announcement');
      return reply.status(500).send({ message: 'Failed to permanently delete announcement' });
    }
  });

  // Get trash announcements
  app.get('/admin/trash/announcements', { preHandler: requirePermission('trash_announcements', 'view') }, async (req, reply) => {
    if (!app.hasDecorator('db')) return [];

    try {
      const { rows } = await app.db.query(
        `SELECT id, title, body, category, is_pinned, "order", status, created_by_id, created_by, created_at, updated_date
         FROM announcements
         WHERE status = 'deleted'
         ORDER BY updated_date DESC`
      );

      return rows;
    } catch (err: any) {
      app.log.error({ err }, '[admin] Failed to get trash announcements');
      return reply.status(500).send({ message: 'Failed to fetch trash announcements' });
    }
  });

  // Batch move announcements to trash
  app.post('/admin/announcements/batch-trash', { preHandler: requirePermission('trash_announcements', 'edit') }, async (req, reply) => {
    if (!app.hasDecorator('db')) {
      return reply.status(503).send({ message: 'Database not available' });
    }

    const { announcementIds } = req.body as { announcementIds: string[] };

    if (!Array.isArray(announcementIds) || announcementIds.length === 0) {
      return reply.status(400).send({ message: 'announcementIds array is required' });
    }

    try {
      const placeholders = announcementIds.map((_, i) => `$${i + 1}`).join(',');
      const { rows: deleteResult } = await app.db.query(
        `UPDATE announcements SET status = 'deleted', updated_date = NOW() WHERE id IN (${placeholders}) AND status != 'deleted'`,
        announcementIds
      );

      // 記錄審計日誌
      await createAdminAuditLog(app, {
        user_id: req.user?.id,
        user_role: req.user?.role || 'unknown',
        line_id: req.user?.id || '',
        line_name: req.user?.name || '',
        action: `批量移除 ${deleteResult.length} 則公告至垃圾桶`,
        action_type: 'delete',
        resource_type: 'announcement',
        details: { count: deleteResult.length, announcement_ids: announcementIds },
        ip_address: req.ip,
        user_agent: req.headers['user-agent']
      });

      app.log.info(`[admin] Batch moved ${deleteResult.length} announcements to trash`);
      return { message: `${deleteResult.length} announcements moved to trash` };
    } catch (err: any) {
      app.log.error({ err }, '[admin] Failed to batch move announcements to trash');
      return reply.status(500).send({ message: 'Failed to move announcements to trash' });
    }
  });

  // Batch permanently delete announcements
  app.post('/admin/announcements/batch-delete', { preHandler: requirePermission('trash_announcements', 'delete') }, async (req, reply) => {
    if (!app.hasDecorator('db')) {
      return reply.status(503).send({ message: 'Database not available' });
    }

    const { announcementIds } = req.body as { announcementIds: string[] };

    if (!Array.isArray(announcementIds) || announcementIds.length === 0) {
      return reply.status(400).send({ message: 'announcementIds array is required' });
    }

    try {
      const placeholders = announcementIds.map((_, i) => `$${i + 1}`).join(',');
      const { rows: deleteResult } = await app.db.query(
        `DELETE FROM announcements WHERE id IN (${placeholders}) AND status = 'deleted'`,
        announcementIds
      );

      // 記錄審計日誌
      await createAdminAuditLog(app, {
        user_id: req.user?.id,
        user_role: req.user?.role || 'unknown',
        line_id: req.user?.id || '',
        line_name: req.user?.name || '',
        action: `批量永久刪除 ${deleteResult.length} 則公告`,
        action_type: 'delete',
        resource_type: 'announcement',
        details: { count: deleteResult.length, announcement_ids: announcementIds, permanent: true },
        ip_address: req.ip,
        user_agent: req.headers['user-agent']
      });

      app.log.info(`[admin] Batch permanently deleted ${deleteResult.length} announcements`);
      return { message: `${deleteResult.length} announcements permanently deleted` };
    } catch (err: any) {
      app.log.error({ err }, '[admin] Failed to batch delete announcements');
      return reply.status(500).send({ message: 'Failed to delete announcements' });
    }
  });

  // ==================== 物資垃圾桶管理 ====================

  // Soft delete supply (move to trash)
  app.patch('/admin/supplies/:supplyId/trash', { preHandler: requirePermission('trash_supplies', 'edit') }, async (req, reply) => {
    if (!app.hasDecorator('db')) {
      return reply.status(503).send({ message: 'Database not available' });
    }

    const { supplyId } = req.params as { supplyId: string };

    try {
      // Update supply_donation status to 'deleted' (soft delete)
      const { rows } = await app.db.query(
        `UPDATE supply_donations
         SET status = 'deleted', updated_at = NOW()
         WHERE id = $1 AND status != 'deleted'
         RETURNING id, name, supply_name, status`,
        [supplyId]
      );

      if (rows.length === 0) {
        return reply.status(404).send({ message: 'Supply not found or already deleted' });
      }

      // 記錄審計日誌
      await createAdminAuditLog(app, {
        user_id: req.user?.id,
        user_role: req.user?.role || 'unknown',
        line_id: req.user?.id || '',
        line_name: req.user?.name || '',
        action: `將物資「${rows[0].supply_name || rows[0].name}」移至垃圾桶`,
        action_type: 'delete',
        resource_type: 'supply',
        resource_id: supplyId,
        ip_address: req.ip,
        user_agent: req.headers['user-agent']
      });

      app.log.info(`[admin] Supply soft deleted: ${supplyId}`);
      return { message: 'Supply moved to trash', supply: rows[0] };
    } catch (err: any) {
      app.log.error({ err }, '[admin] Failed to delete supply');
      return reply.status(500).send({ message: 'Failed to delete supply' });
    }
  });

  // Restore supply from trash
  app.patch('/admin/supplies/:supplyId/restore', { preHandler: requirePermission('trash_supplies', 'edit') }, async (req, reply) => {
    if (!app.hasDecorator('db')) {
      return reply.status(503).send({ message: 'Database not available' });
    }

    const { supplyId } = req.params as { supplyId: string };

    try {
      const { rows } = await app.db.query(
        `UPDATE supply_donations
         SET status = 'pledged', updated_at = NOW()
         WHERE id = $1 AND status = 'deleted'
         RETURNING id, name, supply_name, status`,
        [supplyId]
      );

      if (rows.length === 0) {
        return reply.status(404).send({ message: 'Supply not found in trash' });
      }

      // 記錄審計日誌
      await createAdminAuditLog(app, {
        user_id: req.user?.id,
        user_role: req.user?.role || 'unknown',
        line_id: req.user?.id || '',
        line_name: req.user?.name || '',
        action: `還原物資「${rows[0].supply_name || rows[0].name}」從垃圾桶`,
        action_type: 'restore',
        resource_type: 'supply',
        resource_id: supplyId,
        ip_address: req.ip,
        user_agent: req.headers['user-agent']
      });

      app.log.info(`[admin] Supply restored: ${supplyId}`);
      return { message: 'Supply restored from trash', supply: rows[0] };
    } catch (err: any) {
      app.log.error({ err }, '[admin] Failed to restore supply');
      return reply.status(500).send({ message: 'Failed to restore supply' });
    }
  });

  // Permanently delete supply
  app.delete('/admin/supplies/:supplyId', { preHandler: requirePermission('trash_supplies', 'delete') }, async (req, reply) => {
    if (!app.hasDecorator('db')) {
      return reply.status(503).send({ message: 'Database not available' });
    }

    const { supplyId } = req.params as { supplyId: string };

    try {
      // Only allow permanent delete if supply is already in trash
      const { rows: checkRows } = await app.db.query(
        `SELECT status, name, supply_name FROM supply_donations WHERE id = $1`,
        [supplyId]
      );

      if (checkRows.length === 0) {
        return reply.status(404).send({ message: 'Supply not found' });
      }

      if (checkRows[0].status !== 'deleted') {
        return reply.status(400).send({ message: 'Supply must be in trash before permanent deletion' });
      }

      const supplyName = checkRows[0].supply_name || checkRows[0].name;

      // Delete the supply
      await app.db.query('DELETE FROM supply_donations WHERE id = $1', [supplyId]);

      // 記錄審計日誌
      await createAdminAuditLog(app, {
        user_id: req.user?.id,
        user_role: req.user?.role || 'unknown',
        line_id: req.user?.id || '',
        line_name: req.user?.name || '',
        action: `永久刪除物資「${supplyName}」`,
        action_type: 'permanent_delete',
        resource_type: 'supply',
        resource_id: supplyId,
        ip_address: req.ip,
        user_agent: req.headers['user-agent']
      });

      app.log.info(`[admin] Supply permanently deleted: ${supplyId}`);
      return { message: 'Supply permanently deleted' };
    } catch (err: any) {
      app.log.error({ err }, '[admin] Failed to permanently delete supply');
      return reply.status(500).send({ message: 'Failed to delete supply' });
    }
  });

  // Get trash (deleted supplies)
  app.get('/admin/trash/supplies', { preHandler: requirePermission('trash_supplies', 'view') }, async (req, reply) => {
    if (!app.hasDecorator('db')) return [];

    try {
      const { rows } = await app.db.query(
        `SELECT sd.*, g.code as grid_code, da.name as area_name
         FROM supply_donations sd
         LEFT JOIN grids g ON sd.grid_id = g.id
         LEFT JOIN disaster_areas da ON g.disaster_area_id = da.id
         WHERE sd.status = 'deleted'
         ORDER BY sd.updated_at DESC`
      );

      return rows;
    } catch (err: any) {
      app.log.error({ err }, '[admin] Failed to get trash supplies');
      return reply.status(500).send({ message: 'Failed to fetch trash supplies' });
    }
  });

  // Batch move supplies to trash
  app.post('/admin/supplies/batch-trash', { preHandler: requirePermission('trash_supplies', 'edit') }, async (req, reply) => {
    if (!app.hasDecorator('db')) {
      return reply.status(503).send({ message: 'Database not available' });
    }

    const { supplyIds } = req.body as { supplyIds: string[] };

    if (!Array.isArray(supplyIds) || supplyIds.length === 0) {
      return reply.status(400).send({ message: 'No supply IDs provided' });
    }

    try {
      const placeholders = supplyIds.map((_, i) => `$${i + 1}`).join(',');
      const { rows } = await app.db.query(
        `UPDATE supply_donations
         SET status = 'deleted', updated_at = NOW()
         WHERE id IN (${placeholders}) AND status != 'deleted'
         RETURNING id, name, supply_name`,
        supplyIds
      );

      // 記錄審計日誌
      await createAdminAuditLog(app, {
        user_id: req.user?.id,
        user_role: req.user?.role || 'unknown',
        line_id: req.user?.id || '',
        line_name: req.user?.name || '',
        action: `批量移動 ${rows.length} 筆物資至垃圾桶`,
        action_type: 'batch_delete',
        resource_type: 'supply',
        details: { supply_names: rows.map(r => r.supply_name || r.name) },
        ip_address: req.ip,
        user_agent: req.headers['user-agent']
      });

      app.log.info(`[admin] Batch deleted ${rows.length} supplies`);
      return { message: `${rows.length} supplies moved to trash`, supplies: rows };
    } catch (err: any) {
      app.log.error({ err }, '[admin] Failed to batch delete supplies');
      return reply.status(500).send({ message: 'Failed to batch delete supplies' });
    }
  });

  // Batch permanently delete supplies
  app.post('/admin/supplies/batch-delete', { preHandler: requirePermission('trash_supplies', 'delete') }, async (req, reply) => {
    if (!app.hasDecorator('db')) {
      return reply.status(503).send({ message: 'Database not available' });
    }

    const { supplyIds } = req.body as { supplyIds: string[] };

    if (!Array.isArray(supplyIds) || supplyIds.length === 0) {
      return reply.status(400).send({ message: 'No supply IDs provided' });
    }

    try {
      // Check all supplies are in trash
      const placeholders = supplyIds.map((_, i) => `$${i + 1}`).join(',');
      const { rows: checkRows } = await app.db.query(
        `SELECT id FROM supply_donations WHERE id IN (${placeholders}) AND status != 'deleted'`,
        supplyIds
      );

      if (checkRows.length > 0) {
        return reply.status(400).send({
          message: 'Some supplies are not in trash. Move them to trash first.',
          notInTrash: checkRows.map(r => r.id)
        });
      }

      // Get supply names before deletion
      const { rows: supplyNames } = await app.db.query(
        `SELECT name, supply_name FROM supply_donations WHERE id IN (${placeholders})`,
        supplyIds
      );

      // Delete supplies
      const result = await app.db.query(
        `DELETE FROM supply_donations WHERE id IN (${placeholders})`,
        supplyIds
      );
      const rowCount = result.rows.length;

      // 記錄審計日誌
      await createAdminAuditLog(app, {
        user_id: req.user?.id,
        user_role: req.user?.role || 'unknown',
        line_id: req.user?.id || '',
        line_name: req.user?.name || '',
        action: `批量永久刪除 ${rowCount} 筆物資`,
        action_type: 'batch_permanent_delete',
        resource_type: 'supply',
        details: { supply_names: supplyNames.map(r => r.supply_name || r.name) },
        ip_address: req.ip,
        user_agent: req.headers['user-agent']
      });

      app.log.info(`[admin] Permanently deleted ${rowCount} supplies`);
      return { message: `${rowCount} supplies permanently deleted` };
    } catch (err: any) {
      app.log.error({ err }, '[admin] Failed to batch delete supplies');
      return reply.status(500).send({ message: 'Failed to permanently delete supplies' });
    }
  });
}