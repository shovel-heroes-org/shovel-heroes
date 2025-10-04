import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import { stringify } from 'csv-stringify/sync';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/shovel_heroes'
});

/**
 * 格式化日期時間為可讀格式 (YYYY-MM-DD HH:MM:SS)
 */
function formatDateTime(date: Date | string | number | null | undefined): string {
  if (!date) return '';

  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';

    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const seconds = String(d.getSeconds()).padStart(2, '0');

    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  } catch {
    return '';
  }
}

async function testAnnouncementsExport() {
  try {
    console.log('🧪 測試公告匯出 CSV 功能...\n');

    // 模擬後端匯出邏輯
    console.log('步驟 1: 查詢公告資料...');
    const { rows } = await pool.query(
      `SELECT
        id, title, body, priority, status, created_at, updated_date
      FROM announcements
      WHERE status != 'deleted'
      ORDER BY created_at DESC`
    );

    console.log(`✓ 找到 ${rows.length} 筆公告資料\n`);

    if (rows.length === 0) {
      console.log('⚠️  沒有公告資料可匯出！');
      return;
    }

    // 顯示前 3 筆資料
    console.log('前 3 筆公告：');
    rows.slice(0, 3).forEach((row, i) => {
      console.log(`${i + 1}. ${row.title}`);
      console.log(`   優先級: ${row.priority || 'normal'}`);
      console.log(`   狀態: ${row.status}`);
      console.log(`   建立時間: ${row.created_at}`);
      console.log('');
    });

    // 格式化時間欄位
    console.log('步驟 2: 格式化時間欄位...');
    const formattedRows = rows.map(row => ({
      ...row,
      created_at: formatDateTime(row.created_at),
      updated_at: formatDateTime(row.updated_date)
    }));
    console.log('✓ 時間格式化完成\n');

    // 生成 CSV
    console.log('步驟 3: 生成 CSV...');
    try {
      const csv = stringify(formattedRows, {
        header: true,
        columns: {
          id: 'ID',
          title: '標題',
          body: '內容',
          priority: '優先級',
          status: '狀態',
          created_at: '建立時間',
          updated_at: '更新時間'
        }
      });

      console.log('✓ CSV 生成成功\n');
      console.log('CSV 預覽（前 300 字元）：');
      console.log(csv.substring(0, 300));
      console.log('...\n');

      // 添加 BOM
      const csvWithBOM = '\uFEFF' + csv;
      console.log(`✓ 已添加 UTF-8 BOM，總長度: ${csvWithBOM.length} 字元\n`);

      console.log('✅ 測試成功！公告匯出功能正常運作。');

    } catch (csvError) {
      console.error('❌ CSV 生成失敗:', csvError);
      throw csvError;
    }

  } catch (error) {
    console.error('❌ 測試失敗:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

testAnnouncementsExport();
