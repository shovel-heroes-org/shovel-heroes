import type { FastifyInstance } from 'fastify';
import { randomUUID } from 'crypto';
import { z } from 'zod';

const CreateSchema = z.object({ title: z.string(), body: z.string() });

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
    const { title, body } = parsed.data;
    const { rows } = await app.db.query('INSERT INTO announcements (id, title, body) VALUES ($1,$2,$3) RETURNING *', [id, title, body]);
    return reply.status(201).send(rows[0]);
  });
}