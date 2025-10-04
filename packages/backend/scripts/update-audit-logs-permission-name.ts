import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'shovelheroes',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

async function updateAuditLogsPermissionName() {
  const client = await pool.connect();
  try {
    console.log('開始更新 audit_logs 權限名稱...');

    // 更新所有角色的 audit_logs permission_name 和 description
    const updateResult = await client.query(`
      UPDATE role_permissions
      SET
        permission_name = '日誌管理',
        description = CASE
          WHEN role = 'user' THEN '無日誌檢視權限'
          WHEN role = 'grid_manager' THEN '無日誌檢視權限'
          WHEN role = 'admin' THEN '可檢視日誌'
          WHEN role = 'super_admin' THEN '可檢視和匯出系統日誌'
          ELSE description
        END
      WHERE permission_key = 'audit_logs'
        AND permission_name = '稽核日誌'
    `);

    console.log(`已更新 ${updateResult.rowCount} 筆權限記錄`);

    // 驗證更新結果
    const verifyResult = await client.query(`
      SELECT role, permission_name, description
      FROM role_permissions
      WHERE permission_key = 'audit_logs'
      ORDER BY CASE role
        WHEN 'user' THEN 1
        WHEN 'grid_manager' THEN 2
        WHEN 'admin' THEN 3
        WHEN 'super_admin' THEN 4
      END
    `);

    console.log('\n更新後的權限設定:');
    console.table(verifyResult.rows);

    console.log('\n✅ 權限名稱更新完成！');
  } catch (error) {
    console.error('❌ 更新失敗:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

updateAuditLogsPermissionName();
