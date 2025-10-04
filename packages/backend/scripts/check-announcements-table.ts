import { config } from 'dotenv';
import { resolve } from 'path';
import { createPool } from '../src/lib/db.js';

// 載入環境變數
config({ path: resolve(process.cwd(), '../../.env') });

async function checkAnnouncementsTable() {
  const pool = createPool();

  try {
    console.log('檢查 announcements 表結構...\n');

    // 查詢表結構
    const { rows: columns } = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'announcements'
      ORDER BY ordinal_position
    `);

    console.log('欄位列表：');
    columns.forEach((col: any) => {
      console.log(`  ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? 'NOT NULL' : ''} ${col.column_default ? `DEFAULT ${col.column_default}` : ''}`);
    });

    // 查詢公告數量
    const { rows: counts } = await pool.query(`
      SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'active') as active,
        COUNT(*) FILTER (WHERE status = 'deleted') as deleted
      FROM announcements
    `);

    console.log('\n公告統計：');
    console.log(`  總數: ${counts[0].total}`);
    console.log(`  啟用: ${counts[0].active}`);
    console.log(`  已刪除: ${counts[0].deleted}`);

    // 查詢一筆測試資料
    const { rows: sample } = await pool.query(`
      SELECT id, title, status
      FROM announcements
      WHERE status = 'active'
      LIMIT 1
    `);

    if (sample.length > 0) {
      console.log('\n範例資料：');
      console.log(`  ID: ${sample[0].id}`);
      console.log(`  標題: ${sample[0].title}`);
      console.log(`  狀態: ${sample[0].status}`);
    }

    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('檢查失敗:', error);
    await pool.end();
    process.exit(1);
  }
}

checkAnnouncementsTable();
