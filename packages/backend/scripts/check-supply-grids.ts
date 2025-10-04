import pkg from 'pg';
const { Pool } = pkg;

// 從 DATABASE_URL 解析連接資訊
const databaseUrl = process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/shovelheroes';

const pool = new Pool({
  connectionString: databaseUrl
});

async function checkSupplyGrids() {
  try {
    console.log('檢查 CSV 中的網格代碼...\n');

    const gridCodes = ['武昌街276號', '中學街75巷1弄5號'];

    for (const code of gridCodes) {
      const { rows } = await pool.query(
        'SELECT id, code, disaster_area_id FROM grids WHERE code = $1',
        [code]
      );

      if (rows.length > 0) {
        console.log(`✓ 找到網格: ${code}`);
        console.log(`  ID: ${rows[0].id}`);
        console.log(`  災區 ID: ${rows[0].disaster_area_id}\n`);
      } else {
        console.log(`✗ 找不到網格: ${code}\n`);
      }
    }

    // 列出所有現有的網格代碼
    console.log('\n所有現有的網格代碼:');
    const { rows: allGrids } = await pool.query(
      'SELECT code, id FROM grids ORDER BY code LIMIT 20'
    );
    allGrids.forEach(grid => {
      console.log(`  - ${grid.code} (${grid.id})`);
    });

  } catch (error) {
    console.error('檢查失敗:', error);
  } finally {
    await pool.end();
  }
}

checkSupplyGrids();
