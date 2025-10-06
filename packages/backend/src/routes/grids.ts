import type { FastifyInstance } from 'fastify';
import { computeListEtag, ifNoneMatchSatisfied } from '../lib/etag.js';
import { randomUUID } from 'crypto';
import { z } from 'zod';

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

export function registerGridRoutes(app: FastifyInstance) {
  app.get('/grids', async (req, reply) => {
    if (!app.hasDecorator('db')) return [];
    const { rows } = await app.db.query(`
      SELECT 
        id, code, grid_type, disaster_area_id, volunteer_needed, volunteer_registered,
        meeting_point, risks_notes, contact_info, center_lat, center_lng, bounds, status,
        COALESCE(supplies_needed, '[]'::jsonb) AS supplies_needed,
        grid_manager_id, completion_photo, created_by_id, created_by, is_sample,
        created_at, updated_at, created_date, updated_date
      FROM grids
      ORDER BY created_at DESC`);
    // Weak ETag across stable keys: id + updated_at + created_at + volunteer_registered + order-insensitive projections
    const etag = computeListEtag(rows, ['id', 'updated_at', 'created_at', 'volunteer_registered']);
    if (ifNoneMatchSatisfied(req.headers['if-none-match'] as string | undefined, etag)) {
      return reply.code(304).header('ETag', etag).send();
    }
    return reply.header('ETag', etag).header('Cache-Control', 'public, no-cache').send(rows);
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
    const { rows } = await app.db.query(
      `INSERT INTO grids (id, code, grid_type, disaster_area_id, volunteer_needed, meeting_point, risks_notes, contact_info, center_lat, center_lng, bounds, status, supplies_needed, grid_manager_id, completion_photo)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
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
        d.completion_photo || null
      ]
    );
    return reply.status(201).send(rows[0]);
  });

  app.get('/grids/:id', async (req, reply) => {
    const { id } = req.params as any;
    if (!app.hasDecorator('db')) return reply.status(404).send({ message: 'Not found' });
    const { rows } = await app.db.query(`
      SELECT 
        id, code, grid_type, disaster_area_id, volunteer_needed, volunteer_registered,
        meeting_point, risks_notes, contact_info, center_lat, center_lng, bounds, status,
        COALESCE(supplies_needed, '[]'::jsonb) AS supplies_needed,
        grid_manager_id, completion_photo, created_by_id, created_by, is_sample,
        created_at, updated_at, created_date, updated_date
      FROM grids WHERE id=$1`, [id]);
    if (!rows[0]) return reply.status(404).send({ message: 'Not found' });
    return rows[0];
  });

  app.put('/grids/:id', async (req, reply) => {
    const { id } = req.params as any;
    const body = GridCreateSchema.partial().safeParse(req.body);
    if (!body.success) return reply.status(400).send({ message: 'Invalid payload', issues: body.error.issues });
    if (!app.hasDecorator('db')) return reply.status(503).send({ message: 'DB not ready' });
    // Auth & permission
    if (!req.user) return reply.status(401).send({ message: 'Unauthorized' });
    const actingRoleHeader = (req.headers['x-acting-role'] || req.headers['X-Acting-Role']) as string | undefined;
    const actingRole = actingRoleHeader === 'user' ? 'user' : (req.user?.role || 'user');
    const { rows: gridRows } = await app.db.query('SELECT id, created_by_id, grid_manager_id FROM grids WHERE id=$1', [id]);
    const grid = gridRows[0];
    if (!grid) return reply.status(404).send({ message: 'Not found' });
    const userId = req.user.id;
    const isOwner = grid.created_by_id === userId || grid.grid_manager_id === userId;
    const isRealAdmin = req.user.role === 'admin';
    if (actingRole === 'user' && !isOwner) {
      return reply.status(403).send({ message: 'Forbidden (acting as user)' });
    }
    if (actingRole !== 'user' && !(isRealAdmin || isOwner)) {
      return reply.status(403).send({ message: 'Forbidden' });
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

  app.delete('/grids/:id', async (req, reply) => {
    const { id } = req.params as any;
    if (!app.hasDecorator('db')) return reply.status(503).send({ message: 'DB not ready' });
    // Must be authenticated
    const actingRoleHeader = (req.headers['x-acting-role'] || req.headers['X-Acting-Role']) as string | undefined;
    const actingRole = actingRoleHeader === 'user' ? 'user' : (req.user?.role || 'user');
    if (!req.user) {
      return reply.status(401).send({ message: 'Unauthorized' });
    }
    // Fetch grid ownership info
    const { rows: gridRows } = await app.db.query('SELECT id, created_by_id, grid_manager_id FROM grids WHERE id=$1', [id]);
    const grid = gridRows[0];
    if (!grid) return reply.status(404).send({ message: 'Not found' });
    const userId = req.user.id;
    const isOwner = grid.created_by_id === userId || grid.grid_manager_id === userId;
    const isRealAdmin = (req.user.role === 'admin');
    // If acting role is user, forbid even if real admin unless owner.
    if (actingRole === 'user' && !isOwner) {
      return reply.status(403).send({ message: 'Forbidden (acting as user)' });
    }
    // If acting as admin (no actingRole header) allow only admin or owner
    if (actingRole !== 'user' && !(isRealAdmin || isOwner)) {
      return reply.status(403).send({ message: 'Forbidden' });
    }
    // Ensure no dependent records remain unless force=true and admin mode
    const deps = await app.db.query(`
      SELECT 
        (SELECT COUNT(*)::int FROM volunteer_registrations WHERE grid_id=$1) AS vr_count,
        (SELECT COUNT(*)::int FROM supply_donations WHERE grid_id=$1) AS sd_count,
        (SELECT COUNT(*)::int FROM grid_discussions WHERE grid_id=$1) AS gd_count
    `, [id]);
    const d = deps.rows[0] || { vr_count: 0, sd_count: 0, gd_count: 0 };
    const hasDeps = Number(d.vr_count) > 0 || Number(d.sd_count) > 0 || Number(d.gd_count) > 0;

    // Auto force when in admin mode; also allow explicit ?force=true for backwards-compat
    const adminMode = isRealAdmin && actingRole !== 'user';
    const forceParam = ((req.query as any)?.force ?? '').toString().toLowerCase() === 'true';
    const force = adminMode || forceParam;

    if (hasDeps && !(force && adminMode)) {
      return reply.status(409).send({ message: 'Grid has related records', details: d });
    }
    if (hasDeps && force && adminMode) {
      // Best-effort cascade delete in admin mode
      try {
        await app.db.query('DELETE FROM volunteer_registrations WHERE grid_id=$1', [id]);
        await app.db.query('DELETE FROM supply_donations WHERE grid_id=$1', [id]);
        await app.db.query('DELETE FROM grid_discussions WHERE grid_id=$1', [id]);
      } catch (e) {
        return reply.status(500).send({ message: 'Failed to delete related records', error: (e as any)?.message });
      }
    }
    await app.db.query('DELETE FROM grids WHERE id=$1', [id]);
    return reply.status(204).send();
  });
}