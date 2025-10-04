import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/shovelheroes'
});

async function checkTable() {
  try {
    // 查詢審計日誌（有 user_role 的那個表）
    const { rows: countRows } = await pool.query(`
      SELECT COUNT(*) as count
      FROM audit_logs
      WHERE user_role IS NOT NULL
    `);
    console.log(`Total audit logs with user_role: ${countRows[0].count}`);

    const { rows: sampleRows } = await pool.query(`
      SELECT id, user_role, line_id, line_name, action, action_type, created_at
      FROM audit_logs
      WHERE user_role IS NOT NULL
      ORDER BY created_at DESC
      LIMIT 5
    `);
    console.log('\nSample audit log records:');
    sampleRows.forEach((row, i) => {
      console.log(`\n${i + 1}. ${row.action}`);
      console.log(`   Role: ${row.user_role}, Name: ${row.line_name}`);
      console.log(`   Type: ${row.action_type}, Time: ${row.created_at}`);
    });
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkTable();
