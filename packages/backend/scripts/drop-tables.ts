import 'dotenv/config';
import { createPool } from '../src/lib/db.js';

/**
 * 刪除資料庫中所有表格（包含結構）
 * 執行方式: npm --workspace packages/backend run drop:tables
 *
 * 警告：這會永久刪除所有表格和資料，無法復原！
 */

async function dropAllTables() {
  const pool = createPool();
  console.log('[開始刪除所有表格]');

  try {
    // 按照相依性的反向順序刪除表格
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
        await pool.query(`DROP TABLE IF EXISTS ${table} CASCADE`);
        console.log(`✓ 已刪除表格: ${table}`);
      } catch (error) {
        console.warn(`⚠ 刪除 ${table} 時發生錯誤:`, (error as any).message);
      }
    }

    console.log('[所有表格已刪除]');
  } catch (error) {
    console.error('[錯誤]', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

dropAllTables();
