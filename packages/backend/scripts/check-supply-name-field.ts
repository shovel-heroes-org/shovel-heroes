import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/shovelheroes'
});

async function checkData() {
  try {
    const { rows } = await pool.query('SELECT id, name, supply_name, donor_name FROM supply_donations LIMIT 5');

    console.log('現有資料範例:\n');
    if (rows.length === 0) {
      console.log('表中沒有資料');
    } else {
      rows.forEach((row, i) => {
        console.log(`記錄 ${i + 1}:`);
        console.log(`  id: ${row.id}`);
        console.log(`  name: ${row.name}`);
        console.log(`  supply_name: ${row.supply_name}`);
        console.log(`  donor_name: ${row.donor_name}\n`);
      });
    }
  } catch (error: any) {
    console.error('查詢失敗:', error.message);
  } finally {
    await pool.end();
  }
}

checkData();
