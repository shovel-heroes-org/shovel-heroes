import type { FastifyInstance } from 'fastify';
import { computeListEtag, ifNoneMatchSatisfied } from '../lib/etag';
import { randomUUID } from 'crypto';
import { z } from 'zod';

// Accept either content or message (alias). user/author fields are derived from authenticated user.
const CreateSchema = z.object({
  grid_id: z.string(),
  content: z.string().min(1).optional(),
  message: z.string().min(1).optional()
}).refine(d => d.content || d.message, { message: 'content or message required', path: ['content'] });

export function registerGridDiscussionRoutes(app: FastifyInstance) {
  // GET /grid-discussions?grid_id=xxx
  app.get<{ Querystring: { grid_id?: string } }>('/grid-discussions', async (req, reply) => {
    if (!app.hasDecorator('db')) return [];
    const { grid_id } = req.query;
    if (grid_id) {
      const { rows } = await app.db.query('SELECT * FROM grid_discussions WHERE grid_id=$1 ORDER BY created_at DESC', [grid_id]);
      const etag = computeListEtag(rows as any, ['id', 'updated_at', 'created_at']);
      if (ifNoneMatchSatisfied(req.headers['if-none-match'] as string | undefined, etag)) {
        return reply.code(304).header('ETag', etag).send();
      }
  return reply.header('ETag', etag).header('Cache-Control', 'public, no-cache').send(rows);
    }
    const { rows } = await app.db.query('SELECT * FROM grid_discussions ORDER BY created_at DESC');
    const etag = computeListEtag(rows as any, ['id', 'updated_at', 'created_at']);
    if (ifNoneMatchSatisfied(req.headers['if-none-match'] as string | undefined, etag)) {
      return reply.code(304).header('ETag', etag).send();
    }
    return reply.header('ETag', etag).header('Cache-Control', 'public, no-cache').send(rows);
  });

  type CreateInput = z.infer<typeof CreateSchema>;
  app.post<{ Body: CreateInput }>('/grid-discussions', async (req, reply) => {
    const parsed = CreateSchema.safeParse(req.body);
    if (!parsed.success) return reply.status(400).send({ message: 'Invalid payload', issues: parsed.error.issues });
    if (!app.hasDecorator('db')) return reply.status(503).send({ message: 'DB not ready' });
    const authUser = req.user;
    if (!authUser) return reply.status(401).send({ message: 'Unauthorized' });
    const id = randomUUID();
    const { grid_id, content, message } = parsed.data;
    const finalContent = (content || message || '').trim();
    if (!finalContent) return reply.status(400).send({ message: 'Empty content' });
    const authorName = authUser.name || authUser.email || '匿名';
    const authorRole = authUser.role || 'user';
    const { rows } = await app.db.query(
      'INSERT INTO grid_discussions (id, grid_id, user_id, content, author_name, author_role) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *',
      [id, grid_id, authUser.id, finalContent, authorName, authorRole]
    );
    return reply.status(201).send(rows[0]);
  });
}