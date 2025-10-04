import { createPool } from '../src/lib/db.js';
import * as dotenv from 'dotenv';

dotenv.config();

const pool = createPool();

console.log('開始移除「個人管理」分類的權限...\n');

async function main() {
  try {
    // 查詢要刪除的權限
    const permissionsToDelete = await pool.query(`
      SELECT id, role, permission_key, permission_name, permission_category
      FROM role_permissions
      WHERE permission_category = '個人管理'
      ORDER BY role, permission_key
    `);

    console.log('找到以下權限將被刪除:');
    console.log('================================');
    permissionsToDelete.rows.forEach((perm: any) => {
      console.log(`ID: ${perm.id} | 角色: ${perm.role} | 權限: ${perm.permission_name} (${perm.permission_key})`);
    });
    console.log(`\n總計: ${permissionsToDelete.rows.length} 筆權限\n`);

    if (permissionsToDelete.rows.length === 0) {
      console.log('沒有找到需要刪除的權限，腳本結束。');
      await pool.end();
      process.exit(0);
    }

    // 執行刪除
    const deleteResult = await pool.query(`
      DELETE FROM role_permissions
      WHERE permission_category = '個人管理'
    `);

    console.log('刪除完成！');
    console.log(`已刪除 ${deleteResult.rowCount} 筆權限記錄\n`);

    // 驗證刪除結果
    const remaining = await pool.query(`
      SELECT COUNT(*) as count
      FROM role_permissions
      WHERE permission_category = '個人管理'
    `);

    const count = parseInt(remaining.rows[0].count);
    if (count === 0) {
      console.log('✅ 驗證成功：「個人管理」分類的所有權限已完全移除');
    } else {
      console.log(`⚠️ 警告：仍有 ${count} 筆「個人管理」權限未刪除`);
    }

    // 顯示剩餘的權限分類
    const categories = await pool.query(`
      SELECT DISTINCT permission_category, COUNT(*) as count
      FROM role_permissions
      GROUP BY permission_category
      ORDER BY permission_category
    `);

    console.log('\n目前剩餘的權限分類：');
    console.log('================================');
    categories.rows.forEach((cat: any) => {
      console.log(`${cat.permission_category}: ${cat.count} 筆`);
    });

  } catch (error) {
    console.error('❌ 執行過程中發生錯誤:', error);
    await pool.end();
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
