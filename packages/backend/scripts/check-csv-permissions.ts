/**
 * 檢查 CSV 匯入功能所需的權限設定
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { createPool } from '../src/lib/db.js';

// 載入環境變數
config({ path: resolve(process.cwd(), '../../.env') });

async function checkPermissions() {
  const pool = createPool();

  try {
    console.log('檢查 CSV 匯入相關權限設定...\n');

    const permissionKeys = [
      'grids',
      'volunteers',
      'supplies',
      'users',
      'blacklist',
      'disaster_areas',
      'announcements'
    ];

    const roles = ['super_admin', 'admin', 'user'];

    for (const role of roles) {
      console.log(`\n角色: ${role}`);
      console.log('='.repeat(50));

      for (const key of permissionKeys) {
        const result = await pool.query(`
          SELECT permission_key, can_manage
          FROM role_permissions
          WHERE role = $1 AND permission_key = $2
        `, [role, key]);

        if (result.rows.length === 0) {
          console.log(`  ❌ ${key}: 權限未設定`);
        } else {
          const canManage = result.rows[0].can_manage === 1;
          console.log(`  ${canManage ? '✅' : '❌'} ${key}: can_manage = ${canManage ? 'true' : 'false'}`);
        }
      }
    }

    await pool.end();
    console.log('\n檢查完成！');
    process.exit(0);
  } catch (error) {
    console.error('檢查失敗:', error);
    await pool.end();
    process.exit(1);
  }
}

checkPermissions();
