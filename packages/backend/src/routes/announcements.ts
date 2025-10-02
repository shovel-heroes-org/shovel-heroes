import type { FastifyInstance } from 'fastify';
import { randomUUID } from 'crypto';
import { requireAuth, optionalAuth, type AuthenticatedRequest } from '../lib/auth.js';
import { z } from 'zod';

const CreateSchema = z.object({ title: z.string(), body: z.string() });

export function registerAnnouncementRoutes(app: FastifyInstance) {
  // Public read access to view announcements
  app.get('/announcements', { preHandler: optionalAuth }, async () => {
    if (!app.hasDecorator('db')) return [];
    const { rows } = await app.db.query('SELECT * FROM announcements ORDER BY created_at DESC');
    return rows;
  });

  // Require auth for creating announcements (admin only in production)
  app.post('/announcements', { preHandler: requireAuth }, async (req: AuthenticatedRequest, reply) => {
    const parsed = CreateSchema.safeParse(req.body);
    if (!parsed.success) return reply.status(400).send({ message: 'Invalid payload', issues: parsed.error.issues });
    if (!app.hasDecorator('db')) return reply.status(503).send({ message: 'DB not ready' });
    const id = randomUUID();
    const { title, body } = parsed.data;
    const { rows } = await app.db.query('INSERT INTO announcements (id, title, body) VALUES ($1,$2,$3) RETURNING *', [id, title, body]);
    return reply.status(201).send(rows[0]);
  });
}