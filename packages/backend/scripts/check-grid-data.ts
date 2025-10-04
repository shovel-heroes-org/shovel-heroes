import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/shovelheroes'
});

async function checkGridData() {
  try {
    console.log('正在查詢網格資料...\n');

    const { rows } = await pool.query(`
      SELECT id, code, created_by_id, created_by, grid_manager_id, status
      FROM grids
      WHERE status != 'deleted'
      ORDER BY created_at DESC
      LIMIT 10
    `);

    console.log('找到', rows.length, '筆網格資料:\n');

    rows.forEach((row, index) => {
      console.log(`${index + 1}. 網格編號: ${row.code}`);
      console.log(`   ID: ${row.id}`);
      console.log(`   created_by_id: ${row.created_by_id} (type: ${typeof row.created_by_id})`);
      console.log(`   created_by: ${row.created_by}`);
      console.log(`   grid_manager_id: ${row.grid_manager_id}`);
      console.log(`   status: ${row.status}`);
      console.log('');
    });

    // 也查詢用戶資料
    const { rows: users } = await pool.query(`
      SELECT id, name, email, role
      FROM users
      ORDER BY created_at DESC
      LIMIT 5
    `);

    console.log('\n最近的用戶資料:\n');
    users.forEach((user, index) => {
      console.log(`${index + 1}. 用戶名稱: ${user.name}`);
      console.log(`   ID: ${user.id} (type: ${typeof user.id})`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Role: ${user.role}`);
      console.log('');
    });

  } catch (error) {
    console.error('查詢錯誤:', error);
  } finally {
    await pool.end();
  }
}

checkGridData();
