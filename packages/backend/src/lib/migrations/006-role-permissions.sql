-- 權限授權設定資料表
-- 此資料表用於管理不同角色對各功能的存取權限
-- 本文件根據 2025-10-06 實際資料庫狀態生成

CREATE TABLE IF NOT EXISTS role_permissions (
  id SERIAL PRIMARY KEY,
  role TEXT NOT NULL CHECK(role IN ('user', 'grid_manager', 'admin', 'super_admin', 'guest')),
  permission_key TEXT NOT NULL,
  permission_name TEXT NOT NULL,
  permission_category TEXT NOT NULL,
  can_view INTEGER NOT NULL DEFAULT 0,
  can_create INTEGER NOT NULL DEFAULT 0,
  can_edit INTEGER NOT NULL DEFAULT 0,
  can_delete INTEGER NOT NULL DEFAULT 0,
  can_manage INTEGER NOT NULL DEFAULT 0,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(role, permission_key)
);

-- 建立索引以提升查詢效能
CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON role_permissions(role);
CREATE INDEX IF NOT EXISTS idx_role_permissions_key ON role_permissions(permission_key);
CREATE INDEX IF NOT EXISTS idx_role_permissions_role_key ON role_permissions(role, permission_key);


-- ========================================
-- 訪客（guest）權限
-- ========================================

-- 志工報名
INSERT INTO role_permissions (role, permission_key, permission_name, permission_category, can_view, can_create, can_edit, can_delete, can_manage, description)
VALUES ('guest', 'volunteer_registrations', '志工報名', '人員管理', 0, 0, 0, 0, 0, '管理志工報名與調度')
ON CONFLICT (role, permission_key) DO UPDATE SET
  can_view = 0, can_create = 0, can_edit = 0, can_delete = 0, can_manage = 0,
  permission_name = '志工報名', permission_category = '人員管理',
  description = '管理志工報名與調度';

-- 志工狀態管理
INSERT INTO role_permissions (role, permission_key, permission_name, permission_category, can_view, can_create, can_edit, can_delete, can_manage, description)
VALUES ('guest', 'volunteer_status_management', '志工狀態管理', '人員管理', 0, 0, 0, 0, 0, '控制志工報名狀態操作按鈕（確認報名/婉拒、標記到場、標記完成）')
ON CONFLICT (role, permission_key) DO UPDATE SET
  can_view = 0, can_create = 0, can_edit = 0, can_delete = 0, can_manage = 0,
  permission_name = '志工狀態管理', permission_category = '人員管理',
  description = '控制志工報名狀態操作按鈕（確認報名/婉拒、標記到場、標記完成）';

-- 志工管理
INSERT INTO role_permissions (role, permission_key, permission_name, permission_category, can_view, can_create, can_edit, can_delete, can_manage, description)
VALUES ('guest', 'volunteers', '志工管理', '人員管理', 0, 0, 0, 0, 0, '可檢視志工列表')
ON CONFLICT (role, permission_key) DO UPDATE SET
  can_view = 0, can_create = 0, can_edit = 0, can_delete = 0, can_manage = 0,
  permission_name = '志工管理', permission_category = '人員管理',
  description = '可檢視志工列表';

-- 公告垃圾桶
INSERT INTO role_permissions (role, permission_key, permission_name, permission_category, can_view, can_create, can_edit, can_delete, can_manage, description)
VALUES ('guest', 'trash_announcements', '公告垃圾桶', '垃圾桶管理', 0, 0, 0, 0, 0, '訪客角色的公告垃圾桶權限')
ON CONFLICT (role, permission_key) DO UPDATE SET
  can_view = 0, can_create = 0, can_edit = 0, can_delete = 0, can_manage = 0,
  permission_name = '公告垃圾桶', permission_category = '垃圾桶管理',
  description = '訪客角色的公告垃圾桶權限';

-- 災區垃圾桶
INSERT INTO role_permissions (role, permission_key, permission_name, permission_category, can_view, can_create, can_edit, can_delete, can_manage, description)
VALUES ('guest', 'trash_areas', '災區垃圾桶', '垃圾桶管理', 0, 0, 0, 0, 0, '訪客角色的災區垃圾桶權限')
ON CONFLICT (role, permission_key) DO UPDATE SET
  can_view = 0, can_create = 0, can_edit = 0, can_delete = 0, can_manage = 0,
  permission_name = '災區垃圾桶', permission_category = '垃圾桶管理',
  description = '訪客角色的災區垃圾桶權限';

-- 網格垃圾桶
INSERT INTO role_permissions (role, permission_key, permission_name, permission_category, can_view, can_create, can_edit, can_delete, can_manage, description)
VALUES ('guest', 'trash_grids', '網格垃圾桶', '垃圾桶管理', 0, 0, 0, 0, 0, '訪客角色的網格垃圾桶權限')
ON CONFLICT (role, permission_key) DO UPDATE SET
  can_view = 0, can_create = 0, can_edit = 0, can_delete = 0, can_manage = 0,
  permission_name = '網格垃圾桶', permission_category = '垃圾桶管理',
  description = '訪客角色的網格垃圾桶權限';

-- 物資垃圾桶
INSERT INTO role_permissions (role, permission_key, permission_name, permission_category, can_view, can_create, can_edit, can_delete, can_manage, description)
VALUES ('guest', 'trash_supplies', '物資垃圾桶', '垃圾桶管理', 0, 0, 0, 0, 0, '可檢視、還原和永久刪除垃圾桶項目')
ON CONFLICT (role, permission_key) DO UPDATE SET
  can_view = 0, can_create = 0, can_edit = 0, can_delete = 0, can_manage = 0,
  permission_name = '物資垃圾桶', permission_category = '垃圾桶管理',
  description = '可檢視、還原和永久刪除垃圾桶項目';

-- 災區管理
INSERT INTO role_permissions (role, permission_key, permission_name, permission_category, can_view, can_create, can_edit, can_delete, can_manage, description)
VALUES ('guest', 'disaster_areas', '災區管理', '基礎管理', 1, 0, 0, 0, 0, '可檢視災區列表和詳細資訊')
ON CONFLICT (role, permission_key) DO UPDATE SET
  can_view = 1, can_create = 0, can_edit = 0, can_delete = 0, can_manage = 0,
  permission_name = '災區管理', permission_category = '基礎管理',
  description = '可檢視災區列表和詳細資訊';

-- 網格管理
INSERT INTO role_permissions (role, permission_key, permission_name, permission_category, can_view, can_create, can_edit, can_delete, can_manage, description)
VALUES ('guest', 'grids', '網格管理', '基礎管理', 1, 0, 0, 0, 0, '可檢視網格資訊')
ON CONFLICT (role, permission_key) DO UPDATE SET
  can_view = 1, can_create = 0, can_edit = 0, can_delete = 0, can_manage = 0,
  permission_name = '網格管理', permission_category = '基礎管理',
  description = '可檢視網格資訊';

-- 物資管理
INSERT INTO role_permissions (role, permission_key, permission_name, permission_category, can_view, can_create, can_edit, can_delete, can_manage, description)
VALUES ('guest', 'supplies', '物資管理', '資源管理', 1, 0, 0, 0, 0, '可檢視物資資訊')
ON CONFLICT (role, permission_key) DO UPDATE SET
  can_view = 1, can_create = 0, can_edit = 0, can_delete = 0, can_manage = 0,
  permission_name = '物資管理', permission_category = '資源管理',
  description = '可檢視物資資訊';

-- 物資狀態管理
INSERT INTO role_permissions (role, permission_key, permission_name, permission_category, can_view, can_create, can_edit, can_delete, can_manage, description)
VALUES ('guest', 'supplies_status_management', '物資狀態管理', '資源管理', 0, 0, 0, 0, 0, '管理物資捐贈狀態（確認捐贈、標記運送中、確認送達、確認收到）')
ON CONFLICT (role, permission_key) DO UPDATE SET
  can_view = 0, can_create = 0, can_edit = 0, can_delete = 0, can_manage = 0,
  permission_name = '物資狀態管理', permission_category = '資源管理',
  description = '管理物資捐贈狀態（確認捐贈、標記運送中、確認送達、確認收到）';

-- 檢視捐贈者聯絡資訊
INSERT INTO role_permissions (role, permission_key, permission_name, permission_category, can_view, can_create, can_edit, can_delete, can_manage, description)
VALUES ('guest', 'view_donor_contact', '檢視捐贈者聯絡資訊', '隱私管理', 0, 0, 0, 0, 0, '訪客無法檢視捐贈者聯絡資訊')
ON CONFLICT (role, permission_key) DO UPDATE SET
  can_view = 0, can_create = 0, can_edit = 0, can_delete = 0, can_manage = 0,
  permission_name = '檢視捐贈者聯絡資訊', permission_category = '隱私管理',
  description = '訪客無法檢視捐贈者聯絡資訊';

-- 檢視網格聯絡資訊
INSERT INTO role_permissions (role, permission_key, permission_name, permission_category, can_view, can_create, can_edit, can_delete, can_manage, description)
VALUES ('guest', 'view_grid_contact', '檢視網格聯絡資訊', '隱私管理', 1, 0, 0, 0, 0, '訪客可檢視網格建立者的公開聯絡資訊')
ON CONFLICT (role, permission_key) DO UPDATE SET
  can_view = 1, can_create = 0, can_edit = 0, can_delete = 0, can_manage = 0,
  permission_name = '檢視網格聯絡資訊', permission_category = '隱私管理',
  description = '訪客可檢視網格建立者的公開聯絡資訊';

-- 檢視志工聯絡資訊
INSERT INTO role_permissions (role, permission_key, permission_name, permission_category, can_view, can_create, can_edit, can_delete, can_manage, description)
VALUES ('guest', 'view_volunteer_contact', '檢視志工聯絡資訊', '隱私管理', 0, 0, 0, 0, 0, '訪客無法檢視志工聯絡資訊')
ON CONFLICT (role, permission_key) DO UPDATE SET
  can_view = 0, can_create = 0, can_edit = 0, can_delete = 0, can_manage = 0,
  permission_name = '檢視志工聯絡資訊', permission_category = '隱私管理',
  description = '訪客無法檢視志工聯絡資訊';

-- 權限設定
INSERT INTO role_permissions (role, permission_key, permission_name, permission_category, can_view, can_create, can_edit, can_delete, can_manage, description)
VALUES ('guest', 'role_permissions', '權限設定', '系統管理', 0, 0, 0, 0, 0, '無權限設定管理權限')
ON CONFLICT (role, permission_key) DO UPDATE SET
  can_view = 0, can_create = 0, can_edit = 0, can_delete = 0, can_manage = 0,
  permission_name = '權限設定', permission_category = '系統管理',
  description = '無權限設定管理權限';


-- ========================================
-- 一般使用者（user）權限
-- ========================================

-- 志工報名
INSERT INTO role_permissions (role, permission_key, permission_name, permission_category, can_view, can_create, can_edit, can_delete, can_manage, description)
VALUES ('user', 'volunteer_registrations', '志工報名', '人員管理', 1, 1, 1, 0, 0, '可報名成為志工並管理自己的報名')
ON CONFLICT (role, permission_key) DO UPDATE SET
  can_view = 1, can_create = 1, can_edit = 1, can_delete = 0, can_manage = 0,
  permission_name = '志工報名', permission_category = '人員管理',
  description = '可報名成為志工並管理自己的報名';

-- 志工狀態管理
INSERT INTO role_permissions (role, permission_key, permission_name, permission_category, can_view, can_create, can_edit, can_delete, can_manage, description)
VALUES ('user', 'volunteer_status_management', '志工狀態管理', '人員管理', 1, 0, 0, 0, 0, '控制志工報名狀態操作按鈕（確認報名/婉拒、標記到場、標記完成）')
ON CONFLICT (role, permission_key) DO UPDATE SET
  can_view = 1, can_create = 0, can_edit = 0, can_delete = 0, can_manage = 0,
  permission_name = '志工狀態管理', permission_category = '人員管理',
  description = '控制志工報名狀態操作按鈕（確認報名/婉拒、標記到場、標記完成）';

-- 志工管理
INSERT INTO role_permissions (role, permission_key, permission_name, permission_category, can_view, can_create, can_edit, can_delete, can_manage, description)
VALUES ('user', 'volunteers', '志工管理', '人員管理', 1, 0, 0, 0, 0, '可檢視志工列表')
ON CONFLICT (role, permission_key) DO UPDATE SET
  can_view = 1, can_create = 0, can_edit = 0, can_delete = 0, can_manage = 0,
  permission_name = '志工管理', permission_category = '人員管理',
  description = '可檢視志工列表';

-- 公告垃圾桶
INSERT INTO role_permissions (role, permission_key, permission_name, permission_category, can_view, can_create, can_edit, can_delete, can_manage, description)
VALUES ('user', 'trash_announcements', '公告垃圾桶', '垃圾桶管理', 0, 0, 0, 0, 0, '無公告垃圾桶檢視和還原權限')
ON CONFLICT (role, permission_key) DO UPDATE SET
  can_view = 0, can_create = 0, can_edit = 0, can_delete = 0, can_manage = 0,
  permission_name = '公告垃圾桶', permission_category = '垃圾桶管理',
  description = '無公告垃圾桶檢視和還原權限';

-- 災區垃圾桶
INSERT INTO role_permissions (role, permission_key, permission_name, permission_category, can_view, can_create, can_edit, can_delete, can_manage, description)
VALUES ('user', 'trash_areas', '災區垃圾桶', '垃圾桶管理', 0, 0, 0, 0, 0, '無災區垃圾桶檢視和還原權限')
ON CONFLICT (role, permission_key) DO UPDATE SET
  can_view = 0, can_create = 0, can_edit = 0, can_delete = 0, can_manage = 0,
  permission_name = '災區垃圾桶', permission_category = '垃圾桶管理',
  description = '無災區垃圾桶檢視和還原權限';

-- 網格垃圾桶
INSERT INTO role_permissions (role, permission_key, permission_name, permission_category, can_view, can_create, can_edit, can_delete, can_manage, description)
VALUES ('user', 'trash_grids', '網格垃圾桶', '垃圾桶管理', 0, 0, 0, 0, 0, '無網格垃圾桶檢視和還原權限')
ON CONFLICT (role, permission_key) DO UPDATE SET
  can_view = 0, can_create = 0, can_edit = 0, can_delete = 0, can_manage = 0,
  permission_name = '網格垃圾桶', permission_category = '垃圾桶管理',
  description = '無網格垃圾桶檢視和還原權限';

-- 物資垃圾桶
INSERT INTO role_permissions (role, permission_key, permission_name, permission_category, can_view, can_create, can_edit, can_delete, can_manage, description)
VALUES ('user', 'trash_supplies', '物資垃圾桶', '垃圾桶管理', 1, 0, 1, 0, 0, '可檢視、還原和永久刪除垃圾桶項目')
ON CONFLICT (role, permission_key) DO UPDATE SET
  can_view = 1, can_create = 0, can_edit = 1, can_delete = 0, can_manage = 0,
  permission_name = '物資垃圾桶', permission_category = '垃圾桶管理',
  description = '可檢視、還原和永久刪除垃圾桶項目';

-- 災區管理
INSERT INTO role_permissions (role, permission_key, permission_name, permission_category, can_view, can_create, can_edit, can_delete, can_manage, description)
VALUES ('user', 'disaster_areas', '災區管理', '基礎管理', 1, 0, 0, 0, 0, '可檢視災區列表和詳細資訊')
ON CONFLICT (role, permission_key) DO UPDATE SET
  can_view = 1, can_create = 0, can_edit = 0, can_delete = 0, can_manage = 0,
  permission_name = '災區管理', permission_category = '基礎管理',
  description = '可檢視災區列表和詳細資訊';

-- 網格管理
INSERT INTO role_permissions (role, permission_key, permission_name, permission_category, can_view, can_create, can_edit, can_delete, can_manage, description)
VALUES ('user', 'grids', '網格管理', '基礎管理', 1, 1, 1, 0, 0, '可建立和編輯自己的網格')
ON CONFLICT (role, permission_key) DO UPDATE SET
  can_view = 1, can_create = 1, can_edit = 1, can_delete = 0, can_manage = 0,
  permission_name = '網格管理', permission_category = '基礎管理',
  description = '可建立和編輯自己的網格';

-- 需求管理（後台訪問）
INSERT INTO role_permissions (role, permission_key, permission_name, permission_category, can_view, can_create, can_edit, can_delete, can_manage, description)
VALUES ('user', 'admin_panel', '需求管理（後台訪問）', '系統管理', 1, 0, 0, 0, 0, '無管理後台訪問權限')
ON CONFLICT (role, permission_key) DO UPDATE SET
  can_view = 1, can_create = 0, can_edit = 0, can_delete = 0, can_manage = 0,
  permission_name = '需求管理（後台訪問）', permission_category = '系統管理',
  description = '無管理後台訪問權限';

-- 日誌管理
INSERT INTO role_permissions (role, permission_key, permission_name, permission_category, can_view, can_create, can_edit, can_delete, can_manage, description)
VALUES ('user', 'audit_logs', '日誌管理', '系統管理', 0, 0, 0, 0, 0, '無日誌檢視權限')
ON CONFLICT (role, permission_key) DO UPDATE SET
  can_view = 0, can_create = 0, can_edit = 0, can_delete = 0, can_manage = 0,
  permission_name = '日誌管理', permission_category = '系統管理',
  description = '無日誌檢視權限';

-- 黑名單管理
INSERT INTO role_permissions (role, permission_key, permission_name, permission_category, can_view, can_create, can_edit, can_delete, can_manage, description)
VALUES ('user', 'blacklist', '黑名單管理', '系統管理', 0, 0, 0, 0, 0, '無黑名單管理權限')
ON CONFLICT (role, permission_key) DO UPDATE SET
  can_view = 0, can_create = 0, can_edit = 0, can_delete = 0, can_manage = 0,
  permission_name = '黑名單管理', permission_category = '系統管理',
  description = '無黑名單管理權限';

-- 權限設定
INSERT INTO role_permissions (role, permission_key, permission_name, permission_category, can_view, can_create, can_edit, can_delete, can_manage, description)
VALUES ('user', 'role_permissions', '權限設定', '系統管理', 0, 0, 0, 0, 0, '無權限設定管理權限')
ON CONFLICT (role, permission_key) DO UPDATE SET
  can_view = 0, can_create = 0, can_edit = 0, can_delete = 0, can_manage = 0,
  permission_name = '權限設定', permission_category = '系統管理',
  description = '無權限設定管理權限';

-- 使用者管理
INSERT INTO role_permissions (role, permission_key, permission_name, permission_category, can_view, can_create, can_edit, can_delete, can_manage, description)
VALUES ('user', 'users', '使用者管理', '系統管理', 0, 0, 0, 0, 0, '無使用者管理權限')
ON CONFLICT (role, permission_key) DO UPDATE SET
  can_view = 0, can_create = 0, can_edit = 0, can_delete = 0, can_manage = 0,
  permission_name = '使用者管理', permission_category = '系統管理',
  description = '無使用者管理權限';

-- 物資管理
INSERT INTO role_permissions (role, permission_key, permission_name, permission_category, can_view, can_create, can_edit, can_delete, can_manage, description)
VALUES ('user', 'supplies', '物資管理', '資源管理', 1, 1, 1, 0, 0, '可檢視物資資訊並建立需求')
ON CONFLICT (role, permission_key) DO UPDATE SET
  can_view = 1, can_create = 1, can_edit = 1, can_delete = 0, can_manage = 0,
  permission_name = '物資管理', permission_category = '資源管理',
  description = '可檢視物資資訊並建立需求';

-- 物資狀態管理
INSERT INTO role_permissions (role, permission_key, permission_name, permission_category, can_view, can_create, can_edit, can_delete, can_manage, description)
VALUES ('user', 'supplies_status_management', '物資狀態管理', '資源管理', 1, 0, 0, 0, 0, '管理物資捐贈狀態（確認捐贈、標記運送中、確認送達、確認收到）')
ON CONFLICT (role, permission_key) DO UPDATE SET
  can_view = 1, can_create = 0, can_edit = 0, can_delete = 0, can_manage = 0,
  permission_name = '物資狀態管理', permission_category = '資源管理',
  description = '管理物資捐贈狀態（確認捐贈、標記運送中、確認送達、確認收到）';

-- 公告管理
INSERT INTO role_permissions (role, permission_key, permission_name, permission_category, can_view, can_create, can_edit, can_delete, can_manage, description)
VALUES ('user', 'announcements', '公告管理', '資訊管理', 0, 0, 0, 0, 0, '可檢視公告')
ON CONFLICT (role, permission_key) DO UPDATE SET
  can_view = 0, can_create = 0, can_edit = 0, can_delete = 0, can_manage = 0,
  permission_name = '公告管理', permission_category = '資訊管理',
  description = '可檢視公告';

-- 檢視捐贈者聯絡資訊
INSERT INTO role_permissions (role, permission_key, permission_name, permission_category, can_view, can_create, can_edit, can_delete, can_manage, description)
VALUES ('user', 'view_donor_contact', '檢視捐贈者聯絡資訊', '隱私管理', 1, 0, 0, 0, 0, '可檢視自己捐贈的聯絡資訊、自己建立的網格內的捐贈者聯絡資訊')
ON CONFLICT (role, permission_key) DO UPDATE SET
  can_view = 1, can_create = 0, can_edit = 0, can_delete = 0, can_manage = 0,
  permission_name = '檢視捐贈者聯絡資訊', permission_category = '隱私管理',
  description = '可檢視自己捐贈的聯絡資訊、自己建立的網格內的捐贈者聯絡資訊';

-- 檢視網格聯絡資訊
INSERT INTO role_permissions (role, permission_key, permission_name, permission_category, can_view, can_create, can_edit, can_delete, can_manage, description)
VALUES ('user', 'view_grid_contact', '檢視網格聯絡資訊', '隱私管理', 1, 0, 0, 0, 0, '可檢視所有網格建立者的公開聯絡資訊')
ON CONFLICT (role, permission_key) DO UPDATE SET
  can_view = 1, can_create = 0, can_edit = 0, can_delete = 0, can_manage = 0,
  permission_name = '檢視網格聯絡資訊', permission_category = '隱私管理',
  description = '可檢視所有網格建立者的公開聯絡資訊';

-- 檢視志工聯絡資訊
INSERT INTO role_permissions (role, permission_key, permission_name, permission_category, can_view, can_create, can_edit, can_delete, can_manage, description)
VALUES ('user', 'view_volunteer_contact', '檢視志工聯絡資訊', '隱私管理', 1, 0, 0, 0, 0, '可檢視自己的志工聯絡資訊、自己建立的網格內的志工聯絡資訊')
ON CONFLICT (role, permission_key) DO UPDATE SET
  can_view = 1, can_create = 0, can_edit = 0, can_delete = 0, can_manage = 0,
  permission_name = '檢視志工聯絡資訊', permission_category = '隱私管理',
  description = '可檢視自己的志工聯絡資訊、自己建立的網格內的志工聯絡資訊';


-- ========================================
-- 網格管理員（grid_manager）權限
-- ========================================

-- 志工報名
INSERT INTO role_permissions (role, permission_key, permission_name, permission_category, can_view, can_create, can_edit, can_delete, can_manage, description)
VALUES ('grid_manager', 'volunteer_registrations', '志工報名', '人員管理', 1, 1, 1, 0, 0, '可管理志工報名')
ON CONFLICT (role, permission_key) DO UPDATE SET
  can_view = 1, can_create = 1, can_edit = 1, can_delete = 0, can_manage = 0,
  permission_name = '志工報名', permission_category = '人員管理',
  description = '可管理志工報名';

-- 志工狀態管理
INSERT INTO role_permissions (role, permission_key, permission_name, permission_category, can_view, can_create, can_edit, can_delete, can_manage, description)
VALUES ('grid_manager', 'volunteer_status_management', '志工狀態管理', '人員管理', 1, 0, 0, 0, 1, '控制志工報名狀態操作按鈕（確認報名/婉拒、標記到場、標記完成）')
ON CONFLICT (role, permission_key) DO UPDATE SET
  can_view = 1, can_create = 0, can_edit = 0, can_delete = 0, can_manage = 1,
  permission_name = '志工狀態管理', permission_category = '人員管理',
  description = '控制志工報名狀態操作按鈕（確認報名/婉拒、標記到場、標記完成）';

-- 志工管理
INSERT INTO role_permissions (role, permission_key, permission_name, permission_category, can_view, can_create, can_edit, can_delete, can_manage, description)
VALUES ('grid_manager', 'volunteers', '志工管理', '人員管理', 1, 0, 0, 0, 1, '可管理志工資訊')
ON CONFLICT (role, permission_key) DO UPDATE SET
  can_view = 1, can_create = 0, can_edit = 0, can_delete = 0, can_manage = 1,
  permission_name = '志工管理', permission_category = '人員管理',
  description = '可管理志工資訊';

-- 公告垃圾桶
INSERT INTO role_permissions (role, permission_key, permission_name, permission_category, can_view, can_create, can_edit, can_delete, can_manage, description)
VALUES ('grid_manager', 'trash_announcements', '公告垃圾桶', '垃圾桶管理', 1, 0, 1, 0, 0, '可檢視和還原公告垃圾桶項目（edit=還原）')
ON CONFLICT (role, permission_key) DO UPDATE SET
  can_view = 1, can_create = 0, can_edit = 1, can_delete = 0, can_manage = 0,
  permission_name = '公告垃圾桶', permission_category = '垃圾桶管理',
  description = '可檢視和還原公告垃圾桶項目（edit=還原）';

-- 災區垃圾桶
INSERT INTO role_permissions (role, permission_key, permission_name, permission_category, can_view, can_create, can_edit, can_delete, can_manage, description)
VALUES ('grid_manager', 'trash_areas', '災區垃圾桶', '垃圾桶管理', 1, 0, 1, 0, 0, '可檢視災區垃圾桶並還原項目')
ON CONFLICT (role, permission_key) DO UPDATE SET
  can_view = 1, can_create = 0, can_edit = 1, can_delete = 0, can_manage = 0,
  permission_name = '災區垃圾桶', permission_category = '垃圾桶管理',
  description = '可檢視災區垃圾桶並還原項目';

-- 網格垃圾桶
INSERT INTO role_permissions (role, permission_key, permission_name, permission_category, can_view, can_create, can_edit, can_delete, can_manage, description)
VALUES ('grid_manager', 'trash_grids', '網格垃圾桶', '垃圾桶管理', 1, 0, 1, 0, 0, '可檢視網格垃圾桶並還原項目')
ON CONFLICT (role, permission_key) DO UPDATE SET
  can_view = 1, can_create = 0, can_edit = 1, can_delete = 0, can_manage = 0,
  permission_name = '網格垃圾桶', permission_category = '垃圾桶管理',
  description = '可檢視網格垃圾桶並還原項目';

-- 物資垃圾桶
INSERT INTO role_permissions (role, permission_key, permission_name, permission_category, can_view, can_create, can_edit, can_delete, can_manage, description)
VALUES ('grid_manager', 'trash_supplies', '物資垃圾桶', '垃圾桶管理', 1, 0, 1, 0, 0, '可檢視、還原和永久刪除垃圾桶項目')
ON CONFLICT (role, permission_key) DO UPDATE SET
  can_view = 1, can_create = 0, can_edit = 1, can_delete = 0, can_manage = 0,
  permission_name = '物資垃圾桶', permission_category = '垃圾桶管理',
  description = '可檢視、還原和永久刪除垃圾桶項目';

-- 災區管理
INSERT INTO role_permissions (role, permission_key, permission_name, permission_category, can_view, can_create, can_edit, can_delete, can_manage, description)
VALUES ('grid_manager', 'disaster_areas', '災區管理', '基礎管理', 1, 0, 1, 0, 0, '可檢視和編輯災區資訊')
ON CONFLICT (role, permission_key) DO UPDATE SET
  can_view = 1, can_create = 0, can_edit = 1, can_delete = 0, can_manage = 0,
  permission_name = '災區管理', permission_category = '基礎管理',
  description = '可檢視和編輯災區資訊';

-- 網格管理
INSERT INTO role_permissions (role, permission_key, permission_name, permission_category, can_view, can_create, can_edit, can_delete, can_manage, description)
VALUES ('grid_manager', 'grids', '網格管理', '基礎管理', 1, 1, 1, 1, 0, '可完整管理所有網格')
ON CONFLICT (role, permission_key) DO UPDATE SET
  can_view = 1, can_create = 1, can_edit = 1, can_delete = 1, can_manage = 0,
  permission_name = '網格管理', permission_category = '基礎管理',
  description = '可完整管理所有網格';

-- 需求管理（後台訪問）
INSERT INTO role_permissions (role, permission_key, permission_name, permission_category, can_view, can_create, can_edit, can_delete, can_manage, description)
VALUES ('grid_manager', 'admin_panel', '需求管理（後台訪問）', '系統管理', 1, 0, 0, 0, 0, '可訪問管理後台檢視需求資料')
ON CONFLICT (role, permission_key) DO UPDATE SET
  can_view = 1, can_create = 0, can_edit = 0, can_delete = 0, can_manage = 0,
  permission_name = '需求管理（後台訪問）', permission_category = '系統管理',
  description = '可訪問管理後台檢視需求資料';

-- 日誌管理
INSERT INTO role_permissions (role, permission_key, permission_name, permission_category, can_view, can_create, can_edit, can_delete, can_manage, description)
VALUES ('grid_manager', 'audit_logs', '日誌管理', '系統管理', 0, 0, 0, 0, 0, '無日誌檢視權限')
ON CONFLICT (role, permission_key) DO UPDATE SET
  can_view = 0, can_create = 0, can_edit = 0, can_delete = 0, can_manage = 0,
  permission_name = '日誌管理', permission_category = '系統管理',
  description = '無日誌檢視權限';

-- 黑名單管理
INSERT INTO role_permissions (role, permission_key, permission_name, permission_category, can_view, can_create, can_edit, can_delete, can_manage, description)
VALUES ('grid_manager', 'blacklist', '黑名單管理', '系統管理', 0, 0, 0, 0, 0, '無黑名單管理權限')
ON CONFLICT (role, permission_key) DO UPDATE SET
  can_view = 0, can_create = 0, can_edit = 0, can_delete = 0, can_manage = 0,
  permission_name = '黑名單管理', permission_category = '系統管理',
  description = '無黑名單管理權限';

-- 權限設定
INSERT INTO role_permissions (role, permission_key, permission_name, permission_category, can_view, can_create, can_edit, can_delete, can_manage, description)
VALUES ('grid_manager', 'role_permissions', '權限設定', '系統管理', 0, 0, 0, 0, 0, '無權限設定管理權限')
ON CONFLICT (role, permission_key) DO UPDATE SET
  can_view = 0, can_create = 0, can_edit = 0, can_delete = 0, can_manage = 0,
  permission_name = '權限設定', permission_category = '系統管理',
  description = '無權限設定管理權限';

-- 使用者管理
INSERT INTO role_permissions (role, permission_key, permission_name, permission_category, can_view, can_create, can_edit, can_delete, can_manage, description)
VALUES ('grid_manager', 'users', '使用者管理', '系統管理', 0, 0, 0, 0, 0, '可檢視使用者列表')
ON CONFLICT (role, permission_key) DO UPDATE SET
  can_view = 0, can_create = 0, can_edit = 0, can_delete = 0, can_manage = 0,
  permission_name = '使用者管理', permission_category = '系統管理',
  description = '可檢視使用者列表';

-- 物資管理
INSERT INTO role_permissions (role, permission_key, permission_name, permission_category, can_view, can_create, can_edit, can_delete, can_manage, description)
VALUES ('grid_manager', 'supplies', '物資管理', '資源管理', 1, 1, 1, 0, 0, '可管理物資資訊')
ON CONFLICT (role, permission_key) DO UPDATE SET
  can_view = 1, can_create = 1, can_edit = 1, can_delete = 0, can_manage = 0,
  permission_name = '物資管理', permission_category = '資源管理',
  description = '可管理物資資訊';

-- 物資狀態管理
INSERT INTO role_permissions (role, permission_key, permission_name, permission_category, can_view, can_create, can_edit, can_delete, can_manage, description)
VALUES ('grid_manager', 'supplies_status_management', '物資狀態管理', '資源管理', 1, 0, 0, 0, 0, '管理物資捐贈狀態（確認捐贈、標記運送中、確認送達、確認收到）')
ON CONFLICT (role, permission_key) DO UPDATE SET
  can_view = 1, can_create = 0, can_edit = 0, can_delete = 0, can_manage = 0,
  permission_name = '物資狀態管理', permission_category = '資源管理',
  description = '管理物資捐贈狀態（確認捐贈、標記運送中、確認送達、確認收到）';

-- 公告管理
INSERT INTO role_permissions (role, permission_key, permission_name, permission_category, can_view, can_create, can_edit, can_delete, can_manage, description)
VALUES ('grid_manager', 'announcements', '公告管理', '資訊管理', 1, 0, 0, 0, 0, '可管理公告')
ON CONFLICT (role, permission_key) DO UPDATE SET
  can_view = 1, can_create = 0, can_edit = 0, can_delete = 0, can_manage = 0,
  permission_name = '公告管理', permission_category = '資訊管理',
  description = '可管理公告';

-- 檢視捐贈者聯絡資訊
INSERT INTO role_permissions (role, permission_key, permission_name, permission_category, can_view, can_create, can_edit, can_delete, can_manage, description)
VALUES ('grid_manager', 'view_donor_contact', '檢視捐贈者聯絡資訊', '隱私管理', 1, 0, 0, 0, 0, '可檢視所管理網格內的捐贈者聯絡資訊')
ON CONFLICT (role, permission_key) DO UPDATE SET
  can_view = 1, can_create = 0, can_edit = 0, can_delete = 0, can_manage = 0,
  permission_name = '檢視捐贈者聯絡資訊', permission_category = '隱私管理',
  description = '可檢視所管理網格內的捐贈者聯絡資訊';

-- 檢視網格聯絡資訊
INSERT INTO role_permissions (role, permission_key, permission_name, permission_category, can_view, can_create, can_edit, can_delete, can_manage, description)
VALUES ('grid_manager', 'view_grid_contact', '檢視網格聯絡資訊', '隱私管理', 1, 0, 0, 0, 0, '可檢視所有網格建立者的公開聯絡資訊')
ON CONFLICT (role, permission_key) DO UPDATE SET
  can_view = 1, can_create = 0, can_edit = 0, can_delete = 0, can_manage = 0,
  permission_name = '檢視網格聯絡資訊', permission_category = '隱私管理',
  description = '可檢視所有網格建立者的公開聯絡資訊';

-- 檢視志工聯絡資訊
INSERT INTO role_permissions (role, permission_key, permission_name, permission_category, can_view, can_create, can_edit, can_delete, can_manage, description)
VALUES ('grid_manager', 'view_volunteer_contact', '檢視志工聯絡資訊', '隱私管理', 1, 0, 0, 0, 0, '可檢視所管理網格內的志工聯絡資訊')
ON CONFLICT (role, permission_key) DO UPDATE SET
  can_view = 1, can_create = 0, can_edit = 0, can_delete = 0, can_manage = 0,
  permission_name = '檢視志工聯絡資訊', permission_category = '隱私管理',
  description = '可檢視所管理網格內的志工聯絡資訊';


-- ========================================
-- 管理員（admin）權限
-- ========================================

-- 志工報名
INSERT INTO role_permissions (role, permission_key, permission_name, permission_category, can_view, can_create, can_edit, can_delete, can_manage, description)
VALUES ('admin', 'volunteer_registrations', '志工報名', '人員管理', 1, 1, 1, 0, 1, '可完整管理志工報名')
ON CONFLICT (role, permission_key) DO UPDATE SET
  can_view = 1, can_create = 1, can_edit = 1, can_delete = 0, can_manage = 1,
  permission_name = '志工報名', permission_category = '人員管理',
  description = '可完整管理志工報名';

-- 志工狀態管理
INSERT INTO role_permissions (role, permission_key, permission_name, permission_category, can_view, can_create, can_edit, can_delete, can_manage, description)
VALUES ('admin', 'volunteer_status_management', '志工狀態管理', '人員管理', 1, 0, 0, 0, 1, '控制志工報名狀態操作按鈕（確認報名/婉拒、標記到場、標記完成）')
ON CONFLICT (role, permission_key) DO UPDATE SET
  can_view = 1, can_create = 0, can_edit = 0, can_delete = 0, can_manage = 1,
  permission_name = '志工狀態管理', permission_category = '人員管理',
  description = '控制志工報名狀態操作按鈕（確認報名/婉拒、標記到場、標記完成）';

-- 志工管理
INSERT INTO role_permissions (role, permission_key, permission_name, permission_category, can_view, can_create, can_edit, can_delete, can_manage, description)
VALUES ('admin', 'volunteers', '志工管理', '人員管理', 1, 0, 0, 0, 1, '可完整管理志工')
ON CONFLICT (role, permission_key) DO UPDATE SET
  can_view = 1, can_create = 0, can_edit = 0, can_delete = 0, can_manage = 1,
  permission_name = '志工管理', permission_category = '人員管理',
  description = '可完整管理志工';

-- 公告垃圾桶
INSERT INTO role_permissions (role, permission_key, permission_name, permission_category, can_view, can_create, can_edit, can_delete, can_manage, description)
VALUES ('admin', 'trash_announcements', '公告垃圾桶', '垃圾桶管理', 1, 0, 1, 0, 0, '可檢視、還原和永久刪除公告垃圾桶項目')
ON CONFLICT (role, permission_key) DO UPDATE SET
  can_view = 1, can_create = 0, can_edit = 1, can_delete = 0, can_manage = 0,
  permission_name = '公告垃圾桶', permission_category = '垃圾桶管理',
  description = '可檢視、還原和永久刪除公告垃圾桶項目';

-- 災區垃圾桶
INSERT INTO role_permissions (role, permission_key, permission_name, permission_category, can_view, can_create, can_edit, can_delete, can_manage, description)
VALUES ('admin', 'trash_areas', '災區垃圾桶', '垃圾桶管理', 1, 0, 1, 0, 1, '可完整管理災區垃圾桶（檢視、還原、永久刪除）')
ON CONFLICT (role, permission_key) DO UPDATE SET
  can_view = 1, can_create = 0, can_edit = 1, can_delete = 0, can_manage = 1,
  permission_name = '災區垃圾桶', permission_category = '垃圾桶管理',
  description = '可完整管理災區垃圾桶（檢視、還原、永久刪除）';

-- 網格垃圾桶
INSERT INTO role_permissions (role, permission_key, permission_name, permission_category, can_view, can_create, can_edit, can_delete, can_manage, description)
VALUES ('admin', 'trash_grids', '網格垃圾桶', '垃圾桶管理', 1, 0, 1, 0, 1, '可完整管理網格垃圾桶（檢視、還原、永久刪除）')
ON CONFLICT (role, permission_key) DO UPDATE SET
  can_view = 1, can_create = 0, can_edit = 1, can_delete = 0, can_manage = 1,
  permission_name = '網格垃圾桶', permission_category = '垃圾桶管理',
  description = '可完整管理網格垃圾桶（檢視、還原、永久刪除）';

-- 物資垃圾桶
INSERT INTO role_permissions (role, permission_key, permission_name, permission_category, can_view, can_create, can_edit, can_delete, can_manage, description)
VALUES ('admin', 'trash_supplies', '物資垃圾桶', '垃圾桶管理', 1, 0, 1, 0, 1, '可檢視、還原和永久刪除垃圾桶項目')
ON CONFLICT (role, permission_key) DO UPDATE SET
  can_view = 1, can_create = 0, can_edit = 1, can_delete = 0, can_manage = 1,
  permission_name = '物資垃圾桶', permission_category = '垃圾桶管理',
  description = '可檢視、還原和永久刪除垃圾桶項目';

-- 災區管理
INSERT INTO role_permissions (role, permission_key, permission_name, permission_category, can_view, can_create, can_edit, can_delete, can_manage, description)
VALUES ('admin', 'disaster_areas', '災區管理', '基礎管理', 1, 1, 1, 1, 1, '可完整管理災區')
ON CONFLICT (role, permission_key) DO UPDATE SET
  can_view = 1, can_create = 1, can_edit = 1, can_delete = 1, can_manage = 1,
  permission_name = '災區管理', permission_category = '基礎管理',
  description = '可完整管理災區';

-- 網格管理
INSERT INTO role_permissions (role, permission_key, permission_name, permission_category, can_view, can_create, can_edit, can_delete, can_manage, description)
VALUES ('admin', 'grids', '網格管理', '基礎管理', 1, 1, 1, 1, 1, '可完整管理所有網格')
ON CONFLICT (role, permission_key) DO UPDATE SET
  can_view = 1, can_create = 1, can_edit = 1, can_delete = 1, can_manage = 1,
  permission_name = '網格管理', permission_category = '基礎管理',
  description = '可完整管理所有網格';

-- 需求管理（後台訪問）
INSERT INTO role_permissions (role, permission_key, permission_name, permission_category, can_view, can_create, can_edit, can_delete, can_manage, description)
VALUES ('admin', 'admin_panel', '需求管理（後台訪問）', '系統管理', 1, 1, 1, 1, 1, '可完整訪問管理後台的需求管理功能')
ON CONFLICT (role, permission_key) DO UPDATE SET
  can_view = 1, can_create = 1, can_edit = 1, can_delete = 1, can_manage = 1,
  permission_name = '需求管理（後台訪問）', permission_category = '系統管理',
  description = '可完整訪問管理後台的需求管理功能';

-- 日誌管理
INSERT INTO role_permissions (role, permission_key, permission_name, permission_category, can_view, can_create, can_edit, can_delete, can_manage, description)
VALUES ('admin', 'audit_logs', '日誌管理', '系統管理', 0, 0, 0, 0, 0, '可檢視日誌')
ON CONFLICT (role, permission_key) DO UPDATE SET
  can_view = 0, can_create = 0, can_edit = 0, can_delete = 0, can_manage = 0,
  permission_name = '日誌管理', permission_category = '系統管理',
  description = '可檢視日誌';

-- 黑名單管理
INSERT INTO role_permissions (role, permission_key, permission_name, permission_category, can_view, can_create, can_edit, can_delete, can_manage, description)
VALUES ('admin', 'blacklist', '黑名單管理', '系統管理', 1, 0, 0, 1, 1, '可管理使用者黑名單')
ON CONFLICT (role, permission_key) DO UPDATE SET
  can_view = 1, can_create = 0, can_edit = 0, can_delete = 1, can_manage = 1,
  permission_name = '黑名單管理', permission_category = '系統管理',
  description = '可管理使用者黑名單';

-- 權限設定
INSERT INTO role_permissions (role, permission_key, permission_name, permission_category, can_view, can_create, can_edit, can_delete, can_manage, description)
VALUES ('admin', 'role_permissions', '權限設定', '系統管理', 1, 0, 1, 0, 1, '可檢視和管理權限設定')
ON CONFLICT (role, permission_key) DO UPDATE SET
  can_view = 1, can_create = 0, can_edit = 1, can_delete = 0, can_manage = 1,
  permission_name = '權限設定', permission_category = '系統管理',
  description = '可檢視和管理權限設定';

-- 使用者管理
INSERT INTO role_permissions (role, permission_key, permission_name, permission_category, can_view, can_create, can_edit, can_delete, can_manage, description)
VALUES ('admin', 'users', '使用者管理', '系統管理', 1, 0, 0, 0, 0, '可管理一般使用者（不含超級管理員）')
ON CONFLICT (role, permission_key) DO UPDATE SET
  can_view = 1, can_create = 0, can_edit = 0, can_delete = 0, can_manage = 0,
  permission_name = '使用者管理', permission_category = '系統管理',
  description = '可管理一般使用者（不含超級管理員）';

-- 物資管理
INSERT INTO role_permissions (role, permission_key, permission_name, permission_category, can_view, can_create, can_edit, can_delete, can_manage, description)
VALUES ('admin', 'supplies', '物資管理', '資源管理', 1, 1, 1, 1, 0, '可完整管理物資')
ON CONFLICT (role, permission_key) DO UPDATE SET
  can_view = 1, can_create = 1, can_edit = 1, can_delete = 1, can_manage = 0,
  permission_name = '物資管理', permission_category = '資源管理',
  description = '可完整管理物資';

-- 物資狀態管理
INSERT INTO role_permissions (role, permission_key, permission_name, permission_category, can_view, can_create, can_edit, can_delete, can_manage, description)
VALUES ('admin', 'supplies_status_management', '物資狀態管理', '資源管理', 1, 0, 0, 0, 0, '管理物資捐贈狀態（確認捐贈、標記運送中、確認送達、確認收到）')
ON CONFLICT (role, permission_key) DO UPDATE SET
  can_view = 1, can_create = 0, can_edit = 0, can_delete = 0, can_manage = 0,
  permission_name = '物資狀態管理', permission_category = '資源管理',
  description = '管理物資捐贈狀態（確認捐贈、標記運送中、確認送達、確認收到）';

-- 公告管理
INSERT INTO role_permissions (role, permission_key, permission_name, permission_category, can_view, can_create, can_edit, can_delete, can_manage, description)
VALUES ('admin', 'announcements', '公告管理', '資訊管理', 1, 1, 1, 1, 1, '可完整管理公告')
ON CONFLICT (role, permission_key) DO UPDATE SET
  can_view = 1, can_create = 1, can_edit = 1, can_delete = 1, can_manage = 1,
  permission_name = '公告管理', permission_category = '資訊管理',
  description = '可完整管理公告';

-- 檢視捐贈者聯絡資訊
INSERT INTO role_permissions (role, permission_key, permission_name, permission_category, can_view, can_create, can_edit, can_delete, can_manage, description)
VALUES ('admin', 'view_donor_contact', '檢視捐贈者聯絡資訊', '隱私管理', 1, 0, 0, 0, 0, '可檢視所有捐贈者聯絡資訊')
ON CONFLICT (role, permission_key) DO UPDATE SET
  can_view = 1, can_create = 0, can_edit = 0, can_delete = 0, can_manage = 0,
  permission_name = '檢視捐贈者聯絡資訊', permission_category = '隱私管理',
  description = '可檢視所有捐贈者聯絡資訊';

-- 檢視網格聯絡資訊
INSERT INTO role_permissions (role, permission_key, permission_name, permission_category, can_view, can_create, can_edit, can_delete, can_manage, description)
VALUES ('admin', 'view_grid_contact', '檢視網格聯絡資訊', '隱私管理', 1, 0, 0, 0, 0, '可檢視所有網格建立者的公開聯絡資訊')
ON CONFLICT (role, permission_key) DO UPDATE SET
  can_view = 1, can_create = 0, can_edit = 0, can_delete = 0, can_manage = 0,
  permission_name = '檢視網格聯絡資訊', permission_category = '隱私管理',
  description = '可檢視所有網格建立者的公開聯絡資訊';

-- 檢視志工聯絡資訊
INSERT INTO role_permissions (role, permission_key, permission_name, permission_category, can_view, can_create, can_edit, can_delete, can_manage, description)
VALUES ('admin', 'view_volunteer_contact', '檢視志工聯絡資訊', '隱私管理', 1, 0, 0, 0, 0, '可檢視所有志工聯絡資訊')
ON CONFLICT (role, permission_key) DO UPDATE SET
  can_view = 1, can_create = 0, can_edit = 0, can_delete = 0, can_manage = 0,
  permission_name = '檢視志工聯絡資訊', permission_category = '隱私管理',
  description = '可檢視所有志工聯絡資訊';


-- ========================================
-- 超級管理員（super_admin）權限
-- ========================================

-- 志工報名
INSERT INTO role_permissions (role, permission_key, permission_name, permission_category, can_view, can_create, can_edit, can_delete, can_manage, description)
VALUES ('super_admin', 'volunteer_registrations', '志工報名', '人員管理', 1, 1, 1, 0, 1, '完整志工報名管理權限')
ON CONFLICT (role, permission_key) DO UPDATE SET
  can_view = 1, can_create = 1, can_edit = 1, can_delete = 0, can_manage = 1,
  permission_name = '志工報名', permission_category = '人員管理',
  description = '完整志工報名管理權限';

-- 志工狀態管理
INSERT INTO role_permissions (role, permission_key, permission_name, permission_category, can_view, can_create, can_edit, can_delete, can_manage, description)
VALUES ('super_admin', 'volunteer_status_management', '志工狀態管理', '人員管理', 1, 0, 0, 0, 1, '控制志工報名狀態操作按鈕（確認報名/婉拒、標記到場、標記完成）')
ON CONFLICT (role, permission_key) DO UPDATE SET
  can_view = 1, can_create = 0, can_edit = 0, can_delete = 0, can_manage = 1,
  permission_name = '志工狀態管理', permission_category = '人員管理',
  description = '控制志工報名狀態操作按鈕（確認報名/婉拒、標記到場、標記完成）';

-- 志工管理
INSERT INTO role_permissions (role, permission_key, permission_name, permission_category, can_view, can_create, can_edit, can_delete, can_manage, description)
VALUES ('super_admin', 'volunteers', '志工管理', '人員管理', 1, 0, 0, 0, 1, '完整志工管理權限')
ON CONFLICT (role, permission_key) DO UPDATE SET
  can_view = 1, can_create = 0, can_edit = 0, can_delete = 0, can_manage = 1,
  permission_name = '志工管理', permission_category = '人員管理',
  description = '完整志工管理權限';

-- 公告垃圾桶
INSERT INTO role_permissions (role, permission_key, permission_name, permission_category, can_view, can_create, can_edit, can_delete, can_manage, description)
VALUES ('super_admin', 'trash_announcements', '公告垃圾桶', '垃圾桶管理', 1, 0, 1, 1, 0, '可檢視、還原和永久刪除公告垃圾桶項目')
ON CONFLICT (role, permission_key) DO UPDATE SET
  can_view = 1, can_create = 0, can_edit = 1, can_delete = 1, can_manage = 0,
  permission_name = '公告垃圾桶', permission_category = '垃圾桶管理',
  description = '可檢視、還原和永久刪除公告垃圾桶項目';

-- 災區垃圾桶
INSERT INTO role_permissions (role, permission_key, permission_name, permission_category, can_view, can_create, can_edit, can_delete, can_manage, description)
VALUES ('super_admin', 'trash_areas', '災區垃圾桶', '垃圾桶管理', 1, 0, 1, 1, 1, '完整管理災區垃圾桶（檢視、還原、永久刪除）')
ON CONFLICT (role, permission_key) DO UPDATE SET
  can_view = 1, can_create = 0, can_edit = 1, can_delete = 1, can_manage = 1,
  permission_name = '災區垃圾桶', permission_category = '垃圾桶管理',
  description = '完整管理災區垃圾桶（檢視、還原、永久刪除）';

-- 網格垃圾桶
INSERT INTO role_permissions (role, permission_key, permission_name, permission_category, can_view, can_create, can_edit, can_delete, can_manage, description)
VALUES ('super_admin', 'trash_grids', '網格垃圾桶', '垃圾桶管理', 1, 0, 1, 1, 1, '完整管理網格垃圾桶（檢視、還原、永久刪除）')
ON CONFLICT (role, permission_key) DO UPDATE SET
  can_view = 1, can_create = 0, can_edit = 1, can_delete = 1, can_manage = 1,
  permission_name = '網格垃圾桶', permission_category = '垃圾桶管理',
  description = '完整管理網格垃圾桶（檢視、還原、永久刪除）';

-- 物資垃圾桶
INSERT INTO role_permissions (role, permission_key, permission_name, permission_category, can_view, can_create, can_edit, can_delete, can_manage, description)
VALUES ('super_admin', 'trash_supplies', '物資垃圾桶', '垃圾桶管理', 1, 0, 1, 1, 1, '可檢視、還原和永久刪除垃圾桶項目')
ON CONFLICT (role, permission_key) DO UPDATE SET
  can_view = 1, can_create = 0, can_edit = 1, can_delete = 1, can_manage = 1,
  permission_name = '物資垃圾桶', permission_category = '垃圾桶管理',
  description = '可檢視、還原和永久刪除垃圾桶項目';

-- 災區管理
INSERT INTO role_permissions (role, permission_key, permission_name, permission_category, can_view, can_create, can_edit, can_delete, can_manage, description)
VALUES ('super_admin', 'disaster_areas', '災區管理', '基礎管理', 1, 1, 1, 1, 1, '完整災區管理權限')
ON CONFLICT (role, permission_key) DO UPDATE SET
  can_view = 1, can_create = 1, can_edit = 1, can_delete = 1, can_manage = 1,
  permission_name = '災區管理', permission_category = '基礎管理',
  description = '完整災區管理權限';

-- 網格管理
INSERT INTO role_permissions (role, permission_key, permission_name, permission_category, can_view, can_create, can_edit, can_delete, can_manage, description)
VALUES ('super_admin', 'grids', '網格管理', '基礎管理', 1, 1, 1, 1, 1, '完整網格管理權限')
ON CONFLICT (role, permission_key) DO UPDATE SET
  can_view = 1, can_create = 1, can_edit = 1, can_delete = 1, can_manage = 1,
  permission_name = '網格管理', permission_category = '基礎管理',
  description = '完整網格管理權限';

-- 需求管理（後台訪問）
INSERT INTO role_permissions (role, permission_key, permission_name, permission_category, can_view, can_create, can_edit, can_delete, can_manage, description)
VALUES ('super_admin', 'admin_panel', '需求管理（後台訪問）', '系統管理', 1, 1, 1, 1, 1, '完整管理後台權限，包含所有需求管理功能')
ON CONFLICT (role, permission_key) DO UPDATE SET
  can_view = 1, can_create = 1, can_edit = 1, can_delete = 1, can_manage = 1,
  permission_name = '需求管理（後台訪問）', permission_category = '系統管理',
  description = '完整管理後台權限，包含所有需求管理功能';

-- 日誌管理
INSERT INTO role_permissions (role, permission_key, permission_name, permission_category, can_view, can_create, can_edit, can_delete, can_manage, description)
VALUES ('super_admin', 'audit_logs', '日誌管理', '系統管理', 1, 0, 0, 0, 1, '可檢視和匯出系統日誌')
ON CONFLICT (role, permission_key) DO UPDATE SET
  can_view = 1, can_create = 0, can_edit = 0, can_delete = 0, can_manage = 1,
  permission_name = '日誌管理', permission_category = '系統管理',
  description = '可檢視和匯出系統日誌';

-- 黑名單管理
INSERT INTO role_permissions (role, permission_key, permission_name, permission_category, can_view, can_create, can_edit, can_delete, can_manage, description)
VALUES ('super_admin', 'blacklist', '黑名單管理', '系統管理', 1, 0, 0, 1, 1, '完整黑名單管理權限')
ON CONFLICT (role, permission_key) DO UPDATE SET
  can_view = 1, can_create = 0, can_edit = 0, can_delete = 1, can_manage = 1,
  permission_name = '黑名單管理', permission_category = '系統管理',
  description = '完整黑名單管理權限';

-- 權限設定
INSERT INTO role_permissions (role, permission_key, permission_name, permission_category, can_view, can_create, can_edit, can_delete, can_manage, description)
VALUES ('super_admin', 'role_permissions', '權限設定', '系統管理', 1, 0, 1, 0, 1, '可管理所有角色的權限設定')
ON CONFLICT (role, permission_key) DO UPDATE SET
  can_view = 1, can_create = 0, can_edit = 1, can_delete = 0, can_manage = 1,
  permission_name = '權限設定', permission_category = '系統管理',
  description = '可管理所有角色的權限設定';

-- 使用者管理
INSERT INTO role_permissions (role, permission_key, permission_name, permission_category, can_view, can_create, can_edit, can_delete, can_manage, description)
VALUES ('super_admin', 'users', '使用者管理', '系統管理', 1, 1, 1, 1, 1, '完整使用者管理權限，包含角色變更')
ON CONFLICT (role, permission_key) DO UPDATE SET
  can_view = 1, can_create = 1, can_edit = 1, can_delete = 1, can_manage = 1,
  permission_name = '使用者管理', permission_category = '系統管理',
  description = '完整使用者管理權限，包含角色變更';

-- 物資管理
INSERT INTO role_permissions (role, permission_key, permission_name, permission_category, can_view, can_create, can_edit, can_delete, can_manage, description)
VALUES ('super_admin', 'supplies', '物資管理', '資源管理', 1, 1, 1, 1, 1, '完整物資管理權限')
ON CONFLICT (role, permission_key) DO UPDATE SET
  can_view = 1, can_create = 1, can_edit = 1, can_delete = 1, can_manage = 1,
  permission_name = '物資管理', permission_category = '資源管理',
  description = '完整物資管理權限';

-- 物資狀態管理
INSERT INTO role_permissions (role, permission_key, permission_name, permission_category, can_view, can_create, can_edit, can_delete, can_manage, description)
VALUES ('super_admin', 'supplies_status_management', '物資狀態管理', '資源管理', 1, 0, 0, 0, 1, '管理物資捐贈狀態（確認捐贈、標記運送中、確認送達、確認收到）')
ON CONFLICT (role, permission_key) DO UPDATE SET
  can_view = 1, can_create = 0, can_edit = 0, can_delete = 0, can_manage = 1,
  permission_name = '物資狀態管理', permission_category = '資源管理',
  description = '管理物資捐贈狀態（確認捐贈、標記運送中、確認送達、確認收到）';

-- 公告管理
INSERT INTO role_permissions (role, permission_key, permission_name, permission_category, can_view, can_create, can_edit, can_delete, can_manage, description)
VALUES ('super_admin', 'announcements', '公告管理', '資訊管理', 1, 1, 1, 1, 1, '完整公告管理權限')
ON CONFLICT (role, permission_key) DO UPDATE SET
  can_view = 1, can_create = 1, can_edit = 1, can_delete = 1, can_manage = 1,
  permission_name = '公告管理', permission_category = '資訊管理',
  description = '完整公告管理權限';

-- 檢視捐贈者聯絡資訊
INSERT INTO role_permissions (role, permission_key, permission_name, permission_category, can_view, can_create, can_edit, can_delete, can_manage, description)
VALUES ('super_admin', 'view_donor_contact', '檢視捐贈者聯絡資訊', '隱私管理', 1, 0, 0, 0, 0, '完整檢視所有捐贈者聯絡資訊權限')
ON CONFLICT (role, permission_key) DO UPDATE SET
  can_view = 1, can_create = 0, can_edit = 0, can_delete = 0, can_manage = 0,
  permission_name = '檢視捐贈者聯絡資訊', permission_category = '隱私管理',
  description = '完整檢視所有捐贈者聯絡資訊權限';

-- 檢視網格聯絡資訊
INSERT INTO role_permissions (role, permission_key, permission_name, permission_category, can_view, can_create, can_edit, can_delete, can_manage, description)
VALUES ('super_admin', 'view_grid_contact', '檢視網格聯絡資訊', '隱私管理', 1, 0, 0, 0, 0, '完整檢視所有網格建立者的公開聯絡資訊權限')
ON CONFLICT (role, permission_key) DO UPDATE SET
  can_view = 1, can_create = 0, can_edit = 0, can_delete = 0, can_manage = 0,
  permission_name = '檢視網格聯絡資訊', permission_category = '隱私管理',
  description = '完整檢視所有網格建立者的公開聯絡資訊權限';

-- 檢視志工聯絡資訊
INSERT INTO role_permissions (role, permission_key, permission_name, permission_category, can_view, can_create, can_edit, can_delete, can_manage, description)
VALUES ('super_admin', 'view_volunteer_contact', '檢視志工聯絡資訊', '隱私管理', 1, 0, 0, 0, 0, '完整檢視所有志工聯絡資訊權限')
ON CONFLICT (role, permission_key) DO UPDATE SET
  can_view = 1, can_create = 0, can_edit = 0, can_delete = 0, can_manage = 0,
  permission_name = '檢視志工聯絡資訊', permission_category = '隱私管理',
  description = '完整檢視所有志工聯絡資訊權限';

