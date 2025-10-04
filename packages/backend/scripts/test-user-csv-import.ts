import pg from 'pg';
import { parse } from 'csv-parse/sync';

const { Pool } = pg;

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'shovelheroes',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

function removeBOM(text: string): string {
  if (text.charCodeAt(0) === 0xFEFF) {
    return text.substring(1);
  }
  return text;
}

async function testUserCSVImport() {
  try {
    // 模擬匯出的 CSV（包含空的 Email）
    const csvContent = `ID,姓名（必填）,Email（必填）,角色（user/admin/moderator）,黑名單,註冊時間
line_U6bbce1dd78d96b8cbefac396f38ac627,alian2,,user,1,2025-10-03 14:48:55
line_U6bbce1dd78d96b8cbefac396f38ac624,alian,,super_admin,,2025-10-03 14:48:55
line_Ub9ef7c520c5e85cf3a802d4725d67bc6,pichu,,user,,2025-10-02 22:37:22`;

    console.log('CSV 內容：');
    console.log(csvContent);
    console.log('\n');

    const csvData = removeBOM(csvContent);
    const records = parse(csvData, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      encoding: 'utf-8'
    });

    console.log('解析後的記錄數：', records.length);
    console.log('\n解析後的資料：');
    console.log(records);

    let imported = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const record of records as any[]) {
      console.log('\n處理記錄：', record);

      const name = record['姓名（必填）'] || record['姓名'];
      const email = record['Email（必填）'] || record['Email'];
      const role = record['角色（user/admin/moderator）'] || record['角色'] || 'user';

      console.log('  name:', name);
      console.log('  email:', email);
      console.log('  role:', role);

      if (!name || !email) {
        console.log('  ❌ 缺少必填欄位');
        errors.push(`Missing required fields in row: ${JSON.stringify(record)}`);
        continue;
      }

      console.log('  ✅ 驗證通過');
      imported++;
    }

    console.log('\n結果：');
    console.log('成功：', imported);
    console.log('略過：', skipped);
    console.log('錯誤：', errors.length);

    if (errors.length > 0) {
      console.log('\n錯誤詳情：');
      errors.forEach(err => console.log('  -', err));
    }

    await pool.end();
  } catch (error) {
    console.error('錯誤：', error);
    await pool.end();
    process.exit(1);
  }
}

testUserCSVImport();
