import type { FastifyInstance } from 'fastify';
import { computeListEtag, ifNoneMatchSatisfied } from '../lib/etag.js';
import { randomUUID } from 'crypto';
import { z } from 'zod';
import { filterVolunteerPrivacy, filterVolunteersPrivacy } from '../lib/privacy-filter.js';

const CreateSchema = z.object({
  grid_id: z.string(),
  user_id: z.string().optional(),
  volunteer_name: z.string().min(1).optional(),
  volunteer_phone: z.preprocess(v => (typeof v === 'string' && v.trim() === '' ? undefined : v), z.string().optional()),
  volunteer_email: z.preprocess(v => (typeof v === 'string' && v.trim() === '' ? undefined : v), z.string().email().optional()),
  available_time: z.preprocess(v => (typeof v === 'string' && v.trim() === '' ? undefined : v), z.string().optional()),
  skills: z.array(z.string()).optional(),
  equipment: z.array(z.string()).optional(),
  status: z.preprocess(v => (typeof v === 'string' && v.trim() === '' ? undefined : v), z.string().optional()),
  notes: z.preprocess(v => (typeof v === 'string' && v.trim() === '' ? undefined : v), z.string().optional())
}).refine(
  (data) => data.user_id || data.volunteer_name,
  {
    message: 'Either user_id or volunteer_name must be provided for registration',
    path: ['user_id']
  }
);

const UpdateSchema = z.object({
  volunteer_name: z.string().min(1).optional(),
  volunteer_phone: z.preprocess(v => (typeof v === 'string' && v.trim() === '' ? undefined : v), z.string().optional()),
  volunteer_email: z.preprocess(v => (typeof v === 'string' && v.trim() === '' ? undefined : v), z.string().email().optional()),
  available_time: z.preprocess(v => (typeof v === 'string' && v.trim() === '' ? undefined : v), z.string().optional()),
  skills: z.array(z.string()).optional(),
  equipment: z.array(z.string()).optional(),
  status: z.preprocess(v => (typeof v === 'string' && v.trim() === '' ? undefined : v), z.string().optional()),
  notes: z.preprocess(v => (typeof v === 'string' && v.trim() === '' ? undefined : v), z.string().optional())
});

export function registerVolunteerRegistrationRoutes(app: FastifyInstance) {
  app.get('/volunteer-registrations', async (req) => {
    if (!app.hasDecorator('db')) return { data: [], can_view_phone: false };
    const gridId = (req.query as any)?.grid_id;

    // 從 JWT middleware 獲取用戶資訊 (req.user 由 users.ts 的 preHandler 設定)
    const user = (req as any).user;

    // 取得作用中的角色（配合視角切換）
    const actingRoleHeader = (req.headers['x-acting-role'] || req.headers['X-Acting-Role']) as string | undefined;
    const actingRole = actingRoleHeader ? String(actingRoleHeader) : (user?.role || 'guest');

    const { rows: contactPermRows } = await app.db.query(
      `SELECT can_view FROM role_permissions WHERE role = $1 AND permission_key = 'view_volunteer_contact'`,
      [actingRole]
    );
    const hasContactPermission = contactPermRows.length > 0 && (contactPermRows[0].can_view === 1 || contactPermRows[0].can_view === true || contactPermRows[0].can_view === '1');

    // 取得 volunteer_registrations 的編輯和管理權限
    const { rows: editPermRows } = await app.db.query(
      `SELECT can_edit, can_manage FROM role_permissions WHERE role = $1 AND permission_key = 'volunteer_registrations'`,
      [actingRole]
    );
    const hasEditPermission = editPermRows.length > 0 && (editPermRows[0].can_edit === 1 || editPermRows[0].can_edit === true || editPermRows[0].can_edit === '1');
    const hasManagePermission = editPermRows.length > 0 && (editPermRows[0].can_manage === 1 || editPermRows[0].can_manage === true || editPermRows[0].can_manage === '1');

    // Debug log
    app.log.info({
      actingRole,
      contactPermRows,
      hasContactPermission,
      can_view_value: contactPermRows[0]?.can_view,
      can_view_type: typeof contactPermRows[0]?.can_view
    }, 'volunteer-registrations: Contact permission check');

    // 檢查使用者是否為管理員（基於作用中角色）
    const isUserAdmin = actingRole === 'admin' || actingRole === 'super_admin';

    if (gridId) {
      // 取得志工報名資料和網格建立者資訊
      const { rows } = await app.db.query(`
        SELECT vr.*, g.created_by_id as grid_creator_id, g.grid_manager_id as grid_manager_id
        FROM volunteer_registrations vr
        LEFT JOIN grids g ON g.id = vr.grid_id
        WHERE vr.grid_id = $1
        ORDER BY vr.created_at DESC
      `, [gridId]);

      // 取得網格建立者 ID
      const gridCreatorId = rows.length > 0 ? rows[0].grid_creator_id : undefined;
      const gridManagerId = rows.length > 0 ? rows[0].grid_manager_id : undefined;

      // 檢查使用者是否為該網格的建立者
      const isGridCreator = user && gridCreatorId && user.id === gridCreatorId;
      const isGridManager = user && gridManagerId && user.id === gridManagerId;

      // 過濾隱私資訊
      const filtered = filterVolunteersPrivacy(rows, user, gridCreatorId, {
        gridManagerId,
        actingRole,
        userActualRole: user?.role,  // 傳遞實際角色
        canViewContact: hasContactPermission,
      });

      // 權限判斷：
      // 規則：高權限角色 + 是網格建立者 + view_volunteer_contact = 可看該網格所有電話
      //       一般使用者/訪客 + view_volunteer_contact = 只能看自己的電話
      // 注意：隱私過濾函數會處理具體邏輯，這裡只要有權限即可
      const canViewPhones = hasContactPermission;

      return {
        data: filtered,
        can_view_phone: canViewPhones,
        can_edit: hasEditPermission,
        can_manage: hasManagePermission,
        user_id: user?.id  // 前端需要知道當前用戶 ID 來判斷 isSelf
      };
    }

    // 取得所有志工報名（需要分別處理每個網格的隱私）
    const { rows } = await app.db.query(`
      SELECT vr.*, g.created_by_id as grid_creator_id, g.grid_manager_id as grid_manager_id
      FROM volunteer_registrations vr
      LEFT JOIN grids g ON g.id = vr.grid_id
      ORDER BY vr.created_at DESC
    `);

    // 按網格分組並過濾隱私
    const filtered = rows.map(row => {
      return filterVolunteerPrivacy(row, user, row.grid_creator_id, {
        gridManagerId: row.grid_manager_id,
        actingRole,
        userActualRole: user?.role,  // 傳遞實際角色
        canViewContact: hasContactPermission,
      });
    });

    // 對於列表查詢（所有網格）：
    // 規則：高權限角色 + 是網格建立者 + view_volunteer_contact = 可看該網格所有電話
    //       一般使用者/訪客 + view_volunteer_contact = 只能看自己的電話
    // 注意：隱私過濾函數會處理具體邏輯，這裡只要有權限即可
    const canViewPhones = hasContactPermission;

    return {
      data: filtered,
      can_view_phone: canViewPhones,
      can_edit: hasEditPermission,
      can_manage: hasManagePermission,
      user_id: user?.id  // 前端需要知道當前用戶 ID 來判斷 isSelf
    };
  });
  app.post('/volunteer-registrations', async (req, reply) => {
    const parsed = CreateSchema.safeParse(req.body);
    if (!parsed.success) return reply.status(400).send({ message: 'Invalid payload', issues: parsed.error.issues });
    if (!app.hasDecorator('db')) return reply.status(503).send({ message: 'DB not ready' });

    // 取得當前使用者資訊
    const user = (req as any).user;
    const createdById = user?.id || null;

    const id = randomUUID();
    const d = parsed.data;
    const { rows } = await app.db.query(
      `INSERT INTO volunteer_registrations (id, grid_id, user_id, created_by_id, volunteer_name, volunteer_phone, volunteer_email, available_time, skills, equipment, status, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
      [
        id,
        d.grid_id,
        d.user_id || null,
        createdById,  // 記錄建立者ID
        d.volunteer_name || null,
        d.volunteer_phone && d.volunteer_phone.trim() !== '' ? d.volunteer_phone : null,
        d.volunteer_email && d.volunteer_email.trim() !== '' ? d.volunteer_email : null,
        d.available_time || null,
        d.skills ? JSON.stringify(d.skills) : null,
        d.equipment ? JSON.stringify(d.equipment) : null,
        d.status || 'pending',
        d.notes || null
      ]
    );
    // Recalculate volunteer_registered (exclude cancelled if present)
    await app.db.query(
      `UPDATE grids SET volunteer_registered = (
         SELECT COUNT(*) FROM volunteer_registrations vr
         WHERE vr.grid_id = $1 AND COALESCE(vr.status,'pending') NOT IN ('cancelled')
       ), updated_at = NOW() WHERE id = $1`,
      [d.grid_id]
    );
    return reply.status(201).send(rows[0]);
  });
  
  // Update status (pending -> confirmed / declined / cancelled; confirmed -> cancelled; others immutable)
  app.put('/volunteer-registrations/:id', async (req, reply) => {
    if (!req.user) return reply.status(401).send({ message: 'Unauthorized' });
    if (!app.hasDecorator('db')) return reply.status(503).send({ message: 'DB not ready' });
    const { id } = req.params as any;
    const { status } = (req.body as any) || {};
  // Full lifecycle: pending -> confirmed -> arrived -> completed
  // Branch exits: pending -> declined | cancelled; confirmed/arrived -> cancelled; completed/declined/cancelled terminal
  const allowed = ['pending','confirmed','arrived','completed','declined','cancelled'];
    if (!status || !allowed.includes(status)) {
      return reply.status(400).send({ message: 'Invalid or missing status' });
    }
    // Fetch existing with grid ownership context (created_by_id)
    const { rows: existingRows } = await app.db.query(
      `SELECT vr.*, g.created_by_id AS grid_creator_id, g.grid_manager_id AS grid_manager_id
       FROM volunteer_registrations vr
       LEFT JOIN grids g ON g.id = vr.grid_id
       WHERE vr.id = $1`, [id]
    );
    const existing = existingRows[0];
    if (!existing) return reply.status(404).send({ message: 'Not found' });

    const currentStatus = existing.status || 'pending';
    const userId = req.user.id;
    const isSelf = existing.user_id === userId || existing.created_by_id === userId;

    // 取得作用中的角色
    const actingRoleHeader = (req.headers['x-acting-role'] || req.headers['X-Acting-Role']) as string | undefined;
    const actingRole = actingRoleHeader === 'user' ? 'user' : (req.user.role || 'user');

    // 有權限的身份：超管、管理員、網格管理員、網格創建者
    const isPrivileged = ['super_admin', 'admin', 'grid_manager'].includes(actingRole) ||
                         existing.grid_creator_id === userId ||
                         existing.grid_manager_id === userId;

    // Transition rules
    function canTransition(from: string, to: string) {
      if (from === to) return true;
      if (from === 'pending') return ['confirmed','declined','cancelled'].includes(to);
      if (from === 'confirmed') return ['arrived','cancelled'].includes(to);
      if (from === 'arrived') return ['completed','cancelled'].includes(to);
      return false; // declined or cancelled are terminal
    }
    if (!canTransition(currentStatus, status)) {
      return reply.status(400).send({ message: 'Illegal status transition' });
    }
    // Permission rules
    if (['confirmed','declined','arrived','completed'].includes(status) && !isPrivileged) {
      return reply.status(403).send({ message: 'Forbidden' });
    }
    if (status === 'cancelled' && !(isSelf || isPrivileged)) {
      return reply.status(403).send({ message: 'Forbidden' });
    }

    const { rows: updatedRows } = await app.db.query(
      'UPDATE volunteer_registrations SET status=$2, updated_at=NOW() WHERE id=$1 RETURNING *',
      [id, status]
    );
    const updated = updatedRows[0];
    // Recalculate volunteer_registered (exclude both 'cancelled' and 'declined' statuses from the count)
    await app.db.query(
      `UPDATE grids SET volunteer_registered = (
         SELECT COUNT(*) FROM volunteer_registrations vr
         WHERE vr.grid_id = $1 
           AND COALESCE(vr.status,'pending') IN ('confirmed','arrived','completed')
       ), updated_at = NOW() WHERE id = $1`,
      [updated.grid_id]
    );
    return updated;
  });

  // PATCH 路由：支援編輯志工報名的所有欄位
  app.patch('/volunteer-registrations/:id', async (req, reply) => {
    if (!req.user) return reply.status(401).send({ message: 'Unauthorized' });
    if (!app.hasDecorator('db')) return reply.status(503).send({ message: 'DB not ready' });

    const { id } = req.params as any;
    const parsed = UpdateSchema.safeParse(req.body);
    if (!parsed.success) return reply.status(400).send({ message: 'Invalid payload', issues: parsed.error.issues });

    // 取得現有報名資料及權限資訊
    const { rows: existingRows } = await app.db.query(
      `SELECT vr.*, g.created_by_id AS grid_creator_id, g.grid_manager_id AS grid_manager_id
       FROM volunteer_registrations vr
       LEFT JOIN grids g ON g.id = vr.grid_id
       WHERE vr.id = $1`, [id]
    );
    const existing = existingRows[0];
    if (!existing) return reply.status(404).send({ message: 'Not found' });

    const userId = req.user.id;
    const isSelf = existing.user_id === userId || existing.created_by_id === userId;

    // 取得作用中的角色
    const actingRoleHeader = (req.headers['x-acting-role'] || req.headers['X-Acting-Role']) as string | undefined;
    const actingRole = actingRoleHeader === 'user' ? 'user' : (req.user.role || 'user');

    // 檢查編輯權限 (基於 role_permissions 表 - volunteer_registrations)
    const { rows: permRows } = await app.db.query(
      `SELECT can_edit, can_manage FROM role_permissions WHERE role = $1 AND permission_key = 'volunteer_registrations'`,
      [actingRole]
    );
    const hasEditPermission = permRows.length > 0 && (permRows[0].can_edit === 1 || permRows[0].can_edit === true || permRows[0].can_edit === '1');
    const hasManagePermission = permRows.length > 0 && (permRows[0].can_manage === 1 || permRows[0].can_manage === true || permRows[0].can_manage === '1');

    // 權限檢查邏輯（嚴格依照需求表格）：
    // can_edit 權限：只能編輯自己的志工報名
    // can_manage 權限：可以編輯別人的志工報名
    const canEditSelf = hasEditPermission && isSelf;
    const canEditOthers = hasManagePermission && !isSelf;

    if (!canEditSelf && !canEditOthers) {
      return reply.status(403).send({ message: 'Forbidden - No permission to edit this registration' });
    }

    // 建立更新欄位和值
    const updateFields: string[] = [];
    const values: any[] = [];
    let valueIndex = 1;

    if (parsed.data.volunteer_name !== undefined) {
      updateFields.push(`volunteer_name = $${valueIndex++}`);
      values.push(parsed.data.volunteer_name);
    }
    if (parsed.data.volunteer_phone !== undefined) {
      updateFields.push(`volunteer_phone = $${valueIndex++}`);
      values.push(parsed.data.volunteer_phone && parsed.data.volunteer_phone.trim() !== '' ? parsed.data.volunteer_phone : null);
    }
    if (parsed.data.volunteer_email !== undefined) {
      updateFields.push(`volunteer_email = $${valueIndex++}`);
      values.push(parsed.data.volunteer_email && parsed.data.volunteer_email.trim() !== '' ? parsed.data.volunteer_email : null);
    }
    if (parsed.data.available_time !== undefined) {
      updateFields.push(`available_time = $${valueIndex++}`);
      values.push(parsed.data.available_time || null);
    }
    if (parsed.data.skills !== undefined) {
      updateFields.push(`skills = $${valueIndex++}`);
      values.push(parsed.data.skills ? JSON.stringify(parsed.data.skills) : null);
    }
    if (parsed.data.equipment !== undefined) {
      updateFields.push(`equipment = $${valueIndex++}`);
      values.push(parsed.data.equipment ? JSON.stringify(parsed.data.equipment) : null);
    }
    if (parsed.data.notes !== undefined) {
      updateFields.push(`notes = $${valueIndex++}`);
      values.push(parsed.data.notes || null);
    }
    if (parsed.data.status !== undefined) {
      updateFields.push(`status = $${valueIndex++}`);
      values.push(parsed.data.status || 'pending');
    }

    // 添加更新時間
    updateFields.push(`updated_at = NOW()`);

    // 執行更新
    if (updateFields.length > 0) {
      values.push(id);
      const updateSql = `UPDATE volunteer_registrations SET ${updateFields.join(', ')} WHERE id = $${valueIndex} RETURNING *`;
      const { rows: updatedRows } = await app.db.query(updateSql, values);

      // 如果狀態有變更，需要更新網格的志工計數
      if (parsed.data.status !== undefined && parsed.data.status !== existing.status) {
        await app.db.query(
          `UPDATE grids SET volunteer_registered = (
             SELECT COUNT(*) FROM volunteer_registrations vr
             WHERE vr.grid_id = $1
               AND COALESCE(vr.status,'pending') IN ('confirmed','arrived','completed')
           ), updated_at = NOW() WHERE id = $1`,
          [existing.grid_id]
        );
      }

      return updatedRows[0];
    }

    return existing;
  });

  app.delete('/volunteer-registrations/:id', async (req, reply) => {
    const { id } = req.params as any;
    if (!app.hasDecorator('db')) return reply.status(503).send({ message: 'DB not ready' });
    // Find grid id first to recalc after delete
    const { rows: findRows } = await app.db.query('SELECT grid_id FROM volunteer_registrations WHERE id=$1', [id]);
    await app.db.query('DELETE FROM volunteer_registrations WHERE id=$1', [id]);
    const gridId = findRows[0]?.grid_id;
    if (gridId) {
      await app.db.query(
        `UPDATE grids SET volunteer_registered = (
           SELECT COUNT(*) FROM volunteer_registrations vr
           WHERE vr.grid_id = $1 AND COALESCE(vr.status,'pending') NOT IN ('cancelled')
         ), updated_at = NOW() WHERE id = $1`,
        [gridId]
      );
    }
    return reply.status(204).send();
  });
}
