import type { FastifyInstance } from 'fastify';
import { computeListEtag, ifNoneMatchSatisfied } from '../lib/etag.js';
import { randomUUID } from 'crypto';
import { z } from 'zod';

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

export function registerVolunteerRegistrationRoutes(app: FastifyInstance) {
  app.get('/volunteer-registrations', async (req, reply) => {
    // Admin-only in admin mode (acting role not 'user')
    if (!req.user) return reply.status(401).send({ message: 'Unauthorized' });
    const actingRoleHeader = (req.headers['x-acting-role'] || (req.headers as any)['X-Acting-Role']) as string | undefined;
    const actingRole = actingRoleHeader === 'user' ? 'user' : (req.user?.role || 'user');
    const isRealAdmin = req.user?.role === 'admin';
    if (actingRole === 'user' || !isRealAdmin) {
      return reply.status(403).send({ message: 'Forbidden: admin only' });
    }
    if (!app.hasDecorator('db')) return [];
    const gridId = (req.query as any)?.grid_id;
    if (gridId) {
      const { rows } = await app.db.query('SELECT * FROM volunteer_registrations WHERE grid_id=$1 ORDER BY created_at DESC', [gridId]);
      const etag = computeListEtag(rows as any, ['id', 'updated_at', 'created_at', 'status']);
      if (ifNoneMatchSatisfied(req.headers['if-none-match'] as string | undefined, etag)) {
        return reply.code(304).header('ETag', etag).header('Cache-Control', 'private, no-cache').header('Vary', 'Authorization, X-Acting-Role').send();
      }
      return reply.header('ETag', etag).header('Cache-Control', 'private, no-cache').header('Vary', 'Authorization, X-Acting-Role').send(rows);
    }
    const { rows } = await app.db.query('SELECT * FROM volunteer_registrations ORDER BY created_at DESC');
    const etag = computeListEtag(rows as any, ['id', 'updated_at', 'created_at', 'status']);
    if (ifNoneMatchSatisfied(req.headers['if-none-match'] as string | undefined, etag)) {
      return reply.code(304).header('ETag', etag).header('Cache-Control', 'private, no-cache').header('Vary', 'Authorization, X-Acting-Role').send();
    }
    return reply.header('ETag', etag).header('Cache-Control', 'private, no-cache').header('Vary', 'Authorization, X-Acting-Role').send(rows);
  });
  app.post('/volunteer-registrations', async (req, reply) => {
    const parsed = CreateSchema.safeParse(req.body);
    if (!parsed.success) return reply.status(400).send({ message: 'Invalid payload', issues: parsed.error.issues });
    if (!app.hasDecorator('db')) return reply.status(503).send({ message: 'DB not ready' });
    const id = randomUUID();
    const d = parsed.data;
    const { rows } = await app.db.query(
      `INSERT INTO volunteer_registrations (id, grid_id, user_id, volunteer_name, volunteer_phone, volunteer_email, available_time, skills, equipment, status, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
      [
        id,
        d.grid_id,
        d.user_id || null,
        d.volunteer_name || null,
        d.volunteer_phone || null,
        d.volunteer_email || null,
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
    const isSelf = existing.user_id === userId;
    const isPrivileged = ['admin','grid_manager'].includes(req.user.role || '') || existing.grid_creator_id === userId || existing.grid_manager_id === userId;

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