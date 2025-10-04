/**
 * 建立審計日誌表
 * 記錄系統中的所有重要操作，用於安全審計和防範有心人士
 */

import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/shovelheroes'
});

async function createAuditLogTable() {
  const client = await pool.connect();

  try {
    console.log('開始建立審計日誌表...');

    // 建立管理操作審計日誌表（改名為 admin_audit_logs 避免與 HTTP 請求日誌衝突）
    await client.query(`
      CREATE TABLE IF NOT EXISTS admin_audit_logs (
        id TEXT PRIMARY KEY,
        user_id TEXT,
        user_role TEXT NOT NULL,
        line_id TEXT,
        line_name TEXT,
        action TEXT NOT NULL,
        action_type TEXT NOT NULL,
        resource_type TEXT,
        resource_id TEXT,
        details JSONB,
        ip_address TEXT,
        user_agent TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
      );
    `);

    console.log('✅ 審計日誌表建立成功');

    // 建立索引以加速查詢
    try {
      await client.query('CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_user_id ON admin_audit_logs(user_id)');
      await client.query('CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_action_type ON admin_audit_logs(action_type)');
      await client.query('CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_created_at ON admin_audit_logs(created_at DESC)');
      await client.query('CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_user_role ON admin_audit_logs(user_role)');
      console.log('✅ 索引建立成功');
    } catch (indexError: any) {
      console.log('⚠️  索引建立警告:', indexError.message);
    }

    console.log('\n審計日誌表結構：');
    console.log('- id: 日誌唯一識別碼');
    console.log('- user_id: 使用者ID');
    console.log('- user_role: 使用者角色（user, grid_manager, admin, super_admin）');
    console.log('- line_id: LINE 用戶ID');
    console.log('- line_name: LINE 用戶名稱');
    console.log('- action: 操作描述');
    console.log('- action_type: 操作類型（create, update, delete, login, export, import, etc.）');
    console.log('- resource_type: 資源類型（user, grid, area, volunteer, supply, etc.）');
    console.log('- resource_id: 資源ID');
    console.log('- details: 詳細資訊（JSON格式）');
    console.log('- ip_address: IP位址');
    console.log('- user_agent: 使用者代理');
    console.log('- created_at: 建立時間');

  } catch (error) {
    console.error('❌ 建立審計日誌表失敗:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

createAuditLogTable()
  .then(() => {
    console.log('\n✅ 完成！');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ 執行失敗:', error);
    process.exit(1);
  });
