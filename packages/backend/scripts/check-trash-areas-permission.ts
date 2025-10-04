import { getDb } from '../src/lib/db.js';

async function checkTrashAreasPermission() {
  try {
    const db = await getDb();

    console.log('檢查 trash_areas 權限設定...\n');

    const result = await db.query(
      `SELECT role, permission_key, permission_name, can_view, can_create, can_edit, can_delete, can_manage
       FROM role_permissions
       WHERE permission_key = 'trash_areas'
       ORDER BY role`
    );

    if (result.rows.length === 0) {
      console.log('❌ 找不到 trash_areas 權限設定！');
    } else {
      console.log('找到以下權限設定：\n');
      for (const row of result.rows) {
        console.log(`角色: ${row.role}`);
        console.log(`  權限名稱: ${row.permission_name}`);
        console.log(`  can_view: ${row.can_view}`);
        console.log(`  can_create: ${row.can_create}`);
        console.log(`  can_edit: ${row.can_edit}`);
        console.log(`  can_delete: ${row.can_delete}`);
        console.log(`  can_manage: ${row.can_manage}`);
        console.log('');
      }
    }

    await db.end();
  } catch (error) {
    console.error('錯誤:', error);
    process.exit(1);
  }
}

checkTrashAreasPermission();
