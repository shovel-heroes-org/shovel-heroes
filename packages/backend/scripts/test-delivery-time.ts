import pg from 'pg';

async function testDeliveryTime() {
  const client = new pg.Client({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/shovelheroes'
  });

  try {
    await client.connect();
    console.log('已連接到資料庫');

    // 先找一個存在的 grid
    const gridResult = await client.query('SELECT id FROM grids LIMIT 1');
    if (gridResult.rows.length === 0) {
      console.log('沒有可用的 grid，無法測試');
      return;
    }

    const gridId = gridResult.rows[0].id;
    console.log(`\n使用 grid ID: ${gridId}`);

    // 建立一筆測試捐贈記錄，包含 delivery_time
    const testId = 'test-delivery-' + Date.now();
    const insertResult = await client.query(`
      INSERT INTO supply_donations
        (id, grid_id, name, supply_name, quantity, unit,
         donor_name, donor_phone, donor_email,
         delivery_method, delivery_address, delivery_time, notes, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *
    `, [
      testId,
      gridId,
      '測試物資',
      '測試物資',
      10,
      '個',
      '測試捐贈者',
      '0912345678',
      'test@example.com',
      'delivery',
      '測試地址',
      '今日下午 3:00',  // 預計送達時間
      '這是測試記錄',
      'pledged'
    ]);

    console.log('\n✅ 成功建立測試捐贈記錄：');
    console.log('ID:', insertResult.rows[0].id);
    console.log('物資名稱:', insertResult.rows[0].supply_name);
    console.log('預計送達時間:', insertResult.rows[0].delivery_time);
    console.log('配送方式:', insertResult.rows[0].delivery_method);
    console.log('送達地址:', insertResult.rows[0].delivery_address);

    // 驗證資料確實寫入
    const verifyResult = await client.query(
      'SELECT id, supply_name, delivery_time, delivery_method FROM supply_donations WHERE id = $1',
      [testId]
    );

    console.log('\n驗證查詢結果：');
    console.log(JSON.stringify(verifyResult.rows[0], null, 2));

    // 清理測試資料
    await client.query('DELETE FROM supply_donations WHERE id = $1', [testId]);
    console.log('\n✅ 測試資料已清理');

  } catch (error) {
    console.error('錯誤:', error);
  } finally {
    await client.end();
  }
}

testDeliveryTime();
