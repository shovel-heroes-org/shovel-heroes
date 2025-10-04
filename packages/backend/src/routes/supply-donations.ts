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
        SELECT
          sd.id, sd.grid_id, sd.name, sd.supply_name, sd.quantity, sd.unit,
          sd.donor_name, sd.donor_phone, sd.donor_email, sd.donor_contact,
          sd.delivery_method, sd.delivery_address, sd.delivery_time, sd.notes, sd.status,
          sd.created_by_id, sd.created_by,
          sd.created_at, sd.created_at as created_date,
          g.created_by_id as grid_creator_id
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
      SELECT
        sd.id, sd.grid_id, sd.name, sd.supply_name, sd.quantity, sd.unit,
        sd.donor_name, sd.donor_phone, sd.donor_email, sd.donor_contact,
        sd.delivery_method, sd.delivery_address, sd.delivery_time, sd.notes, sd.status,
        sd.created_by_id, sd.created_by,
        sd.created_at, sd.created_at as created_date,
        g.created_by_id as grid_creator_id
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

    // 存儲完整的捐贈資訊，包括所有欄位
    const { rows } = await app.db.query(
      `INSERT INTO supply_donations
        (id, grid_id, name, supply_name, quantity, unit,
         donor_name, donor_phone, donor_email, donor_contact,
         delivery_method, delivery_address, delivery_time, notes, status,
         created_by_id, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
       RETURNING *, created_at as created_date`,
      [
        id,
        d.grid_id,
        name,
        d.supply_name || name,
        d.quantity,
        unit,
        d.donor_name || null,
        d.donor_phone || null,
        d.donor_email || null,
        donor_contact,
        d.delivery_method || null,
        d.delivery_address || null,
        d.delivery_time || null,
        d.notes || null,
        'pledged',
        req.user?.id || null,
        req.user?.name || null
      ]
    );
    return reply.status(201).send(rows[0]);
  });

  // 更新物資捐贈狀態
  // Status lifecycle: pledged -> confirmed -> delivered -> received
  // Exit: pledged/confirmed -> cancelled
  app.put('/supply-donations/:id', async (req, reply) => {
    if (!req.user) return reply.status(401).send({ message: 'Unauthorized' });
    if (!app.hasDecorator('db')) return reply.status(503).send({ message: 'DB not ready' });
    const { id } = req.params as any;
    const { status } = (req.body as any) || {};

    const allowed = ['pledged', 'confirmed', 'delivered', 'received', 'cancelled'];
    if (!status || !allowed.includes(status)) {
      return reply.status(400).send({ message: 'Invalid or missing status' });
    }

    // 取得捐贈記錄和網格擁有者資訊
    const { rows: existingRows } = await app.db.query(
      `SELECT sd.*, g.created_by_id AS grid_creator_id, g.grid_manager_id AS grid_manager_id
       FROM supply_donations sd
       LEFT JOIN grids g ON g.id = sd.grid_id
       WHERE sd.id = $1`, [id]
    );
    const existing = existingRows[0];
    if (!existing) return reply.status(404).send({ message: 'Not found' });

    const currentStatus = existing.status || 'pledged';
    const userId = req.user.id;
    const isDonorSelf = existing.created_by_id === userId;
    const isGridCreator = existing.grid_creator_id === userId;
    const isGridManager = existing.grid_manager_id === userId;
    const isAdmin = ['admin', 'super_admin'].includes(req.user.role || '');
    const isPrivileged = isAdmin || isGridCreator || isGridManager;

    // 狀態轉換規則
    function canTransition(from: string, to: string) {
      if (from === to) return true;
      if (from === 'pledged') return ['confirmed', 'cancelled'].includes(to);
      if (from === 'confirmed') return ['delivered', 'cancelled'].includes(to);
      if (from === 'delivered') return ['received'].includes(to);
      return false; // received and cancelled are terminal
    }

    if (!canTransition(currentStatus, status)) {
      return reply.status(400).send({ message: 'Illegal status transition' });
    }

    // 權限規則
    // A (Grid Creator), B (Donor), C (Admin) 都可以調整狀態
    // - 捐贈者本人 (B) 可以取消自己的捐贈
    // - 網格建立者 (A) 可以確認、標記為已送達、已收到
    // - 管理員可以進行所有操作
    if (status === 'cancelled') {
      if (!(isDonorSelf || isPrivileged)) {
        return reply.status(403).send({ message: 'Forbidden - Only donor or grid owner can cancel' });
      }
    } else if (['confirmed', 'delivered', 'received'].includes(status)) {
      if (!isPrivileged) {
        return reply.status(403).send({ message: 'Forbidden - Only grid owner or admin can update status' });
      }
    }

    const { rows: updatedRows } = await app.db.query(
      'UPDATE supply_donations SET status=$2, updated_at=NOW() WHERE id=$1 RETURNING *, created_at as created_date',
      [id, status]
    );

    return updatedRows[0];
  });

  // 刪除物資捐贈
  app.delete('/supply-donations/:id', async (req, reply) => {
    if (!req.user) return reply.status(401).send({ message: 'Unauthorized' });
    if (!app.hasDecorator('db')) return reply.status(503).send({ message: 'DB not ready' });
    const { id } = req.params as any;

    // 檢查權限：只有管理員、網格建立者或捐贈者本人可以刪除
    const { rows: existingRows } = await app.db.query(
      `SELECT sd.*, g.created_by_id AS grid_creator_id
       FROM supply_donations sd
       LEFT JOIN grids g ON g.id = sd.grid_id
       WHERE sd.id = $1`, [id]
    );

    if (existingRows.length === 0) {
      return reply.status(404).send({ message: 'Not found' });
    }

    const existing = existingRows[0];
    const userId = req.user.id;
    const isDonorSelf = existing.created_by_id === userId;
    const isGridCreator = existing.grid_creator_id === userId;
    const isAdmin = ['admin', 'super_admin'].includes(req.user.role || '');

    if (!(isDonorSelf || isGridCreator || isAdmin)) {
      return reply.status(403).send({ message: 'Forbidden - Only donor, grid owner, or admin can delete' });
    }

    await app.db.query('DELETE FROM supply_donations WHERE id=$1', [id]);
    return reply.status(204).send();
  });
}