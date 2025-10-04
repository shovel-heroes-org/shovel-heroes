import { config } from 'dotenv';
import { resolve } from 'path';
import { createPool } from '../src/lib/db.js';

// 載入環境變數
config({ path: resolve(process.cwd(), '../../.env') });

async function checkPermissions() {
  const pool = createPool();

  try {
    console.log('檢查資料庫中的權限資料...\n');

    // 查詢所有權限
    const result = await pool.query(`
      SELECT
        id,
        role,
        permission_key,
        permission_name,
        permission_category,
        can_view,
        can_create,
        can_edit,
        can_delete,
        can_manage,
        description
      FROM role_permissions
      ORDER BY
        CASE role
          WHEN 'super_admin' THEN 1
          WHEN 'admin' THEN 2
          WHEN 'grid_manager' THEN 3
          WHEN 'user' THEN 4
          WHEN 'guest' THEN 5
        END,
        permission_category,
        permission_name
      LIMIT 20
    `);

    console.log(`找到 ${result.rowCount} 筆權限資料（顯示前 20 筆）:\n`);

    result.rows.forEach((row: any, index: number) => {
      console.log(`${index + 1}. [${row.role}] ${row.permission_name} (${row.permission_key})`);
      console.log(`   分類: ${row.permission_category}`);
      console.log(`   權限: 檢視=${row.can_view} 建立=${row.can_create} 編輯=${row.can_edit} 刪除=${row.can_delete} 管理=${row.can_manage}`);
      console.log(`   說明: ${row.description}`);
      console.log('');
    });

    // 統計各角色的權限數量
    const stats = await pool.query(`
      SELECT role, COUNT(*) as count
      FROM role_permissions
      GROUP BY role
      ORDER BY
        CASE role
          WHEN 'super_admin' THEN 1
          WHEN 'admin' THEN 2
          WHEN 'grid_manager' THEN 3
          WHEN 'user' THEN 4
          WHEN 'guest' THEN 5
        END
    `);

    console.log('\n權限統計：');
    stats.rows.forEach((row: any) => {
      console.log(`  ${row.role}: ${row.count} 項權限`);
    });

    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('檢查權限資料失敗:', error);
    await pool.end();
    process.exit(1);
  }
}

checkPermissions();
