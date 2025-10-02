import type { FastifyInstance } from 'fastify';
import { createPool, attachDb } from './db.js';

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
  -- user_id is nullable to allow anonymous volunteer registrations
  -- Anonymous registrations must provide volunteer_name instead
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

-- Future-proof: ensure new columns exist if schema was created before this update
ALTER TABLE disaster_areas
  ADD COLUMN IF NOT EXISTS township TEXT,
  ADD COLUMN IF NOT EXISTS county TEXT,
  ADD COLUMN IF NOT EXISTS bounds JSONB,
  ADD COLUMN IF NOT EXISTS grid_size INTEGER,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS created_by_id TEXT,
  ADD COLUMN IF NOT EXISTS created_by TEXT,
  ADD COLUMN IF NOT EXISTS is_sample BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS created_date TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_date TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE grids
  ADD COLUMN IF NOT EXISTS completion_photo TEXT,
  ADD COLUMN IF NOT EXISTS created_by_id TEXT,
  ADD COLUMN IF NOT EXISTS created_by TEXT,
  ADD COLUMN IF NOT EXISTS is_sample BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS created_date TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_date TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE volunteer_registrations
  ADD COLUMN IF NOT EXISTS volunteer_name TEXT,
  ADD COLUMN IF NOT EXISTS volunteer_phone TEXT,
  ADD COLUMN IF NOT EXISTS volunteer_email TEXT,
  ADD COLUMN IF NOT EXISTS available_time TEXT,
  ADD COLUMN IF NOT EXISTS skills JSONB,
  ADD COLUMN IF NOT EXISTS equipment JSONB,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS check_in_time TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS created_by_id TEXT,
  ADD COLUMN IF NOT EXISTS created_by TEXT,
  ADD COLUMN IF NOT EXISTS is_sample BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS created_date TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_date TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE announcements
  ADD COLUMN IF NOT EXISTS content TEXT,
  ADD COLUMN IF NOT EXISTS category TEXT,
  ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS external_links JSONB,
  ADD COLUMN IF NOT EXISTS contact_phone TEXT,
  ADD COLUMN IF NOT EXISTS "order" INTEGER,
  ADD COLUMN IF NOT EXISTS created_by_id TEXT,
  ADD COLUMN IF NOT EXISTS created_by TEXT,
  ADD COLUMN IF NOT EXISTS is_sample BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS created_date TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_date TIMESTAMPTZ DEFAULT NOW();
`;

export async function initDb(app: FastifyInstance) {
  try {
    const pool = createPool();
    await pool.query(SCHEMA_SQL);
    await attachDb(app, pool);
    app.log.info('[db] connected & schema ensured');
  } catch (err) {
    app.log.warn({ err }, '[db] initialization failed – continuing without DB');
  }
}
