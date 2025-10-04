import pg from 'pg';
import { stringify } from 'csv-stringify/sync';

const { Pool } = pg;

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'shovelheroes',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

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

async function testUserCSVExport() {
  try {
    console.log('正在查詢用戶資料...');
    const { rows } = await pool.query(
      `SELECT
        id, name, email, role, is_blacklisted, created_at
      FROM users
      ORDER BY created_at DESC
      LIMIT 3`
    );

    console.log('\n查詢結果：');
    console.log(rows);

    // 格式化時間欄位
    const formattedRows = rows.map(row => ({
      ...row,
      created_at: formatDateTime(row.created_at)
    }));

    console.log('\n格式化後的資料：');
    console.log(formattedRows);

    const csv = stringify(formattedRows, {
      header: true,
      columns: {
        id: 'ID',
        name: '姓名（必填）',
        email: 'Email（必填）',
        role: '角色（user/admin/moderator）',
        is_blacklisted: '黑名單',
        created_at: '註冊時間'
      }
    });

    console.log('\n匯出的 CSV 內容：');
    console.log(csv);

    console.log('\n匯出的 CSV 標題列：');
    const lines = csv.split('\n');
    console.log(lines[0]);

    if (lines.length > 1) {
      console.log('\n第一筆資料：');
      console.log(lines[1]);
    }

    await pool.end();
  } catch (error) {
    console.error('錯誤：', error);
    await pool.end();
    process.exit(1);
  }
}

testUserCSVExport();
