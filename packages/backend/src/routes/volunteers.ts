import type { FastifyInstance } from 'fastify';

// NOTE: This endpoint is an aggregate view combining volunteer_registrations + users.
// DB schema currently only stores minimal fields for volunteer_registrations.
// For now we synthesize presentation fields that frontend expects (volunteer_name, volunteer_phone, etc.).
// Future: extend schema to actually persist skills/equipment/available_time/notes or join another table.

interface RawRow {
  id: string;
  grid_id: string;
  user_id: string | null;
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

    const { grid_id, status, limit = 200, page = 1, include_counts = 'true' } = req.query as any;

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

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const sql = `
      SELECT
        vr.id, vr.grid_id, vr.user_id, vr.created_at,
        COALESCE(vr.volunteer_name, u.name) AS volunteer_name,
        vr.volunteer_phone, vr.volunteer_email, vr.available_time,
        vr.skills, vr.equipment, vr.status, vr.notes,
        u.name as user_name, u.email as user_email
      FROM volunteer_registrations vr
      LEFT JOIN users u ON u.id = vr.user_id
      ${where}
      ORDER BY vr.created_at DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}
    `;
    params.push(Number(limit), Number(page - 1) * Number(limit));

    const { rows } = await app.db.query(sql, params) as { rows: RawRow[] };

    // Placeholder: derive can_view_phone (stub: true if any auth header present)
    const auth = req.headers['authorization'];
    const can_view_phone = Boolean(auth); // integrate real auth/roles later

    // Map rows to VolunteerListItem spec shape.
    const data = rows.map(r => ({
      id: r.id,
      grid_id: r.grid_id,
      user_id: r.user_id || undefined,
      volunteer_name: r.volunteer_name || r.user_name || '匿名志工',
      volunteer_phone: can_view_phone ? r.volunteer_phone : undefined,
      status: r.status || 'pending',
      available_time: r.available_time,
      skills: ensureArray(r.skills),
      equipment: ensureArray(r.equipment),
      notes: r.notes,
      created_date: r.created_at
    }));

    let status_counts: any = undefined;
    if (include_counts !== 'false') {
      const statusCountSql = `
      SELECT status, COUNT(*)::int AS count
      FROM volunteer_registrations vr
      ${where}
      GROUP BY status
      `;
      const { rows: statusRows } = await app.db.query(statusCountSql, params.slice(0, params.length - 2));
      status_counts = {
        pending: 0,
        confirmed: 0,
        arrived: 0,
        completed: 0,
        cancelled: 0,
        ...Object.fromEntries(statusRows.map(r => [r.status, r.count]))
      };
    }

    // total (without pagination) - if full dataset small we can reuse data length else run count(*).
    // Simplicity: run a COUNT(*) query with same filters.
    const countSql = `SELECT COUNT(*)::int AS c FROM volunteer_registrations vr ${where}`;
    const { rows: countRows } = await app.db.query(countSql, params.slice(0, params.length - 2));
    const total = countRows[0]?.c ?? data.length;

    return { data, can_view_phone, total, status_counts, limit: Number(limit), page: Number(page) };
  });
}
