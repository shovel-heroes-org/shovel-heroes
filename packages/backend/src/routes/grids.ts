import type { FastifyInstance } from 'fastify';
import { randomUUID } from 'crypto';
import { z } from 'zod';
import { requireAuth, requirePermission } from '../middlewares/AuthMiddleware.js';

const BoundsSchema = z.object({ north: z.number(), south: z.number(), east: z.number(), west: z.number() });
const SupplyNeedSchema = z.object({ name: z.string(), quantity: z.number(), unit: z.string(), received: z.number().optional() });
const GridCreateSchema = z.object({
  code: z.string(),
  grid_type: z.string(),
  disaster_area_id: z.string(),
  volunteer_needed: z.number().optional(),
  meeting_point: z.string().optional(),
  risks_notes: z.string().optional(),
  contact_info: z.string().optional(),
  center_lat: z.number(),
  center_lng: z.number(),
  bounds: BoundsSchema.optional(),
  status: z.string().optional(),
  supplies_needed: z.array(SupplyNeedSchema).optional(),
  grid_manager_id: z.string().optional(),
  completion_photo: z.string().optional(),
  __turnstile_token: z.string().optional()
});

/**
 * 檢查資源操作權限（結合權限系統和資源擁有權）
 */
async function checkResourcePermission(
  app: FastifyInstance,
  request: any,
  action: 'view' | 'create' | 'edit' | 'delete',
  gridId?: string
): Promise<{ allowed: boolean; message?: string }> {
  // 取得作用中的角色
  const actingRoleHeader = (request.headers['x-acting-role'] || request.headers['X-Acting-Role']) as string | undefined;
  const actingRole = actingRoleHeader === 'user' ? 'user' : (request.user?.role || 'user');

  // 超級管理員有所有權限
  if (actingRole === 'super_admin') {
    return { allowed: true };
  }

  // 檢查基礎權限
  const actionColumn = `can_${action}`;
  const { rows: permRows } = await app.db.query(
    `SELECT ${actionColumn} FROM role_permissions WHERE role = $1 AND permission_key = 'grids'`,
    [actingRole]
  );

  const hasBasePermission = permRows.length > 0 && (permRows[0][actionColumn] === 1 || permRows[0][actionColumn] === true);

  // 對於 edit 和 delete，需要檢查資源擁有權或 my_resources 權限
  if ((action === 'edit' || action === 'delete') && gridId && request.user) {
    // 取得網格資訊
    const { rows: gridRows } = await app.db.query(
      'SELECT created_by_id, grid_manager_id FROM grids WHERE id=$1',
      [gridId]
    );

    if (gridRows.length === 0) {
      return { allowed: false, message: 'Grid not found' };
    }

    const grid = gridRows[0];
    const isOwner = grid.created_by_id === request.user.id || grid.grid_manager_id === request.user.id;

    // 如果使用者是擁有者，檢查 my_resources 權限
    if (isOwner) {
      const { rows: myResRows } = await app.db.query(
        `SELECT ${actionColumn} FROM role_permissions WHERE role = $1 AND permission_key = 'my_resources'`,
        [actingRole]
      );
      const hasMyResourcesPerm = myResRows.length > 0 && (myResRows[0][actionColumn] === 1 || myResRows[0][actionColumn] === true);

      if (hasMyResourcesPerm) {
        return { allowed: true };
      }
    }

    // 如果不是擁有者，則需要有 grids 的完整權限
    if (!isOwner && !hasBasePermission) {
      return { allowed: false, message: 'Forbidden - Not owner and no permission' };
    }

    // 如果是擁有者但沒有 my_resources 權限，檢查是否有 grids 的完整權限
    if (isOwner && !hasBasePermission) {
      return { allowed: false, message: 'Forbidden - No permission to modify own resources' };
    }
  }

  return { allowed: hasBasePermission, message: hasBasePermission ? undefined : 'Forbidden - No permission' };
}

export function registerGridRoutes(app: FastifyInstance) {
  app.get('/grids', async (req) => {
    if (!app.hasDecorator('db')) return [];

    // 從 JWT middleware 獲取用戶資訊 (req.user 由 users.ts 的 preHandler 設定)
    const user = (req as any).user;
    const actingRole = req.headers['x-acting-role'] as string;

    // 獲取作用角色（視角切換）
    const effectiveRole = actingRole || user?.role || 'guest';

    // 檢查 view_grid_contact 權限
    const { rows: permissions } = await app.db.query(
      'SELECT can_view FROM role_permissions WHERE role = $1 AND permission_key = $2',
      [effectiveRole, 'view_grid_contact']
    );
    const canViewGridContact = permissions.length > 0 && permissions[0].can_view === 1;

    // 查詢網格
    const { rows } = await app.db.query(`
      SELECT
        id, code, grid_type, disaster_area_id, volunteer_needed, volunteer_registered,
        meeting_point, risks_notes, contact_info, center_lat, center_lng, bounds, status,
        COALESCE(supplies_needed, '[]'::jsonb) AS supplies_needed,
        grid_manager_id, completion_photo, created_by_id, created_by, is_sample,
        created_at, updated_at, created_date, updated_date
      FROM grids
      WHERE status != 'deleted'
      ORDER BY created_at DESC`);

    // 應用隱私過濾
    const { filterGridsPrivacy } = await import('../lib/privacy-filter.js');
    const filteredGrids = await filterGridsPrivacy(rows, user, app.db, {
      actingRole: effectiveRole,
      canViewGridContact
    });

    return filteredGrids;
  });

  app.post('/grids', async (req, reply) => {
    const body = GridCreateSchema.safeParse(req.body);
    if (!body.success) return reply.status(400).send({ message: 'Invalid payload', issues: body.error.issues });

    // Cloudflare Turnstile verification (optional based on env)
    const TURNSTILE_SECRET = process.env.TURNSTILE_SECRET_KEY;
    if (TURNSTILE_SECRET) {
      const token = body.data.__turnstile_token;
      if (!token) {
        return reply.status(400).send({ message: 'Missing Turnstile token' });
      }
      try {
        const verifyRes = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({ secret: TURNSTILE_SECRET, response: token })
        });
        const verifyJson: any = await verifyRes.json();
        if (!verifyJson.success) {
          app.log.warn({ msg: 'Turnstile verification failed', verifyJson });
          return reply.status(400).send({ message: 'Turnstile verification failed' });
        }
      } catch (err) {
        app.log.error({ msg: 'Turnstile verification error', err });
        return reply.status(500).send({ message: 'Turnstile verification error' });
      }
    }
    if (!app.hasDecorator('db')) return reply.status(503).send({ message: 'DB not ready' });
    const id = randomUUID();
    const d = body.data;

    // Get created_by_id from authenticated user
    const createdById = req.user?.id || null;

    const { rows } = await app.db.query(
      `INSERT INTO grids (id, code, grid_type, disaster_area_id, volunteer_needed, meeting_point, risks_notes, contact_info, center_lat, center_lng, bounds, status, supplies_needed, grid_manager_id, completion_photo, created_by_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
       RETURNING *`,
      [
        id,
        d.code,
        d.grid_type,
        d.disaster_area_id,
        d.volunteer_needed || 0,
        d.meeting_point || null,
        d.risks_notes || null,
        d.contact_info || null,
        d.center_lat,
        d.center_lng,
        d.bounds ? JSON.stringify(d.bounds) : null,
        d.status || 'open',
        d.supplies_needed ? JSON.stringify(d.supplies_needed) : null,
        d.grid_manager_id || null,
        d.completion_photo || null,
        createdById
      ]
    );
    return reply.status(201).send(rows[0]);
  });

  app.get('/grids/:id', async (req, reply) => {
    const { id } = req.params as any;
    if (!app.hasDecorator('db')) return reply.status(404).send({ message: 'Not found' });

    // 從 JWT middleware 獲取用戶資訊 (req.user 由 users.ts 的 preHandler 設定)
    const user = (req as any).user;
    const actingRole = req.headers['x-acting-role'] as string;

    // 獲取作用角色（視角切換）
    const effectiveRole = actingRole || user?.role || 'guest';

    // 檢查 view_grid_contact 權限
    const { rows: permissions } = await app.db.query(
      'SELECT can_view FROM role_permissions WHERE role = $1 AND permission_key = $2',
      [effectiveRole, 'view_grid_contact']
    );
    const canViewGridContact = permissions.length > 0 && permissions[0].can_view === 1;

    // 查詢網格
    const { rows } = await app.db.query(`
      SELECT
        id, code, grid_type, disaster_area_id, volunteer_needed, volunteer_registered,
        meeting_point, risks_notes, contact_info, center_lat, center_lng, bounds, status,
        COALESCE(supplies_needed, '[]'::jsonb) AS supplies_needed,
        grid_manager_id, completion_photo, created_by_id, created_by, is_sample,
        created_at, updated_at, created_date, updated_date
      FROM grids WHERE id=$1`, [id]);
    if (!rows[0]) return reply.status(404).send({ message: 'Not found' });

    // 應用隱私過濾
    const { filterGridPrivacy } = await import('../lib/privacy-filter.js');
    const filteredGrid = await filterGridPrivacy(rows[0], user, app.db, {
      actingRole: effectiveRole,
      canViewGridContact
    });

    return filteredGrid;
  });

  app.put('/grids/:id', async (req, reply) => {
    const { id } = req.params as any;
    const body = GridCreateSchema.partial().safeParse(req.body);
    if (!body.success) return reply.status(400).send({ message: 'Invalid payload', issues: body.error.issues });
    if (!app.hasDecorator('db')) return reply.status(503).send({ message: 'DB not ready' });

    // Auth & permission
    if (!req.user) return reply.status(401).send({ message: 'Unauthorized' });

    // 檢查權限
    const permCheck = await checkResourcePermission(app, req, 'edit', id);
    if (!permCheck.allowed) {
      return reply.status(403).send({ message: permCheck.message || 'Forbidden' });
    }

    const fields = body.data;
    const set: string[] = [];
    const values: any[] = [];
    let i = 1;
    for (const [k, v] of Object.entries(fields)) {
      set.push(`${k}=$${i++}`);
      if (k === 'bounds' || k === 'supplies_needed') {
        values.push(v ? JSON.stringify(v) : null);
      } else {
        values.push(v);
      }
    }
    if (set.length === 0) return reply.send({ updated: false });
    values.push(id);
    const { rows } = await app.db.query(`UPDATE grids SET ${set.join(', ')}, updated_at=NOW() WHERE id=$${i} RETURNING *`, values);
    if (!rows[0]) return reply.status(404).send({ message: 'Not found' });
    return rows[0];
  });

  // 軟刪除（移至垃圾桶）
  app.delete('/grids/:id', async (req, reply) => {
    const { id } = req.params as any;
    if (!app.hasDecorator('db')) return reply.status(503).send({ message: 'DB not ready' });

    // Auth & permission
    if (!req.user) {
      return reply.status(401).send({ message: 'Unauthorized' });
    }

    // 檢查編輯權限（軟刪除需要編輯權限）
    const permCheck = await checkResourcePermission(app, req, 'edit', id);
    if (!permCheck.allowed) {
      return reply.status(403).send({ message: permCheck.message || 'Forbidden' });
    }

    // 檢查網格是否存在
    const { rows: gridRows } = await app.db.query('SELECT status FROM grids WHERE id=$1', [id]);
    if (gridRows.length === 0) {
      return reply.status(404).send({ message: 'Grid not found' });
    }

    // 軟刪除：設定 status 為 'deleted'
    await app.db.query('UPDATE grids SET status=$1, updated_at=NOW() WHERE id=$2', ['deleted', id]);
    return reply.status(204).send();
  });

  // 還原（從垃圾桶還原）
  app.post('/grids/:id/restore', async (req, reply) => {
    const { id } = req.params as any;
    if (!app.hasDecorator('db')) return reply.status(503).send({ message: 'DB not ready' });

    // Auth & permission
    if (!req.user) {
      return reply.status(401).send({ message: 'Unauthorized' });
    }

    // 檢查編輯權限（還原需要編輯權限）
    const permCheck = await checkResourcePermission(app, req, 'edit', id);
    if (!permCheck.allowed) {
      return reply.status(403).send({ message: permCheck.message || 'Forbidden' });
    }

    // 檢查網格是否存在且在垃圾桶中
    const { rows: gridRows } = await app.db.query('SELECT status FROM grids WHERE id=$1', [id]);
    if (gridRows.length === 0) {
      return reply.status(404).send({ message: 'Grid not found' });
    }
    if (gridRows[0].status !== 'deleted') {
      return reply.status(400).send({ message: 'Grid is not in trash' });
    }

    // 還原：設定 status 為 'open'
    await app.db.query('UPDATE grids SET status=$1, updated_at=NOW() WHERE id=$2', ['open', id]);
    return reply.status(204).send();
  });

  // 永久刪除（從垃圾桶永久刪除）
  app.delete('/grids/:id/permanent', async (req, reply) => {
    const { id } = req.params as any;
    if (!app.hasDecorator('db')) return reply.status(503).send({ message: 'DB not ready' });

    // Auth & permission
    if (!req.user) {
      return reply.status(401).send({ message: 'Unauthorized' });
    }

    // 檢查刪除權限（永久刪除需要刪除權限）
    const permCheck = await checkResourcePermission(app, req, 'delete', id);
    if (!permCheck.allowed) {
      return reply.status(403).send({ message: permCheck.message || 'Forbidden' });
    }

    // 檢查網格是否在垃圾桶中
    const { rows: gridRows } = await app.db.query('SELECT status FROM grids WHERE id=$1', [id]);
    if (gridRows.length === 0) {
      return reply.status(404).send({ message: 'Grid not found' });
    }
    if (gridRows[0].status !== 'deleted') {
      return reply.status(400).send({ message: 'Grid must be in trash before permanent deletion' });
    }

    // 檢查關聯記錄
    const deps = await app.db.query(`
      SELECT
        (SELECT COUNT(*) FROM volunteer_registrations WHERE grid_id=$1) AS vr_count,
        (SELECT COUNT(*) FROM supply_donations WHERE grid_id=$1) AS sd_count,
        (SELECT COUNT(*) FROM grid_discussions WHERE grid_id=$1) AS gd_count
    `, [id]);
    const d = deps.rows[0];
    const hasRelatedRecords = d && (Number(d.vr_count) > 0 || Number(d.sd_count) > 0 || Number(d.gd_count) > 0);

    // 如果有關聯記錄，進行級聯刪除
    if (hasRelatedRecords) {
      // 取得作用中的角色
      const actingRoleHeader = (req.headers['x-acting-role'] || req.headers['X-Acting-Role']) as string | undefined;
      const actingRole = actingRoleHeader === 'user' ? 'user' : (req.user?.role || 'user');

      // 檢查級聯刪除權限
      const { rows: cascadePermRows } = await app.db.query(
        `SELECT can_delete FROM role_permissions WHERE role = $1 AND permission_key = 'trash_supplies'`,
        [actingRole]
      );

      const canCascadeDelete = cascadePermRows.length > 0 &&
        (cascadePermRows[0].can_delete === 1 || cascadePermRows[0].can_delete === true);

      // 如果沒有級聯刪除權限，返回 409 錯誤
      if (!canCascadeDelete) {
        return reply.status(409).send({
          message: 'Grid has related records',
          details: d,
          hint: 'Need trash_supplies delete permission for cascade delete'
        });
      }

      // 級聯刪除關聯記錄
      if (Number(d.vr_count) > 0) {
        await app.db.query('DELETE FROM volunteer_registrations WHERE grid_id=$1', [id]);
      }
      if (Number(d.sd_count) > 0) {
        await app.db.query('DELETE FROM supply_donations WHERE grid_id=$1', [id]);
      }
      if (Number(d.gd_count) > 0) {
        await app.db.query('DELETE FROM grid_discussions WHERE grid_id=$1', [id]);
      }
    }

    // 永久刪除網格
    await app.db.query('DELETE FROM grids WHERE id=$1', [id]);
    return reply.status(204).send();
  });

  // 取得垃圾桶中的網格
  app.get('/grids/trash', async (req, reply) => {
    if (!app.hasDecorator('db')) return [];

    // Auth & permission
    if (!req.user) {
      return reply.status(401).send({ message: 'Unauthorized' });
    }

    // 查詢 status = 'deleted' 的網格
    const { rows } = await app.db.query(`
      SELECT
        id, code, grid_type, disaster_area_id, volunteer_needed, volunteer_registered,
        meeting_point, risks_notes, contact_info, center_lat, center_lng, bounds, status,
        COALESCE(supplies_needed, '[]'::jsonb) AS supplies_needed,
        grid_manager_id, completion_photo, created_by_id, created_by, is_sample,
        created_at, updated_at, created_date, updated_date
      FROM grids
      WHERE status = 'deleted'
      ORDER BY updated_at DESC`);

    return rows;
  });
}