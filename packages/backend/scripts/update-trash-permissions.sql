-- 更新垃圾桶權限：移除 can_manage 權限
-- 垃圾桶功能實際使用的權限：
-- - can_view: 檢視垃圾桶列表
-- - can_edit: 還原功能
-- - can_delete: 永久刪除
-- 不使用的權限：can_create 和 can_manage

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
WHERE permission_key IN ('trash_grids', 'trash_areas', 'trash_announcements');

-- 顯示更新後的結果
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
  permission_key;
