import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/shovelheroes'
});

async function checkTable() {
  try {
    const { rows } = await pool.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'audit_logs'
      ORDER BY ordinal_position
    `);

    console.log('audit_logs table columns:');
    rows.forEach(row => {
      console.log(`  ${row.column_name}: ${row.data_type}`);
    });

    const { rows: countRows } = await pool.query('SELECT COUNT(*) as count FROM audit_logs');
    console.log(`\nTotal records: ${countRows[0].count}`);

    const { rows: sampleRows } = await pool.query('SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 2');
    console.log('\nSample records:');
    console.log(JSON.stringify(sampleRows, null, 2));
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

checkTable();
