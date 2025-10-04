import { createPool } from '../src/lib/db.js';

async function renamePermission() {
  const pool = createPool();

  try {
    console.log('將 admin_panel 權限名稱改為「需求管理（後台訪問）」...\n');

    // 更新權限名稱和描述
    const result = await pool.query(`
      UPDATE role_permissions
      SET
        permission_name = '需求管理（後台訪問）',
        description = CASE role
          WHEN 'super_admin' THEN '完整管理後台權限，包含所有需求管理功能'
          WHEN 'admin' THEN '可完整訪問管理後台的需求管理功能'
          WHEN 'grid_manager' THEN '可訪問管理後台檢視需求資料'
          WHEN 'user' THEN '無管理後台訪問權限'
          WHEN 'guest' THEN '無管理後台訪問權限'
          ELSE description
        END
      WHERE permission_key = 'admin_panel'
    `);

    console.log(`✓ 成功更新 ${result.rowCount} 筆權限記錄`);

    // 顯示更新後的結果
    const checkResult = await pool.query(`
      SELECT role, permission_name, description
      FROM role_permissions
      WHERE permission_key = 'admin_panel'
      ORDER BY role
    `);

    console.log('\n更新後的權限：');
    checkResult.rows.forEach((row: any) => {
      console.log(`  ${row.role}: ${row.permission_name} - ${row.description}`);
    });

    process.exit(0);
  } catch (error) {
    console.error('更新失敗:', error);
    process.exit(1);
  }
}

renamePermission();
