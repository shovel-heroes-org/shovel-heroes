import { Pool } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/shovel_heroes'
});

// 新的細分隱私權限
const detailedPrivacyPermissions = [
  // 訪客權限
  { role: 'guest', permission_key: 'view_volunteer_contact', permission_name: '檢視志工聯絡資訊', permission_category: '隱私管理', can_view: 0, can_create: 0, can_edit: 0, can_delete: 0, can_manage: 0, description: '無權限檢視志工的聯絡資訊（電話、電子郵件等）' },
  { role: 'guest', permission_key: 'view_donor_contact', permission_name: '檢視捐贈者聯絡資訊', permission_category: '隱私管理', can_view: 0, can_create: 0, can_edit: 0, can_delete: 0, can_manage: 0, description: '無權限檢視捐贈者的聯絡資訊（電話、電子郵件等）' },
  { role: 'guest', permission_key: 'view_grid_contact', permission_name: '檢視網格區域聯絡人資訊', permission_category: '隱私管理', can_view: 1, can_create: 0, can_edit: 0, can_delete: 0, can_manage: 0, description: '可檢視網格區域聯絡人的公開資訊' },

  // 一般使用者權限
  { role: 'user', permission_key: 'view_volunteer_contact', permission_name: '檢視志工聯絡資訊', permission_category: '隱私管理', can_view: 1, can_create: 0, can_edit: 0, can_delete: 0, can_manage: 0, description: '可檢視自己建立的網格中志工的聯絡資訊（網格建立者 A 可看到在該網格報名的志工 B 的聯絡方式），以及自己作為志工的聯絡資訊' },
  { role: 'user', permission_key: 'view_donor_contact', permission_name: '檢視捐贈者聯絡資訊', permission_category: '隱私管理', can_view: 1, can_create: 0, can_edit: 0, can_delete: 0, can_manage: 0, description: '可檢視自己建立的網格中捐贈者的聯絡資訊（網格建立者 A 可看到在該網格捐贈物資的捐贈者 C 的聯絡方式），以及自己作為捐贈者的聯絡資訊' },
  { role: 'user', permission_key: 'view_grid_contact', permission_name: '檢視網格區域聯絡人資訊', permission_category: '隱私管理', can_view: 1, can_create: 0, can_edit: 0, can_delete: 0, can_manage: 0, description: '可檢視所有網格建立者（需求端 A）的聯絡資訊，A 的聯絡資訊永遠公開顯示' },

  // 網格管理員權限
  { role: 'grid_manager', permission_key: 'view_volunteer_contact', permission_name: '檢視志工聯絡資訊', permission_category: '隱私管理', can_view: 1, can_create: 0, can_edit: 0, can_delete: 0, can_manage: 0, description: '可檢視所有網格中志工的聯絡資訊' },
  { role: 'grid_manager', permission_key: 'view_donor_contact', permission_name: '檢視捐贈者聯絡資訊', permission_category: '隱私管理', can_view: 1, can_create: 0, can_edit: 0, can_delete: 0, can_manage: 0, description: '可檢視所有網格中捐贈者的聯絡資訊' },
  { role: 'grid_manager', permission_key: 'view_grid_contact', permission_name: '檢視網格區域聯絡人資訊', permission_category: '隱私管理', can_view: 1, can_create: 0, can_edit: 0, can_delete: 0, can_manage: 0, description: '可檢視所有網格區域聯絡人的資訊' },

  // 管理員權限
  { role: 'admin', permission_key: 'view_volunteer_contact', permission_name: '檢視志工聯絡資訊', permission_category: '隱私管理', can_view: 1, can_create: 0, can_edit: 0, can_delete: 0, can_manage: 0, description: '可檢視所有志工的聯絡資訊' },
  { role: 'admin', permission_key: 'view_donor_contact', permission_name: '檢視捐贈者聯絡資訊', permission_category: '隱私管理', can_view: 1, can_create: 0, can_edit: 0, can_delete: 0, can_manage: 0, description: '可檢視所有捐贈者的聯絡資訊' },
  { role: 'admin', permission_key: 'view_grid_contact', permission_name: '檢視網格區域聯絡人資訊', permission_category: '隱私管理', can_view: 1, can_create: 0, can_edit: 0, can_delete: 0, can_manage: 0, description: '可檢視所有網格區域聯絡人的資訊' },

  // 超級管理員權限
  { role: 'super_admin', permission_key: 'view_volunteer_contact', permission_name: '檢視志工聯絡資訊', permission_category: '隱私管理', can_view: 1, can_create: 0, can_edit: 0, can_delete: 0, can_manage: 0, description: '可檢視所有志工的聯絡資訊' },
  { role: 'super_admin', permission_key: 'view_donor_contact', permission_name: '檢視捐贈者聯絡資訊', permission_category: '隱私管理', can_view: 1, can_create: 0, can_edit: 0, can_delete: 0, can_manage: 0, description: '可檢視所有捐贈者的聯絡資訊' },
  { role: 'super_admin', permission_key: 'view_grid_contact', permission_name: '檢視網格區域聯絡人資訊', permission_category: '隱私管理', can_view: 1, can_create: 0, can_edit: 0, can_delete: 0, can_manage: 0, description: '可檢視所有網格區域聯絡人的資訊' },
];

async function addDetailedPrivacyPermissions() {
  try {
    console.log('開始添加細分的隱私權限...\n');

    // 1. 刪除舊的 view_contact_info 權限
    console.log('步驟 1: 刪除舊的「檢視聯絡資訊」權限...');
    const deleteResult = await pool.query(`
      DELETE FROM role_permissions
      WHERE permission_key = 'view_contact_info'
      RETURNING role
    `);
    console.log(`✓ 已刪除 ${deleteResult.rowCount} 條舊權限記錄\n`);

    // 2. 添加新的細分權限
    console.log('步驟 2: 添加新的細分隱私權限...');
    let addedCount = 0;

    for (const perm of detailedPrivacyPermissions) {
      await pool.query(`
        INSERT INTO role_permissions (
          role, permission_key, permission_name, permission_category,
          can_view, can_create, can_edit, can_delete, can_manage, description
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT (role, permission_key)
        DO UPDATE SET
          permission_name = EXCLUDED.permission_name,
          permission_category = EXCLUDED.permission_category,
          can_view = EXCLUDED.can_view,
          can_create = EXCLUDED.can_create,
          can_edit = EXCLUDED.can_edit,
          can_delete = EXCLUDED.can_delete,
          can_manage = EXCLUDED.can_manage,
          description = EXCLUDED.description,
          updated_at = NOW()
      `, [
        perm.role,
        perm.permission_key,
        perm.permission_name,
        perm.permission_category,
        perm.can_view,
        perm.can_create,
        perm.can_edit,
        perm.can_delete,
        perm.can_manage,
        perm.description
      ]);
      addedCount++;
    }

    console.log(`✓ 已添加/更新 ${addedCount} 條細分權限記錄\n`);

    // 3. 驗證結果
    console.log('步驟 3: 驗證新權限...');
    const { rows } = await pool.query(`
      SELECT permission_key, permission_name, COUNT(*) as role_count
      FROM role_permissions
      WHERE permission_category = '隱私管理'
      GROUP BY permission_key, permission_name
      ORDER BY permission_name
    `);

    console.log('\n✅ 隱私管理權限列表：');
    rows.forEach(row => {
      console.log(`  - ${row.permission_name} (${row.permission_key}): ${row.role_count} 個角色`);
    });

    console.log('\n✅ 細分隱私權限添加完成！');

  } catch (error) {
    console.error('❌ 添加失敗:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

addDetailedPrivacyPermissions();
