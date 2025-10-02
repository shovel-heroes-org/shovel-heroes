import type { FastifyInstance } from 'fastify';
import { randomUUID } from 'crypto';
import { z } from 'zod';

const CreateSchema = z.object({
  title: z.string(),
  body: z.string(), // deprecated but still stored
  content: z.string().optional(),
  category: z.string().optional(),
  is_pinned: z.boolean().optional(),
  external_links: z.array(z.object({ name: z.string(), url: z.string() })).optional(),
  contact_phone: z.string().optional(),
  order: z.number().int().optional()
});

export function registerAnnouncementRoutes(app: FastifyInstance) {
  app.get('/announcements', async () => {
    if (!app.hasDecorator('db')) return [];
    const { rows } = await app.db.query('SELECT * FROM announcements ORDER BY created_at DESC');
    return rows;
  });
  app.post('/announcements', async (req, reply) => {
    const parsed = CreateSchema.safeParse(req.body);
    if (!parsed.success) return reply.status(400).send({ message: 'Invalid payload', issues: parsed.error.issues });
    if (!app.hasDecorator('db')) return reply.status(503).send({ message: 'DB not ready' });
    const id = randomUUID();
    const { title, body, content, category, is_pinned, external_links, contact_phone, order } = parsed.data;
    const { rows } = await app.db.query(
      `INSERT INTO announcements (id, title, body, content, category, is_pinned, external_links, contact_phone, "order")
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [id, title, body, content||null, category||null, is_pinned||false, external_links?JSON.stringify(external_links):null, contact_phone||null, order||null]
    );
    return reply.status(201).send(rows[0]);
  });
}