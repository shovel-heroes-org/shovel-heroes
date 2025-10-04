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

async function testSupplyImport() {
  try {
    // 實際的 CSV 內容
    const csvContent = `ID,網格代碼,災區,物資名稱,數量,單位,捐贈者姓名,聯絡電話,Email,配送方式,送達地址,預計送達時間,備註,狀態,捐贈時間
a066395c-9578-4968-874f-30eee4cbae39,武昌街276號,匯入未知災區 a931d7,鋤頭,1,枝,alian,1111,,direct,111,111,,pledged,2025-10-04 22:36:53`;

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

    for (const record of records as any[]) {
      console.log('\n處理記錄：', record);

      const gridCode = record['網格代碼（必填）'] || record['網格代碼'];
      const supplyName = record['物資名稱（必填）'] || record['物資名稱'];
      const donorName = record['捐贈者姓名（必填）'] || record['捐贈者姓名'];

      console.log('  網格代碼:', gridCode);
      console.log('  物資名稱:', supplyName);
      console.log('  捐贈者姓名:', donorName);

      if (!donorName || !gridCode || !supplyName) {
        console.log('  ❌ 缺少必填欄位');
        continue;
      }

      console.log('  ✅ 必填欄位驗證通過');

      // 查找網格
      const { rows: grids } = await pool.query(
        'SELECT id, code FROM grids WHERE code = $1',
        [gridCode]
      );

      console.log('  查找網格結果:', grids);

      if (grids.length === 0) {
        console.log(`  ❌ 找不到網格: ${gridCode}`);

        // 列出所有網格代碼
        const { rows: allGrids } = await pool.query(
          'SELECT code FROM grids LIMIT 10'
        );
        console.log('  現有的網格代碼（前10個）:');
        allGrids.forEach(g => console.log('    -', g.code));
      } else {
        console.log(`  ✅ 找到網格: ${grids[0].id}`);
      }
    }

    await pool.end();
  } catch (error) {
    console.error('錯誤：', error);
    await pool.end();
    process.exit(1);
  }
}

testSupplyImport();
