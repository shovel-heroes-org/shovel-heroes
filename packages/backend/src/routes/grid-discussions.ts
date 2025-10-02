import type { FastifyInstance } from 'fastify';
import { randomUUID } from 'crypto';
import { z } from 'zod';

// Accept either content or message (alias), plus optional author fields
const CreateSchema = z.object({
  grid_id: z.string(),
  user_id: z.string().optional(),
  content: z.string().min(1).optional(),
  message: z.string().min(1).optional(),
  author_name: z.string().max(120).optional(),
  author_role: z.string().max(60).optional()
}).refine(d => d.content || d.message, { message: 'content or message required', path: ['content'] });

export function registerGridDiscussionRoutes(app: FastifyInstance) {
  app.get('/grid-discussions', async (req: any) => {
    if (!app.hasDecorator('db')) return [];
    const { grid_id } = (req.query || {}) as { grid_id?: string };
    if (grid_id) {
      const { rows } = await app.db.query('SELECT * FROM grid_discussions WHERE grid_id=$1 ORDER BY created_at DESC', [grid_id]);
      return rows;
    }
    const { rows } = await app.db.query('SELECT * FROM grid_discussions ORDER BY created_at DESC');
    return rows;
  });
  app.post('/grid-discussions', async (req, reply) => {
    const parsed = CreateSchema.safeParse(req.body);
    if (!parsed.success) return reply.status(400).send({ message: 'Invalid payload', issues: parsed.error.issues });
    if (!app.hasDecorator('db')) return reply.status(503).send({ message: 'DB not ready' });
    const id = randomUUID();
    const { grid_id, user_id, content, message, author_name, author_role } = parsed.data;
    const finalContent = (content || message || '').trim();
    if (!finalContent) return reply.status(400).send({ message: 'Empty content' });
    const { rows } = await app.db.query(
      'INSERT INTO grid_discussions (id, grid_id, user_id, content, author_name, author_role) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *',
      [id, grid_id, user_id || null, finalContent, author_name || null, author_role || null]
    );
    return reply.status(201).send(rows[0]);
  });
}