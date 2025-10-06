import type { FastifyInstance } from 'fastify';
import { randomUUID } from 'crypto';
import { z } from 'zod';
import { filterDonationPrivacy, filterDonationsPrivacy } from '../lib/privacy-filter.js';

// Accept both legacy simplified shape and richer frontend form shape.
const CreateSchema = z.object({
  grid_id: z.string(),
  name: z.string().optional(), // internal normalized name (fallback to supply_name)
  supply_name: z.string().optional(), // frontend field
  quantity: z.number(),
  unit: z.string().optional(),
  donor_name: z.string().optional(),
  donor_phone: z.string().optional(),
  donor_email: z.string().optional(),
  donor_contact: z.string().optional(),
  delivery_method: z.string().optional(),
  delivery_address: z.string().optional(),
  delivery_time: z.string().optional(),
  notes: z.string().optional()
}).refine(d => !!(d.name || d.supply_name), { message: 'supply_name or name required', path: ['supply_name'] });

export function registerSupplyDonationRoutes(app: FastifyInstance) {
  app.get('/supply-donations', async (req) => {
    if (!app.hasDecorator('db')) return [];
    const gridId = (req.query as any)?.grid_id;

    const actingRoleHeader = (req.headers['x-acting-role'] || req.headers['X-Acting-Role']) as string | undefined;
    const actingRole = actingRoleHeader ? String(actingRoleHeader) : (req.user?.role || 'guest');

    const { rows: contactPermRows } = await app.db.query(
      `SELECT can_view FROM role_permissions WHERE role = $1 AND permission_key = 'view_donor_contact'`,
      [actingRole]
    );
    const hasContactPermission = contactPermRows.length > 0 && (contactPermRows[0].can_view === 1 || contactPermRows[0].can_view === true);

    // 查詢物資捐贈管理權限
    const { rows: suppliesPermRows } = await app.db.query(
      `SELECT can_view, can_create, can_edit, can_manage, can_delete
       FROM role_permissions
       WHERE role = $1 AND permission_key = 'supplies'`,
      [actingRole]
    );
    const hasViewPermission = suppliesPermRows.length > 0 && (suppliesPermRows[0].can_view === 1 || suppliesPermRows[0].can_view === true || suppliesPermRows[0].can_view === '1');
    const hasCreatePermission = suppliesPermRows.length > 0 && (suppliesPermRows[0].can_create === 1 || suppliesPermRows[0].can_create === true || suppliesPermRows[0].can_create === '1');
    const hasEditPermission = suppliesPermRows.length > 0 && (suppliesPermRows[0].can_edit === 1 || suppliesPermRows[0].can_edit === true || suppliesPermRows[0].can_edit === '1');
    const hasManagePermission = suppliesPermRows.length > 0 && (suppliesPermRows[0].can_manage === 1 || suppliesPermRows[0].can_manage === true || suppliesPermRows[0].can_manage === '1');
    const hasDeletePermission = suppliesPermRows.length > 0 && (suppliesPermRows[0].can_delete === 1 || suppliesPermRows[0].can_delete === true || suppliesPermRows[0].can_delete === '1');

    if (gridId) {
      // 取得物資捐贈資料和網格建立者資訊（排除已刪除的記錄）
      const { rows } = await app.db.query(`
        SELECT
          sd.id, sd.grid_id, sd.name, sd.supply_name, sd.quantity, sd.unit,
          sd.donor_name, sd.donor_phone, sd.donor_email, sd.donor_contact,
          sd.delivery_method, sd.delivery_address, sd.delivery_time, sd.notes, sd.status,
          sd.created_by_id, sd.created_by,
          sd.created_at, sd.created_at as created_date,
          g.created_by_id as grid_creator_id,
          g.grid_manager_id as grid_manager_id
        FROM supply_donations sd
        LEFT JOIN grids g ON g.id = sd.grid_id
        WHERE sd.grid_id = $1 AND (sd.status IS NULL OR sd.status != 'deleted')
        ORDER BY sd.created_at DESC
      `, [gridId]);

      // 取得網格建立者 ID
      const gridCreatorId = rows.length > 0 ? rows[0].grid_creator_id : undefined;
      const gridManagerId = rows.length > 0 ? rows[0].grid_manager_id : undefined;

      // 過濾隱私資訊
      const filtered = filterDonationsPrivacy(rows, req.user || null, gridCreatorId, {
        gridManagerId,
        actingRole,
        canViewContact: hasContactPermission,
      });

      // 回傳資料和權限資訊
      return {
        data: filtered,
        can_view_donor_contact: hasContactPermission,
        can_view: hasViewPermission,
        can_create: hasCreatePermission,
        can_edit: hasEditPermission,
        can_manage: hasManagePermission,
        can_delete: hasDeletePermission,
        user_id: req.user?.id || null
      };
    }

    // 取得所有物資捐贈（需要分別處理每個網格的隱私，排除已刪除的記錄）
    const { rows } = await app.db.query(`
      SELECT
        sd.id, sd.grid_id, sd.name, sd.supply_name, sd.quantity, sd.unit,
        sd.donor_name, sd.donor_phone, sd.donor_email, sd.donor_contact,
        sd.delivery_method, sd.delivery_address, sd.delivery_time, sd.notes, sd.status,
        sd.created_by_id, sd.created_by,
        sd.created_at, sd.created_at as created_date,
        g.created_by_id as grid_creator_id,
        g.grid_manager_id as grid_manager_id
      FROM supply_donations sd
      LEFT JOIN grids g ON g.id = sd.grid_id
      WHERE (sd.status IS NULL OR sd.status != 'deleted')
      ORDER BY sd.created_at DESC
    `);

    // 按網格過濾隱私
    const filtered = rows.map(row => {
      return filterDonationPrivacy(row, req.user || null, row.grid_creator_id, {
        gridManagerId: row.grid_manager_id,
        actingRole,
        canViewContact: hasContactPermission,
      });
    });

    // 回傳資料和權限資訊
    return {
      data: filtered,
      can_view_donor_contact: hasContactPermission,
      can_view: hasViewPermission,
      can_create: hasCreatePermission,
      can_edit: hasEditPermission,
      can_manage: hasManagePermission,
      can_delete: hasDeletePermission,
      user_id: req.user?.id || null
    };
  });
  app.post('/supply-donations', async (req, reply) => {
    const parsed = CreateSchema.safeParse(req.body);
    if (!parsed.success) return reply.status(400).send({ message: 'Invalid payload', issues: parsed.error.issues });
    if (!app.hasDecorator('db')) return reply.status(503).send({ message: 'DB not ready' });
    const id = randomUUID();
    const d = parsed.data;
    const name = (d.name || d.supply_name || '').trim();
    const unit = (d.unit || '件').trim();
    const donorParts = [d.donor_name, d.donor_phone, d.donor_email].filter(v => typeof v === 'string' && v.trim() !== '');
    const donor_contact = d.donor_contact || (donorParts.length ? donorParts.join(' / ') : null);

    // 存儲完整的捐贈資訊，包括所有欄位
    const { rows } = await app.db.query(
      `INSERT INTO supply_donations
        (id, grid_id, name, supply_name, quantity, unit,
         donor_name, donor_phone, donor_email, donor_contact,
         delivery_method, delivery_address, delivery_time, notes, status,
         created_by_id, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
       RETURNING *, created_at as created_date`,
      [
        id,
        d.grid_id,
        name,
        d.supply_name || name,
        d.quantity,
        unit,
        d.donor_name || null,
        d.donor_phone || null,
        d.donor_email || null,
        donor_contact,
        d.delivery_method || null,
        d.delivery_address || null,
        d.delivery_time || null,
        d.notes || null,
        'pledged',
        req.user?.id || null,
        req.user?.name || null
      ]
    );
    return reply.status(201).send(rows[0]);
  });

  // 更新物資捐贈 - 支援狀態更新和完整編輯
  app.put('/supply-donations/:id', async (req, reply) => {
    if (!req.user) return reply.status(401).send({ message: 'Unauthorized' });
    if (!app.hasDecorator('db')) return reply.status(503).send({ message: 'DB not ready' });
    const { id } = req.params as any;
    const body = req.body as any || {};

    // 除錯：記錄收到的資料
    // console.log('PUT /supply-donations/:id - Received body:', JSON.stringify(body, null, 2));
    // console.log('Body keys:', Object.keys(body));

    // 取得捐贈記錄和網格擁有者資訊
    const { rows: existingRows } = await app.db.query(
      `SELECT sd.*, g.created_by_id AS grid_creator_id, g.grid_manager_id AS grid_manager_id
       FROM supply_donations sd
       LEFT JOIN grids g ON g.id = sd.grid_id
       WHERE sd.id = $1`, [id]
    );
    const existing = existingRows[0];
    if (!existing) return reply.status(404).send({ message: 'Not found' });

    const userId = req.user.id;
    const isDonorSelf = existing.created_by_id === userId;
    const isGridCreator = existing.grid_creator_id === userId;
    const isGridManager = existing.grid_manager_id === userId;
    const isAdmin = ['admin', 'super_admin'].includes(req.user.role || '');
    const isPrivileged = isAdmin || isGridCreator || isGridManager;

    // 檢查物資狀態管理權限
    const actingRoleHeader = (req.headers['x-acting-role'] || req.headers['X-Acting-Role']) as string | undefined;
    const actingRole = actingRoleHeader ? String(actingRoleHeader) : (req.user?.role || 'guest');

    const { rows: statusPermRows } = await app.db.query(
      `SELECT can_view FROM role_permissions WHERE role = $1 AND permission_key = 'supplies_status_management'`,
      [actingRole]
    );
    const hasStatusManagementPermission = statusPermRows.length > 0 && (statusPermRows[0].can_view === 1 || statusPermRows[0].can_view === true);

    // 判斷是狀態更新還是完整編輯
    const isStatusOnlyUpdate = body.status && Object.keys(body).length === 1;

    // console.log('isStatusOnlyUpdate:', isStatusOnlyUpdate);
    // console.log('Current status:', existing.status);

    if (isStatusOnlyUpdate) {
      // 純狀態更新邏輯
      const { status } = body;
      const allowed = ['pledged', 'confirmed', 'in_transit', 'delivered', 'received', 'cancelled'];
      if (!allowed.includes(status)) {
        return reply.status(400).send({ message: 'Invalid status' });
      }

      // 檢查是否有物資狀態管理權限
      if (!hasStatusManagementPermission) {
        return reply.status(403).send({ message: 'Forbidden - Requires supplies_status_management permission' });
      }

      const currentStatus = existing.status || 'pledged';

      // 狀態轉換規則
      function canTransition(from: string, to: string) {
        if (from === to) return true;
        if (from === 'pledged') return ['confirmed', 'cancelled'].includes(to);
        if (from === 'confirmed') return ['in_transit', 'cancelled'].includes(to);
        if (from === 'in_transit') return ['delivered', 'cancelled'].includes(to);
        if (from === 'delivered') return ['received'].includes(to);
        return false; // received and cancelled are terminal
      }

      console.log(`Status transition check: ${currentStatus} -> ${status}`);
      if (!canTransition(currentStatus, status)) {
        console.log(`Illegal transition: ${currentStatus} -> ${status}`);
        return reply.status(400).send({ message: 'Illegal status transition' });
      }

      // 權限規則
      if (status === 'cancelled') {
        if (!(isDonorSelf || isPrivileged)) {
          return reply.status(403).send({ message: 'Forbidden - Only donor or grid owner can cancel' });
        }
      } else if (['confirmed', 'in_transit', 'delivered'].includes(status)) {
        if (!(isDonorSelf || isAdmin)) {
          return reply.status(403).send({ message: 'Forbidden - Only donor or admin can update to this status' });
        }
      } else if (status === 'received') {
        if (!isPrivileged) {
          return reply.status(403).send({ message: 'Forbidden - Only grid owner or admin can confirm received' });
        }
      }

      const { rows: updatedRows } = await app.db.query(
        'UPDATE supply_donations SET status=$2, updated_at=NOW() WHERE id=$1 RETURNING *, created_at as created_date',
        [id, status]
      );

      return updatedRows[0];
    } else {
      // 完整編輯邏輯 - 只有管理員、網格建立者或捐贈者本人可以編輯
      if (!(isDonorSelf || isPrivileged)) {
        return reply.status(403).send({ message: 'Forbidden - Only donor, grid owner, or admin can edit' });
      }

      // 建立更新的欄位
      const updateFields: string[] = [];
      const updateValues: any[] = [];
      let paramCounter = 2; // 從 $2 開始，$1 是 id

      if (body.supply_name !== undefined) {
        updateFields.push(`supply_name = $${paramCounter}`);
        updateValues.push(body.supply_name);
        paramCounter++;
      }
      if (body.quantity !== undefined) {
        updateFields.push(`quantity = $${paramCounter}`);
        updateValues.push(body.quantity);
        paramCounter++;
      }
      if (body.unit !== undefined) {
        updateFields.push(`unit = $${paramCounter}`);
        updateValues.push(body.unit);
        paramCounter++;
      }
      if (body.donor_name !== undefined) {
        updateFields.push(`donor_name = $${paramCounter}`);
        updateValues.push(body.donor_name);
        paramCounter++;
      }
      if (body.donor_phone !== undefined) {
        updateFields.push(`donor_phone = $${paramCounter}`);
        updateValues.push(body.donor_phone);
        paramCounter++;
      }
      if (body.donor_email !== undefined) {
        updateFields.push(`donor_email = $${paramCounter}`);
        updateValues.push(body.donor_email);
        paramCounter++;
      }
      if (body.delivery_method !== undefined) {
        updateFields.push(`delivery_method = $${paramCounter}`);
        updateValues.push(body.delivery_method);
        paramCounter++;
      }
      if (body.delivery_address !== undefined) {
        updateFields.push(`delivery_address = $${paramCounter}`);
        updateValues.push(body.delivery_address);
        paramCounter++;
      }
      if (body.delivery_time !== undefined) {
        updateFields.push(`delivery_time = $${paramCounter}`);
        updateValues.push(body.delivery_time);
        paramCounter++;
      }
      if (body.notes !== undefined) {
        updateFields.push(`notes = $${paramCounter}`);
        updateValues.push(body.notes);
        paramCounter++;
      }
      if (body.status !== undefined) {
        // 編輯時也可以更新狀態，但要檢查轉換規則和權限
        // 檢查是否有物資狀態管理權限
        if (!hasStatusManagementPermission) {
          return reply.status(403).send({ message: 'Forbidden - Requires supplies_status_management permission to change status' });
        }

        const currentStatus = existing.status || 'pledged';
        const newStatus = body.status;

        // 狀態轉換規則
        function canTransition(from: string, to: string) {
          if (from === to) return true;
          if (from === 'pledged') return ['confirmed', 'cancelled'].includes(to);
          if (from === 'confirmed') return ['in_transit', 'cancelled'].includes(to);
          if (from === 'in_transit') return ['delivered', 'cancelled'].includes(to);
          if (from === 'delivered') return ['received'].includes(to);
          return false;
        }

        if (!canTransition(currentStatus, newStatus)) {
          return reply.status(400).send({ message: 'Illegal status transition' });
        }

        updateFields.push(`status = $${paramCounter}`);
        updateValues.push(newStatus);
        paramCounter++;
      }

      if (updateFields.length === 0) {
        return reply.status(400).send({ message: 'No valid fields to update' });
      }

      // 加入更新時間
      updateFields.push('updated_at = NOW()');

      // 執行更新
      const updateQuery = `
        UPDATE supply_donations
        SET ${updateFields.join(', ')}
        WHERE id = $1
        RETURNING *, created_at as created_date
      `;

      const { rows: updatedRows } = await app.db.query(
        updateQuery,
        [id, ...updateValues]
      );

      return updatedRows[0];
    }
  });

  // 刪除物資捐贈
  app.delete('/supply-donations/:id', async (req, reply) => {
    if (!req.user) return reply.status(401).send({ message: 'Unauthorized' });
    if (!app.hasDecorator('db')) return reply.status(503).send({ message: 'DB not ready' });
    const { id } = req.params as any;

    // 檢查權限：只有管理員、網格建立者或捐贈者本人可以刪除
    const { rows: existingRows } = await app.db.query(
      `SELECT sd.*, g.created_by_id AS grid_creator_id
       FROM supply_donations sd
       LEFT JOIN grids g ON g.id = sd.grid_id
       WHERE sd.id = $1`, [id]
    );

    if (existingRows.length === 0) {
      return reply.status(404).send({ message: 'Not found' });
    }

    const existing = existingRows[0];
    const userId = req.user.id;
    const isDonorSelf = existing.created_by_id === userId;
    const isGridCreator = existing.grid_creator_id === userId;
    const isAdmin = ['admin', 'super_admin'].includes(req.user.role || '');

    if (!(isDonorSelf || isGridCreator || isAdmin)) {
      return reply.status(403).send({ message: 'Forbidden - Only donor, grid owner, or admin can delete' });
    }

    await app.db.query('DELETE FROM supply_donations WHERE id=$1', [id]);
    return reply.status(204).send();
  });
}
