import type { FastifyInstance } from 'fastify';
import { randomUUID } from 'crypto';

export interface DisasterArea {
  id: string;
  name: string;
  township?: string | null;
  county?: string | null;
  center_lat: number;
  center_lng: number;
  bounds?: any;
  grid_size?: number | null;
  status?: string;
  description?: string | null;
  created_by_id?: string | null;
  created_by?: string | null;
  is_sample?: boolean;
  created_at: string;
  updated_at: string;
  created_date?: string;
  updated_date?: string;
}

export async function listDisasterAreas(app: FastifyInstance): Promise<DisasterArea[]> {
  if (!app.hasDecorator('db')) return [];
  const { rows } = await app.db.query<DisasterArea>('SELECT * FROM disaster_areas ORDER BY created_at DESC');
  return rows;
}

interface CreateInput {
  name: string;
  township?: string;
  county?: string;
  center_lat: number;
  center_lng: number;
  bounds?: any;
  grid_size?: number;
  status?: string;
  description?: string;
}

export async function createDisasterArea(app: FastifyInstance, input: CreateInput): Promise<DisasterArea> {
  if (!app.hasDecorator('db')) {
    const now = new Date().toISOString();
    return { id: randomUUID(), created_at: now, updated_at: now, ...input } as DisasterArea;
  }
  const id = randomUUID();
  const { rows } = await app.db.query<DisasterArea>(
    `INSERT INTO disaster_areas (id, name, township, county, center_lat, center_lng, bounds, grid_size, status, description)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
    [
      id,
      input.name,
      input.township || null,
      input.county || null,
      input.center_lat,
      input.center_lng,
      input.bounds ? JSON.stringify(input.bounds) : null,
      input.grid_size || null,
      input.status || 'active',
      input.description || null
    ]
  );
  return rows[0];
}

export async function getDisasterArea(app: FastifyInstance, id: string): Promise<DisasterArea | null> {
  if (!app.hasDecorator('db')) return null;
  const { rows } = await app.db.query<DisasterArea>('SELECT * FROM disaster_areas WHERE id=$1', [id]);
  return rows[0] || null;
}

interface UpdateInput {
  name?: string;
  township?: string;
  county?: string;
  center_lat?: number;
  center_lng?: number;
  bounds?: any;
  grid_size?: number;
  status?: string;
  description?: string;
}

export async function updateDisasterArea(app: FastifyInstance, id: string, input: UpdateInput): Promise<DisasterArea | null> {
  if (!app.hasDecorator('db')) return null;
  const fields: string[] = [];
  const values: any[] = [];
  let i = 1;
  for (const [k, v] of Object.entries(input)) {
    if (typeof v === 'undefined') continue;
    fields.push(`${k}=$${i++}`);
    if (k === 'bounds') {
      values.push(v ? JSON.stringify(v) : null);
    } else {
      values.push(v);
    }
  }
  if (!fields.length) {
    const existing = await getDisasterArea(app, id);
    return existing;
  }
  values.push(id);
  const { rows } = await app.db.query<DisasterArea>(
    `UPDATE disaster_areas SET ${fields.join(', ')}, updated_at=NOW() WHERE id=$${i} RETURNING *`,
    values
  );
  return rows[0] || null;
}

export async function deleteDisasterArea(app: FastifyInstance, id: string): Promise<boolean> {
  if (!app.hasDecorator('db')) return false;
  const { rowCount } = await (app.db as any).pool.query('DELETE FROM disaster_areas WHERE id=$1', [id]);
  return rowCount > 0;
}
