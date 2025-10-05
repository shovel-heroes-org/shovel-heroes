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

async function checkUserRoles() {
  try {
    console.log('檢查使用者角色設定...\n');
    
    const { rows } = await pool.query(`
      SELECT id, name, email, role, created_at 
      FROM users 
      ORDER BY created_at DESC 
      LIMIT 20
    `);
    
    console.log(`找到 ${rows.length} 位使用者:\n`);
    
    rows.forEach((user, index) => {
      console.log(`${index + 1}. ${user.name || user.email}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Role: ${user.role || 'user (預設)'}`);
      console.log(`   ID: ${user.id}`);
      console.log('');
    });
    
  } catch (error) {
    console.error('檢查失敗:', error);
  } finally {
    await pool.end();
  }
}

checkUserRoles();
