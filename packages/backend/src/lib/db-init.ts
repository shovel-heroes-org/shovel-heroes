import type { FastifyInstance } from 'fastify';
import { createPool, attachDb } from './db.js';

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS disaster_areas (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  center_lat DOUBLE PRECISION NOT NULL,
  center_lng DOUBLE PRECISION NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
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
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS volunteer_registrations (
  id TEXT PRIMARY KEY,
  grid_id TEXT NOT NULL REFERENCES grids(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
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
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
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
