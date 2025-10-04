import { Pool } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/shovel_heroes'
});

async function verifyPriorityColumn() {
  try {
    console.log('🔍 驗證 announcements 表的 priority 欄位...\n');

    // 檢查欄位是否存在
    console.log('步驟 1: 檢查 priority 欄位是否存在...');
    const { rows: columns } = await pool.query(`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns
      WHERE table_name = 'announcements'
      AND column_name = 'priority'
    `);

    if (columns.length === 0) {
      console.log('❌ priority 欄位不存在！');
      return;
    }

    console.log('✅ priority 欄位存在');
    console.log(`   資料型別: ${columns[0].data_type}`);
    console.log(`   預設值: ${columns[0].column_default}`);
    console.log('');

    // 檢查現有資料的 priority 值
    console.log('步驟 2: 檢查現有公告資料的 priority 值...');
    const { rows: announcements } = await pool.query(`
      SELECT id, title, priority, status
      FROM announcements
      WHERE status != 'deleted'
      ORDER BY created_at DESC
      LIMIT 5
    `);

    console.log(`找到 ${announcements.length} 筆公告資料\n`);

    if (announcements.length > 0) {
      announcements.forEach((ann, i) => {
        console.log(`${i + 1}. ${ann.title}`);
        console.log(`   Priority: ${ann.priority || '(NULL)'}`);
        console.log(`   Status: ${ann.status}`);
        console.log('');
      });
    }

    // 統計 priority 值分布
    console.log('步驟 3: 統計 priority 值分布...');
    const { rows: stats } = await pool.query(`
      SELECT
        priority,
        COUNT(*) as count
      FROM announcements
      WHERE status != 'deleted'
      GROUP BY priority
      ORDER BY count DESC
    `);

    console.log('Priority 值分布：');
    stats.forEach(stat => {
      console.log(`  ${stat.priority || '(NULL)'}: ${stat.count} 筆`);
    });
    console.log('');

    // 測試 CSV 匯出查詢
    console.log('步驟 4: 測試 CSV 匯出查詢...');
    try {
      const { rows: exportData } = await pool.query(`
        SELECT
          id, title, body, priority, status, created_at, updated_date
        FROM announcements
        WHERE status != 'deleted'
        ORDER BY created_at DESC
        LIMIT 3
      `);

      console.log('✅ CSV 匯出查詢成功！');
      console.log(`   返回 ${exportData.length} 筆資料`);
      console.log('');

      if (exportData.length > 0) {
        console.log('前 3 筆資料預覽：');
        exportData.forEach((row, i) => {
          console.log(`${i + 1}. ${row.title}`);
          console.log(`   Priority: ${row.priority}`);
          console.log(`   Status: ${row.status}`);
          console.log(`   Created: ${row.created_at}`);
          console.log('');
        });
      }

      console.log('✅✅✅ 驗證完成！priority 欄位已成功新增，CSV 匯出功能應該可以正常運作了。');

    } catch (queryError) {
      console.error('❌ CSV 匯出查詢失敗:', queryError);
      throw queryError;
    }

  } catch (error) {
    console.error('❌ 驗證失敗:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

verifyPriorityColumn();
