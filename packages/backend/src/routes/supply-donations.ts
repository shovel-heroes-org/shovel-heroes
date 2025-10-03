import type { FastifyInstance } from 'fastify';
import { randomUUID } from 'crypto';
import { z } from 'zod';

// Accept both legacy simplified shape and richer frontend form shape.
const CreateSchema = z.object({
  grid_id: z.string(),
  name: z.string().optional(), // internal normalized name (fallback to supply_name)
  supply_name: z.string().optional(), // frontend field
  quantity: z.number(),
  unit: z.string().optional(),
  donor_name: z.string().optional(),
  donor_phone: z.string().optional(),
  donor_email: z.string().optional(),
  donor_contact: z.string().optional(),
  delivery_method: z.string().optional(),
  delivery_address: z.string().optional(),
  delivery_time: z.string().optional(),
  notes: z.string().optional()
}).refine(d => !!(d.name || d.supply_name), { message: 'supply_name or name required', path: ['supply_name'] });

export function registerSupplyDonationRoutes(app: FastifyInstance) {
  app.get('/supply-donations', async (req) => {
    if (!app.hasDecorator('db')) return [];
    const gridId = (req.query as any)?.grid_id;
    if (gridId) {
      const { rows } = await app.db.query('SELECT * FROM supply_donations WHERE grid_id=$1 ORDER BY created_at DESC', [gridId]);
      return rows;
    }
    const { rows } = await app.db.query('SELECT * FROM supply_donations ORDER BY created_at DESC');
    return rows;
  });
  app.post('/supply-donations', async (req, reply) => {
    const parsed = CreateSchema.safeParse(req.body);
    if (!parsed.success) return reply.status(400).send({ message: 'Invalid payload', issues: parsed.error.issues });
    if (!app.hasDecorator('db')) return reply.status(503).send({ message: 'DB not ready' });
    const id = randomUUID();
    const d = parsed.data;
    const name = (d.name || d.supply_name || '').trim();
    const unit = (d.unit || '件').trim();
    const donorParts = [d.donor_name, d.donor_phone, d.donor_email].filter(v => typeof v === 'string' && v.trim() !== '');
    const donor_contact = d.donor_contact || (donorParts.length ? donorParts.join(' / ') : null);
    // We currently ignore delivery_method/address/time/notes because schema for supply_donations table is minimal.
    const { rows } = await app.db.query('INSERT INTO supply_donations (id, grid_id, name, quantity, unit, donor_contact) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *', [id, d.grid_id, name, d.quantity, unit, donor_contact]);
    return reply.status(201).send(rows[0]);
  });
}