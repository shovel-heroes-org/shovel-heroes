import { createPool } from '../src/lib/db.js';
import * as dotenv from 'dotenv';

dotenv.config();

const permissions = [
  // 訪客權限
  { role: 'guest', permission_key: 'disaster_areas', permission_name: '災區管理', permission_category: '基礎管理', can_view: 1, can_create: 0, can_edit: 0, can_delete: 0, can_manage: 0, description: '可檢視災區列表和詳細資訊' },
  { role: 'guest', permission_key: 'grids', permission_name: '網格管理', permission_category: '基礎管理', can_view: 1, can_create: 0, can_edit: 0, can_delete: 0, can_manage: 0, description: '可檢視網格資訊' },
  { role: 'guest', permission_key: 'volunteers', permission_name: '志工管理', permission_category: '人員管理', can_view: 1, can_create: 0, can_edit: 0, can_delete: 0, can_manage: 0, description: '可檢視志工列表' },
  { role: 'guest', permission_key: 'supplies', permission_name: '物資管理', permission_category: '資源管理', can_view: 1, can_create: 0, can_edit: 0, can_delete: 0, can_manage: 0, description: '可檢視物資資訊' },
  // 隱私管理權限（訪客）
  { role: 'guest', permission_key: 'view_volunteer_contact', permission_name: '檢視志工聯絡資訊', permission_category: '隱私管理', can_view: 0, can_create: 0, can_edit: 0, can_delete: 0, can_manage: 0, description: '無權限檢視志工的聯絡資訊（電話、電子郵件等）' },
  { role: 'guest', permission_key: 'view_donor_contact', permission_name: '檢視捐贈者聯絡資訊', permission_category: '隱私管理', can_view: 0, can_create: 0, can_edit: 0, can_delete: 0, can_manage: 0, description: '無權限檢視捐贈者的聯絡資訊（電話、電子郵件等）' },
  { role: 'guest', permission_key: 'view_grid_contact', permission_name: '檢視網格區域聯絡人資訊', permission_category: '隱私管理', can_view: 1, can_create: 0, can_edit: 0, can_delete: 0, can_manage: 0, description: '可檢視網格區域聯絡人的公開資訊' },

  // 一般使用者權限
  { role: 'user', permission_key: 'disaster_areas', permission_name: '災區管理', permission_category: '基礎管理', can_view: 1, can_create: 0, can_edit: 0, can_delete: 0, can_manage: 0, description: '可檢視災區列表和詳細資訊' },
  { role: 'user', permission_key: 'grids', permission_name: '網格管理', permission_category: '基礎管理', can_view: 1, can_create: 1, can_edit: 1, can_delete: 0, can_manage: 0, description: '可建立和編輯自己的網格' },
  { role: 'user', permission_key: 'volunteers', permission_name: '志工管理', permission_category: '人員管理', can_view: 1, can_create: 0, can_edit: 0, can_delete: 0, can_manage: 0, description: '可檢視志工列表' },
  { role: 'user', permission_key: 'volunteer_registrations', permission_name: '志工報名', permission_category: '人員管理', can_view: 1, can_create: 1, can_edit: 1, can_delete: 0, can_manage: 0, description: '可報名成為志工並管理自己的報名' },
  { role: 'user', permission_key: 'supplies', permission_name: '物資管理', permission_category: '資源管理', can_view: 1, can_create: 1, can_edit: 0, can_delete: 0, can_manage: 0, description: '可檢視物資資訊並建立需求' },
  { role: 'user', permission_key: 'announcements', permission_name: '公告管理', permission_category: '資訊管理', can_view: 1, can_create: 0, can_edit: 0, can_delete: 0, can_manage: 0, description: '可檢視公告' },
  // 系統管理權限（一般使用者）
  { role: 'user', permission_key: 'users', permission_name: '使用者管理', permission_category: '系統管理', can_view: 0, can_create: 0, can_edit: 0, can_delete: 0, can_manage: 0, description: '無使用者管理權限' },
  { role: 'user', permission_key: 'blacklist', permission_name: '黑名單管理', permission_category: '系統管理', can_view: 0, can_create: 0, can_edit: 0, can_delete: 0, can_manage: 0, description: '無黑名單管理權限' },
  { role: 'user', permission_key: 'role_permissions', permission_name: '權限設定', permission_category: '系統管理', can_view: 0, can_create: 0, can_edit: 0, can_delete: 0, can_manage: 0, description: '無權限設定管理權限' },
  { role: 'user', permission_key: 'audit_logs', permission_name: '日誌管理', permission_category: '系統管理', can_view: 0, can_create: 0, can_edit: 0, can_delete: 0, can_manage: 0, description: '無日誌檢視權限' },
  { role: 'user', permission_key: 'admin_panel', permission_name: '需求管理（後台訪問）', permission_category: '系統管理', can_view: 0, can_create: 0, can_edit: 0, can_delete: 0, can_manage: 0, description: '無管理後台訪問權限' },
  // 垃圾桶權限（一般使用者）- 注意：edit=還原, delete=永久刪除, create不使用
  { role: 'user', permission_key: 'trash_grids', permission_name: '網格垃圾桶', permission_category: '垃圾桶管理', can_view: 0, can_create: 0, can_edit: 0, can_delete: 0, can_manage: 0, description: '無網格垃圾桶檢視和還原權限' },
  { role: 'user', permission_key: 'trash_areas', permission_name: '災區垃圾桶', permission_category: '垃圾桶管理', can_view: 0, can_create: 0, can_edit: 0, can_delete: 0, can_manage: 0, description: '無災區垃圾桶檢視和還原權限' },
  { role: 'user', permission_key: 'trash_announcements', permission_name: '公告垃圾桶', permission_category: '垃圾桶管理', can_view: 0, can_create: 0, can_edit: 0, can_delete: 0, can_manage: 0, description: '無公告垃圾桶檢視和還原權限' },
  // 隱私管理權限（一般使用者）
  { role: 'user', permission_key: 'view_volunteer_contact', permission_name: '檢視志工聯絡資訊', permission_category: '隱私管理', can_view: 1, can_create: 0, can_edit: 0, can_delete: 0, can_manage: 0, description: '可檢視自己建立的網格中志工的聯絡資訊，以及自己作為志工的聯絡資訊' },
  { role: 'user', permission_key: 'view_donor_contact', permission_name: '檢視捐贈者聯絡資訊', permission_category: '隱私管理', can_view: 1, can_create: 0, can_edit: 0, can_delete: 0, can_manage: 0, description: '可檢視自己建立的網格中捐贈者的聯絡資訊，以及自己作為捐贈者的聯絡資訊' },
  { role: 'user', permission_key: 'view_grid_contact', permission_name: '檢視網格區域聯絡人資訊', permission_category: '隱私管理', can_view: 1, can_create: 0, can_edit: 0, can_delete: 0, can_manage: 0, description: '可檢視所有網格區域聯絡人的資訊' },

  // 網格管理員權限
  { role: 'grid_manager', permission_key: 'disaster_areas', permission_name: '災區管理', permission_category: '基礎管理', can_view: 1, can_create: 0, can_edit: 1, can_delete: 0, can_manage: 0, description: '可檢視和編輯災區資訊' },
  { role: 'grid_manager', permission_key: 'grids', permission_name: '網格管理', permission_category: '基礎管理', can_view: 1, can_create: 1, can_edit: 1, can_delete: 1, can_manage: 0, description: '可完整管理所有網格' },
  { role: 'grid_manager', permission_key: 'volunteers', permission_name: '志工管理', permission_category: '人員管理', can_view: 1, can_create: 1, can_edit: 1, can_delete: 0, can_manage: 0, description: '可管理志工資訊' },
  { role: 'grid_manager', permission_key: 'volunteer_registrations', permission_name: '志工報名', permission_category: '人員管理', can_view: 1, can_create: 1, can_edit: 1, can_delete: 1, can_manage: 0, description: '可管理志工報名' },
  { role: 'grid_manager', permission_key: 'supplies', permission_name: '物資管理', permission_category: '資源管理', can_view: 1, can_create: 1, can_edit: 1, can_delete: 0, can_manage: 0, description: '可管理物資資訊' },
  { role: 'grid_manager', permission_key: 'announcements', permission_name: '公告管理', permission_category: '資訊管理', can_view: 1, can_create: 1, can_edit: 1, can_delete: 1, can_manage: 0, description: '可管理公告' },
  // 系統管理權限（網格管理員）
  { role: 'grid_manager', permission_key: 'users', permission_name: '使用者管理', permission_category: '系統管理', can_view: 1, can_create: 0, can_edit: 0, can_delete: 0, can_manage: 0, description: '可檢視使用者列表' },
  { role: 'grid_manager', permission_key: 'blacklist', permission_name: '黑名單管理', permission_category: '系統管理', can_view: 0, can_create: 0, can_edit: 0, can_delete: 0, can_manage: 0, description: '無黑名單管理權限' },
  { role: 'grid_manager', permission_key: 'role_permissions', permission_name: '權限設定', permission_category: '系統管理', can_view: 0, can_create: 0, can_edit: 0, can_delete: 0, can_manage: 0, description: '無權限設定管理權限' },
  { role: 'grid_manager', permission_key: 'audit_logs', permission_name: '日誌管理', permission_category: '系統管理', can_view: 0, can_create: 0, can_edit: 0, can_delete: 0, can_manage: 0, description: '無日誌檢視權限' },
  { role: 'grid_manager', permission_key: 'admin_panel', permission_name: '需求管理（後台訪問）', permission_category: '系統管理', can_view: 1, can_create: 0, can_edit: 0, can_delete: 0, can_manage: 0, description: '可訪問管理後台檢視需求資料' },
  // 垃圾桶權限（網格管理員）- 注意：edit=還原, delete=永久刪除, create不使用
  { role: 'grid_manager', permission_key: 'trash_grids', permission_name: '網格垃圾桶', permission_category: '垃圾桶管理', can_view: 1, can_create: 0, can_edit: 1, can_delete: 0, can_manage: 0, description: '可檢視和還原網格垃圾桶項目（edit=還原）' },
  { role: 'grid_manager', permission_key: 'trash_areas', permission_name: '災區垃圾桶', permission_category: '垃圾桶管理', can_view: 1, can_create: 0, can_edit: 1, can_delete: 0, can_manage: 0, description: '可檢視和還原災區垃圾桶項目（edit=還原）' },
  { role: 'grid_manager', permission_key: 'trash_announcements', permission_name: '公告垃圾桶', permission_category: '垃圾桶管理', can_view: 1, can_create: 0, can_edit: 1, can_delete: 0, can_manage: 0, description: '可檢視和還原公告垃圾桶項目（edit=還原）' },
  // 隱私管理權限（網格管理員）
  { role: 'grid_manager', permission_key: 'view_volunteer_contact', permission_name: '檢視志工聯絡資訊', permission_category: '隱私管理', can_view: 1, can_create: 0, can_edit: 0, can_delete: 0, can_manage: 0, description: '可檢視所有網格中志工的聯絡資訊' },
  { role: 'grid_manager', permission_key: 'view_donor_contact', permission_name: '檢視捐贈者聯絡資訊', permission_category: '隱私管理', can_view: 1, can_create: 0, can_edit: 0, can_delete: 0, can_manage: 0, description: '可檢視所有網格中捐贈者的聯絡資訊' },
  { role: 'grid_manager', permission_key: 'view_grid_contact', permission_name: '檢視網格區域聯絡人資訊', permission_category: '隱私管理', can_view: 1, can_create: 0, can_edit: 0, can_delete: 0, can_manage: 0, description: '可檢視所有網格區域聯絡人的資訊' },

  // 管理員權限
  { role: 'admin', permission_key: 'disaster_areas', permission_name: '災區管理', permission_category: '基礎管理', can_view: 1, can_create: 1, can_edit: 1, can_delete: 1, can_manage: 1, description: '可完整管理災區' },
  { role: 'admin', permission_key: 'grids', permission_name: '網格管理', permission_category: '基礎管理', can_view: 1, can_create: 1, can_edit: 1, can_delete: 1, can_manage: 1, description: '可完整管理所有網格' },
  { role: 'admin', permission_key: 'volunteers', permission_name: '志工管理', permission_category: '人員管理', can_view: 1, can_create: 1, can_edit: 1, can_delete: 1, can_manage: 1, description: '可完整管理志工' },
  { role: 'admin', permission_key: 'volunteer_registrations', permission_name: '志工報名', permission_category: '人員管理', can_view: 1, can_create: 1, can_edit: 1, can_delete: 1, can_manage: 1, description: '可完整管理志工報名' },
  { role: 'admin', permission_key: 'supplies', permission_name: '物資管理', permission_category: '資源管理', can_view: 1, can_create: 1, can_edit: 1, can_delete: 1, can_manage: 1, description: '可完整管理物資' },
  { role: 'admin', permission_key: 'announcements', permission_name: '公告管理', permission_category: '資訊管理', can_view: 1, can_create: 1, can_edit: 1, can_delete: 1, can_manage: 1, description: '可完整管理公告' },
  // 系統管理權限（管理員）
  { role: 'admin', permission_key: 'users', permission_name: '使用者管理', permission_category: '系統管理', can_view: 1, can_create: 1, can_edit: 1, can_delete: 0, can_manage: 1, description: '可管理一般使用者（不含超級管理員）' },
  { role: 'admin', permission_key: 'blacklist', permission_name: '黑名單管理', permission_category: '系統管理', can_view: 1, can_create: 1, can_edit: 1, can_delete: 1, can_manage: 1, description: '可管理使用者黑名單' },
  { role: 'admin', permission_key: 'role_permissions', permission_name: '權限設定', permission_category: '系統管理', can_view: 1, can_create: 0, can_edit: 1, can_delete: 0, can_manage: 0, description: '可檢視和部分編輯權限設定' },
  { role: 'admin', permission_key: 'audit_logs', permission_name: '日誌管理', permission_category: '系統管理', can_view: 1, can_create: 0, can_edit: 0, can_delete: 0, can_manage: 0, description: '可檢視日誌' },
  { role: 'admin', permission_key: 'admin_panel', permission_name: '需求管理（後台訪問）', permission_category: '系統管理', can_view: 1, can_create: 1, can_edit: 1, can_delete: 1, can_manage: 1, description: '可完整訪問管理後台的需求管理功能' },
  // 垃圾桶權限（管理員）- view=檢視, edit=還原, delete=永久刪除（不使用 create 和 manage）
  { role: 'admin', permission_key: 'trash_grids', permission_name: '網格垃圾桶', permission_category: '垃圾桶管理', can_view: 1, can_create: 0, can_edit: 1, can_delete: 1, can_manage: 0, description: '可檢視、還原和永久刪除網格垃圾桶項目' },
  { role: 'admin', permission_key: 'trash_areas', permission_name: '災區垃圾桶', permission_category: '垃圾桶管理', can_view: 1, can_create: 0, can_edit: 1, can_delete: 1, can_manage: 0, description: '可檢視、還原和永久刪除災區垃圾桶項目' },
  { role: 'admin', permission_key: 'trash_announcements', permission_name: '公告垃圾桶', permission_category: '垃圾桶管理', can_view: 1, can_create: 0, can_edit: 1, can_delete: 1, can_manage: 0, description: '可檢視、還原和永久刪除公告垃圾桶項目' },
  // 隱私管理權限（管理員）
  { role: 'admin', permission_key: 'view_volunteer_contact', permission_name: '檢視志工聯絡資訊', permission_category: '隱私管理', can_view: 1, can_create: 0, can_edit: 0, can_delete: 0, can_manage: 0, description: '可檢視所有志工的聯絡資訊' },
  { role: 'admin', permission_key: 'view_donor_contact', permission_name: '檢視捐贈者聯絡資訊', permission_category: '隱私管理', can_view: 1, can_create: 0, can_edit: 0, can_delete: 0, can_manage: 0, description: '可檢視所有捐贈者的聯絡資訊' },
  { role: 'admin', permission_key: 'view_grid_contact', permission_name: '檢視網格區域聯絡人資訊', permission_category: '隱私管理', can_view: 1, can_create: 0, can_edit: 0, can_delete: 0, can_manage: 0, description: '可檢視所有網格區域聯絡人的資訊' },

  // 超級管理員權限
  { role: 'super_admin', permission_key: 'disaster_areas', permission_name: '災區管理', permission_category: '基礎管理', can_view: 1, can_create: 1, can_edit: 1, can_delete: 1, can_manage: 1, description: '完整災區管理權限' },
  { role: 'super_admin', permission_key: 'grids', permission_name: '網格管理', permission_category: '基礎管理', can_view: 1, can_create: 1, can_edit: 1, can_delete: 1, can_manage: 1, description: '完整網格管理權限' },
  { role: 'super_admin', permission_key: 'volunteers', permission_name: '志工管理', permission_category: '人員管理', can_view: 1, can_create: 1, can_edit: 1, can_delete: 1, can_manage: 1, description: '完整志工管理權限' },
  { role: 'super_admin', permission_key: 'volunteer_registrations', permission_name: '志工報名', permission_category: '人員管理', can_view: 1, can_create: 1, can_edit: 1, can_delete: 1, can_manage: 1, description: '完整志工報名管理權限' },
  { role: 'super_admin', permission_key: 'supplies', permission_name: '物資管理', permission_category: '資源管理', can_view: 1, can_create: 1, can_edit: 1, can_delete: 1, can_manage: 1, description: '完整物資管理權限' },
  { role: 'super_admin', permission_key: 'announcements', permission_name: '公告管理', permission_category: '資訊管理', can_view: 1, can_create: 1, can_edit: 1, can_delete: 1, can_manage: 1, description: '完整公告管理權限' },
  // 系統管理權限（超級管理員）
  { role: 'super_admin', permission_key: 'users', permission_name: '使用者管理', permission_category: '系統管理', can_view: 1, can_create: 1, can_edit: 1, can_delete: 1, can_manage: 1, description: '完整使用者管理權限，包含角色變更' },
  { role: 'super_admin', permission_key: 'blacklist', permission_name: '黑名單管理', permission_category: '系統管理', can_view: 1, can_create: 1, can_edit: 1, can_delete: 1, can_manage: 1, description: '完整黑名單管理權限' },
  { role: 'super_admin', permission_key: 'role_permissions', permission_name: '權限設定', permission_category: '系統管理', can_view: 1, can_create: 1, can_edit: 1, can_delete: 1, can_manage: 1, description: '可管理所有角色的權限設定' },
  { role: 'super_admin', permission_key: 'audit_logs', permission_name: '日誌管理', permission_category: '系統管理', can_view: 1, can_create: 0, can_edit: 0, can_delete: 0, can_manage: 1, description: '可檢視和匯出系統日誌' },
  { role: 'super_admin', permission_key: 'admin_panel', permission_name: '需求管理（後台訪問）', permission_category: '系統管理', can_view: 1, can_create: 1, can_edit: 1, can_delete: 1, can_manage: 1, description: '完整管理後台權限，包含所有需求管理功能' },
  // 垃圾桶權限（超級管理員）- view=檢視, edit=還原, delete=永久刪除（不使用 create 和 manage）
  { role: 'super_admin', permission_key: 'trash_grids', permission_name: '網格垃圾桶', permission_category: '垃圾桶管理', can_view: 1, can_create: 0, can_edit: 1, can_delete: 1, can_manage: 0, description: '可檢視、還原和永久刪除網格垃圾桶項目' },
  { role: 'super_admin', permission_key: 'trash_areas', permission_name: '災區垃圾桶', permission_category: '垃圾桶管理', can_view: 1, can_create: 0, can_edit: 1, can_delete: 1, can_manage: 0, description: '可檢視、還原和永久刪除災區垃圾桶項目' },
  { role: 'super_admin', permission_key: 'trash_announcements', permission_name: '公告垃圾桶', permission_category: '垃圾桶管理', can_view: 1, can_create: 0, can_edit: 1, can_delete: 1, can_manage: 0, description: '可檢視、還原和永久刪除公告垃圾桶項目' },
  // 隱私管理權限（超級管理員）
  { role: 'super_admin', permission_key: 'view_volunteer_contact', permission_name: '檢視志工聯絡資訊', permission_category: '隱私管理', can_view: 1, can_create: 0, can_edit: 0, can_delete: 0, can_manage: 0, description: '可檢視所有志工的聯絡資訊' },
  { role: 'super_admin', permission_key: 'view_donor_contact', permission_name: '檢視捐贈者聯絡資訊', permission_category: '隱私管理', can_view: 1, can_create: 0, can_edit: 0, can_delete: 0, can_manage: 0, description: '可檢視所有捐贈者的聯絡資訊' },
  { role: 'super_admin', permission_key: 'view_grid_contact', permission_name: '檢視網格區域聯絡人資訊', permission_category: '隱私管理', can_view: 1, can_create: 0, can_edit: 0, can_delete: 0, can_manage: 0, description: '可檢視所有網格區域聯絡人的資訊' },
];

async function initPermissions() {
  const pool = createPool();

  try {
    console.log('開始初始化權限資料...');

    for (const perm of permissions) {
      await pool.query(`
        INSERT INTO role_permissions (
          role, permission_key, permission_name, permission_category,
          can_view, can_create, can_edit, can_delete, can_manage, description
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT (role, permission_key) DO NOTHING
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
    }

    console.log(`成功初始化 ${permissions.length} 條權限資料`);

    // 顯示統計
    const result = await pool.query('SELECT role, COUNT(*) as count FROM role_permissions GROUP BY role ORDER BY role');
    console.log('\n權限統計：');
    result.rows.forEach((row: any) => {
      console.log(`  ${row.role}: ${row.count} 項權限`);
    });

    process.exit(0);
  } catch (error) {
    console.error('初始化權限資料失敗:', error);
    process.exit(1);
  }
}

initPermissions();
