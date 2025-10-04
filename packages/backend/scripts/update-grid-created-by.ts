import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/shovelheroes'
});

async function updateGridCreatedBy() {
  try {
    console.log('開始更新網格的 created_by_id 欄位...\n');

    // 先檢查有多少網格需要更新
    const { rows: checkRows } = await pool.query(`
      SELECT COUNT(*) as count
      FROM grids
      WHERE created_by_id IS NULL AND grid_manager_id IS NOT NULL
    `);

    const needUpdateCount = parseInt(checkRows[0].count);
    console.log(`找到 ${needUpdateCount} 筆網格需要更新 created_by_id`);

    if (needUpdateCount === 0) {
      console.log('沒有需要更新的網格。');
      return;
    }

    // 執行更新
    const { rows: updateResult } = await pool.query(`
      UPDATE grids
      SET created_by_id = grid_manager_id
      WHERE created_by_id IS NULL AND grid_manager_id IS NOT NULL
      RETURNING id, code, created_by_id
    `);

    console.log(`\n成功更新 ${updateResult.length} 筆網格:\n`);

    updateResult.slice(0, 10).forEach((row, index) => {
      console.log(`${index + 1}. 網格編號: ${row.code}`);
      console.log(`   ID: ${row.id}`);
      console.log(`   created_by_id: ${row.created_by_id}`);
      console.log('');
    });

    if (updateResult.length > 10) {
      console.log(`... 還有 ${updateResult.length - 10} 筆網格已更新\n`);
    }

    // 驗證更新結果
    const { rows: verifyRows } = await pool.query(`
      SELECT
        COUNT(*) FILTER (WHERE created_by_id IS NOT NULL) as has_creator,
        COUNT(*) FILTER (WHERE created_by_id IS NULL) as no_creator,
        COUNT(*) as total
      FROM grids
      WHERE status != 'deleted'
    `);

    console.log('更新後的統計:');
    console.log(`- 有 created_by_id 的網格: ${verifyRows[0].has_creator}`);
    console.log(`- 沒有 created_by_id 的網格: ${verifyRows[0].no_creator}`);
    console.log(`- 總計: ${verifyRows[0].total}`);

  } catch (error) {
    console.error('更新錯誤:', error);
  } finally {
    await pool.end();
  }
}

updateGridCreatedBy();
