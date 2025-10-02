import type { FastifyInstance } from 'fastify';
import { randomUUID } from 'crypto';
import { z } from 'zod';

const CreateSchema = z.object({
  grid_id: z.string(),
  user_id: z.string().optional(),
  volunteer_name: z.string().min(1).optional(),
  volunteer_phone: z.string().optional(),
  volunteer_email: z.string().email().optional(),
  available_time: z.string().optional(),
  skills: z.array(z.string()).optional(),
  equipment: z.array(z.string()).optional(),
  status: z.string().optional(),
  notes: z.string().optional()
}).refine(
  (data) => data.user_id || data.volunteer_name,
  {
    message: 'Either user_id or volunteer_name must be provided for registration',
    path: ['user_id']
  }
);

export function registerVolunteerRegistrationRoutes(app: FastifyInstance) {
  app.get('/volunteer-registrations', async () => {
    if (!app.hasDecorator('db')) return [];
    const { rows } = await app.db.query('SELECT * FROM volunteer_registrations ORDER BY created_at DESC');
    return rows;
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
    return reply.status(201).send(rows[0]);
  });
  app.delete('/volunteer-registrations/:id', async (req, reply) => {
    const { id } = req.params as any;
    if (!app.hasDecorator('db')) return reply.status(503).send({ message: 'DB not ready' });
    await app.db.query('DELETE FROM volunteer_registrations WHERE id=$1', [id]);
    return reply.status(204).send();
  });
}