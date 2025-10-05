import { config } from 'dotenv';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '../../..');

config({ path: join(rootDir, '.env') });

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function checkVolunteerPermissions() {
  try {
    console.log('檢查志工權限設定...\n');

    const { rows } = await pool.query(`
      SELECT role, permission_key, can_view, can_manage, can_edit, can_delete, can_create
      FROM role_permissions
      WHERE permission_key IN ('volunteers', 'volunteer_registrations')
      ORDER BY permission_key, role
    `);

    console.log(`找到 ${rows.length} 筆志工相關權限:\n`);

    rows.forEach((perm) => {
      console.log(`[${perm.role}] ${perm.permission_key}`);
      console.log(`  can_view: ${perm.can_view}`);
      console.log(`  can_create: ${perm.can_create}`);
      console.log(`  can_edit: ${perm.can_edit}`);
      console.log(`  can_delete: ${perm.can_delete}`);
      console.log(`  can_manage: ${perm.can_manage}`);
      console.log('');
    });

  } catch (error) {
    console.error('檢查失敗:', error);
  } finally {
    await pool.end();
  }
}

checkVolunteerPermissions();
