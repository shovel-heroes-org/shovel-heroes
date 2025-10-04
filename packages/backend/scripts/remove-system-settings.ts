import { createPool } from '../src/lib/db.js';

async function removeSystemSettings() {
  const pool = createPool();

  try {
    console.log('開始移除 system_settings 權限...');

    // 刪除 system_settings 權限
    const result = await pool.query(
      `DELETE FROM role_permissions WHERE permission_key = 'system_settings'`
    );

    console.log(`✓ 成功移除 ${result.rowCount} 筆 system_settings 權限`);

    // 確認刪除結果
    const checkResult = await pool.query(
      `SELECT COUNT(*) as count FROM role_permissions WHERE permission_key = 'system_settings'`
    );

    if (checkResult.rows[0].count === '0') {
      console.log('✓ 確認：system_settings 權限已完全移除');
    } else {
      console.log('⚠ 警告：仍有 system_settings 權限殘留');
    }

    // 顯示當前系統管理類別的權限
    const sysPerms = await pool.query(`
      SELECT DISTINCT permission_key, permission_name
      FROM role_permissions
      WHERE permission_category = '系統管理'
      ORDER BY permission_name
    `);

    console.log('\n當前「系統管理」類別的權限：');
    sysPerms.rows.forEach((row: any) => {
      console.log(`  - ${row.permission_name} (${row.permission_key})`);
    });

    process.exit(0);
  } catch (error) {
    console.error('移除 system_settings 權限失敗:', error);
    process.exit(1);
  }
}

removeSystemSettings();
