import { Pool } from 'pg';

const pool = new Pool({
  connectionString: 'postgres://postgres:postgres@localhost:5432/shovelheroes'
});

async function checkLatestDonation() {
  try {
    const { rows } = await pool.query(`
      SELECT *
      FROM supply_donations
      ORDER BY created_at DESC
      LIMIT 1
    `);

    if (rows.length === 0) {
      console.log('沒有捐贈記錄');
      return;
    }

    console.log('最新的捐贈記錄:');
    console.log(JSON.stringify(rows[0], null, 2));
  } catch (error) {
    console.error('錯誤:', error);
  } finally {
    await pool.end();
  }
}

checkLatestDonation();
