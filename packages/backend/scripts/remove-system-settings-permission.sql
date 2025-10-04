-- 移除 system_settings 權限（此權限沒有對應的前端 UI 實作）
-- 執行日期: 2025-10-04
-- 原因: system_settings 權限在資料庫中定義，但前端沒有對應的功能頁面

DELETE FROM role_permissions WHERE permission_key = 'system_settings';

-- 確認刪除結果
SELECT
  role,
  permission_key,
  permission_name
FROM role_permissions
WHERE permission_key = 'system_settings';

-- 應該返回 0 筆資料，表示刪除成功
