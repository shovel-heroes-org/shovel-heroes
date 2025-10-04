import pg from 'pg';
import { randomUUID } from 'crypto';

async function createTestDonation() {
  const client = new pg.Client({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/shovelheroes'
  });

  try {
    await client.connect();
    console.log('已連接到資料庫');

    // 找一個 open 狀態的 grid
    const gridResult = await client.query(`
      SELECT id, code
      FROM grids
      WHERE status = 'open'
      LIMIT 1
    `);

    if (gridResult.rows.length === 0) {
      console.log('沒有可用的 open 狀態 grid，無法測試');
      return;
    }

    const grid = gridResult.rows[0];
    console.log(`\n使用 grid: ${grid.code} (${grid.id})`);

    // 使用固定的測試物資
    const testSupplyName = '鋤頭';
    const testUnit = '枝';
    console.log(`捐贈物資: ${testSupplyName} (${testUnit})`);

    // 建立測試捐贈記錄
    const testId = randomUUID();
    const insertResult = await client.query(`
      INSERT INTO supply_donations
        (id, grid_id, name, supply_name, quantity, unit,
         donor_name, donor_phone, donor_email, donor_contact,
         delivery_method, delivery_address, delivery_time, notes, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING *
    `, [
      testId,
      grid.id,
      testSupplyName,
      testSupplyName,
      5,  // 捐贈數量
      testUnit,
      '測試捐贈者 - 張小明',
      '0987654321',
      'test@example.com',
      '測試捐贈者 - 張小明 / 0987654321',
      'delivery',  // 配送方式
      '台北市大安區測試路123號',  // 送達地址
      '今日下午 3:00',  // 預計送達時間
      '這是一筆測試捐贈記錄，包含完整的配送資訊',
      'pledged'
    ]);

    console.log('\n✅ 成功建立測試捐贈記錄！');
    console.log('================================');
    console.log('ID:', insertResult.rows[0].id);
    console.log('物資名稱:', insertResult.rows[0].supply_name);
    console.log('數量:', insertResult.rows[0].quantity, insertResult.rows[0].unit);
    console.log('捐贈者:', insertResult.rows[0].donor_name);
    console.log('電話:', insertResult.rows[0].donor_phone);
    console.log('配送方式:', insertResult.rows[0].delivery_method);
    console.log('送達地址:', insertResult.rows[0].delivery_address);
    console.log('預計送達時間:', insertResult.rows[0].delivery_time);
    console.log('備註:', insertResult.rows[0].notes);
    console.log('狀態:', insertResult.rows[0].status);
    console.log('================================');
    console.log('\n請到前端查看此捐贈記錄，確認「預計送達時間」是否正確顯示。');

  } catch (error) {
    console.error('錯誤:', error);
  } finally {
    await client.end();
  }
}

createTestDonation();
