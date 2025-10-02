import type { FastifyInstance } from 'fastify';
import { randomUUID } from 'crypto';
import { requireAuth, optionalAuth, type AuthenticatedRequest } from '../lib/auth.js';
import { z } from 'zod';

const CreateSchema = z.object({ grid_id: z.string(), user_id: z.string().optional(), content: z.string().min(1) });

export function registerGridDiscussionRoutes(app: FastifyInstance) {
  // Public read access to view discussions
  app.get('/grid-discussions', { preHandler: optionalAuth }, async () => {
    if (!app.hasDecorator('db')) return [];
    const { rows } = await app.db.query('SELECT * FROM grid_discussions ORDER BY created_at DESC');
    return rows;
  });

  // Require auth for posting discussions
  app.post('/grid-discussions', { preHandler: requireAuth }, async (req: AuthenticatedRequest, reply) => {
    const parsed = CreateSchema.safeParse(req.body);
    if (!parsed.success) return reply.status(400).send({ message: 'Invalid payload', issues: parsed.error.issues });
    if (!app.hasDecorator('db')) return reply.status(503).send({ message: 'DB not ready' });
    const id = randomUUID();
    const { grid_id, user_id, content } = parsed.data;
    const { rows } = await app.db.query('INSERT INTO grid_discussions (id, grid_id, user_id, content) VALUES ($1,$2,$3,$4) RETURNING *', [id, grid_id, user_id||null, content]);
    return reply.status(201).send(rows[0]);
  });
}