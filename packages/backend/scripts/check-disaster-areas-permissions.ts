import { createPool } from '../src/lib/db.js';

async function checkPermissions() {
  const pool = createPool();

  try {
    console.log('檢查災區管理權限...\n');

    const result = await pool.query(`
      SELECT role, permission_key, permission_name, can_view
      FROM role_permissions
      WHERE permission_name = '災區管理'
      ORDER BY role
    `);

    console.log('災區管理權限列表：');
    result.rows.forEach((row: any) => {
      console.log(`  角色: ${row.role}, Key: ${row.permission_key}, 可檢視: ${row.can_view}`);
    });

    // 檢查是否所有角色都使用 disaster_areas 作為 key
    const wrongKeys = result.rows.filter((row: any) => row.permission_key !== 'disaster_areas');
    if (wrongKeys.length > 0) {
      console.log('\n⚠ 發現錯誤的 permission_key:');
      wrongKeys.forEach((row: any) => {
        console.log(`  角色 ${row.role} 使用了 ${row.permission_key} 而非 disaster_areas`);
      });
    } else {
      console.log('\n✓ 所有災區管理權限都正確使用 disaster_areas 作為 key');
    }

    process.exit(0);
  } catch (error) {
    console.error('檢查失敗:', error);
    process.exit(1);
  }
}

checkPermissions();
