import type { FastifyInstance } from 'fastify';
import { randomUUID } from 'crypto';

export function registerFunctionRoutes(app: FastifyInstance) {
  app.post('/functions/fix-grid-bounds', async () => ({ done: true }));

  app.get('/functions/export-grids-csv', async (req, reply) => {
    if (!app.hasDecorator('db')) return reply.type('text/csv; charset=utf-8').send('\uFEFFid,code\n');
    const { rows } = await app.db.query('SELECT id, code, grid_type, disaster_area_id, status FROM grids ORDER BY created_at ASC');
    const header = 'id,code,grid_type,disaster_area_id,status';
    const lines = rows.map(r => [r.id, r.code, r.grid_type, r.disaster_area_id, r.status].map(v => `"${(v||'').toString().replace(/"/g,'""')}"`).join(','));
    const csvWithBOM = '\uFEFF' + [header, ...lines].join('\n');
    return reply.type('text/csv; charset=utf-8').send(csvWithBOM);
  });

  app.get('/functions/grid-template', async (req, reply) => {
    const header = 'code,grid_type,disaster_area_id,center_lat,center_lng';
    const csvWithBOM = '\uFEFF' + header + '\n';
    return reply.type('text/csv; charset=utf-8').send(csvWithBOM);
  });

  app.post('/functions/import-grids-csv', async (req, reply) => {
    const body = req.body as any;
    const csv: string | undefined = body?.csv;
    if (!csv) return reply.status(400).send({ message: 'csv missing' });
    if (!app.hasDecorator('db')) return { imported: 0 };
    const lines = csv.split(/\r?\n/).filter(l => l.trim());
    const [headerLine, ...dataLines] = lines;
    const headers = headerLine.split(',');
    let count = 0;
    for (const line of dataLines) {
      const cols = line.split(',');
      const rec: Record<string,string> = {};
      headers.forEach((h,i)=> rec[h.trim()] = (cols[i]||'').replace(/^"|"$/g,''));
      if (!rec.code) continue;
      const id = randomUUID();
      await app.db.query('INSERT INTO grids (id, code, grid_type, disaster_area_id, center_lat, center_lng) VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (id) DO NOTHING', [id, rec.code, rec.grid_type||'manpower', rec.disaster_area_id, Number(rec.center_lat)||0, Number(rec.center_lng)||0]);
      count++;
    }
    return { imported: count };
  });

  app.post('/functions/external-grid-api', async (req) => ({ ok: true, echo: req.body }));
  app.post('/functions/external-volunteer-api', async (req) => ({ ok: true, echo: req.body }));
}