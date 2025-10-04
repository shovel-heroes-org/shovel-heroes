require('dotenv/config');
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

(async () => {
  try {
    const total = await pool.query('SELECT COUNT(*) as count FROM role_permissions');
    console.log('總權限數:', total.rows[0].count);

    console.log('\n各角色權限統計:');
    const stats = await pool.query(`
      SELECT role, COUNT(*) as count
      FROM role_permissions
      GROUP BY role
      ORDER BY CASE role
        WHEN 'guest' THEN 1
        WHEN 'user' THEN 2
        WHEN 'grid_manager' THEN 3
        WHEN 'admin' THEN 4
        WHEN 'super_admin' THEN 5
      END
    `);

    stats.rows.forEach(r => {
      console.log(`  ${r.role}: ${r.count} 項權限`);
    });

    console.log('\n新增的權限類別:');
    const categories = await pool.query(`
      SELECT DISTINCT permission_category
      FROM role_permissions
      ORDER BY permission_category
    `);
    categories.rows.forEach(c => {
      console.log(`  - ${c.permission_category}`);
    });

    await pool.end();
  } catch (e) {
    console.error('錯誤:', e.message);
    await pool.end();
    process.exit(1);
  }
})();
