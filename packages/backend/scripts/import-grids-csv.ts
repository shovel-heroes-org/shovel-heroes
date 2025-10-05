import 'dotenv/config';
import { createReadStream } from 'fs';
import { stat } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { parse } from 'csv-parse';
import { randomUUID } from 'crypto';
import { createPool } from '../src/lib/db.js';

/**
 * CSV -> grids importer.
 * Usage:
 *   npm --workspace packages/backend run import:grids:csv -- \
 *     --file "imports/your.csv" \
 *     [--disaster <fallbackDisasterAreaId>] [--dry]
 *
 * CSV Header expected (order flexible):
 * code,grid_type,disaster_area_id,center_lat,center_lng,bounds,volunteer_needed,volunteer_registered,supplies_needed,grid_manager_id,meeting_point,risks_notes,contact_info,status,completion_photo,id,created_date,updated_date,created_by_id,created_by,is_sample
 * Extra columns ignored. Missing optional columns defaulted.
 * If id column empty, a UUID will be generated.
 * If disaster_area_id not resolvable and --disaster not provided, row is skipped.
 * bounds & supplies_needed must be JSON (object / array) or empty.
 */

interface GridCsvRowRaw { [k: string]: string | undefined }

interface ParsedRow {
  id: string;
  code: string;
  grid_type: string;
  disaster_area_id: string;
  center_lat: number;
  center_lng: number;
  volunteer_needed: number;
  volunteer_registered: number;
  meeting_point: string | null;
  risks_notes: string | null;
  contact_info: string | null;
  bounds: any | null;
  status: string;
  supplies_needed: any[] | null;
  grid_manager_id: string | null;
  completion_photo: string | null;
  created_by_id: string | null;
  created_by: string | null;
  is_sample: boolean;
  created_date?: string | null;
  updated_date?: string | null;
}

function parseJSONField(field?: string): any | null {
  if (!field) return null;
  const trimmed = field.trim();
  if (!trimmed) return null;
  try {
    return JSON.parse(trimmed);
  } catch (e) {
    console.warn('[warn] JSON parse failed:', trimmed.slice(0,120));
    return null;
  }
}

function coerceInt(v?: string): number {
  if (!v) return 0;
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : 0;
}

function coerceFloat(v?: string): number {
  if (!v) return 0;
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : 0;
}

function toBool(v?: string): boolean {
  if (!v) return false;
  const t = v.toLowerCase();
  return t === 'true' || t === '1' || t === 'yes';
}

async function ensureDisasterArea(pool: any, id: string) {
  if (!id) return false;
  const { rows } = await pool.query('SELECT id FROM disaster_areas WHERE id=$1', [id]);
  return !!rows[0];
}

async function upsertGrid(pool: any, r: ParsedRow) {
  await pool.query(`INSERT INTO grids (id,code,grid_type,disaster_area_id,volunteer_needed,volunteer_registered,meeting_point,risks_notes,contact_info,center_lat,center_lng,bounds,status,supplies_needed,grid_manager_id,completion_photo,created_by_id,created_by,is_sample,created_date,updated_date)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,COALESCE($20,NOW()),COALESCE($21,NOW()))
    ON CONFLICT (id) DO UPDATE SET
      code=EXCLUDED.code,grid_type=EXCLUDED.grid_type,disaster_area_id=EXCLUDED.disaster_area_id,volunteer_needed=EXCLUDED.volunteer_needed,volunteer_registered=EXCLUDED.volunteer_registered,
      meeting_point=EXCLUDED.meeting_point,risks_notes=EXCLUDED.risks_notes,contact_info=EXCLUDED.contact_info,center_lat=EXCLUDED.center_lat,center_lng=EXCLUDED.center_lng,
      bounds=EXCLUDED.bounds,status=EXCLUDED.status,supplies_needed=EXCLUDED.supplies_needed,grid_manager_id=EXCLUDED.grid_manager_id,completion_photo=EXCLUDED.completion_photo,
      created_by_id=EXCLUDED.created_by_id,created_by=EXCLUDED.created_by,is_sample=EXCLUDED.is_sample,updated_at=NOW(),updated_date=NOW()`,
    [r.id,r.code,r.grid_type,r.disaster_area_id,r.volunteer_needed,r.volunteer_registered,r.meeting_point,r.risks_notes,r.contact_info,r.center_lat,r.center_lng,r.bounds?JSON.stringify(r.bounds):null,r.status,r.supplies_needed?JSON.stringify(r.supplies_needed):null,r.grid_manager_id,r.completion_photo,r.created_by_id,r.created_by,r.is_sample,r.created_date,r.updated_date]
  );
}

async function main() {
  const args = process.argv.slice(2);
  let file = '';
  let fallbackDisaster = '';
  let dry = false;
  for (let i=0;i<args.length;i++) {
    const a = args[i];
    if (a === '--file') file = args[++i];
    else if (a === '--disaster') fallbackDisaster = args[++i];
    else if (a === '--dry') dry = true;
  }
  if (!file) {
    console.error('Missing --file <csvPath>');
    process.exit(1);
  }
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const ROOT = path.resolve(__dirname, '../../..');
  const abs = path.isAbsolute(file) ? file : path.join(ROOT, file);
  await stat(abs).catch(() => { console.error('File not found:', abs); process.exit(1); });

  const pool = createPool();
  console.log('[import:grids:csv] start file=', abs, 'dry=', dry);

  const parser = createReadStream(abs).pipe(parse({ columns: true, skip_empty_lines: true, trim: true }));
  let total = 0; let imported = 0; let skipped = 0;
  for await (const rec of parser as any as GridCsvRowRaw[]) {
    total++;
    try {
      const code = (rec.code||'').trim();
      const grid_type = (rec.grid_type||'').trim() || 'manpower';
      const disaster_area_id_raw = (rec.disaster_area_id||'').trim();
      let disaster_area_id = disaster_area_id_raw;
      if (!disaster_area_id) disaster_area_id = fallbackDisaster;
      if (!disaster_area_id) {
        console.warn(`[skip] row ${total} missing disaster_area_id and no fallback`);
        skipped++; continue;
      }
      const disasterExists = await ensureDisasterArea(pool, disaster_area_id);
      if (!disasterExists) {
        if (fallbackDisaster && fallbackDisaster !== disaster_area_id) {
          const fallbackExists = await ensureDisasterArea(pool, fallbackDisaster);
          if (fallbackExists) {
            disaster_area_id = fallbackDisaster;
          } else {
            console.warn(`[skip] row ${total} unknown disaster_area_id=${disaster_area_id}`);
            skipped++; continue;
          }
        } else {
          console.warn(`[skip] row ${total} unknown disaster_area_id=${disaster_area_id}`);
          skipped++; continue;
        }
      }

      const center_lat = coerceFloat(rec.center_lat);
      const center_lng = coerceFloat(rec.center_lng);
      if (!center_lat || !center_lng) {
        console.warn(`[skip] row ${total} invalid lat/lng`);
        skipped++; continue;
      }

      const bounds = parseJSONField(rec.bounds);
      const supplies_needed = parseJSONField(rec.supplies_needed);
      const volunteer_needed = coerceInt(rec.volunteer_needed);
      const volunteer_registered = coerceInt(rec.volunteer_registered);
      const status = (rec.status||'').trim() || 'open';
      const id = (rec.id||'').trim() || randomUUID();

      const row: ParsedRow = {
        id,
        code,
        grid_type,
        disaster_area_id,
        center_lat,
        center_lng,
        volunteer_needed,
        volunteer_registered,
        meeting_point: rec.meeting_point?.trim() || null,
        risks_notes: rec.risks_notes?.trim() || null,
        contact_info: rec.contact_info?.trim() || null,
        bounds,
        status,
        supplies_needed: Array.isArray(supplies_needed) ? supplies_needed : (supplies_needed ? [supplies_needed] : null),
        grid_manager_id: rec.grid_manager_id?.trim() || null,
        completion_photo: rec.completion_photo?.trim() || null,
        created_by_id: rec.created_by_id?.trim() || null,
        created_by: rec.created_by?.trim() || null,
        is_sample: toBool(rec.is_sample),
        created_date: rec.created_date?.trim() || null,
        updated_date: rec.updated_date?.trim() || null
      };

      if (dry) {
        console.log('[dry] would import', row.code, row.id);
        imported++; // count as processed
      } else {
        await upsertGrid(pool, row);
        imported++;
      }
    } catch (e: any) {
      console.warn('[error] row', total, e.message);
      skipped++;
    }
  }

  console.log(`[import:grids:csv] done total=${total} imported=${imported} skipped=${skipped}`);
  await pool.end();
}

main().catch(err => { console.error(err); process.exit(1); });
