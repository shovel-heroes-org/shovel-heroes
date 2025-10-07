import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { requirePermission, requireManagePermission } from '../middlewares/PermissionMiddleware.js';
import { createAdminAuditLogFromRequest, AuditActionType, AuditResourceType } from '../lib/audit-logger.js';

interface RolePermission {
  id?: number;
  role: string;
  permission_key: string;
  permission_name: string;
  permission_category: string;
  can_view: number;
  can_create: number;
  can_edit: number;
  can_delete: number;
  can_manage: number;
  description?: string;
}

interface UpdatePermissionBody {
  can_view?: number;
  can_create?: number;
  can_edit?: number;
  can_delete?: number;
  can_manage?: number;
  permission_name?: string;
  description?: string;
}

export default async function permissionsRoutes(app: FastifyInstance) {
  // 取得所有權限設定 - 只需要檢視權限
  app.get('/api/permissions', {
    preHandler: requirePermission('role_permissions', 'view')
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { rows } = await app.db.query(`
        SELECT * FROM role_permissions
        ORDER BY
          CASE role
            WHEN 'super_admin' THEN 1
            WHEN 'admin' THEN 2
            WHEN 'grid_manager' THEN 3
            WHEN 'user' THEN 4
            WHEN 'guest' THEN 5
          END,
          permission_category,
          permission_name
      `);

      return reply.send(rows);
    } catch (error: any) {
      app.log.error('取得權限設定失敗:', error);
      return reply.status(500).send({
        message: '取得權限設定失敗',
        error: error.message
      });
    }
  });

  // 取得特定角色的權限設定 - 只需要檢視權限
  app.get<{
    Params: { role: string }
  }>('/api/permissions/role/:role', {
    preHandler: requirePermission('role_permissions', 'view')
  }, async (request, reply) => {
    try {
      const { role } = request.params;

      const { rows } = await app.db.query(`
        SELECT * FROM role_permissions
        WHERE role = $1
        ORDER BY permission_category, permission_name
      `, [role]);

      return reply.send(rows);
    } catch (error: any) {
      app.log.error('取得角色權限設定失敗:', error);
      return reply.status(500).send({
        message: '取得角色權限設定失敗',
        error: error.message
      });
    }
  });

  // 取得權限分類列表 - 只需要檢視權限
  app.get('/api/permissions/categories', {
    preHandler: requirePermission('role_permissions', 'view')
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { rows } = await app.db.query(`
        SELECT DISTINCT permission_category as category
        FROM role_permissions
        ORDER BY permission_category
      `);

      return reply.send(rows);
    } catch (error: any) {
      app.log.error('取得權限分類失敗:', error);
      return reply.status(500).send({
        message: '取得權限分類失敗',
        error: error.message
      });
    }
  });

  // 更新單一權限設定 - 需要編輯權限（用於編輯權限項目名稱和說明）
  app.patch<{
    Params: { id: string },
    Body: UpdatePermissionBody
  }>('/api/permissions/:id', {
    preHandler: requirePermission('role_permissions', 'edit')
  }, async (request, reply) => {
    try {
      const { id } = request.params;
      const updateData = request.body;

      // 驗證權限 ID 是否存在
      const { rows: existing } = await app.db.query('SELECT * FROM role_permissions WHERE id = $1', [id]);
      if (existing.length === 0) {
        return reply.status(404).send({ message: '找不到該權限設定' });
      }

      // 建立更新語句
      const updateFields: string[] = [];
      const updateValues: any[] = [];
      let paramIndex = 1;

      if (updateData.can_view !== undefined) {
        updateFields.push(`can_view = $${paramIndex++}`);
        updateValues.push(updateData.can_view);
      }
      if (updateData.can_create !== undefined) {
        updateFields.push(`can_create = $${paramIndex++}`);
        updateValues.push(updateData.can_create);
      }
      if (updateData.can_edit !== undefined) {
        updateFields.push(`can_edit = $${paramIndex++}`);
        updateValues.push(updateData.can_edit);
      }
      if (updateData.can_delete !== undefined) {
        updateFields.push(`can_delete = $${paramIndex++}`);
        updateValues.push(updateData.can_delete);
      }
      if (updateData.can_manage !== undefined) {
        updateFields.push(`can_manage = $${paramIndex++}`);
        updateValues.push(updateData.can_manage);
      }
      if (updateData.permission_name !== undefined) {
        updateFields.push(`permission_name = $${paramIndex++}`);
        updateValues.push(updateData.permission_name);
      }
      if (updateData.description !== undefined) {
        updateFields.push(`description = $${paramIndex++}`);
        updateValues.push(updateData.description);
      }

      if (updateFields.length === 0) {
        return reply.status(400).send({ message: '沒有提供要更新的欄位' });
      }

      updateFields.push('updated_at = NOW()');
      updateValues.push(id);

      const updateQuery = `
        UPDATE role_permissions
        SET ${updateFields.join(', ')}
        WHERE id = $${paramIndex}
      `;

      await app.db.query(updateQuery, updateValues);

      // 取得更新後的資料
      const { rows: updated } = await app.db.query('SELECT * FROM role_permissions WHERE id = $1', [id]);

      // 記錄稽核日誌
      await createAdminAuditLogFromRequest(app, request, {
        action: '更新權限設定',
        action_type: AuditActionType.UPDATE,
        resource_type: AuditResourceType.ROLE_PERMISSION,
        resource_id: id,
        details: {
          before: existing[0],
          after: updated[0]
        }
      });

      return reply.send({
        message: '權限設定更新成功',
        data: updated[0]
      });
    } catch (error: any) {
      app.log.error('更新權限設定失敗:', error);
      return reply.status(500).send({
        message: '更新權限設定失敗',
        error: error.message
      });
    }
  });

  // 批次更新權限設定
  app.post<{
    Body: {
      permissions: Array<{
        id: number;
        can_view?: number;
        can_create?: number;
        can_edit?: number;
        can_delete?: number;
        can_manage?: number;
      }>
    }
  }>('/api/permissions/batch-update', {
    preHandler: requireManagePermission('role_permissions')
  }, async (request, reply) => {
    try {
      const { permissions } = request.body;

      if (!Array.isArray(permissions) || permissions.length === 0) {
        return reply.status(400).send({ message: '請提供要更新的權限列表' });
      }

      // 使用 PostgreSQL 批次更新
      for (const perm of permissions) {
        // 驗證必要欄位
        if (!perm.id) {
          app.log.error({ perm }, '權限更新缺少 ID');
          return reply.status(400).send({ message: '權限更新資料缺少 ID' });
        }

        // 先檢查權限是否存在
        const { rows: existing } = await app.db.query(
          'SELECT id FROM role_permissions WHERE id = $1',
          [perm.id]
        );

        if (existing.length === 0) {
          app.log.error({ permId: perm.id }, '找不到權限 ID');
          return reply.status(404).send({ message: `找不到權限 ID: ${perm.id}` });
        }

        const updateFields: string[] = [];
        const updateValues: any[] = [];
        let paramIndex = 1;

        if (perm.can_view !== undefined) {
          updateFields.push(`can_view = $${paramIndex++}`);
          updateValues.push(perm.can_view);
        }
        if (perm.can_create !== undefined) {
          updateFields.push(`can_create = $${paramIndex++}`);
          updateValues.push(perm.can_create);
        }
        if (perm.can_edit !== undefined) {
          updateFields.push(`can_edit = $${paramIndex++}`);
          updateValues.push(perm.can_edit);
        }
        if (perm.can_delete !== undefined) {
          updateFields.push(`can_delete = $${paramIndex++}`);
          updateValues.push(perm.can_delete);
        }
        if (perm.can_manage !== undefined) {
          updateFields.push(`can_manage = $${paramIndex++}`);
          updateValues.push(perm.can_manage);
        }

        if (updateFields.length > 0) {
          updateFields.push('updated_at = NOW()');
          updateValues.push(perm.id);

          const updateQuery = `
            UPDATE role_permissions
            SET ${updateFields.join(', ')}
            WHERE id = $${paramIndex}
          `;

          app.log.info({ permId: perm.id, updateQuery, updateValues }, `更新權限 ID ${perm.id}`);
          await app.db.query(updateQuery, updateValues);
        }
      }

      // 記錄稽核日誌
      await createAdminAuditLogFromRequest(app, request, {
        action: '批次更新權限設定',
        action_type: AuditActionType.BATCH_UPDATE,
        resource_type: AuditResourceType.ROLE_PERMISSION,
        details: { count: permissions.length }
      });

      return reply.send({
        message: '批次更新權限設定成功',
        count: permissions.length
      });
    } catch (error: any) {
      app.log.error('批次更新權限設定失敗:', error);
      return reply.status(500).send({
        message: '批次更新權限設定失敗',
        error: error.message
      });
    }
  });

  // 重置角色權限為預設值
  app.post<{
    Body: { role: string }
  }>('/api/permissions/reset-role', {
    preHandler: requireManagePermission('role_permissions')
  }, async (request, reply) => {
    try {
      const { role } = request.body;

      if (!role || !['user', 'grid_manager', 'admin', 'super_admin', 'guest'].includes(role)) {
        return reply.status(400).send({ message: '無效的角色' });
      }

      // 刪除現有設定
      await app.db.query('DELETE FROM role_permissions WHERE role = $1', [role]);

      // 記錄稽核日誌
      await createAdminAuditLogFromRequest(app, request, {
        action: '重置角色權限',
        action_type: AuditActionType.RESET,
        resource_type: AuditResourceType.ROLE_PERMISSION,
        details: { role }
      });

      return reply.send({
        message: `${role} 角色權限已重置為預設值。請重新執行 init-permissions 腳本來恢復預設權限。`
      });
    } catch (error: any) {
      app.log.error('重置角色權限失敗:', error);
      return reply.status(500).send({
        message: '重置角色權限失敗',
        error: error.message
      });
    }
  });

  // 取得當前角色的所有權限（公開 API，用於前端快取）
  app.get<{
    Querystring: {
      role: string;
    }
  }>('/api/permissions/for-role', async (request, reply) => {
    try {
      const { role } = request.query;

      if (!role) {
        return reply.status(400).send({ message: '缺少角色參數' });
      }

      // 驗證角色是否有效
      if (!['super_admin', 'admin', 'grid_manager', 'user', 'guest'].includes(role)) {
        return reply.status(400).send({ message: '無效的角色' });
      }

      const { rows } = await app.db.query(`
        SELECT
          permission_key,
          can_view,
          can_create,
          can_edit,
          can_delete,
          can_manage
        FROM role_permissions
        WHERE role = $1
        ORDER BY permission_key
      `, [role]);

      // 轉換為更易於前端使用的格式
      const permissions: Record<string, {
        view: boolean;
        create: boolean;
        edit: boolean;
        delete: boolean;
        manage: boolean;
      }> = {};

      rows.forEach((row: any) => {
        permissions[row.permission_key] = {
          view: row.can_view === 1,
          create: row.can_create === 1,
          edit: row.can_edit === 1,
          delete: row.can_delete === 1,
          manage: row.can_manage === 1
        };
      });

      return reply.send({ role, permissions });
    } catch (error: any) {
      app.log.error('取得角色權限失敗:', error);
      return reply.status(500).send({
        message: '取得角色權限失敗',
        error: error.message
      });
    }
  });

  // 檢查特定角色是否有特定權限
  app.get<{
    Querystring: {
      role: string;
      permission_key: string;
      action: 'view' | 'create' | 'edit' | 'delete' | 'manage';
    }
  }>('/api/permissions/check', async (request, reply) => {
    try {
      const { role, permission_key, action } = request.query;

      if (!role || !permission_key || !action) {
        return reply.status(400).send({ message: '缺少必要參數' });
      }

      const { rows } = await app.db.query(`
        SELECT * FROM role_permissions
        WHERE role = $1 AND permission_key = $2
      `, [role, permission_key]);

      if (rows.length === 0) {
        return reply.send({ hasPermission: false });
      }

      const permission = rows[0] as RolePermission;
      let hasPermission = false;
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
      }

      return reply.send({ hasPermission });
    } catch (error: any) {
      app.log.error('檢查權限失敗:', error);
      return reply.status(500).send({
        message: '檢查權限失敗',
        error: error.message
      });
    }
  });

  // 匯出權限設定為 CSV
  app.get('/api/permissions/export', {
    preHandler: requireManagePermission('role_permissions')
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { rows } = await app.db.query(`
        SELECT
          id,
          role,
          permission_key,
          permission_name,
          permission_category,
          can_view,
          can_create,
          can_edit,
          can_delete,
          can_manage,
          description
        FROM role_permissions
        ORDER BY
          CASE role
            WHEN 'super_admin' THEN 1
            WHEN 'admin' THEN 2
            WHEN 'grid_manager' THEN 3
            WHEN 'user' THEN 4
            WHEN 'guest' THEN 5
          END,
          permission_category,
          permission_name
      `);

      // 產生 CSV
      const headers = [
        'ID',
        '角色',
        '權限鍵值',
        '權限名稱',
        '權限分類',
        '可檢視',
        '可建立',
        '可編輯',
        '可刪除',
        '可管理',
        '說明'
      ];

      const csvRows = [headers.join(',')];

      rows.forEach((row: any) => {
        const values = [
          row.id,
          row.role,
          row.permission_key,
          `"${row.permission_name || ''}"`,
          `"${row.permission_category || ''}"`,
          row.can_view,
          row.can_create,
          row.can_edit,
          row.can_delete,
          row.can_manage,
          `"${row.description || ''}"`
        ];
        csvRows.push(values.join(','));
      });

      const csv = csvRows.join('\n');

      // 記錄稽核日誌
      await createAdminAuditLogFromRequest(app, request, {
        action: '匯出權限設定',
        action_type: AuditActionType.EXPORT,
        resource_type: AuditResourceType.ROLE_PERMISSION,
        details: { count: rows.length }
      });

      // 設定回應標頭
      reply.header('Content-Type', 'text/csv; charset=utf-8');
      reply.header('Content-Disposition', `attachment; filename="permissions_${new Date().toISOString().slice(0, 10)}.csv"`);

      return reply.send('\uFEFF' + csv); // 加上 BOM 以支援 Excel 中文顯示
    } catch (error: any) {
      app.log.error('匯出權限設定失敗:', error);
      return reply.status(500).send({
        message: '匯出權限設定失敗',
        error: error.message
      });
    }
  });

  // 匯入權限設定從 CSV
  app.post<{
    Body: {
      csvData: string;
    }
  }>('/api/permissions/import', {
    preHandler: requireManagePermission('role_permissions')
  }, async (request, reply) => {
    try {
      const { csvData } = request.body;

      if (!csvData) {
        return reply.status(400).send({ message: '缺少 CSV 資料' });
      }

      // 解析 CSV
      const lines = csvData.trim().split('\n');
      if (lines.length < 2) {
        return reply.status(400).send({ message: 'CSV 資料格式錯誤' });
      }

      // 跳過標題行
      const dataLines = lines.slice(1);
      let successCount = 0;
      let errorCount = 0;
      const errors: string[] = [];

      for (let i = 0; i < dataLines.length; i++) {
        try {
          const line = dataLines[i].trim();
          if (!line) continue;

          // 解析 CSV 行（處理引號內的逗號）
          const values: string[] = [];
          let currentValue = '';
          let insideQuotes = false;

          for (let j = 0; j < line.length; j++) {
            const char = line[j];
            if (char === '"') {
              insideQuotes = !insideQuotes;
            } else if (char === ',' && !insideQuotes) {
              values.push(currentValue.trim());
              currentValue = '';
            } else {
              currentValue += char;
            }
          }
          values.push(currentValue.trim());

          if (values.length < 11) {
            errors.push(`第 ${i + 2} 行: 欄位數量不足`);
            errorCount++;
            continue;
          }

          const [
            id,
            role,
            permission_key,
            permission_name,
            permission_category,
            can_view,
            can_create,
            can_edit,
            can_delete,
            can_manage,
            description
          ] = values;

          // 驗證角色
          if (!['super_admin', 'admin', 'grid_manager', 'user', 'guest'].includes(role)) {
            errors.push(`第 ${i + 2} 行: 無效的角色 "${role}"`);
            errorCount++;
            continue;
          }

          // 檢查權限是否存在
          const { rows: existing } = await app.db.query(
            'SELECT id FROM role_permissions WHERE role = $1 AND permission_key = $2',
            [role, permission_key]
          );

          if (existing.length > 0) {
            // 更新現有權限
            await app.db.query(`
              UPDATE role_permissions
              SET
                permission_name = $1,
                permission_category = $2,
                can_view = $3,
                can_create = $4,
                can_edit = $5,
                can_delete = $6,
                can_manage = $7,
                description = $8,
                updated_at = NOW()
              WHERE role = $9 AND permission_key = $10
            `, [
              permission_name,
              permission_category,
              parseInt(can_view) || 0,
              parseInt(can_create) || 0,
              parseInt(can_edit) || 0,
              parseInt(can_delete) || 0,
              parseInt(can_manage) || 0,
              description,
              role,
              permission_key
            ]);
          } else {
            // 新增權限
            await app.db.query(`
              INSERT INTO role_permissions (
                role,
                permission_key,
                permission_name,
                permission_category,
                can_view,
                can_create,
                can_edit,
                can_delete,
                can_manage,
                description
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            `, [
              role,
              permission_key,
              permission_name,
              permission_category,
              parseInt(can_view) || 0,
              parseInt(can_create) || 0,
              parseInt(can_edit) || 0,
              parseInt(can_delete) || 0,
              parseInt(can_manage) || 0,
              description
            ]);
          }

          successCount++;
        } catch (error: any) {
          errors.push(`第 ${i + 2} 行: ${error.message}`);
          errorCount++;
        }
      }

      // 記錄稽核日誌
      await createAdminAuditLogFromRequest(app, request, {
        action: '匯入權限設定',
        action_type: AuditActionType.IMPORT,
        resource_type: AuditResourceType.ROLE_PERMISSION,
        details: {
          successCount,
          errorCount,
          errors: errors.slice(0, 10) // 只記錄前 10 個錯誤
        }
      });

      return reply.send({
        message: '匯入完成',
        successCount,
        errorCount,
        errors
      });
    } catch (error: any) {
      app.log.error('匯入權限設定失敗:', error);
      return reply.status(500).send({
        message: '匯入權限設定失敗',
        error: error.message
      });
    }
  });
}
