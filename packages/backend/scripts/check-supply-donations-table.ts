import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/shovelheroes'
});

async function checkTable() {
  try {
    const { rows } = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'supply_donations'
      ORDER BY ordinal_position
    `);

    console.log('supply_donations 表結構:\n');
    rows.forEach(row => {
      console.log(`- ${row.column_name}: ${row.data_type} (NULL: ${row.is_nullable})`);
    });
  } catch (error: any) {
    console.error('查詢失敗:', error.message);
  } finally {
    await pool.end();
  }
}

checkTable();
