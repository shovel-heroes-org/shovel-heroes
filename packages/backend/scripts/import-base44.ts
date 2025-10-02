import 'dotenv/config';
import { readFile } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { createPool } from '../src/lib/db.js';

/**
 * Legacy Base44 plan data import script.
 * Reads JSON entity export files under legacy-data/base44-plan and upserts into current schema tables.
 * Ids are preserved. Existing rows updated (updated_at / updated_date touched).
 * Run with: npm --workspace packages/backend run import:legacy
 */

interface Bounds { north: number; south: number; east: number; west: number }
interface SupplyNeed { name: string; quantity: number; unit: string; received?: number }

interface DisasterAreaLegacy {
  id: string; name: string; township?: string; county?: string; center_lat: number; center_lng: number;
  bounds?: Bounds; grid_size?: number; status?: string; description?: string;
  created_by_id?: string; created_by?: string; is_sample?: boolean; created_date?: string; updated_date?: string;
}
interface GridLegacy {
  id: string; code: string; grid_type: string; disaster_area_id: string;
  volunteer_needed?: number; volunteer_registered?: number; meeting_point?: string | null;
  risks_notes?: string | null; contact_info?: string | null; center_lat: number; center_lng: number;
  bounds?: Bounds; status?: string; supplies_needed?: SupplyNeed[]; grid_manager_id?: string | null;
  completion_photo?: string | null; created_by_id?: string; created_by?: string; is_sample?: boolean;
  created_date?: string; updated_date?: string;
}
interface VolunteerRegistrationLegacy {
  id: string; grid_id: string; user_id?: string | null; volunteer_name?: string | null; volunteer_phone?: string | null;
  volunteer_email?: string | null; available_time?: string | null; skills?: unknown[]; equipment?: unknown[];
  status?: string | null; check_in_time?: string | null; notes?: string | null;
  created_by_id?: string; created_by?: string; is_sample?: boolean; created_date?: string; updated_date?: string;
}
interface AnnouncementLegacy {
  id: string; title: string; content: string; category?: string | null; is_pinned?: boolean; external_links?: any[];
  contact_phone?: string | null; order?: number | null; created_by_id?: string; created_by?: string; is_sample?: boolean;
  created_date?: string; updated_date?: string;
}
interface SupplyDonationLegacy {
  id: string; grid_id: string; donor_name: string; donor_phone?: string | null; donor_email?: string | null;
  supply_name: string; quantity: number; delivery_method?: string | null; delivery_address?: string | null; delivery_time?: string | null;
  status?: string | null; received_photo?: string | null; notes?: string | null; created_by_id?: string; created_by?: string; is_sample?: boolean;
  created_date?: string; updated_date?: string;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '../../..');
const LEGACY_DIR = path.join(ROOT, 'legacy-data', 'base44-plan');

async function readJson<T>(file: string): Promise<T[]> {
  const full = path.join(LEGACY_DIR, file);
  try {
    const raw = await readFile(full, 'utf8');
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed?.data)) return parsed.data as T[];
    console.warn(`[warn] ${file} has no data[]`);
    return [];
  } catch (e) {
    console.warn(`[skip] Cannot read ${file}:`, (e as any).message);
    return [];
  }
}

function toTs(t?: string) { return t ? new Date(t) : undefined; }

async function importDisasterAreas(pool: any): Promise<Set<string>> {
  const rows = await readJson<DisasterAreaLegacy>('entity-DisasterArea.json');
  const ids = new Set<string>();
  if (!rows.length) {
    console.warn('[import] no disaster areas in legacy file');
    return ids;
  }
  console.log(`Importing disaster_areas: ${rows.length}`);
  for (const r of rows) {
    await pool.query(`INSERT INTO disaster_areas (id,name,township,county,center_lat,center_lng,bounds,grid_size,status,description,created_by_id,created_by,is_sample,created_date,updated_date)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,COALESCE($14,NOW()),COALESCE($15,NOW()))
      ON CONFLICT (id) DO UPDATE SET 
        name=EXCLUDED.name,township=EXCLUDED.township,county=EXCLUDED.county,center_lat=EXCLUDED.center_lat,center_lng=EXCLUDED.center_lng,
        bounds=EXCLUDED.bounds,grid_size=EXCLUDED.grid_size,status=EXCLUDED.status,description=EXCLUDED.description,
        created_by_id=EXCLUDED.created_by_id,created_by=EXCLUDED.created_by,is_sample=EXCLUDED.is_sample,updated_at=NOW(),updated_date=NOW()`,
      [r.id, r.name, r.township||null, r.county||null, r.center_lat, r.center_lng, r.bounds?JSON.stringify(r.bounds):null, r.grid_size||null, r.status||'active', r.description||null, r.created_by_id||null, r.created_by||null, r.is_sample||false, r.created_date, r.updated_date]
    );
    ids.add(r.id);
  }
  return ids;
}

async function importGrids(pool: any, knownDisasterIds: Set<string>) {
  const rows = await readJson<GridLegacy>('entity-Grid.json');
  if (!rows.length) return;
  console.log(`Importing grids: ${rows.length}`);
  const createdPlaceholderIds = new Set<string>();
  for (const r of rows) {
    if (!knownDisasterIds.has(r.disaster_area_id)) {
      // Create placeholder disaster area so FK passes. Use first grid lat/lng referencing it.
      if (!createdPlaceholderIds.has(r.disaster_area_id)) {
        const placeholderName = r.disaster_area_id === 'unknown_disaster_area' ? '未知災區' : `匯入未知災區 ${r.disaster_area_id.slice(-6)}`;
        await pool.query(`INSERT INTO disaster_areas (id,name,center_lat,center_lng,status,created_by,is_sample,created_date,updated_date)
          VALUES ($1,$2,$3,$4,'active','legacy-import',false,NOW(),NOW())
          ON CONFLICT (id) DO NOTHING`,
          [r.disaster_area_id, placeholderName, r.center_lat, r.center_lng]
        );
        knownDisasterIds.add(r.disaster_area_id);
        createdPlaceholderIds.add(r.disaster_area_id);
        console.log(`[import] created placeholder disaster_area ${r.disaster_area_id}`);
      }
    }
    await pool.query(`INSERT INTO grids (id,code,grid_type,disaster_area_id,volunteer_needed,volunteer_registered,meeting_point,risks_notes,contact_info,center_lat,center_lng,bounds,status,supplies_needed,grid_manager_id,completion_photo,created_by_id,created_by,is_sample,created_date,updated_date)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,COALESCE($20,NOW()),COALESCE($21,NOW()))
      ON CONFLICT (id) DO UPDATE SET 
        code=EXCLUDED.code,grid_type=EXCLUDED.grid_type,disaster_area_id=EXCLUDED.disaster_area_id,volunteer_needed=EXCLUDED.volunteer_needed,volunteer_registered=EXCLUDED.volunteer_registered,
        meeting_point=EXCLUDED.meeting_point,risks_notes=EXCLUDED.risks_notes,contact_info=EXCLUDED.contact_info,center_lat=EXCLUDED.center_lat,center_lng=EXCLUDED.center_lng,
        bounds=EXCLUDED.bounds,status=EXCLUDED.status,supplies_needed=EXCLUDED.supplies_needed,grid_manager_id=EXCLUDED.grid_manager_id,completion_photo=EXCLUDED.completion_photo,
        created_by_id=EXCLUDED.created_by_id,created_by=EXCLUDED.created_by,is_sample=EXCLUDED.is_sample,updated_at=NOW(),updated_date=NOW()`,
      [r.id,r.code,r.grid_type,r.disaster_area_id,r.volunteer_needed||0,r.volunteer_registered||0,r.meeting_point||null,r.risks_notes||null,r.contact_info||null,r.center_lat,r.center_lng,r.bounds?JSON.stringify(r.bounds):null,r.status||'open',r.supplies_needed?JSON.stringify(r.supplies_needed):null,r.grid_manager_id||null,r.completion_photo||null,r.created_by_id||null,r.created_by||null,r.is_sample||false,r.created_date,r.updated_date]
    );
  }
}

async function importVolunteerRegistrations(pool: any) {
  const rows = await readJson<VolunteerRegistrationLegacy>('entity-VolunteerRegistration.json');
  if (!rows.length) return;
  console.log(`Importing volunteer_registrations: ${rows.length}`);
  // Preload existing grid ids
  const existingGridsRes = await pool.query('SELECT id FROM grids');
  const existingGridIds = new Set<string>(existingGridsRes.rows.map((r: any) => r.id));
  for (const r of rows) {
    if (!existingGridIds.has(r.grid_id)) {
      // Create minimal placeholder grid linked to first known disaster area (or a generic one)
      const disasterAreaRow = await pool.query('SELECT id, center_lat, center_lng FROM disaster_areas LIMIT 1');
      const da = disasterAreaRow.rows[0];
      const centerLat = da?.center_lat || 0;
      const centerLng = da?.center_lng || 0;
      await pool.query(`INSERT INTO grids (id,code,grid_type,disaster_area_id,center_lat,center_lng,status,volunteer_needed,volunteer_registered,created_by,is_sample,created_date,updated_date)
        VALUES ($1,$2,'unknown','unknown_disaster_area',$3,$4,'open',0,0,'legacy-import',false,NOW(),NOW())
        ON CONFLICT (id) DO NOTHING`, [r.grid_id, `placeholder-${r.grid_id.slice(-6)}`, centerLat, centerLng]);
      existingGridIds.add(r.grid_id);
      // Ensure the placeholder disaster area exists if not
      await pool.query(`INSERT INTO disaster_areas (id,name,center_lat,center_lng,status,created_by,is_sample,created_date,updated_date)
        VALUES ('unknown_disaster_area','未知災區',0,0,'active','legacy-import',false,NOW(),NOW())
        ON CONFLICT (id) DO NOTHING`);
    }
    await pool.query(`INSERT INTO volunteer_registrations (id,grid_id,user_id,volunteer_name,volunteer_phone,volunteer_email,available_time,skills,equipment,status,check_in_time,notes,created_by_id,created_by,is_sample,created_date,updated_date)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,COALESCE($16,NOW()),COALESCE($17,NOW()))
      ON CONFLICT (id) DO UPDATE SET 
        grid_id=EXCLUDED.grid_id,user_id=EXCLUDED.user_id,volunteer_name=EXCLUDED.volunteer_name,volunteer_phone=EXCLUDED.volunteer_phone,volunteer_email=EXCLUDED.volunteer_email,
        available_time=EXCLUDED.available_time,skills=EXCLUDED.skills,equipment=EXCLUDED.equipment,status=EXCLUDED.status,check_in_time=EXCLUDED.check_in_time,notes=EXCLUDED.notes,
        created_by_id=EXCLUDED.created_by_id,created_by=EXCLUDED.created_by,is_sample=EXCLUDED.is_sample,updated_at=NOW(),updated_date=NOW()`,
      [r.id,r.grid_id,r.user_id||null,r.volunteer_name||null,r.volunteer_phone||null,r.volunteer_email||null,r.available_time||null,JSON.stringify(r.skills||[]),JSON.stringify(r.equipment||[]),r.status||'pending',r.check_in_time||null,r.notes||null,r.created_by_id||null,r.created_by||null,r.is_sample||false,r.created_date,r.updated_date]
    );
  }
}

async function importAnnouncements(pool: any) {
  const rows = await readJson<AnnouncementLegacy>('entity-Announcement.json');
  if (!rows.length) return;
  console.log(`Importing announcements: ${rows.length}`);
  for (const r of rows) {
    await pool.query(`INSERT INTO announcements (id,title,body,content,category,is_pinned,external_links,contact_phone,"order",created_by_id,created_by,is_sample,created_date,updated_date)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,COALESCE($13,NOW()),COALESCE($14,NOW()))
      ON CONFLICT (id) DO UPDATE SET 
        title=EXCLUDED.title,body=EXCLUDED.body,content=EXCLUDED.content,category=EXCLUDED.category,is_pinned=EXCLUDED.is_pinned,external_links=EXCLUDED.external_links,contact_phone=EXCLUDED.contact_phone,"order"=EXCLUDED."order",
        created_by_id=EXCLUDED.created_by_id,created_by=EXCLUDED.created_by,is_sample=EXCLUDED.is_sample,updated_date=NOW()`,
      [r.id,r.title,r.content,r.content,r.category||null,r.is_pinned||false,JSON.stringify(r.external_links||[]),r.contact_phone||null,r.order||null,r.created_by_id||null,r.created_by||null,r.is_sample||false,r.created_date,r.updated_date]
    );
  }
}

async function importSupplyDonations(pool: any) {
  const rows = await readJson<SupplyDonationLegacy>('entity-SupplyDonation.json');
  if (!rows.length) return;
  console.log(`Importing supply_donations (mapped subset): ${rows.length}`);
  // Current schema only supports: id, grid_id, name, quantity, unit, donor_contact
  const existingGridsRes = await pool.query('SELECT id FROM grids');
  const existingGridIds = new Set<string>(existingGridsRes.rows.map((r: any) => r.id));
  for (const r of rows) {
    if (!existingGridIds.has(r.grid_id)) {
      const daRow = await pool.query('SELECT id, center_lat, center_lng FROM disaster_areas LIMIT 1');
      const da = daRow.rows[0];
      await pool.query(`INSERT INTO grids (id,code,grid_type,disaster_area_id,center_lat,center_lng,status,volunteer_needed,volunteer_registered,created_by,is_sample,created_date,updated_date)
        VALUES ($1,$2,'unknown','unknown_disaster_area',$3,$4,'open',0,0,'legacy-import',false,NOW(),NOW())
        ON CONFLICT (id) DO NOTHING`, [r.grid_id, `supply-placeholder-${r.grid_id.slice(-6)}`, da?.center_lat||0, da?.center_lng||0]);
      existingGridIds.add(r.grid_id);
      await pool.query(`INSERT INTO disaster_areas (id,name,center_lat,center_lng,status,created_by,is_sample,created_date,updated_date)
        VALUES ('unknown_disaster_area','未知災區',0,0,'active','legacy-import',false,NOW(),NOW())
        ON CONFLICT (id) DO NOTHING`);
    }
    const name = r.supply_name || 'unknown';
    const unit = '件';
    const donor_contactParts = [r.donor_name, r.donor_phone, r.donor_email].filter(Boolean);
    const donor_contact = donor_contactParts.join(' / ') || null;
    await pool.query(`INSERT INTO supply_donations (id,grid_id,name,quantity,unit,donor_contact,created_at)
      VALUES ($1,$2,$3,$4,$5,$6,COALESCE($7,NOW()))
      ON CONFLICT (id) DO NOTHING`,
      [r.id, r.grid_id, name, r.quantity || 0, unit, donor_contact, r.created_date]
    );
  }
}

async function main() {
  const pool = createPool();
  console.log('[import] starting');
  try {
    const known = await importDisasterAreas(pool);
    await importGrids(pool, known);
    await importVolunteerRegistrations(pool);
    await importAnnouncements(pool);
    await importSupplyDonations(pool);
  } finally {
    await pool.end();
  }
  console.log('[import] done');
}

main().catch(err => { console.error(err); process.exit(1); });
