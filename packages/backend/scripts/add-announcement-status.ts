import { config } from 'dotenv';
import { resolve } from 'path';
import { createPool } from '../src/lib/db.js';

// 載入環境變數
config({ path: resolve(process.cwd(), '../../.env') });

async function addAnnouncementStatus() {
  const pool = createPool();

  try {
    console.log('開始為 announcements 表新增 status 欄位...\n');

    // 檢查欄位是否已存在
    const { rows: existing } = await pool.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'announcements'
      AND column_name = 'status'
    `);

    if (existing.length > 0) {
      console.log('✅ status 欄位已存在，無需新增');
      await pool.end();
      process.exit(0);
      return;
    }

    // 新增 status 欄位
    console.log('新增 status 欄位...');
    await pool.query(`
      ALTER TABLE announcements
      ADD COLUMN status TEXT NOT NULL DEFAULT 'active'
    `);

    console.log('✅ 新增 status 欄位成功');

    // 新增索引以提升查詢效能
    console.log('建立 status 索引...');
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_announcements_status
      ON announcements(status)
    `);

    console.log('✅ 建立索引成功');

    // 驗證
    const { rows: verification } = await pool.query(`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns
      WHERE table_name = 'announcements'
      AND column_name = 'status'
    `);

    console.log('\n驗證結果：');
    console.log(`  欄位名稱: ${verification[0].column_name}`);
    console.log(`  資料類型: ${verification[0].data_type}`);
    console.log(`  預設值: ${verification[0].column_default}`);

    // 統計公告數量
    const { rows: counts } = await pool.query(`
      SELECT COUNT(*) as total
      FROM announcements
      WHERE status = 'active'
    `);

    console.log(`\n目前公告數量: ${counts[0].total}`);
    console.log('\n✅ 遷移完成！');

    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ 遷移失敗:', error);
    await pool.end();
    process.exit(1);
  }
}

addAnnouncementStatus();
