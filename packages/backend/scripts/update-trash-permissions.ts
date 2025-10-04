import { createPool } from '../src/lib/db.js';

/**
 * 更新垃圾桶權限：移除 can_manage 權限
 *
 * 垃圾桶功能實際使用的權限：
 * - can_view: 檢視垃圾桶列表
 * - can_edit: 還原功能
 * - can_delete: 永久刪除
 *
 * 不使用的權限：
 * - can_create: 垃圾桶不需要建立功能
 * - can_manage: 垃圾桶不需要管理功能
 */
async function updateTrashPermissions() {
  const pool = createPool();

  try {
    console.log('開始更新垃圾桶權限...\n');

    // 更新所有垃圾桶權限，將 can_manage 設為 0
    const result = await pool.query(`
      UPDATE role_permissions
      SET
        can_manage = 0,
        description = CASE permission_key
          WHEN 'trash_grids' THEN
            CASE role
              WHEN 'admin' THEN '可檢視、還原和永久刪除網格垃圾桶項目'
              WHEN 'super_admin' THEN '可檢視、還原和永久刪除網格垃圾桶項目'
              WHEN 'grid_manager' THEN '可檢視和還原網格垃圾桶項目（edit=還原）'
              ELSE description
            END
          WHEN 'trash_areas' THEN
            CASE role
              WHEN 'admin' THEN '可檢視、還原和永久刪除災區垃圾桶項目'
              WHEN 'super_admin' THEN '可檢視、還原和永久刪除災區垃圾桶項目'
              WHEN 'grid_manager' THEN '可檢視和還原災區垃圾桶項目（edit=還原）'
              ELSE description
            END
          WHEN 'trash_announcements' THEN
            CASE role
              WHEN 'admin' THEN '可檢視、還原和永久刪除公告垃圾桶項目'
              WHEN 'super_admin' THEN '可檢視、還原和永久刪除公告垃圾桶項目'
              WHEN 'grid_manager' THEN '可檢視和還原公告垃圾桶項目（edit=還原）'
              ELSE description
            END
          ELSE description
        END
      WHERE permission_key IN ('trash_grids', 'trash_areas', 'trash_announcements')
    `);

    console.log(`✓ 成功更新 ${result.rowCount} 筆垃圾桶權限記錄\n`);

    // 顯示更新後的權限設定
    const permissions = await pool.query(`
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
      WHERE permission_key IN ('trash_grids', 'trash_areas', 'trash_announcements')
      ORDER BY
        CASE role
          WHEN 'user' THEN 1
          WHEN 'grid_manager' THEN 2
          WHEN 'admin' THEN 3
          WHEN 'super_admin' THEN 4
        END,
        permission_key
    `);

    console.log('=== 更新後的垃圾桶權限設定 ===\n');

    let currentRole = '';
    permissions.rows.forEach((perm: any) => {
      if (perm.role !== currentRole) {
        currentRole = perm.role;
        console.log(`\n【${perm.role}】`);
      }

      const perms = [];
      if (perm.can_view) perms.push('檢視');
      if (perm.can_create) perms.push('建立');
      if (perm.can_edit) perms.push('編輯(還原)');
      if (perm.can_delete) perms.push('刪除(永久)');
      if (perm.can_manage) perms.push('管理');

      console.log(`  ${perm.permission_name.padEnd(12)} | ${perms.join(', ').padEnd(30)} | ${perm.description}`);
    });

    console.log('\n');
    console.log('=== 權限說明 ===');
    console.log('  檢視: can_view   - 顯示垃圾桶按鈕和列表');
    console.log('  編輯: can_edit   - 還原垃圾桶項目（前端使用 canEdit 檢查）');
    console.log('  刪除: can_delete - 永久刪除項目（前端使用 canDelete 檢查）');
    console.log('  建立: can_create - 垃圾桶不使用此權限');
    console.log('  管理: can_manage - 垃圾桶不使用此權限');

    process.exit(0);
  } catch (error) {
    console.error('更新垃圾桶權限失敗:', error);
    process.exit(1);
  }
}

updateTrashPermissions();
