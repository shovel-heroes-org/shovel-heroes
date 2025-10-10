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
  line_sub TEXT UNIQUE,
  avatar_url TEXT,
  role TEXT DEFAULT 'user',
  is_blacklisted BOOLEAN DEFAULT FALSE,
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
  supply_name TEXT,
  quantity INTEGER NOT NULL,
  unit TEXT NOT NULL,
  donor_name TEXT,
  donor_phone TEXT,
  donor_email TEXT,
  donor_contact TEXT,
  delivery_method TEXT,
  delivery_address TEXT,
  delivery_time TEXT,
  notes TEXT,
  status TEXT DEFAULT 'pledged',
  created_by_id TEXT,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS grid_discussions (
  id TEXT PRIMARY KEY,
  grid_id TEXT NOT NULL REFERENCES grids(id) ON DELETE CASCADE,
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  author_name TEXT,
  author_role TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS announcements (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  content TEXT,
  category TEXT,
  priority TEXT DEFAULT 'normal',
  is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
  external_links JSONB,
  contact_phone TEXT,
  "order" INTEGER,
  status TEXT NOT NULL DEFAULT 'active',
  created_by_id TEXT,
  created_by TEXT,
  is_sample BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_date TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS admin_audit_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  user_role TEXT NOT NULL,
  line_id TEXT,
  line_name TEXT,
  action TEXT NOT NULL,
  action_type TEXT NOT NULL,
  resource_type TEXT,
  resource_id TEXT,
  details JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  method TEXT NOT NULL,
  path TEXT NOT NULL,
  query JSONB,
  ip TEXT,
  headers JSONB,
  status_code INT,
  error TEXT,
  duration_ms INT,
  request_body JSONB,
  response_body JSONB,
  user_id TEXT,
  resource_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
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
  ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'normal',
  ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS external_links JSONB,
  ADD COLUMN IF NOT EXISTS contact_phone TEXT,
  ADD COLUMN IF NOT EXISTS "order" INTEGER,
  ADD COLUMN IF NOT EXISTS created_by_id TEXT,
  ADD COLUMN IF NOT EXISTS created_by TEXT,
  ADD COLUMN IF NOT EXISTS is_sample BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS created_date TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_date TIMESTAMPTZ DEFAULT NOW();

-- Auth related additions (idempotent) for existing deployments upgrading schema
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS line_sub TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS avatar_url TEXT,
  ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user',
  ADD COLUMN IF NOT EXISTS is_blacklisted BOOLEAN DEFAULT FALSE;

-- New optional columns for discussions metadata
ALTER TABLE grid_discussions
  ADD COLUMN IF NOT EXISTS author_name TEXT,
  ADD COLUMN IF NOT EXISTS author_role TEXT;

-- Role permissions table for managing access control
CREATE TABLE IF NOT EXISTS role_permissions (
  id SERIAL PRIMARY KEY,
  role TEXT NOT NULL CHECK(role IN ('user', 'grid_manager', 'admin', 'super_admin', 'guest')),
  permission_key TEXT NOT NULL,
  permission_name TEXT NOT NULL,
  permission_category TEXT NOT NULL,
  can_view INTEGER NOT NULL DEFAULT 0,
  can_create INTEGER NOT NULL DEFAULT 0,
  can_edit INTEGER NOT NULL DEFAULT 0,
  can_delete INTEGER NOT NULL DEFAULT 0,
  can_manage INTEGER NOT NULL DEFAULT 0,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(role, permission_key)
);

CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON role_permissions(role);
CREATE INDEX IF NOT EXISTS idx_role_permissions_key ON role_permissions(permission_key);
CREATE INDEX IF NOT EXISTS idx_role_permissions_role_key ON role_permissions(role, permission_key);

-- Admin audit logs indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_user_id ON admin_audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_user_role ON admin_audit_logs(user_role);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_action_type ON admin_audit_logs(action_type);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_created_at ON admin_audit_logs(created_at DESC);

-- HTTP audit logs indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_path ON audit_logs(path);
CREATE INDEX IF NOT EXISTS idx_audit_logs_method ON audit_logs(method);
CREATE INDEX IF NOT EXISTS idx_audit_logs_status_code ON audit_logs(status_code);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
`;

export async function initDb(app: FastifyInstance) {
  try {
    const pool = createPool();
    await pool.query(SCHEMA_SQL);

    // 執行遷移：添加 supply_donations 欄位
    const { addSupplyDonationsFields } = await import('./migrations/add-supply-donations-fields.js');
    await addSupplyDonationsFields(pool);

    await attachDb(app, pool);
    app.log.info('[db] connected & schema ensured');
  } catch (err) {
    app.log.warn({ err }, '[db] initialization failed – continuing without DB');
  }
}
