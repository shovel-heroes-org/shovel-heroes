import type { FastifyInstance } from 'fastify';
import { computeListEtag, ifNoneMatchSatisfied } from '../lib/etag.js';
import { randomUUID } from 'crypto';
import { z } from 'zod';
import { linePush, buildGridLink } from '../lib/line-messaging.js';

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
    const created = rows[0];

    // Notify: grid owner/manager and participants except author (best effort)
    try {
      const gridRes = await app.db.query(
        'SELECT id, code, created_by_id, grid_manager_id FROM grids WHERE id=$1',
        [grid_id]
      );
      const grid = gridRes.rows[0];
      if (grid) {
        const link = buildGridLink(grid.id, 'discussion');
        // participants who have discussed this grid (distinct user_id) and volunteer registrations
        const partRes = await app.db.query(
          `SELECT DISTINCT u.line_sub as to_id
           FROM grid_discussions gd
           JOIN users u ON u.id = gd.user_id
           WHERE gd.grid_id=$1 AND gd.user_id IS NOT NULL AND gd.user_id <> $2 AND u.line_sub IS NOT NULL`,
          [grid_id, authUser.id]
        );
        const targets = new Set<string>();
        for (const r of partRes.rows) if (r.to_id) targets.add(r.to_id);
        // add owner/manager
        const ownerMgrRes = await app.db.query(
          `SELECT DISTINCT u.line_sub as to_id FROM users u
           WHERE (u.id = $1 OR u.id = $2) AND u.line_sub IS NOT NULL`,
          [grid.created_by_id, grid.grid_manager_id]
        );
        for (const r of ownerMgrRes.rows) if (r.to_id) targets.add(r.to_id);

        // push messages (LINE user id should be 'line_xxx' if we use id, but linePush expects LINE userId; using line_sub if available)
        const msg = [{ type: 'text', text: `有人在「${grid.code || grid.id}」留言：\n${finalContent}\n\n查看討論：${link}` }];
        await Promise.all(Array.from(targets).map(to => linePush(app.log, to, msg).catch(() => {})));
      }
    } catch (err) {
      req.log.error({ err }, '[grid-discussions] notify failed');
    }

    return reply.status(201).send(created);
  });
}