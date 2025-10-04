import { Pool } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/shovel_heroes'
});

async function verifyPrivacyPermissions() {
  try {
    console.log('驗證隱私管理權限設定...\n');

    // 查詢所有隱私管理權限
    const { rows } = await pool.query(`
      SELECT
        role,
        permission_key,
        permission_name,
        can_view,
        can_create,
        can_edit,
        can_delete,
        can_manage,
        description
      FROM role_permissions
      WHERE permission_category = '隱私管理'
      ORDER BY
        permission_name,
        CASE role
          WHEN 'super_admin' THEN 1
          WHEN 'admin' THEN 2
          WHEN 'grid_manager' THEN 3
          WHEN 'user' THEN 4
          WHEN 'guest' THEN 5
        END
    `);

    if (rows.length === 0) {
      console.log('❌ 未找到隱私管理權限');
      return;
    }

    console.log(`✅ 找到 ${rows.length} 條隱私管理權限\n`);

    // 按權限項目分組顯示
    const groupedByPermission: Record<string, any[]> = {};
    rows.forEach(row => {
      if (!groupedByPermission[row.permission_name]) {
        groupedByPermission[row.permission_name] = [];
      }
      groupedByPermission[row.permission_name].push(row);
    });

    Object.keys(groupedByPermission).sort().forEach(permName => {
      console.log(`📋 ${permName}:`);
      console.log('─'.repeat(80));

      groupedByPermission[permName].forEach(perm => {
        console.log(`  角色: ${perm.role.padEnd(15)} | 檢視: ${perm.can_view === 1 ? '✓' : '✗'} | 建立: ${perm.can_create === 1 ? '✓' : '✗'} | 編輯: ${perm.can_edit === 1 ? '✓' : '✗'} | 刪除: ${perm.can_delete === 1 ? '✓' : '✗'} | 管理: ${perm.can_manage === 1 ? '✓' : '✗'}`);
      });

      console.log(`  說明: ${groupedByPermission[permName][0].description}`);
      console.log('');
    });

    // 檢查權限完整性
    console.log('\n🔍 權限完整性檢查：');
    const expectedPermissions = ['view_volunteer_contact', 'view_donor_contact', 'view_grid_contact'];
    const expectedRoles = ['guest', 'user', 'grid_manager', 'admin', 'super_admin'];

    let missingCount = 0;
    expectedPermissions.forEach(permKey => {
      expectedRoles.forEach(role => {
        const exists = rows.some(r => r.permission_key === permKey && r.role === role);
        if (!exists) {
          console.log(`  ❌ 缺少: ${role} - ${permKey}`);
          missingCount++;
        }
      });
    });

    if (missingCount === 0) {
      console.log('  ✅ 所有權限完整');
    } else {
      console.log(`  ⚠️  發現 ${missingCount} 個缺失的權限`);
    }

    // 檢查是否有舊的 view_contact_info
    const { rows: oldPerms } = await pool.query(`
      SELECT COUNT(*) as count
      FROM role_permissions
      WHERE permission_key = 'view_contact_info'
    `);

    console.log('\n🗑️  舊權限檢查：');
    if (parseInt(oldPerms[0].count) > 0) {
      console.log(`  ⚠️  仍有 ${oldPerms[0].count} 條舊的 view_contact_info 權限`);
    } else {
      console.log('  ✅ 已清理舊的 view_contact_info 權限');
    }

  } catch (error) {
    console.error('❌ 驗證失敗:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

verifyPrivacyPermissions();
