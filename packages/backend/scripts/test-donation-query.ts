import { Pool } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/shovel_heroes'
});

async function testQuery() {
  try {
    console.log('測試物資捐贈查詢...\n');

    const { rows } = await pool.query(`
      SELECT
        sd.id, sd.grid_id, sd.name, sd.supply_name, sd.quantity, sd.unit,
        sd.donor_name, sd.donor_phone, sd.donor_email, sd.donor_contact,
        sd.delivery_method, sd.delivery_address, sd.delivery_time, sd.notes, sd.status,
        sd.created_by_id, sd.created_by,
        sd.created_at, sd.created_at as created_date,
        g.created_by_id as grid_creator_id
      FROM supply_donations sd
      LEFT JOIN grids g ON g.id = sd.grid_id
      ORDER BY sd.created_at DESC
      LIMIT 1
    `);

    if (rows.length > 0) {
      console.log('查詢結果:');
      console.log(JSON.stringify(rows[0], null, 2));
    } else {
      console.log('沒有找到捐贈記錄');
    }
  } catch (error) {
    console.error('查詢失敗:', error);
  } finally {
    await pool.end();
  }
}

testQuery();
