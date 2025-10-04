import { Pool } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/shovel_heroes'
});

async function updatePermission() {
  try {
    console.log('更新「檢視聯絡資訊」權限設定...\n');

    // 將所有角色的 can_manage 設為 0，因為這是純檢視權限
    const result = await pool.query(`
      UPDATE role_permissions
      SET can_manage = 0,
          updated_at = NOW()
      WHERE permission_key = 'view_contact_info'
      RETURNING role, permission_name, can_view, can_manage
    `);

    console.log(`✅ 已更新 ${result.rowCount} 條權限記錄\n`);

    // 顯示更新後的結果
    console.log('更新後的權限設定：\n');
    result.rows.forEach(row => {
      console.log(`角色: ${row.role}`);
      console.log(`  權限: ${row.permission_name}`);
      console.log(`  可檢視: ${row.can_view === 1 ? '✓' : '✗'}`);
      console.log(`  可管理: ${row.can_manage === 1 ? '✓' : '✗'}`);
      console.log('');
    });

    console.log('說明：「檢視聯絡資訊」是純檢視權限，只使用 can_view 欄位');
    console.log('      不使用 can_create、can_edit、can_delete、can_manage 欄位');

  } catch (error) {
    console.error('❌ 更新失敗:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

updatePermission();
