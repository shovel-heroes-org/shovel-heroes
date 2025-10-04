import type { FastifyInstance } from 'fastify';
import { randomUUID } from 'crypto';
import { z } from 'zod';
import { filterDonationPrivacy, filterDonationsPrivacy } from '../lib/privacy-filter.js';

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
      // 取得物資捐贈資料和網格建立者資訊
      const { rows } = await app.db.query(`
        SELECT sd.*, g.created_by_id as grid_creator_id
        FROM supply_donations sd
        LEFT JOIN grids g ON g.id = sd.grid_id
        WHERE sd.grid_id = $1
        ORDER BY sd.created_at DESC
      `, [gridId]);

      // 取得網格建立者 ID
      const gridCreatorId = rows.length > 0 ? rows[0].grid_creator_id : undefined;

      // 過濾隱私資訊
      const filtered = filterDonationsPrivacy(rows, req.user || null, gridCreatorId);
      return filtered;
    }

    // 取得所有物資捐贈（需要分別處理每個網格的隱私）
    const { rows } = await app.db.query(`
      SELECT sd.*, g.created_by_id as grid_creator_id
      FROM supply_donations sd
      LEFT JOIN grids g ON g.id = sd.grid_id
      ORDER BY sd.created_at DESC
    `);

    // 按網格過濾隱私
    const filtered = rows.map(row => {
      return filterDonationPrivacy(row, req.user || null, row.grid_creator_id);
    });

    return filtered;
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