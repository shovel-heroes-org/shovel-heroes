import { Pool } from 'pg';

const pool = new Pool({
  connectionString: 'postgres://postgres:postgres@localhost:5432/shovelheroes'
});

async function checkDonations() {
  try {
    const { rows } = await pool.query(`
      SELECT id, supply_name, donor_name, donor_phone, delivery_time, created_at
      FROM supply_donations
      ORDER BY created_at DESC
      LIMIT 5
    `);

    console.log('捐贈記錄數量:', rows.length);
    console.log('\n最近的捐贈記錄:');
    rows.forEach((row, i) => {
      console.log(`\n記錄 ${i + 1}:`);
      console.log('  ID:', row.id);
      console.log('  物資名稱:', row.supply_name);
      console.log('  捐贈者:', row.donor_name);
      console.log('  電話:', row.donor_phone);
      console.log('  預計送達時間:', row.delivery_time || '未填寫');
      console.log('  創建時間:', row.created_at);
    });
  } catch (error) {
    console.error('錯誤:', error);
  } finally {
    await pool.end();
  }
}

checkDonations();
