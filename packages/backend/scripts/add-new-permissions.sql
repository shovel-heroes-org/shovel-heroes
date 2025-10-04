-- 為所有角色添加新的細緻權限

-- 一般使用者 (user) 的系統管理權限
INSERT INTO role_permissions (role, permission_key, permission_name, permission_category, can_view, can_create, can_edit, can_delete, can_manage, description)
VALUES
  ('user', 'users', '使用者管理', '系統管理', 0, 0, 0, 0, 0, '無使用者管理權限'),
  ('user', 'blacklist', '黑名單管理', '系統管理', 0, 0, 0, 0, 0, '無黑名單管理權限'),
  ('user', 'role_permissions', '權限設定', '系統管理', 0, 0, 0, 0, 0, '無權限設定管理權限'),
  ('user', 'audit_logs', '日誌管理', '系統管理', 0, 0, 0, 0, 0, '無日誌檢視權限'),
  ('user', 'system_settings', '系統設定', '系統管理', 0, 0, 0, 0, 0, '無系統設定權限'),
  ('user', 'admin_panel', '管理後台', '系統管理', 0, 0, 0, 0, 0, '無管理後台訪問權限')
ON CONFLICT (role, permission_key) DO NOTHING;

-- 一般使用者 (user) 的垃圾桶權限
INSERT INTO role_permissions (role, permission_key, permission_name, permission_category, can_view, can_create, can_edit, can_delete, can_manage, description)
VALUES
  ('user', 'trash_grids', '網格垃圾桶', '垃圾桶管理', 0, 0, 0, 0, 0, '無網格垃圾桶檢視和還原權限'),
  ('user', 'trash_areas', '災區垃圾桶', '垃圾桶管理', 0, 0, 0, 0, 0, '無災區垃圾桶檢視和還原權限')
ON CONFLICT (role, permission_key) DO NOTHING;

-- 一般使用者 (user) 的個人資料與資源權限
INSERT INTO role_permissions (role, permission_key, permission_name, permission_category, can_view, can_create, can_edit, can_delete, can_manage, description)
VALUES
  ('user', 'profile', '個人資料', '個人管理', 1, 0, 1, 0, 0, '可檢視和編輯自己的個人資料'),
  ('user', 'my_resources', '我的資源', '個人管理', 1, 0, 1, 1, 0, '可檢視、編輯和刪除自己建立的網格、物資等資源')
ON CONFLICT (role, permission_key) DO NOTHING;

-- 網格管理員 (grid_manager) 的系統管理權限
INSERT INTO role_permissions (role, permission_key, permission_name, permission_category, can_view, can_create, can_edit, can_delete, can_manage, description)
VALUES
  ('grid_manager', 'users', '使用者管理', '系統管理', 1, 0, 0, 0, 0, '可檢視使用者列表'),
  ('grid_manager', 'blacklist', '黑名單管理', '系統管理', 0, 0, 0, 0, 0, '無黑名單管理權限'),
  ('grid_manager', 'role_permissions', '權限設定', '系統管理', 0, 0, 0, 0, 0, '無權限設定管理權限'),
  ('grid_manager', 'audit_logs', '日誌管理', '系統管理', 0, 0, 0, 0, 0, '無日誌檢視權限'),
  ('grid_manager', 'system_settings', '系統設定', '系統管理', 0, 0, 0, 0, 0, '無系統設定權限')
ON CONFLICT (role, permission_key) DO NOTHING;

-- 網格管理員 (grid_manager) 的垃圾桶權限
INSERT INTO role_permissions (role, permission_key, permission_name, permission_category, can_view, can_create, can_edit, can_delete, can_manage, description)
VALUES
  ('grid_manager', 'trash_grids', '網格垃圾桶', '垃圾桶管理', 1, 0, 1, 0, 0, '可檢視網格垃圾桶並還原項目'),
  ('grid_manager', 'trash_areas', '災區垃圾桶', '垃圾桶管理', 1, 0, 1, 0, 0, '可檢視災區垃圾桶並還原項目')
ON CONFLICT (role, permission_key) DO NOTHING;

-- 網格管理員 (grid_manager) 的個人資料與資源權限
INSERT INTO role_permissions (role, permission_key, permission_name, permission_category, can_view, can_create, can_edit, can_delete, can_manage, description)
VALUES
  ('grid_manager', 'profile', '個人資料', '個人管理', 1, 0, 1, 0, 0, '可檢視和編輯自己的個人資料'),
  ('grid_manager', 'my_resources', '我的資源', '個人管理', 1, 0, 1, 1, 0, '可檢視、編輯和刪除自己建立的網格、物資等資源')
ON CONFLICT (role, permission_key) DO NOTHING;

-- 管理員 (admin) 的新系統管理權限
INSERT INTO role_permissions (role, permission_key, permission_name, permission_category, can_view, can_create, can_edit, can_delete, can_manage, description)
VALUES
  ('admin', 'role_permissions', '權限設定', '系統管理', 1, 0, 1, 0, 0, '可檢視和部分編輯權限設定'),
  ('admin', 'audit_logs', '日誌管理', '系統管理', 1, 0, 0, 0, 0, '可檢視日誌'),
  ('admin', 'system_settings', '系統設定', '系統管理', 1, 0, 1, 0, 0, '可檢視和編輯系統設定')
ON CONFLICT (role, permission_key) DO NOTHING;

-- 管理員 (admin) 的垃圾桶權限
INSERT INTO role_permissions (role, permission_key, permission_name, permission_category, can_view, can_create, can_edit, can_delete, can_manage, description)
VALUES
  ('admin', 'trash_grids', '網格垃圾桶', '垃圾桶管理', 1, 0, 1, 1, 1, '可完整管理網格垃圾桶（檢視、還原、永久刪除）'),
  ('admin', 'trash_areas', '災區垃圾桶', '垃圾桶管理', 1, 0, 1, 1, 1, '可完整管理災區垃圾桶（檢視、還原、永久刪除）')
ON CONFLICT (role, permission_key) DO NOTHING;

-- 管理員 (admin) 的個人資料與資源權限
INSERT INTO role_permissions (role, permission_key, permission_name, permission_category, can_view, can_create, can_edit, can_delete, can_manage, description)
VALUES
  ('admin', 'profile', '個人資料', '個人管理', 1, 0, 1, 0, 0, '可檢視和編輯自己的個人資料'),
  ('admin', 'my_resources', '我的資源', '個人管理', 1, 0, 1, 1, 1, '可完整管理自己建立的網格、物資等資源')
ON CONFLICT (role, permission_key) DO NOTHING;

-- 超級管理員 (super_admin) 的垃圾桶權限
INSERT INTO role_permissions (role, permission_key, permission_name, permission_category, can_view, can_create, can_edit, can_delete, can_manage, description)
VALUES
  ('super_admin', 'trash_grids', '網格垃圾桶', '垃圾桶管理', 1, 0, 1, 1, 1, '完整管理網格垃圾桶（檢視、還原、永久刪除）'),
  ('super_admin', 'trash_areas', '災區垃圾桶', '垃圾桶管理', 1, 0, 1, 1, 1, '完整管理災區垃圾桶（檢視、還原、永久刪除）')
ON CONFLICT (role, permission_key) DO NOTHING;

-- 超級管理員 (super_admin) 的個人資料與資源權限
INSERT INTO role_permissions (role, permission_key, permission_name, permission_category, can_view, can_create, can_edit, can_delete, can_manage, description)
VALUES
  ('super_admin', 'profile', '個人資料', '個人管理', 1, 0, 1, 0, 0, '可檢視和編輯自己的個人資料'),
  ('super_admin', 'my_resources', '我的資源', '個人管理', 1, 0, 1, 1, 1, '可完整管理自己建立的網格、物資等資源')
ON CONFLICT (role, permission_key) DO NOTHING;

-- 查詢最終結果
SELECT role, COUNT(*) as permission_count
FROM role_permissions
GROUP BY role
ORDER BY CASE role
  WHEN 'guest' THEN 1
  WHEN 'user' THEN 2
  WHEN 'grid_manager' THEN 3
  WHEN 'admin' THEN 4
  WHEN 'super_admin' THEN 5
END;

SELECT COUNT(*) as total_permissions FROM role_permissions;
