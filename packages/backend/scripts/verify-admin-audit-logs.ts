import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  connectionString: 'postgresql://postgres:postgres@localhost:5432/shovelheroes'
});

async function verify() {
  try {
    const { rows } = await pool.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'admin_audit_logs'
      ORDER BY ordinal_position
    `);

    console.log('admin_audit_logs 表欄位：');
    rows.forEach(row => {
      console.log(`  - ${row.column_name}: ${row.data_type}`);
    });

    const { rows: countRows } = await pool.query('SELECT COUNT(*) as count FROM admin_audit_logs');
    console.log(`\n總記錄數: ${countRows[0].count}`);
  } catch (error: any) {
    console.error('錯誤:', error.message);
  } finally {
    await pool.end();
  }
}

verify();
