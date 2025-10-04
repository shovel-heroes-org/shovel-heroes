import 'dotenv/config';
import { createPool } from '../src/lib/db.js';

/**
 * 清空資料庫所有表格的資料
 * 執行方式: npm --workspace packages/backend run clear:db
 */

async function clearDatabase() {
  const pool = createPool();
  console.log('[開始清空資料庫]');

  try {
    // 先停用外鍵約束檢查
    await pool.query('SET session_replication_role = replica;');

    // 清空所有表格
    const tables = [
      'grid_discussions',
      'supply_donations',
      'volunteer_registrations',
      'grids',
      'announcements',
      'disaster_areas',
      'users'
    ];

    for (const table of tables) {
      try {
        await pool.query(`TRUNCATE TABLE ${table} CASCADE`);
        console.log(`✓ 已清空: ${table}`);
      } catch (error) {
        console.warn(`⚠ 清空 ${table} 時發生錯誤:`, (error as any).message);
      }
    }

    // 重新啟用外鍵約束檢查
    await pool.query('SET session_replication_role = DEFAULT;');

    console.log('[資料庫清空完成]');
  } catch (error) {
    console.error('[錯誤]', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

clearDatabase();
