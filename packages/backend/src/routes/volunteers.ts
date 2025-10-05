import type { FastifyInstance } from 'fastify';

// NOTE: This endpoint is an aggregate view combining volunteer_registrations + users.
// DB schema currently only stores minimal fields for volunteer_registrations.
// For now we synthesize presentation fields that frontend expects (volunteer_name, volunteer_phone, etc.).
// Future: extend schema to actually persist skills/equipment/available_time/notes or join another table.

interface RawRow {
  id: string;
  grid_id: string;
  user_id: string | null;
  created_by_id: string | null;
  created_at: string;
  volunteer_name: string | null;
  volunteer_phone: string | null;
  volunteer_email: string | null;
  available_time: string | null;
  skills: unknown | null;
  equipment: unknown | null;
  status: string | null;
  notes: string | null;
  user_name: string | null;
  user_email: string | null;
  grid_creator_id: string | null;
  grid_manager_id: string | null;
}

/**
 * Ensures a value is an array. If already an array, returns it.
 * Otherwise returns an empty array.
 */
function ensureArray(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  // Attempt to parse JSON strings that might represent an array
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  // Per spec: if not already an array, return empty array (do NOT wrap single values)
  return [];
}

export function registerVolunteersRoutes(app: FastifyInstance) {
  app.get('/volunteers', async (req: any, reply) => {
    if (!app.hasDecorator('db')) return reply.status(503).send({ message: 'DB not ready' });
    // Require authentication to view any volunteer aggregated data
    if (!req.user) return reply.status(401).send({ message: 'Unauthorized' });

    // 取得作用中的角色
    const actingRoleHeader = (req.headers['x-acting-role'] || req.headers['X-Acting-Role']) as string | undefined;
    const actingRole = actingRoleHeader === 'user' ? 'user' : (req.user?.role || 'user');

    // 檢查基礎權限
    const { rows: permRows } = await app.db.query(
      `SELECT can_view, can_manage FROM role_permissions WHERE role = $1 AND permission_key = 'volunteers'`,
      [actingRole]
    );

    const hasViewPermission = permRows.length > 0 && (permRows[0].can_view === 1 || permRows[0].can_view === true);
    const hasManagePermission = permRows.length > 0 && (permRows[0].can_manage === 1 || permRows[0].can_manage === true);

    if (!hasViewPermission) {
      return reply.status(403).send({ message: 'Forbidden - No permission to view volunteers' });
    }

    const { rows: contactPermRows } = await app.db.query(
      `SELECT can_view FROM role_permissions WHERE role = $1 AND permission_key = 'view_volunteer_contact'`,
      [actingRole]
    );
    const hasContactViewPermission = contactPermRows.length > 0 && (contactPermRows[0].can_view === 1 || contactPermRows[0].can_view === true);

    const { grid_id, status, limit = 200, offset = 0, include_counts = 'true' } = req.query as any;

    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;
    if (grid_id) {
      conditions.push(`vr.grid_id = $${paramIndex++}`);
      params.push(grid_id);
    }
    if (status) {
      conditions.push(`vr.status = $${paramIndex++}`);
      params.push(status);
    }

    // 資料範圍限制：只有具有 manage 權限的角色才能看到所有志工
    // 否則只能看到自己的報名或自己管理的網格的志工
    const isAdminMode = hasManagePermission;
    if (!isAdminMode) {
      // Restrict to: (a) registrations user created (vr.user_id) OR (b) grids created/managed by user
      // Use three bound params for clarity
      const uid = req.user.id;
      conditions.push(`(vr.user_id = $${paramIndex} OR vr.grid_id IN (SELECT id FROM grids WHERE created_by_id=$${paramIndex+1} OR grid_manager_id=$${paramIndex+2}))`);
      params.push(uid, uid, uid);
      paramIndex += 3;
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const sql = `
      SELECT
        vr.id, vr.grid_id, vr.user_id, vr.created_at, vr.created_by_id,
        COALESCE(vr.volunteer_name, u.name) AS volunteer_name,
        vr.volunteer_phone, vr.volunteer_email, vr.available_time,
        vr.skills, vr.equipment, vr.status, vr.notes,
        u.name as user_name, u.email as user_email,
        g.created_by_id as grid_creator_id,
        g.grid_manager_id as grid_manager_id
      FROM volunteer_registrations vr
      LEFT JOIN users u ON u.id = vr.user_id
      LEFT JOIN grids g ON g.id = vr.grid_id
      ${where}
      ORDER BY vr.created_at DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}
    `;
    params.push(Number(limit), Number(offset));

  const { rows } = await app.db.query(sql, params) as { rows: RawRow[] };

  // 只有具有隱私權限的角色才可能看到電話資訊，管理權限則決定是否取得完整列表
  const canViewAllPhone = hasContactViewPermission && hasManagePermission;

    // Map rows to VolunteerListItem spec shape.
    const currentUserId = req.user.id;
    const data = rows.map(r => {
      // basic row
      const base = {
        id: r.id,
        grid_id: r.grid_id,
        user_id: r.user_id || undefined,
        volunteer_name: r.volunteer_name || r.user_name || '匿名志工',
        status: r.status || 'pending',
        available_time: r.available_time,
        skills: ensureArray(r.skills),
        equipment: ensureArray(r.equipment),
        notes: r.notes,
        created_date: r.created_at,
        created_by_id: r.created_by_id || undefined
      };
      if (!hasContactViewPermission) {
        return { ...base, volunteer_phone: undefined, volunteer_email: undefined };
      }

      const isSelf = (r.user_id && r.user_id === currentUserId) || (r.created_by_id && r.created_by_id === currentUserId);
      const isGridCreator = r.grid_creator_id && r.grid_creator_id === currentUserId;
      const isGridManager = r.grid_manager_id && r.grid_manager_id === currentUserId;
      const showPhone = canViewAllPhone || isSelf || isGridCreator || isGridManager;
      return {
        ...base,
        volunteer_phone: showPhone ? r.volunteer_phone : undefined,
        volunteer_email: showPhone ? r.volunteer_email : undefined
      };
    });

  let status_counts: any = undefined;
    if (include_counts !== 'false') {
      // Aggregate counts by status dynamically
      const counts: Record<string, number> = {};
      for (const d of data) {
        counts[d.status] = (counts[d.status] || 0) + 1;
      }
      status_counts = {
        pending: 0,
        confirmed: 0,
        arrived: 0,
        completed: 0,
        cancelled: 0,
        ...counts
      };
    }

    // total (without pagination) - if full dataset small we can reuse data length else run count(*).
    // Simplicity: run a COUNT(*) query with same filters.
    const countSql = `SELECT COUNT(*)::int AS c FROM volunteer_registrations vr ${where}`;
    const { rows: countRows } = await app.db.query(countSql, params.slice(0, params.length - 2));
    const total = countRows[0]?.c ?? data.length;

    return { data, can_view_phone: canViewAllPhone, total, status_counts, limit: Number(limit), page: Math.floor(Number(offset) / Number(limit)) + 1 };
  });
}
