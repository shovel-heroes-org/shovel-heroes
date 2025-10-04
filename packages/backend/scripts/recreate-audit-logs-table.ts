/**
 * 重建 audit_logs 表（HTTP 請求日誌）
 * 修正錯誤的表結構
 */

import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/shovelheroes'
});

async function recreateAuditLogsTable() {
  const client = await pool.connect();

  try {
    console.log('開始重建 audit_logs 表...');

    // 刪除錯誤的表
    await client.query('DROP TABLE IF EXISTS audit_logs CASCADE');
    console.log('✅ 已刪除舊的 audit_logs 表');

    // 重建正確的表結構（HTTP 請求日誌）
    await client.query(`
      CREATE TABLE audit_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        method TEXT NOT NULL,
        path TEXT NOT NULL,
        query JSONB,
        ip TEXT,
        headers JSONB,
        status_code INT,
        error TEXT,
        duration_ms INT,
        request_body JSONB,
        response_body JSONB,
        user_id TEXT,
        resource_id TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    console.log('✅ audit_logs 表重建成功');

    // 建立索引以加速查詢
    try {
      await client.query('CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id)');
      await client.query('CREATE INDEX IF NOT EXISTS idx_audit_logs_path ON audit_logs(path)');
      await client.query('CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC)');
      console.log('✅ 索引建立成功');
    } catch (indexError: any) {
      console.log('⚠️  索引建立警告:', indexError.message);
    }

    console.log('\naudit_logs 表結構（HTTP 請求日誌）：');
    console.log('- id: 日誌唯一識別碼');
    console.log('- method: HTTP 方法');
    console.log('- path: 請求路徑');
    console.log('- query: 查詢參數（JSON格式）');
    console.log('- ip: IP位址');
    console.log('- headers: 請求標頭（JSON格式）');
    console.log('- status_code: HTTP 狀態碼');
    console.log('- error: 錯誤訊息');
    console.log('- duration_ms: 請求耗時（毫秒）');
    console.log('- request_body: 請求內容（JSON格式）');
    console.log('- response_body: 回應內容（JSON格式）');
    console.log('- user_id: 使用者ID');
    console.log('- resource_id: 資源ID');
    console.log('- created_at: 建立時間');

  } catch (error) {
    console.error('❌ 重建 audit_logs 表失敗:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

recreateAuditLogsTable()
  .then(() => {
    console.log('\n✅ 完成！');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ 執行失敗:', error);
    process.exit(1);
  });
