import pg from 'pg';

async function checkPermission() {
  const client = new pg.Client({
    connectionString: 'postgres://postgres:postgres@localhost:5432/shovelheroes'
  });

  try {
    await client.connect();
    console.log('✅ 已連接到資料庫\n');

    const res = await client.query(`
      SELECT role, permission_key, can_view, can_manage
      FROM role_permissions
      WHERE permission_key = 'view_volunteer_contact'
      ORDER BY role
    `);

    console.log('view_volunteer_contact 權限設定:');
    console.log('================================================');
    res.rows.forEach(row => {
      console.log(`角色: ${row.role}`);
      console.log(`  can_view: ${row.can_view}`);
      console.log(`  can_manage: ${row.can_manage}`);
      console.log('');
    });

  } catch (error) {
    console.error('❌ 錯誤:', error);
  } finally {
    await client.end();
  }
}

checkPermission();
