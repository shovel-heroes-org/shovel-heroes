-- 修復 admin 角色的 role_permissions 權限
-- 讓 admin 能夠檢視和管理權限設定

UPDATE role_permissions
SET
  can_view = 1,
  can_edit = 1,
  can_manage = 1,
  description = '可檢視和管理權限設定',
  updated_at = NOW()
WHERE
  role = 'admin'
  AND permission_key = 'role_permissions';

-- 檢查更新結果
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
WHERE permission_key = 'role_permissions'
ORDER BY
  CASE role
    WHEN 'super_admin' THEN 1
    WHEN 'admin' THEN 2
    WHEN 'grid_manager' THEN 3
    WHEN 'user' THEN 4
    WHEN 'guest' THEN 5
  END;
