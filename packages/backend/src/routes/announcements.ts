import type { FastifyInstance } from 'fastify';
import { randomUUID } from 'crypto';
import { z } from 'zod';
import { requireAuth, requirePermission } from '../middlewares/AuthMiddleware.js';

const CreateSchema = z.object({
  title: z.string(),
  // body previously required; now optional but we enforce body or content must exist
  body: z.string().optional(),
  content: z.string().optional(),
  category: z.string().optional(),
  is_pinned: z.boolean().optional(),
  external_links: z.array(z.object({ name: z.string(), url: z.string() })).optional(),
  contact_phone: z.string().optional(),
  order: z.coerce.number().int().optional()
}).refine((d) => Boolean((d.body && d.body.trim()) || (d.content && d.content.trim())), {
  message: 'Either body or content must be provided'
});

const UpdateSchema = z.object({
  title: z.string().optional(),
  body: z.string().optional(),
  content: z.string().optional(),
  category: z.string().optional(),
  is_pinned: z.boolean().optional(),
  external_links: z.array(z.object({ name: z.string(), url: z.string() })).optional(),
  contact_phone: z.string().optional(),
  order: z.coerce.number().int().optional()
});

export function registerAnnouncementRoutes(app: FastifyInstance) {
  // 檢視公告 - 所有人都可以檢視
  app.get('/announcements', async () => {
    if (!app.hasDecorator('db')) return [];
    const { rows } = await app.db.query('SELECT * FROM announcements ORDER BY "order" ASC, created_at DESC');
    return rows;
  });

  // 建立公告 - 需要 create 權限
  app.post('/announcements', {
    preHandler: [requireAuth, requirePermission('announcements', 'create')]
  }, async (req, reply) => {
    const parsed = CreateSchema.safeParse(req.body);
    if (!parsed.success) return reply.status(400).send({ message: 'Invalid payload', issues: parsed.error.issues });
    if (!app.hasDecorator('db')) return reply.status(503).send({ message: 'DB not ready' });
    const id = randomUUID();
    const { title, body, content, category, is_pinned, external_links, contact_phone, order } = parsed.data;
    const { rows } = await app.db.query(
      `INSERT INTO announcements (id, title, body, content, category, is_pinned, external_links, contact_phone, "order")
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [
        id,
        title,
        body ?? null,
        content || null,
        category || null,
        is_pinned || false,
        external_links ? JSON.stringify(external_links) : null,
        contact_phone || null,
        order || null
      ]
    );
    return reply.status(201).send(rows[0]);
  });

  // 更新公告 - 需要 edit 權限
  app.put('/announcements/:id', {
    preHandler: [requireAuth, requirePermission('announcements', 'edit')]
  }, async (req, reply) => {
    const parsed = UpdateSchema.safeParse(req.body);
    if (!parsed.success) return reply.status(400).send({ message: 'Invalid payload', issues: parsed.error.issues });
    if (!app.hasDecorator('db')) return reply.status(503).send({ message: 'DB not ready' });

    const id = (req.params as any)?.id as string;
    if (!id) return reply.status(400).send({ message: 'Missing id' });

    const data = parsed.data;
    const fields: string[] = [];
    const values: any[] = [];

    const push = (sqlField: string, value: any) => {
      values.push(value);
      fields.push(`${sqlField} = $${values.length}`);
    };

    // Whitelist fields
    if (typeof data.title !== 'undefined') push('title', data.title);
    if (typeof data.body !== 'undefined') push('body', data.body ?? null);
    if (typeof data.content !== 'undefined') push('content', data.content ?? null);
    if (typeof data.category !== 'undefined') push('category', data.category ?? null);
    if (typeof data.is_pinned !== 'undefined') push('is_pinned', !!data.is_pinned);
    if (typeof data.external_links !== 'undefined') push('external_links', data.external_links ? JSON.stringify(data.external_links) : null);
    if (typeof data.contact_phone !== 'undefined') push('contact_phone', data.contact_phone ?? null);
    if (typeof data.order !== 'undefined') push('"order"', data.order ?? null);

    if (fields.length === 0) return reply.status(400).send({ message: 'No fields to update' });

    const sql = `UPDATE announcements SET ${fields.join(', ')} WHERE id = $${values.length + 1} RETURNING *`;
    values.push(id);
    const { rows } = await app.db.query(sql, values);
    if (rows.length === 0) return reply.status(404).send({ message: 'Not found' });
    return rows[0];
  });

  // 刪除公告 - 需要 delete 權限
  app.delete('/announcements/:id', {
    preHandler: [requireAuth, requirePermission('announcements', 'delete')]
  }, async (req, reply) => {
    if (!app.hasDecorator('db')) return reply.status(503).send({ message: 'DB not ready' });
    const id = (req.params as any)?.id as string;
    if (!id) return reply.status(400).send({ message: 'Missing id' });
    const { rows } = await app.db.query('DELETE FROM announcements WHERE id = $1 RETURNING id', [id]);
    if (rows.length === 0) return reply.status(404).send({ message: 'Not found' });
    return reply.status(204).send();
  });
}