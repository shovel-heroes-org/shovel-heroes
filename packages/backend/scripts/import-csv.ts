import 'dotenv/config';
import { readFile } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { createPool } from '../src/lib/db.js';

/**
 * CSV 資料匯入腳本
 * 從 CSV 檔案匯入資料到資料庫
 * 執行方式: npm --workspace packages/backend run import:csv
 */

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '../../..');
const CSV_DIR = path.join(ROOT, '..', 'drive-download-20251002T070003Z-1-001');

// 解析 CSV 行
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());

  return result;
}

// 讀取 CSV 檔案
async function readCSV(filename: string): Promise<any[]> {
  const filePath = path.join(CSV_DIR, filename);
  try {
    const content = await readFile(filePath, 'utf8');
    const lines = content.split('\n').filter(line => line.trim());

    if (lines.length === 0) {
      console.warn(`[警告] ${filename} 是空檔案`);
      return [];
    }

    const headers = parseCSVLine(lines[0]);
    const rows: any[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i]);
      if (values.length !== headers.length) {
        console.warn(`[警告] 第 ${i + 1} 行欄位數量不符: ${values.length} vs ${headers.length}`);
        continue;
      }

      const row: any = {};
      headers.forEach((header, index) => {
        const value = values[index];
        row[header] = value === '' ? null : value;
      });

      rows.push(row);
    }

    console.log(`[讀取] ${filename}: ${rows.length} 筆資料`);
    return rows;
  } catch (error) {
    console.error(`[錯誤] 無法讀取 ${filename}:`, error);
    return [];
  }
}

// 處理 CSV 中的 JSON 字串
function parseJsonString(str: string | null): any {
  if (!str) return null;
  try {
    // CSV 中的 JSON 可能被轉義，需要處理
    const cleaned = str.replace(/""/g, '"');
    return JSON.parse(cleaned);
  } catch (error) {
    console.warn(`[警告] JSON 解析失敗: ${str}`);
    return null;
  }
}

// 匯入災區資料
async function importDisasterAreas(pool: any): Promise<Set<string>> {
  const rows = await readCSV('DisasterArea.csv');
  const ids = new Set<string>();

  if (rows.length === 0) {
    console.warn('[匯入] 沒有災區資料');
    return ids;
  }

  console.log(`[匯入] 災區: ${rows.length} 筆`);

  for (const row of rows) {
    if (!row.id) continue;

    try {
      const bounds = parseJsonString(row.bounds);

      await pool.query(`
        INSERT INTO disaster_areas (
          id, name, township, county, center_lat, center_lng,
          bounds, grid_size, status, description,
          created_by_id, created_by, is_sample, created_date, updated_date
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, COALESCE($14, NOW()), COALESCE($15, NOW()))
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          township = EXCLUDED.township,
          county = EXCLUDED.county,
          center_lat = EXCLUDED.center_lat,
          center_lng = EXCLUDED.center_lng,
          bounds = EXCLUDED.bounds,
          grid_size = EXCLUDED.grid_size,
          status = EXCLUDED.status,
          description = EXCLUDED.description,
          updated_at = NOW(),
          updated_date = NOW()
      `, [
        row.id,
        row.name,
        row.township,
        row.county,
        parseFloat(row.center_lat) || 0,
        parseFloat(row.center_lng) || 0,
        bounds ? JSON.stringify(bounds) : null,
        row.grid_size ? parseInt(row.grid_size) : null,
        row.status || 'active',
        row.description,
        row.created_by_id,
        row.created_by,
        row.is_sample === 'true' || row.is_sample === '1',
        row.created_date,
        row.updated_date
      ]);

      ids.add(row.id);
    } catch (error) {
      console.error(`[錯誤] 匯入災區 ${row.id} 失敗:`, error);
    }
  }

  return ids;
}

// 匯入網格資料
async function importGrids(pool: any, knownDisasterIds: Set<string>) {
  const rows = await readCSV('Grid.csv');

  if (rows.length === 0) {
    console.warn('[匯入] 沒有網格資料');
    return;
  }

  console.log(`[匯入] 網格: ${rows.length} 筆`);

  for (const row of rows) {
    if (!row.id) continue;

    try {
      const bounds = parseJsonString(row.bounds);
      const suppliesNeeded = parseJsonString(row.supplies_needed);

      await pool.query(`
        INSERT INTO grids (
          id, code, grid_type, disaster_area_id,
          volunteer_needed, volunteer_registered,
          meeting_point, risks_notes, contact_info,
          center_lat, center_lng, bounds, status,
          supplies_needed, grid_manager_id, completion_photo,
          created_by_id, created_by, is_sample, created_date, updated_date
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, COALESCE($20, NOW()), COALESCE($21, NOW()))
        ON CONFLICT (id) DO UPDATE SET
          code = EXCLUDED.code,
          grid_type = EXCLUDED.grid_type,
          volunteer_needed = EXCLUDED.volunteer_needed,
          volunteer_registered = EXCLUDED.volunteer_registered,
          meeting_point = EXCLUDED.meeting_point,
          risks_notes = EXCLUDED.risks_notes,
          contact_info = EXCLUDED.contact_info,
          center_lat = EXCLUDED.center_lat,
          center_lng = EXCLUDED.center_lng,
          bounds = EXCLUDED.bounds,
          status = EXCLUDED.status,
          supplies_needed = EXCLUDED.supplies_needed,
          updated_at = NOW(),
          updated_date = NOW()
      `, [
        row.id,
        row.code,
        row.grid_type,
        row.disaster_area_id,
        row.volunteer_needed ? parseInt(row.volunteer_needed) : 0,
        row.volunteer_registered ? parseInt(row.volunteer_registered) : 0,
        row.meeting_point,
        row.risks_notes,
        row.contact_info,
        parseFloat(row.center_lat) || 0,
        parseFloat(row.center_lng) || 0,
        bounds ? JSON.stringify(bounds) : null,
        row.status || 'open',
        suppliesNeeded ? JSON.stringify(suppliesNeeded) : null,
        row.grid_manager_id,
        row.completion_photo,
        row.created_by_id,
        row.created_by,
        row.is_sample === 'true' || row.is_sample === '1',
        row.created_date,
        row.updated_date
      ]);
    } catch (error) {
      console.error(`[錯誤] 匯入網格 ${row.id} 失敗:`, error);
    }
  }
}

// 匯入志工報名資料
async function importVolunteerRegistrations(pool: any) {
  const rows = await readCSV('VolunteerRegistration.csv');

  if (rows.length === 0) {
    console.warn('[匯入] 沒有志工報名資料');
    return;
  }

  console.log(`[匯入] 志工報名: ${rows.length} 筆`);

  for (const row of rows) {
    if (!row.id) continue;

    try {
      const skills = parseJsonString(row.skills) || [];
      const equipment = parseJsonString(row.equipment) || [];

      await pool.query(`
        INSERT INTO volunteer_registrations (
          id, grid_id, user_id, volunteer_name, volunteer_phone,
          volunteer_email, available_time, skills, equipment,
          status, check_in_time, notes,
          created_by_id, created_by, is_sample, created_date, updated_date
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, COALESCE($16, NOW()), COALESCE($17, NOW()))
        ON CONFLICT (id) DO UPDATE SET
          volunteer_name = EXCLUDED.volunteer_name,
          volunteer_phone = EXCLUDED.volunteer_phone,
          volunteer_email = EXCLUDED.volunteer_email,
          available_time = EXCLUDED.available_time,
          status = EXCLUDED.status,
          updated_at = NOW(),
          updated_date = NOW()
      `, [
        row.id,
        row.grid_id,
        row.user_id,
        row.volunteer_name,
        row.volunteer_phone,
        row.volunteer_email,
        row.available_time,
        JSON.stringify(skills),
        JSON.stringify(equipment),
        row.status || 'pending',
        row.check_in_time,
        row.notes,
        row.created_by_id,
        row.created_by,
        row.is_sample === 'true' || row.is_sample === '1',
        row.created_date,
        row.updated_date
      ]);
    } catch (error) {
      console.error(`[錯誤] 匯入志工報名 ${row.id} 失敗:`, error);
    }
  }
}

// 匯入公告資料
async function importAnnouncements(pool: any) {
  const rows = await readCSV('Announcement.csv');

  if (rows.length === 0) {
    console.warn('[匯入] 沒有公告資料');
    return;
  }

  console.log(`[匯入] 公告: ${rows.length} 筆`);

  for (const row of rows) {
    if (!row.id) continue;

    try {
      await pool.query(`
        INSERT INTO announcements (
          id, title, body, content, category, is_pinned,
          external_links, contact_phone, "order",
          created_by_id, created_by, is_sample, created_date, updated_date
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, COALESCE($13, NOW()), COALESCE($14, NOW()))
        ON CONFLICT (id) DO UPDATE SET
          title = EXCLUDED.title,
          body = EXCLUDED.body,
          content = EXCLUDED.content,
          category = EXCLUDED.category,
          is_pinned = EXCLUDED.is_pinned,
          updated_date = NOW()
      `, [
        row.id,
        row.title,
        row.body || row.content,
        row.content,
        row.category,
        row.is_pinned === 'true' || row.is_pinned === '1',
        row.external_links || '[]',
        row.contact_phone,
        row.order ? parseInt(row.order) : null,
        row.created_by_id,
        row.created_by,
        row.is_sample === 'true' || row.is_sample === '1',
        row.created_date,
        row.updated_date
      ]);
    } catch (error) {
      console.error(`[錯誤] 匯入公告 ${row.id} 失敗:`, error);
    }
  }
}

// 匯入物資捐贈資料
async function importSupplyDonations(pool: any) {
  const rows = await readCSV('SupplyDonation.csv');

  if (rows.length === 0) {
    console.warn('[匯入] 沒有物資捐贈資料');
    return;
  }

  console.log(`[匯入] 物資捐贈: ${rows.length} 筆`);

  for (const row of rows) {
    if (!row.id) continue;

    try {
      const donorContactParts = [row.donor_name, row.donor_phone, row.donor_email].filter(Boolean);
      const donorContact = donorContactParts.join(' / ') || null;

      await pool.query(`
        INSERT INTO supply_donations (
          id, grid_id, name, quantity, unit, donor_contact, created_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, COALESCE($7, NOW()))
        ON CONFLICT (id) DO NOTHING
      `, [
        row.id,
        row.grid_id,
        row.supply_name || 'unknown',
        row.quantity ? parseInt(row.quantity) : 0,
        '件',
        donorContact,
        row.created_date
      ]);
    } catch (error) {
      console.error(`[錯誤] 匯入物資捐贈 ${row.id} 失敗:`, error);
    }
  }
}

// 匯入討論資料
async function importGridDiscussions(pool: any) {
  const rows = await readCSV('GridDiscussion.csv');

  if (rows.length === 0) {
    console.warn('[匯入] 沒有討論資料');
    return;
  }

  console.log(`[匯入] 討論: ${rows.length} 筆`);

  for (const row of rows) {
    if (!row.id) continue;

    try {
      // content 欄位是 NOT NULL，用 message 或預設值
      const content = row.message || '無內容';

      await pool.query(`
        INSERT INTO grid_discussions (
          id, grid_id, user_id, content, author_name, message, created_at, created_date
        )
        VALUES ($1, $2, $3, $4, $5, $6, COALESCE($7, NOW()), $8)
        ON CONFLICT (id) DO NOTHING
      `, [
        row.id,
        row.grid_id,
        row.user_id,
        content,
        row.author_name || '匿名',
        row.message,
        row.created_date,
        row.created_date
      ]);
    } catch (error) {
      console.error(`[錯誤] 匯入討論 ${row.id} 失敗:`, error);
    }
  }
}

// 初始化資料庫結構
async function initDatabase(pool: any) {
  console.log('[初始化資料庫]');

  const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS disaster_areas (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  township TEXT,
  county TEXT,
  center_lat DOUBLE PRECISION NOT NULL,
  center_lng DOUBLE PRECISION NOT NULL,
  bounds JSONB,
  grid_size INTEGER,
  status TEXT NOT NULL DEFAULT 'active',
  description TEXT,
  created_by_id TEXT,
  created_by TEXT,
  is_sample BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_date TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS grids (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL,
  grid_type TEXT NOT NULL,
  disaster_area_id TEXT NOT NULL REFERENCES disaster_areas(id) ON DELETE CASCADE,
  volunteer_needed INTEGER DEFAULT 0,
  volunteer_registered INTEGER DEFAULT 0,
  meeting_point TEXT,
  risks_notes TEXT,
  contact_info TEXT,
  center_lat DOUBLE PRECISION NOT NULL,
  center_lng DOUBLE PRECISION NOT NULL,
  bounds JSONB,
  status TEXT NOT NULL DEFAULT 'open',
  supplies_needed JSONB,
  grid_manager_id TEXT,
  completion_photo TEXT,
  created_by_id TEXT,
  created_by TEXT,
  is_sample BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_date TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS volunteer_registrations (
  id TEXT PRIMARY KEY,
  grid_id TEXT NOT NULL REFERENCES grids(id) ON DELETE CASCADE,
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  volunteer_name TEXT,
  volunteer_phone TEXT,
  volunteer_email TEXT,
  available_time TEXT,
  skills JSONB,
  equipment JSONB,
  status TEXT DEFAULT 'pending',
  check_in_time TIMESTAMPTZ,
  notes TEXT,
  created_by_id TEXT,
  created_by TEXT,
  is_sample BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_date TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS supply_donations (
  id TEXT PRIMARY KEY,
  grid_id TEXT NOT NULL REFERENCES grids(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  unit TEXT NOT NULL,
  donor_contact TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS grid_discussions (
  id TEXT PRIMARY KEY,
  grid_id TEXT NOT NULL REFERENCES grids(id) ON DELETE CASCADE,
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add missing columns if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='grid_discussions' AND column_name='author_name') THEN
    ALTER TABLE grid_discussions ADD COLUMN author_name TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='grid_discussions' AND column_name='message') THEN
    ALTER TABLE grid_discussions ADD COLUMN message TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='grid_discussions' AND column_name='created_date') THEN
    ALTER TABLE grid_discussions ADD COLUMN created_date TIMESTAMPTZ;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS announcements (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  content TEXT,
  category TEXT,
  is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
  external_links JSONB,
  contact_phone TEXT,
  "order" INTEGER,
  created_by_id TEXT,
  created_by TEXT,
  is_sample BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_date TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
  `;

  await pool.query(SCHEMA_SQL);
  console.log('[資料庫初始化完成]');
}

async function main() {
  const pool = createPool();
  console.log('[開始匯入]');

  try {
    // 先初始化資料庫
    await initDatabase(pool);

    const knownDisasterIds = await importDisasterAreas(pool);
    await importGrids(pool, knownDisasterIds);
    await importVolunteerRegistrations(pool);
    await importAnnouncements(pool);
    await importSupplyDonations(pool);
    await importGridDiscussions(pool);
  } catch (error) {
    console.error('[錯誤]', error);
    process.exit(1);
  } finally {
    await pool.end();
  }

  console.log('[匯入完成]');
}

main();
