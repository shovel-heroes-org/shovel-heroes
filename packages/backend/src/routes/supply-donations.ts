import type { FastifyInstance } from 'fastify';
import { randomUUID } from 'crypto';
import { z } from 'zod';

const CreateSchema = z.object({ grid_id: z.string(), name: z.string(), quantity: z.number(), unit: z.string(), donor_contact: z.string().optional() });

export function registerSupplyDonationRoutes(app: FastifyInstance) {
  app.get('/supply-donations', async () => {
    if (!app.hasDecorator('db')) return [];
    const { rows } = await app.db.query('SELECT * FROM supply_donations ORDER BY created_at DESC');
    return rows;
  });
  app.post('/supply-donations', async (req, reply) => {
    const parsed = CreateSchema.safeParse(req.body);
    if (!parsed.success) return reply.status(400).send({ message: 'Invalid payload', issues: parsed.error.issues });
    if (!app.hasDecorator('db')) return reply.status(503).send({ message: 'DB not ready' });
    const id = randomUUID();
    const { grid_id, name, quantity, unit, donor_contact } = parsed.data;
    const { rows } = await app.db.query('INSERT INTO supply_donations (id, grid_id, name, quantity, unit, donor_contact) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *', [id, grid_id, name, quantity, unit, donor_contact||null]);
    return reply.status(201).send(rows[0]);
  });
}