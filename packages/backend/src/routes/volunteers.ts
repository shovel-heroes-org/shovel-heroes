import type { FastifyInstance } from 'fastify';

// NOTE: This endpoint is an aggregate view combining volunteer_registrations + users.
// DB schema currently only stores minimal fields for volunteer_registrations.
// For now we synthesize presentation fields that frontend expects (volunteer_name, volunteer_phone, etc.).
// Future: extend schema to actually persist skills/equipment/available_time/notes or join another table.

interface RawRow {
  id: string;
  grid_id: string;
  user_id: string;
  created_at: string;
  user_name: string | null;
  user_email: string | null;
}

export function registerVolunteersRoutes(app: FastifyInstance) {
  app.get('/volunteers', async (req: any, reply) => {
    if (!app.hasDecorator('db')) return reply.status(503).send({ message: 'DB not ready' });

    const { grid_id, status, limit = 200, offset = 0, include_counts = 'true' } = req.query as any;

    // We don't actually have status column in volunteer_registrations yet.
    // Frontend expects statuses; we will default all to 'pending' until schema evolves.
    // If later a status column added, adjust the SELECT accordingly.

    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;
    if (grid_id) {
      conditions.push(`vr.grid_id = $${paramIndex++}`);
      params.push(grid_id);
    }
    // status filter is ignored for now because no status column; keep placeholder for future.
    if (status) {
      // conditions.push(`vr.status = $${paramIndex++}`);
      // params.push(status);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const sql = `SELECT vr.id, vr.grid_id, vr.user_id, vr.created_at, u.name as user_name, u.email as user_email
                 FROM volunteer_registrations vr
                 LEFT JOIN users u ON u.id = vr.user_id
                 ${where}
                 ORDER BY vr.created_at DESC
                 LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
    params.push(Number(limit), Number(offset));

    const { rows } = await app.db.query(sql, params) as { rows: RawRow[] };

    // Placeholder: derive can_view_phone (stub: true if any auth header present)
    const auth = req.headers['authorization'];
    const can_view_phone = Boolean(auth); // integrate real auth/roles later

    // Map rows to VolunteerListItem spec shape.
    const data = rows.map(r => ({
      id: r.id,
      grid_id: r.grid_id,
      user_id: r.user_id,
      volunteer_name: r.user_name || '匿名志工',
      volunteer_phone: can_view_phone ? '0912-***-***' : undefined, // we don't have phone column; masked placeholder
      status: 'pending',
      available_time: null,
      skills: [],
      equipment: [],
      notes: null,
      created_date: r.created_at
    }));

    let status_counts: any = undefined;
    if (include_counts !== 'false') {
      // Since all are pending currently
      status_counts = { pending: data.length, confirmed: 0, arrived: 0, completed: 0, cancelled: 0 };
    }

    // total (without pagination) - if full dataset small we can reuse data length else run count(*).
    // Simplicity: run a COUNT(*) query with same filters.
    const countSql = `SELECT COUNT(*)::int AS c FROM volunteer_registrations vr ${where}`;
    const { rows: countRows } = await app.db.query(countSql, params.slice(0, params.length - 2));
    const total = countRows[0]?.c ?? data.length;

    return { data, can_view_phone, total, status_counts, limit: Number(limit), page: Math.floor(Number(offset) / Number(limit)) + 1 };
  });
}
