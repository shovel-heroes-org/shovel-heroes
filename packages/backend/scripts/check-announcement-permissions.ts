import { createPool } from '../src/lib/db.js';

async function checkPermissions() {
  const pool = createPool();

  try {
    console.log('檢查公告管理權限...\n');

    const result = await pool.query(`
      SELECT role, permission_key, permission_name, permission_category, can_view
      FROM role_permissions
      WHERE permission_name = '公告管理'
      ORDER BY role
    `);

    console.log('公告管理權限列表：');
    result.rows.forEach((row: any) => {
      console.log(`  角色: ${row.role}, Key: ${row.permission_key}, 分類: ${row.permission_category}, 可檢視: ${row.can_view}`);
    });

    // 檢查是否所有角色都使用 announcements 作為 key
    const wrongKeys = result.rows.filter((row: any) => row.permission_key !== 'announcements');
    if (wrongKeys.length > 0) {
      console.log('\n⚠ 發現錯誤的 permission_key:');
      wrongKeys.forEach((row: any) => {
        console.log(`  角色 ${row.role} 使用了 ${row.permission_key} 而非 announcements`);
      });
    } else {
      console.log('\n✓ 所有公告管理權限都正確使用 announcements 作為 key');
    }

    process.exit(0);
  } catch (error) {
    console.error('檢查失敗:', error);
    process.exit(1);
  }
}

checkPermissions();
