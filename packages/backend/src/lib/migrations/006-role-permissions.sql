-- 權限授權設定資料表
-- 此資料表用於管理不同角色對各功能的存取權限
-- 本文件根據 2025-01-06 實際資料庫狀態生成

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
VALUES ('guest', 'supplies_status_management', '物資狀態管理', '資源管理', 0, 0, 0, 0, 0, '不可管理物資狀態')
ON CONFLICT (role, permission_key) DO UPDATE SET
  can_view = 0, can_create = 0, can_edit = 0, can_delete = 0, can_manage = 0,
  permission_name = '物資狀態管理', permission_category = '資源管理',
  description = '不可管理物資狀態';

-- 志工報名
INSERT INTO role_permissions (role, permission_key, permission_name, permission_category, can_view, can_create, can_edit, can_delete, can_manage, description)
VALUES ('guest', 'volunteer_registrations', '志工報名', '人員管理', 0, 0, 0, 0, 0, '無志工報名權限')
ON CONFLICT (role, permission_key) DO UPDATE SET
  can_view = 0, can_create = 0, can_edit = 0, can_delete = 0, can_manage = 0,
  permission_name = '志工報名', permission_category = '人員管理',
  description = '無志工報名權限';

-- 志工管理
INSERT INTO role_permissions (role, permission_key, permission_name, permission_category, can_view, can_create, can_edit, can_delete, can_manage, description)
VALUES ('guest', 'volunteers', '志工管理', '人員管理', 0, 0, 0, 0, 0, '無志工管理權限')
ON CONFLICT (role, permission_key) DO UPDATE SET
  can_view = 0, can_create = 0, can_edit = 0, can_delete = 0, can_manage = 0,
  permission_name = '志工管理', permission_category = '人員管理',
  description = '無志工管理權限';

-- 志工狀態管理
INSERT INTO role_permissions (role, permission_key, permission_name, permission_category, can_view, can_create, can_edit, can_delete, can_manage, description)
VALUES ('guest', 'volunteer_status_management', '志工狀態管理', '人員管理', 0, 0, 0, 0, 0, '不可管理志工狀態')
ON CONFLICT (role, permission_key) DO UPDATE SET
  can_view = 0, can_create = 0, can_edit = 0, can_delete = 0, can_manage = 0,
  permission_name = '志工狀態管理', permission_category = '人員管理',
  description = '不可管理志工狀態';

-- 檢視捐贈者聯絡資訊
INSERT INTO role_permissions (role, permission_key, permission_name, permission_category, can_view, can_create, can_edit, can_delete, can_manage, description)
VALUES ('guest', 'view_donor_contact', '檢視捐贈者聯絡資訊', '隱私權限', 0, 0, 0, 0, 0, '不可檢視捐贈者聯絡資訊')
ON CONFLICT (role, permission_key) DO UPDATE SET
  can_view = 0, can_create = 0, can_edit = 0, can_delete = 0, can_manage = 0,
  permission_name = '檢視捐贈者聯絡資訊', permission_category = '隱私權限',
  description = '不可檢視捐贈者聯絡資訊';

-- 檢視網格聯絡資訊
INSERT INTO role_permissions (role, permission_key, permission_name, permission_category, can_view, can_create, can_edit, can_delete, can_manage, description)
VALUES ('guest', 'view_grid_contact', '檢視網格聯絡資訊', '隱私權限', 1, 0, 0, 0, 0, '可檢視網格聯絡資訊')
ON CONFLICT (role, permission_key) DO UPDATE SET
  can_view = 1, can_create = 0, can_edit = 0, can_delete = 0, can_manage = 0,
  permission_name = '檢視網格聯絡資訊', permission_category = '隱私權限',
  description = '可檢視網格聯絡資訊';

-- 檢視志工聯絡資訊
INSERT INTO role_permissions (role, permission_key, permission_name, permission_category, can_view, can_create, can_edit, can_delete, can_manage, description)
VALUES ('guest', 'view_volunteer_contact', '檢視志工聯絡資訊', '隱私權限', 0, 0, 0, 0, 0, '不可檢視志工聯絡資訊')
ON CONFLICT (role, permission_key) DO UPDATE SET
  can_view = 0, can_create = 0, can_edit = 0, can_delete = 0, can_manage = 0,
  permission_name = '檢視志工聯絡資訊', permission_category = '隱私權限',
  description = '不可檢視志工聯絡資訊';

-- 公告垃圾桶
INSERT INTO role_permissions (role, permission_key, permission_name, permission_category, can_view, can_create, can_edit, can_delete, can_manage, description)
VALUES ('guest', 'trash_announcements', '公告垃圾桶', '垃圾桶管理', 0, 0, 0, 0, 0, '無權限存取公告垃圾桶')
ON CONFLICT (role, permission_key) DO UPDATE SET
  can_view = 0, can_create = 0, can_edit = 0, can_delete = 0, can_manage = 0,
  permission_name = '公告垃圾桶', permission_category = '垃圾桶管理',
  description = '無權限存取公告垃圾桶';

-- 災區垃圾桶
INSERT INTO role_permissions (role, permission_key, permission_name, permission_category, can_view, can_create, can_edit, can_delete, can_manage, description)
VALUES ('guest', 'trash_areas', '災區垃圾桶', '垃圾桶管理', 0, 0, 0, 0, 0, '無權限存取災區垃圾桶')
ON CONFLICT (role, permission_key) DO UPDATE SET
  can_view = 0, can_create = 0, can_edit = 0, can_delete = 0, can_manage = 0,
  permission_name = '災區垃圾桶', permission_category = '垃圾桶管理',
  description = '無權限存取災區垃圾桶';

-- 網格垃圾桶
INSERT INTO role_permissions (role, permission_key, permission_name, permission_category, can_view, can_create, can_edit, can_delete, can_manage, description)
VALUES ('guest', 'trash_grids', '網格垃圾桶', '垃圾桶管理', 0, 0, 0, 0, 0, '無權限存取網格垃圾桶')
ON CONFLICT (role, permission_key) DO UPDATE SET
  can_view = 0, can_create = 0, can_edit = 0, can_delete = 0, can_manage = 0,
  permission_name = '網格垃圾桶', permission_category = '垃圾桶管理',
  description = '無權限存取網格垃圾桶';

-- 物資垃圾桶
INSERT INTO role_permissions (role, permission_key, permission_name, permission_category, can_view, can_create, can_edit, can_delete, can_manage, description)
VALUES ('guest', 'trash_supplies', '物資垃圾桶', '垃圾桶管理', 0, 0, 0, 0, 0, '無權限存取物資垃圾桶')
ON CONFLICT (role, permission_key) DO UPDATE SET
  can_view = 0, can_create = 0, can_edit = 0, can_delete = 0, can_manage = 0,
  permission_name = '物資垃圾桶', permission_category = '垃圾桶管理',
  description = '無權限存取物資垃圾桶';

-- ========================================
-- 一般使用者（user）權限
-- ========================================

-- 後台訪問
INSERT INTO role_permissions (role, permission_key, permission_name, permission_category, can_view, can_create, can_edit, can_delete, can_manage, description)
VALUES ('user', 'admin_panel', '需求管理（後台訪問）', '系統管理', 1, 0, 0, 0, 0, '可訪問管理後台但功能受限')
ON CONFLICT (role, permission_key) DO UPDATE SET
  can_view = 1, can_create = 0, can_edit = 0, can_delete = 0, can_manage = 0,
  permission_name = '需求管理（後台訪問）', permission_category = '系統管理',
  description = '可訪問管理後台但功能受限';

-- 公告管理
INSERT INTO role_permissions (role, permission_key, permission_name, permission_category, can_view, can_create, can_edit, can_delete, can_manage, description)
VALUES ('user', 'announcements', '公告管理', '內容管理', 0, 0, 0, 0, 0, '無公告管理權限')
ON CONFLICT (role, permission_key) DO UPDATE SET
  can_view = 0, can_create = 0, can_edit = 0, can_delete = 0, can_manage = 0,
  permission_name = '公告管理', permission_category = '內容管理',
  description = '無公告管理權限';

-- 日誌管理
INSERT INTO role_permissions (role, permission_key, permission_name, permission_category, can_view, can_create, can_edit, can_delete, can_manage, description)
VALUES ('user', 'audit_logs', '日誌管理', '系統管理', 0, 0, 0, 0, 0, '無日誌存取權限')
ON CONFLICT (role, permission_key) DO UPDATE SET
  can_view = 0, can_create = 0, can_edit = 0, can_delete = 0, can_manage = 0,
  permission_name = '日誌管理', permission_category = '系統管理',
  description = '無日誌存取權限';

-- 黑名單管理
INSERT INTO role_permissions (role, permission_key, permission_name, permission_category, can_view, can_create, can_edit, can_delete, can_manage, description)
VALUES ('user', 'blacklist', '黑名單管理', '系統管理', 0, 0, 0, 0, 0, '無黑名單管理權限')
ON CONFLICT (role, permission_key) DO UPDATE SET
  can_view = 0, can_create = 0, can_edit = 0, can_delete = 0, can_manage = 0,
  permission_name = '黑名單管理', permission_category = '系統管理',
  description = '無黑名單管理權限';

-- 災區管理
INSERT INTO role_permissions (role, permission_key, permission_name, permission_category, can_view, can_create, can_edit, can_delete, can_manage, description)
VALUES ('user', 'disaster_areas', '災區管理', '基礎管理', 1, 0, 0, 0, 0, '可檢視災區列表和詳細資訊')
ON CONFLICT (role, permission_key) DO UPDATE SET
  can_view = 1, can_create = 0, can_edit = 0, can_delete = 0, can_manage = 0,
  permission_name = '災區管理', permission_category = '基礎管理',
  description = '可檢視災區列表和詳細資訊';

-- 網格管理
INSERT INTO role_permissions (role, permission_key, permission_name, permission_category, can_view, can_create, can_edit, can_delete, can_manage, description)
VALUES ('user', 'grids', '網格管理', '基礎管理', 1, 1, 1, 0, 0, '可檢視網格資訊、建立網格並編輯自己的網格')
ON CONFLICT (role, permission_key) DO UPDATE SET
  can_view = 1, can_create = 1, can_edit = 1, can_delete = 0, can_manage = 0,
  permission_name = '網格管理', permission_category = '基礎管理',
  description = '可檢視網格資訊、建立網格並編輯自己的網格';

-- 權限設定
INSERT INTO role_permissions (role, permission_key, permission_name, permission_category, can_view, can_create, can_edit, can_delete, can_manage, description)
VALUES ('user', 'role_permissions', '權限設定', '系統管理', 0, 0, 0, 0, 0, '無權限設定存取權')
ON CONFLICT (role, permission_key) DO UPDATE SET
  can_view = 0, can_create = 0, can_edit = 0, can_delete = 0, can_manage = 0,
  permission_name = '權限設定', permission_category = '系統管理',
  description = '無權限設定存取權';

-- 物資管理
INSERT INTO role_permissions (role, permission_key, permission_name, permission_category, can_view, can_create, can_edit, can_delete, can_manage, description)
VALUES ('user', 'supplies', '物資管理', '資源管理', 1, 1, 1, 0, 0, '可檢視物資資訊、建立需求並編輯自己的物資')
ON CONFLICT (role, permission_key) DO UPDATE SET
  can_view = 1, can_create = 1, can_edit = 1, can_delete = 0, can_manage = 0,
  permission_name = '物資管理', permission_category = '資源管理',
  description = '可檢視物資資訊、建立需求並編輯自己的物資';

-- 物資狀態管理
INSERT INTO role_permissions (role, permission_key, permission_name, permission_category, can_view, can_create, can_edit, can_delete, can_manage, description)
VALUES ('user', 'supplies_status_management', '物資狀態管理', '資源管理', 1, 0, 0, 0, 0, '可檢視物資狀態')
ON CONFLICT (role, permission_key) DO UPDATE SET
  can_view = 1, can_create = 0, can_edit = 0, can_delete = 0, can_manage = 0,
  permission_name = '物資狀態管理', permission_category = '資源管理',
  description = '可檢視物資狀態';

-- 使用者管理
INSERT INTO role_permissions (role, permission_key, permission_name, permission_category, can_view, can_create, can_edit, can_delete, can_manage, description)
VALUES ('user', 'users', '使用者管理', '人員管理', 0, 0, 0, 0, 0, '無使用者管理權限')
ON CONFLICT (role, permission_key) DO UPDATE SET
  can_view = 0, can_create = 0, can_edit = 0, can_delete = 0, can_manage = 0,
  permission_name = '使用者管理', permission_category = '人員管理',
  description = '無使用者管理權限';

-- 檢視捐贈者聯絡資訊
INSERT INTO role_permissions (role, permission_key, permission_name, permission_category, can_view, can_create, can_edit, can_delete, can_manage, description)
VALUES ('user', 'view_donor_contact', '檢視捐贈者聯絡資訊', '隱私權限', 1, 0, 0, 0, 0, '可檢視捐贈者聯絡資訊')
ON CONFLICT (role, permission_key) DO UPDATE SET
  can_view = 1, can_create = 0, can_edit = 0, can_delete = 0, can_manage = 0,
  permission_name = '檢視捐贈者聯絡資訊', permission_category = '隱私權限',
  description = '可檢視捐贈者聯絡資訊';

-- 檢視網格聯絡資訊
INSERT INTO role_permissions (role, permission_key, permission_name, permission_category, can_view, can_create, can_edit, can_delete, can_manage, description)
VALUES ('user', 'view_grid_contact', '檢視網格聯絡資訊', '隱私權限', 1, 0, 0, 0, 0, '可檢視網格聯絡資訊')
ON CONFLICT (role, permission_key) DO UPDATE SET
  can_view = 1, can_create = 0, can_edit = 0, can_delete = 0, can_manage = 0,
  permission_name = '檢視網格聯絡資訊', permission_category = '隱私權限',
  description = '可檢視網格聯絡資訊';

-- 檢視志工聯絡資訊
INSERT INTO role_permissions (role, permission_key, permission_name, permission_category, can_view, can_create, can_edit, can_delete, can_manage, description)
VALUES ('user', 'view_volunteer_contact', '檢視志工聯絡資訊', '隱私權限', 1, 0, 0, 0, 0, '可檢視志工聯絡資訊')
ON CONFLICT (role, permission_key) DO UPDATE SET
  can_view = 1, can_create = 0, can_edit = 0, can_delete = 0, can_manage = 0,
  permission_name = '檢視志工聯絡資訊', permission_category = '隱私權限',
  description = '可檢視志工聯絡資訊';

-- 志工報名
INSERT INTO role_permissions (role, permission_key, permission_name, permission_category, can_view, can_create, can_edit, can_delete, can_manage, description)
VALUES ('user', 'volunteer_registrations', '志工報名', '人員管理', 1, 1, 1, 0, 0, '可檢視志工報名、建立報名並編輯自己的報名')
ON CONFLICT (role, permission_key) DO UPDATE SET
  can_view = 1, can_create = 1, can_edit = 1, can_delete = 0, can_manage = 0,
  permission_name = '志工報名', permission_category = '人員管理',
  description = '可檢視志工報名、建立報名並編輯自己的報名';

-- 志工狀態管理
INSERT INTO role_permissions (role, permission_key, permission_name, permission_category, can_view, can_create, can_edit, can_delete, can_manage, description)
VALUES ('user', 'volunteer_status_management', '志工狀態管理', '人員管理', 1, 0, 0, 0, 0, '可檢視志工狀態')
ON CONFLICT (role, permission_key) DO UPDATE SET
  can_view = 1, can_create = 0, can_edit = 0, can_delete = 0, can_manage = 0,
  permission_name = '志工狀態管理', permission_category = '人員管理',
  description = '可檢視志工狀態';

-- 志工管理
INSERT INTO role_permissions (role, permission_key, permission_name, permission_category, can_view, can_create, can_edit, can_delete, can_manage, description)
VALUES ('user', 'volunteers', '志工管理', '人員管理', 1, 0, 0, 0, 0, '可檢視志工列表')
ON CONFLICT (role, permission_key) DO UPDATE SET
  can_view = 1, can_create = 0, can_edit = 0, can_delete = 0, can_manage = 0,
  permission_name = '志工管理', permission_category = '人員管理',
  description = '可檢視志工列表';

-- 公告垃圾桶
INSERT INTO role_permissions (role, permission_key, permission_name, permission_category, can_view, can_create, can_edit, can_delete, can_manage, description)
VALUES ('user', 'trash_announcements', '公告垃圾桶', '垃圾桶管理', 0, 0, 0, 0, 0, '無權限存取公告垃圾桶')
ON CONFLICT (role, permission_key) DO UPDATE SET
  can_view = 0, can_create = 0, can_edit = 0, can_delete = 0, can_manage = 0,
  permission_name = '公告垃圾桶', permission_category = '垃圾桶管理',
  description = '無權限存取公告垃圾桶';

-- 災區垃圾桶
INSERT INTO role_permissions (role, permission_key, permission_name, permission_category, can_view, can_create, can_edit, can_delete, can_manage, description)
VALUES ('user', 'trash_areas', '災區垃圾桶', '垃圾桶管理', 0, 0, 0, 0, 0, '無權限存取災區垃圾桶')
ON CONFLICT (role, permission_key) DO UPDATE SET
  can_view = 0, can_create = 0, can_edit = 0, can_delete = 0, can_manage = 0,
  permission_name = '災區垃圾桶', permission_category = '垃圾桶管理',
  description = '無權限存取災區垃圾桶';

-- 網格垃圾桶
INSERT INTO role_permissions (role, permission_key, permission_name, permission_category, can_view, can_create, can_edit, can_delete, can_manage, description)
VALUES ('user', 'trash_grids', '網格垃圾桶', '垃圾桶管理', 0, 0, 0, 0, 0, '無權限存取網格垃圾桶')
ON CONFLICT (role, permission_key) DO UPDATE SET
  can_view = 0, can_create = 0, can_edit = 0, can_delete = 0, can_manage = 0,
  permission_name = '網格垃圾桶', permission_category = '垃圾桶管理',
  description = '無權限存取網格垃圾桶';

-- 物資垃圾桶
INSERT INTO role_permissions (role, permission_key, permission_name, permission_category, can_view, can_create, can_edit, can_delete, can_manage, description)
VALUES ('user', 'trash_supplies', '物資垃圾桶', '垃圾桶管理', 1, 0, 1, 0, 0, '可檢視垃圾桶並還原自己的物資')
ON CONFLICT (role, permission_key) DO UPDATE SET
  can_view = 1, can_create = 0, can_edit = 1, can_delete = 0, can_manage = 0,
  permission_name = '物資垃圾桶', permission_category = '垃圾桶管理',
  description = '可檢視垃圾桶並還原自己的物資';

-- ========================================
-- 網格管理員（grid_manager）權限
-- ========================================

-- 後台訪問
INSERT INTO role_permissions (role, permission_key, permission_name, permission_category, can_view, can_create, can_edit, can_delete, can_manage, description)
VALUES ('grid_manager', 'admin_panel', '需求管理（後台訪問）', '系統管理', 1, 0, 0, 0, 0, '可訪問管理後台檢視網格相關資料')
ON CONFLICT (role, permission_key) DO UPDATE SET
  can_view = 1, can_create = 0, can_edit = 0, can_delete = 0, can_manage = 0,
  permission_name = '需求管理（後台訪問）', permission_category = '系統管理',
  description = '可訪問管理後台檢視網格相關資料';

-- 公告管理
INSERT INTO role_permissions (role, permission_key, permission_name, permission_category, can_view, can_create, can_edit, can_delete, can_manage, description)
VALUES ('grid_manager', 'announcements', '公告管理', '內容管理', 1, 0, 0, 0, 0, '可檢視公告但不可建立或編輯')
ON CONFLICT (role, permission_key) DO UPDATE SET
  can_view = 1, can_create = 0, can_edit = 0, can_delete = 0, can_manage = 0,
  permission_name = '公告管理', permission_category = '內容管理',
  description = '可檢視公告但不可建立或編輯';

-- 日誌管理
INSERT INTO role_permissions (role, permission_key, permission_name, permission_category, can_view, can_create, can_edit, can_delete, can_manage, description)
VALUES ('grid_manager', 'audit_logs', '日誌管理', '系統管理', 0, 0, 0, 0, 0, '無日誌存取權限')
ON CONFLICT (role, permission_key) DO UPDATE SET
  can_view = 0, can_create = 0, can_edit = 0, can_delete = 0, can_manage = 0,
  permission_name = '日誌管理', permission_category = '系統管理',
  description = '無日誌存取權限';

-- 黑名單管理
INSERT INTO role_permissions (role, permission_key, permission_name, permission_category, can_view, can_create, can_edit, can_delete, can_manage, description)
VALUES ('grid_manager', 'blacklist', '黑名單管理', '系統管理', 0, 0, 0, 0, 0, '無黑名單管理權限')
ON CONFLICT (role, permission_key) DO UPDATE SET
  can_view = 0, can_create = 0, can_edit = 0, can_delete = 0, can_manage = 0,
  permission_name = '黑名單管理', permission_category = '系統管理',
  description = '無黑名單管理權限';

-- 災區管理
INSERT INTO role_permissions (role, permission_key, permission_name, permission_category, can_view, can_create, can_edit, can_delete, can_manage, description)
VALUES ('grid_manager', 'disaster_areas', '災區管理', '基礎管理', 1, 0, 1, 0, 0, '可檢視和編輯災區資訊')
ON CONFLICT (role, permission_key) DO UPDATE SET
  can_view = 1, can_create = 0, can_edit = 1, can_delete = 0, can_manage = 0,
  permission_name = '災區管理', permission_category = '基礎管理',
  description = '可檢視和編輯災區資訊';

-- 網格管理
INSERT INTO role_permissions (role, permission_key, permission_name, permission_category, can_view, can_create, can_edit, can_delete, can_manage, description)
VALUES ('grid_manager', 'grids', '網格管理', '基礎管理', 1, 1, 1, 1, 0, '可檢視、建立、編輯和刪除網格')
ON CONFLICT (role, permission_key) DO UPDATE SET
  can_view = 1, can_create = 1, can_edit = 1, can_delete = 1, can_manage = 0,
  permission_name = '網格管理', permission_category = '基礎管理',
  description = '可檢視、建立、編輯和刪除網格';

-- 權限設定
INSERT INTO role_permissions (role, permission_key, permission_name, permission_category, can_view, can_create, can_edit, can_delete, can_manage, description)
VALUES ('grid_manager', 'role_permissions', '權限設定', '系統管理', 0, 0, 0, 0, 0, '無權限設定存取權')
ON CONFLICT (role, permission_key) DO UPDATE SET
  can_view = 0, can_create = 0, can_edit = 0, can_delete = 0, can_manage = 0,
  permission_name = '權限設定', permission_category = '系統管理',
  description = '無權限設定存取權';

-- 物資管理
INSERT INTO role_permissions (role, permission_key, permission_name, permission_category, can_view, can_create, can_edit, can_delete, can_manage, description)
VALUES ('grid_manager', 'supplies', '物資管理', '資源管理', 1, 1, 1, 0, 0, '可檢視、建立和編輯物資需求')
ON CONFLICT (role, permission_key) DO UPDATE SET
  can_view = 1, can_create = 1, can_edit = 1, can_delete = 0, can_manage = 0,
  permission_name = '物資管理', permission_category = '資源管理',
  description = '可檢視、建立和編輯物資需求';

-- 物資狀態管理
INSERT INTO role_permissions (role, permission_key, permission_name, permission_category, can_view, can_create, can_edit, can_delete, can_manage, description)
VALUES ('grid_manager', 'supplies_status_management', '物資狀態管理', '資源管理', 1, 0, 0, 0, 0, '可檢視物資狀態')
ON CONFLICT (role, permission_key) DO UPDATE SET
  can_view = 1, can_create = 0, can_edit = 0, can_delete = 0, can_manage = 0,
  permission_name = '物資狀態管理', permission_category = '資源管理',
  description = '可檢視物資狀態';

-- 使用者管理
INSERT INTO role_permissions (role, permission_key, permission_name, permission_category, can_view, can_create, can_edit, can_delete, can_manage, description)
VALUES ('grid_manager', 'users', '使用者管理', '人員管理', 0, 0, 0, 0, 0, '無使用者管理權限')
ON CONFLICT (role, permission_key) DO UPDATE SET
  can_view = 0, can_create = 0, can_edit = 0, can_delete = 0, can_manage = 0,
  permission_name = '使用者管理', permission_category = '人員管理',
  description = '無使用者管理權限';

-- 檢視捐贈者聯絡資訊
INSERT INTO role_permissions (role, permission_key, permission_name, permission_category, can_view, can_create, can_edit, can_delete, can_manage, description)
VALUES ('grid_manager', 'view_donor_contact', '檢視捐贈者聯絡資訊', '隱私權限', 1, 0, 0, 0, 0, '可檢視捐贈者聯絡資訊')
ON CONFLICT (role, permission_key) DO UPDATE SET
  can_view = 1, can_create = 0, can_edit = 0, can_delete = 0, can_manage = 0,
  permission_name = '檢視捐贈者聯絡資訊', permission_category = '隱私權限',
  description = '可檢視捐贈者聯絡資訊';

-- 檢視網格聯絡資訊
INSERT INTO role_permissions (role, permission_key, permission_name, permission_category, can_view, can_create, can_edit, can_delete, can_manage, description)
VALUES ('grid_manager', 'view_grid_contact', '檢視網格聯絡資訊', '隱私權限', 1, 0, 0, 0, 0, '可檢視網格聯絡資訊')
ON CONFLICT (role, permission_key) DO UPDATE SET
  can_view = 1, can_create = 0, can_edit = 0, can_delete = 0, can_manage = 0,
  permission_name = '檢視網格聯絡資訊', permission_category = '隱私權限',
  description = '可檢視網格聯絡資訊';

-- 檢視志工聯絡資訊
INSERT INTO role_permissions (role, permission_key, permission_name, permission_category, can_view, can_create, can_edit, can_delete, can_manage, description)
VALUES ('grid_manager', 'view_volunteer_contact', '檢視志工聯絡資訊', '隱私權限', 1, 0, 0, 0, 0, '可檢視志工聯絡資訊')
ON CONFLICT (role, permission_key) DO UPDATE SET
  can_view = 1, can_create = 0, can_edit = 0, can_delete = 0, can_manage = 0,
  permission_name = '檢視志工聯絡資訊', permission_category = '隱私權限',
  description = '可檢視志工聯絡資訊';

-- 志工報名
INSERT INTO role_permissions (role, permission_key, permission_name, permission_category, can_view, can_create, can_edit, can_delete, can_manage, description)
VALUES ('grid_manager', 'volunteer_registrations', '志工報名', '人員管理', 1, 1, 1, 0, 0, '可檢視、建立和編輯志工報名')
ON CONFLICT (role, permission_key) DO UPDATE SET
  can_view = 1, can_create = 1, can_edit = 1, can_delete = 0, can_manage = 0,
  permission_name = '志工報名', permission_category = '人員管理',
  description = '可檢視、建立和編輯志工報名';

-- 志工狀態管理
INSERT INTO role_permissions (role, permission_key, permission_name, permission_category, can_view, can_create, can_edit, can_delete, can_manage, description)
VALUES ('grid_manager', 'volunteer_status_management', '志工狀態管理', '人員管理', 1, 0, 0, 0, 1, '可完整管理志工狀態')
ON CONFLICT (role, permission_key) DO UPDATE SET
  can_view = 1, can_create = 0, can_edit = 0, can_delete = 0, can_manage = 1,
  permission_name = '志工狀態管理', permission_category = '人員管理',
  description = '可完整管理志工狀態';

-- 志工管理
INSERT INTO role_permissions (role, permission_key, permission_name, permission_category, can_view, can_create, can_edit, can_delete, can_manage, description)
VALUES ('grid_manager', 'volunteers', '志工管理', '人員管理', 1, 0, 0, 0, 1, '可完整管理志工')
ON CONFLICT (role, permission_key) DO UPDATE SET
  can_view = 1, can_create = 0, can_edit = 0, can_delete = 0, can_manage = 1,
  permission_name = '志工管理', permission_category = '人員管理',
  description = '可完整管理志工';

-- 公告垃圾桶
INSERT INTO role_permissions (role, permission_key, permission_name, permission_category, can_view, can_create, can_edit, can_delete, can_manage, description)
VALUES ('grid_manager', 'trash_announcements', '公告垃圾桶', '垃圾桶管理', 1, 0, 1, 0, 0, '可檢視公告垃圾桶並還原')
ON CONFLICT (role, permission_key) DO UPDATE SET
  can_view = 1, can_create = 0, can_edit = 1, can_delete = 0, can_manage = 0,
  permission_name = '公告垃圾桶', permission_category = '垃圾桶管理',
  description = '可檢視公告垃圾桶並還原';

-- 災區垃圾桶
INSERT INTO role_permissions (role, permission_key, permission_name, permission_category, can_view, can_create, can_edit, can_delete, can_manage, description)
VALUES ('grid_manager', 'trash_areas', '災區垃圾桶', '垃圾桶管理', 1, 0, 1, 0, 0, '可檢視災區垃圾桶並還原')
ON CONFLICT (role, permission_key) DO UPDATE SET
  can_view = 1, can_create = 0, can_edit = 1, can_delete = 0, can_manage = 0,
  permission_name = '災區垃圾桶', permission_category = '垃圾桶管理',
  description = '可檢視災區垃圾桶並還原';

-- 網格垃圾桶
INSERT INTO role_permissions (role, permission_key, permission_name, permission_category, can_view, can_create, can_edit, can_delete, can_manage, description)
VALUES ('grid_manager', 'trash_grids', '網格垃圾桶', '垃圾桶管理', 1, 0, 1, 0, 0, '可檢視網格垃圾桶並還原')
ON CONFLICT (role, permission_key) DO UPDATE SET
  can_view = 1, can_create = 0, can_edit = 1, can_delete = 0, can_manage = 0,
  permission_name = '網格垃圾桶', permission_category = '垃圾桶管理',
  description = '可檢視網格垃圾桶並還原';

-- 物資垃圾桶
INSERT INTO role_permissions (role, permission_key, permission_name, permission_category, can_view, can_create, can_edit, can_delete, can_manage, description)
VALUES ('grid_manager', 'trash_supplies', '物資垃圾桶', '垃圾桶管理', 1, 0, 1, 0, 0, '可檢視物資垃圾桶並還原')
ON CONFLICT (role, permission_key) DO UPDATE SET
  can_view = 1, can_create = 0, can_edit = 1, can_delete = 0, can_manage = 0,
  permission_name = '物資垃圾桶', permission_category = '垃圾桶管理',
  description = '可檢視物資垃圾桶並還原';

-- ========================================
-- 管理員（admin）權限
-- ========================================

-- 後台訪問
INSERT INTO role_permissions (role, permission_key, permission_name, permission_category, can_view, can_create, can_edit, can_delete, can_manage, description)
VALUES ('admin', 'admin_panel', '需求管理（後台訪問）', '系統管理', 1, 1, 1, 1, 1, '完整後台管理權限')
ON CONFLICT (role, permission_key) DO UPDATE SET
  can_view = 1, can_create = 1, can_edit = 1, can_delete = 1, can_manage = 1,
  permission_name = '需求管理（後台訪問）', permission_category = '系統管理',
  description = '完整後台管理權限';

-- 公告管理
INSERT INTO role_permissions (role, permission_key, permission_name, permission_category, can_view, can_create, can_edit, can_delete, can_manage, description)
VALUES ('admin', 'announcements', '公告管理', '內容管理', 1, 1, 1, 1, 1, '完整公告管理權限')
ON CONFLICT (role, permission_key) DO UPDATE SET
  can_view = 1, can_create = 1, can_edit = 1, can_delete = 1, can_manage = 1,
  permission_name = '公告管理', permission_category = '內容管理',
  description = '完整公告管理權限';

-- 日誌管理
INSERT INTO role_permissions (role, permission_key, permission_name, permission_category, can_view, can_create, can_edit, can_delete, can_manage, description)
VALUES ('admin', 'audit_logs', '日誌管理', '系統管理', 0, 0, 0, 0, 0, '無日誌存取權限')
ON CONFLICT (role, permission_key) DO UPDATE SET
  can_view = 0, can_create = 0, can_edit = 0, can_delete = 0, can_manage = 0,
  permission_name = '日誌管理', permission_category = '系統管理',
  description = '無日誌存取權限';

-- 黑名單管理
INSERT INTO role_permissions (role, permission_key, permission_name, permission_category, can_view, can_create, can_edit, can_delete, can_manage, description)
VALUES ('admin', 'blacklist', '黑名單管理', '系統管理', 1, 0, 0, 1, 1, '可檢視、刪除和管理黑名單')
ON CONFLICT (role, permission_key) DO UPDATE SET
  can_view = 1, can_create = 0, can_edit = 0, can_delete = 1, can_manage = 1,
  permission_name = '黑名單管理', permission_category = '系統管理',
  description = '可檢視、刪除和管理黑名單';

-- 災區管理
INSERT INTO role_permissions (role, permission_key, permission_name, permission_category, can_view, can_create, can_edit, can_delete, can_manage, description)
VALUES ('admin', 'disaster_areas', '災區管理', '基礎管理', 1, 1, 1, 1, 1, '完整災區管理權限')
ON CONFLICT (role, permission_key) DO UPDATE SET
  can_view = 1, can_create = 1, can_edit = 1, can_delete = 1, can_manage = 1,
  permission_name = '災區管理', permission_category = '基礎管理',
  description = '完整災區管理權限';

-- 網格管理
INSERT INTO role_permissions (role, permission_key, permission_name, permission_category, can_view, can_create, can_edit, can_delete, can_manage, description)
VALUES ('admin', 'grids', '網格管理', '基礎管理', 1, 1, 1, 1, 1, '完整網格管理權限')
ON CONFLICT (role, permission_key) DO UPDATE SET
  can_view = 1, can_create = 1, can_edit = 1, can_delete = 1, can_manage = 1,
  permission_name = '網格管理', permission_category = '基礎管理',
  description = '完整網格管理權限';

-- 權限設定
INSERT INTO role_permissions (role, permission_key, permission_name, permission_category, can_view, can_create, can_edit, can_delete, can_manage, description)
VALUES ('admin', 'role_permissions', '權限設定', '系統管理', 1, 0, 0, 0, 0, '可檢視但不可修改權限設定')
ON CONFLICT (role, permission_key) DO UPDATE SET
  can_view = 1, can_create = 0, can_edit = 0, can_delete = 0, can_manage = 0,
  permission_name = '權限設定', permission_category = '系統管理',
  description = '可檢視但不可修改權限設定';

-- 物資管理
INSERT INTO role_permissions (role, permission_key, permission_name, permission_category, can_view, can_create, can_edit, can_delete, can_manage, description)
VALUES ('admin', 'supplies', '物資管理', '資源管理', 1, 1, 1, 1, 0, '可檢視、建立、編輯和刪除物資，但無完整管理權')
ON CONFLICT (role, permission_key) DO UPDATE SET
  can_view = 1, can_create = 1, can_edit = 1, can_delete = 1, can_manage = 0,
  permission_name = '物資管理', permission_category = '資源管理',
  description = '可檢視、建立、編輯和刪除物資，但無完整管理權';

-- 物資狀態管理
INSERT INTO role_permissions (role, permission_key, permission_name, permission_category, can_view, can_create, can_edit, can_delete, can_manage, description)
VALUES ('admin', 'supplies_status_management', '物資狀態管理', '資源管理', 1, 0, 0, 0, 0, '可檢視物資狀態')
ON CONFLICT (role, permission_key) DO UPDATE SET
  can_view = 1, can_create = 0, can_edit = 0, can_delete = 0, can_manage = 0,
  permission_name = '物資狀態管理', permission_category = '資源管理',
  description = '可檢視物資狀態';

-- 使用者管理
INSERT INTO role_permissions (role, permission_key, permission_name, permission_category, can_view, can_create, can_edit, can_delete, can_manage, description)
VALUES ('admin', 'users', '使用者管理', '人員管理', 1, 1, 1, 1, 1, '完整使用者管理權限')
ON CONFLICT (role, permission_key) DO UPDATE SET
  can_view = 1, can_create = 1, can_edit = 1, can_delete = 1, can_manage = 1,
  permission_name = '使用者管理', permission_category = '人員管理',
  description = '完整使用者管理權限';

-- 檢視捐贈者聯絡資訊
INSERT INTO role_permissions (role, permission_key, permission_name, permission_category, can_view, can_create, can_edit, can_delete, can_manage, description)
VALUES ('admin', 'view_donor_contact', '檢視捐贈者聯絡資訊', '隱私權限', 1, 0, 0, 0, 0, '可檢視捐贈者聯絡資訊')
ON CONFLICT (role, permission_key) DO UPDATE SET
  can_view = 1, can_create = 0, can_edit = 0, can_delete = 0, can_manage = 0,
  permission_name = '檢視捐贈者聯絡資訊', permission_category = '隱私權限',
  description = '可檢視捐贈者聯絡資訊';

-- 檢視網格聯絡資訊
INSERT INTO role_permissions (role, permission_key, permission_name, permission_category, can_view, can_create, can_edit, can_delete, can_manage, description)
VALUES ('admin', 'view_grid_contact', '檢視網格聯絡資訊', '隱私權限', 1, 0, 0, 0, 0, '可檢視網格聯絡資訊')
ON CONFLICT (role, permission_key) DO UPDATE SET
  can_view = 1, can_create = 0, can_edit = 0, can_delete = 0, can_manage = 0,
  permission_name = '檢視網格聯絡資訊', permission_category = '隱私權限',
  description = '可檢視網格聯絡資訊';

-- 檢視志工聯絡資訊
INSERT INTO role_permissions (role, permission_key, permission_name, permission_category, can_view, can_create, can_edit, can_delete, can_manage, description)
VALUES ('admin', 'view_volunteer_contact', '檢視志工聯絡資訊', '隱私權限', 1, 0, 0, 0, 0, '可檢視志工聯絡資訊')
ON CONFLICT (role, permission_key) DO UPDATE SET
  can_view = 1, can_create = 0, can_edit = 0, can_delete = 0, can_manage = 0,
  permission_name = '檢視志工聯絡資訊', permission_category = '隱私權限',
  description = '可檢視志工聯絡資訊';

-- 志工報名
INSERT INTO role_permissions (role, permission_key, permission_name, permission_category, can_view, can_create, can_edit, can_delete, can_manage, description)
VALUES ('admin', 'volunteer_registrations', '志工報名', '人員管理', 1, 1, 1, 0, 1, '可檢視、建立、編輯和管理志工報名')
ON CONFLICT (role, permission_key) DO UPDATE SET
  can_view = 1, can_create = 1, can_edit = 1, can_delete = 0, can_manage = 1,
  permission_name = '志工報名', permission_category = '人員管理',
  description = '可檢視、建立、編輯和管理志工報名';

-- 志工狀態管理
INSERT INTO role_permissions (role, permission_key, permission_name, permission_category, can_view, can_create, can_edit, can_delete, can_manage, description)
VALUES ('admin', 'volunteer_status_management', '志工狀態管理', '人員管理', 1, 0, 0, 0, 1, '可完整管理志工狀態')
ON CONFLICT (role, permission_key) DO UPDATE SET
  can_view = 1, can_create = 0, can_edit = 0, can_delete = 0, can_manage = 1,
  permission_name = '志工狀態管理', permission_category = '人員管理',
  description = '可完整管理志工狀態';

-- 志工管理
INSERT INTO role_permissions (role, permission_key, permission_name, permission_category, can_view, can_create, can_edit, can_delete, can_manage, description)
VALUES ('admin', 'volunteers', '志工管理', '人員管理', 1, 0, 0, 0, 1, '可完整管理志工')
ON CONFLICT (role, permission_key) DO UPDATE SET
  can_view = 1, can_create = 0, can_edit = 0, can_delete = 0, can_manage = 1,
  permission_name = '志工管理', permission_category = '人員管理',
  description = '可完整管理志工';

-- 公告垃圾桶
INSERT INTO role_permissions (role, permission_key, permission_name, permission_category, can_view, can_create, can_edit, can_delete, can_manage, description)
VALUES ('admin', 'trash_announcements', '公告垃圾桶', '垃圾桶管理', 1, 0, 1, 0, 0, '可檢視公告垃圾桶並還原')
ON CONFLICT (role, permission_key) DO UPDATE SET
  can_view = 1, can_create = 0, can_edit = 1, can_delete = 0, can_manage = 0,
  permission_name = '公告垃圾桶', permission_category = '垃圾桶管理',
  description = '可檢視公告垃圾桶並還原';

-- 災區垃圾桶
INSERT INTO role_permissions (role, permission_key, permission_name, permission_category, can_view, can_create, can_edit, can_delete, can_manage, description)
VALUES ('admin', 'trash_areas', '災區垃圾桶', '垃圾桶管理', 1, 0, 1, 0, 1, '可檢視、還原和管理災區垃圾桶')
ON CONFLICT (role, permission_key) DO UPDATE SET
  can_view = 1, can_create = 0, can_edit = 1, can_delete = 0, can_manage = 1,
  permission_name = '災區垃圾桶', permission_category = '垃圾桶管理',
  description = '可檢視、還原和管理災區垃圾桶';

-- 網格垃圾桶
INSERT INTO role_permissions (role, permission_key, permission_name, permission_category, can_view, can_create, can_edit, can_delete, can_manage, description)
VALUES ('admin', 'trash_grids', '網格垃圾桶', '垃圾桶管理', 1, 0, 1, 0, 1, '可檢視、還原和管理網格垃圾桶')
ON CONFLICT (role, permission_key) DO UPDATE SET
  can_view = 1, can_create = 0, can_edit = 1, can_delete = 0, can_manage = 1,
  permission_name = '網格垃圾桶', permission_category = '垃圾桶管理',
  description = '可檢視、還原和管理網格垃圾桶';

-- 物資垃圾桶
INSERT INTO role_permissions (role, permission_key, permission_name, permission_category, can_view, can_create, can_edit, can_delete, can_manage, description)
VALUES ('admin', 'trash_supplies', '物資垃圾桶', '垃圾桶管理', 1, 0, 1, 0, 1, '可檢視、還原和管理物資垃圾桶')
ON CONFLICT (role, permission_key) DO UPDATE SET
  can_view = 1, can_create = 0, can_edit = 1, can_delete = 0, can_manage = 1,
  permission_name = '物資垃圾桶', permission_category = '垃圾桶管理',
  description = '可檢視、還原和管理物資垃圾桶';

-- ========================================
-- 超級管理員（super_admin）權限
-- ========================================

-- 後台訪問
INSERT INTO role_permissions (role, permission_key, permission_name, permission_category, can_view, can_create, can_edit, can_delete, can_manage, description)
VALUES ('super_admin', 'admin_panel', '需求管理（後台訪問）', '系統管理', 1, 1, 1, 1, 1, '完整後台管理權限')
ON CONFLICT (role, permission_key) DO UPDATE SET
  can_view = 1, can_create = 1, can_edit = 1, can_delete = 1, can_manage = 1,
  permission_name = '需求管理（後台訪問）', permission_category = '系統管理',
  description = '完整後台管理權限';

-- 公告管理
INSERT INTO role_permissions (role, permission_key, permission_name, permission_category, can_view, can_create, can_edit, can_delete, can_manage, description)
VALUES ('super_admin', 'announcements', '公告管理', '內容管理', 1, 1, 1, 1, 1, '完整公告管理權限')
ON CONFLICT (role, permission_key) DO UPDATE SET
  can_view = 1, can_create = 1, can_edit = 1, can_delete = 1, can_manage = 1,
  permission_name = '公告管理', permission_category = '內容管理',
  description = '完整公告管理權限';

-- 日誌管理
INSERT INTO role_permissions (role, permission_key, permission_name, permission_category, can_view, can_create, can_edit, can_delete, can_manage, description)
VALUES ('super_admin', 'audit_logs', '日誌管理', '系統管理', 1, 0, 0, 0, 1, '可檢視和管理日誌')
ON CONFLICT (role, permission_key) DO UPDATE SET
  can_view = 1, can_create = 0, can_edit = 0, can_delete = 0, can_manage = 1,
  permission_name = '日誌管理', permission_category = '系統管理',
  description = '可檢視和管理日誌';

-- 黑名單管理
INSERT INTO role_permissions (role, permission_key, permission_name, permission_category, can_view, can_create, can_edit, can_delete, can_manage, description)
VALUES ('super_admin', 'blacklist', '黑名單管理', '系統管理', 1, 0, 0, 1, 1, '完整黑名單管理權限')
ON CONFLICT (role, permission_key) DO UPDATE SET
  can_view = 1, can_create = 0, can_edit = 0, can_delete = 1, can_manage = 1,
  permission_name = '黑名單管理', permission_category = '系統管理',
  description = '完整黑名單管理權限';

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

-- 權限設定
INSERT INTO role_permissions (role, permission_key, permission_name, permission_category, can_view, can_create, can_edit, can_delete, can_manage, description)
VALUES ('super_admin', 'role_permissions', '權限設定', '系統管理', 1, 0, 1, 0, 1, '可檢視、編輯和管理權限設定')
ON CONFLICT (role, permission_key) DO UPDATE SET
  can_view = 1, can_create = 0, can_edit = 1, can_delete = 0, can_manage = 1,
  permission_name = '權限設定', permission_category = '系統管理',
  description = '可檢視、編輯和管理權限設定';

-- 物資管理
INSERT INTO role_permissions (role, permission_key, permission_name, permission_category, can_view, can_create, can_edit, can_delete, can_manage, description)
VALUES ('super_admin', 'supplies', '物資管理', '資源管理', 1, 1, 1, 1, 1, '完整物資管理權限')
ON CONFLICT (role, permission_key) DO UPDATE SET
  can_view = 1, can_create = 1, can_edit = 1, can_delete = 1, can_manage = 1,
  permission_name = '物資管理', permission_category = '資源管理',
  description = '完整物資管理權限';

-- 物資狀態管理
INSERT INTO role_permissions (role, permission_key, permission_name, permission_category, can_view, can_create, can_edit, can_delete, can_manage, description)
VALUES ('super_admin', 'supplies_status_management', '物資狀態管理', '資源管理', 1, 0, 0, 0, 1, '可完整管理物資狀態')
ON CONFLICT (role, permission_key) DO UPDATE SET
  can_view = 1, can_create = 0, can_edit = 0, can_delete = 0, can_manage = 1,
  permission_name = '物資狀態管理', permission_category = '資源管理',
  description = '可完整管理物資狀態';

-- 使用者管理
INSERT INTO role_permissions (role, permission_key, permission_name, permission_category, can_view, can_create, can_edit, can_delete, can_manage, description)
VALUES ('super_admin', 'users', '使用者管理', '人員管理', 1, 1, 1, 1, 1, '完整使用者管理權限')
ON CONFLICT (role, permission_key) DO UPDATE SET
  can_view = 1, can_create = 1, can_edit = 1, can_delete = 1, can_manage = 1,
  permission_name = '使用者管理', permission_category = '人員管理',
  description = '完整使用者管理權限';

-- 檢視捐贈者聯絡資訊
INSERT INTO role_permissions (role, permission_key, permission_name, permission_category, can_view, can_create, can_edit, can_delete, can_manage, description)
VALUES ('super_admin', 'view_donor_contact', '檢視捐贈者聯絡資訊', '隱私權限', 1, 0, 0, 0, 0, '可檢視捐贈者聯絡資訊')
ON CONFLICT (role, permission_key) DO UPDATE SET
  can_view = 1, can_create = 0, can_edit = 0, can_delete = 0, can_manage = 0,
  permission_name = '檢視捐贈者聯絡資訊', permission_category = '隱私權限',
  description = '可檢視捐贈者聯絡資訊';

-- 檢視網格聯絡資訊
INSERT INTO role_permissions (role, permission_key, permission_name, permission_category, can_view, can_create, can_edit, can_delete, can_manage, description)
VALUES ('super_admin', 'view_grid_contact', '檢視網格聯絡資訊', '隱私權限', 1, 0, 0, 0, 0, '可檢視網格聯絡資訊')
ON CONFLICT (role, permission_key) DO UPDATE SET
  can_view = 1, can_create = 0, can_edit = 0, can_delete = 0, can_manage = 0,
  permission_name = '檢視網格聯絡資訊', permission_category = '隱私權限',
  description = '可檢視網格聯絡資訊';

-- 檢視志工聯絡資訊
INSERT INTO role_permissions (role, permission_key, permission_name, permission_category, can_view, can_create, can_edit, can_delete, can_manage, description)
VALUES ('super_admin', 'view_volunteer_contact', '檢視志工聯絡資訊', '隱私權限', 1, 0, 0, 0, 0, '可檢視志工聯絡資訊')
ON CONFLICT (role, permission_key) DO UPDATE SET
  can_view = 1, can_create = 0, can_edit = 0, can_delete = 0, can_manage = 0,
  permission_name = '檢視志工聯絡資訊', permission_category = '隱私權限',
  description = '可檢視志工聯絡資訊';

-- 志工報名
INSERT INTO role_permissions (role, permission_key, permission_name, permission_category, can_view, can_create, can_edit, can_delete, can_manage, description)
VALUES ('super_admin', 'volunteer_registrations', '志工報名', '人員管理', 1, 1, 1, 0, 1, '可檢視、建立、編輯和管理志工報名')
ON CONFLICT (role, permission_key) DO UPDATE SET
  can_view = 1, can_create = 1, can_edit = 1, can_delete = 0, can_manage = 1,
  permission_name = '志工報名', permission_category = '人員管理',
  description = '可檢視、建立、編輯和管理志工報名';

-- 志工狀態管理
INSERT INTO role_permissions (role, permission_key, permission_name, permission_category, can_view, can_create, can_edit, can_delete, can_manage, description)
VALUES ('super_admin', 'volunteer_status_management', '志工狀態管理', '人員管理', 1, 0, 0, 0, 1, '可完整管理志工狀態')
ON CONFLICT (role, permission_key) DO UPDATE SET
  can_view = 1, can_create = 0, can_edit = 0, can_delete = 0, can_manage = 1,
  permission_name = '志工狀態管理', permission_category = '人員管理',
  description = '可完整管理志工狀態';

-- 志工管理
INSERT INTO role_permissions (role, permission_key, permission_name, permission_category, can_view, can_create, can_edit, can_delete, can_manage, description)
VALUES ('super_admin', 'volunteers', '志工管理', '人員管理', 1, 0, 0, 0, 1, '可完整管理志工')
ON CONFLICT (role, permission_key) DO UPDATE SET
  can_view = 1, can_create = 0, can_edit = 0, can_delete = 0, can_manage = 1,
  permission_name = '志工管理', permission_category = '人員管理',
  description = '可完整管理志工';

-- 公告垃圾桶
INSERT INTO role_permissions (role, permission_key, permission_name, permission_category, can_view, can_create, can_edit, can_delete, can_manage, description)
VALUES ('super_admin', 'trash_announcements', '公告垃圾桶', '垃圾桶管理', 1, 0, 1, 1, 0, '可檢視、還原和永久刪除公告')
ON CONFLICT (role, permission_key) DO UPDATE SET
  can_view = 1, can_create = 0, can_edit = 1, can_delete = 1, can_manage = 0,
  permission_name = '公告垃圾桶', permission_category = '垃圾桶管理',
  description = '可檢視、還原和永久刪除公告';

-- 災區垃圾桶
INSERT INTO role_permissions (role, permission_key, permission_name, permission_category, can_view, can_create, can_edit, can_delete, can_manage, description)
VALUES ('super_admin', 'trash_areas', '災區垃圾桶', '垃圾桶管理', 1, 0, 1, 1, 1, '完整災區垃圾桶管理權限')
ON CONFLICT (role, permission_key) DO UPDATE SET
  can_view = 1, can_create = 0, can_edit = 1, can_delete = 1, can_manage = 1,
  permission_name = '災區垃圾桶', permission_category = '垃圾桶管理',
  description = '完整災區垃圾桶管理權限';

-- 網格垃圾桶
INSERT INTO role_permissions (role, permission_key, permission_name, permission_category, can_view, can_create, can_edit, can_delete, can_manage, description)
VALUES ('super_admin', 'trash_grids', '網格垃圾桶', '垃圾桶管理', 1, 0, 1, 1, 1, '完整網格垃圾桶管理權限')
ON CONFLICT (role, permission_key) DO UPDATE SET
  can_view = 1, can_create = 0, can_edit = 1, can_delete = 1, can_manage = 1,
  permission_name = '網格垃圾桶', permission_category = '垃圾桶管理',
  description = '完整網格垃圾桶管理權限';

-- 物資垃圾桶
INSERT INTO role_permissions (role, permission_key, permission_name, permission_category, can_view, can_create, can_edit, can_delete, can_manage, description)
VALUES ('super_admin', 'trash_supplies', '物資垃圾桶', '垃圾桶管理', 1, 0, 1, 1, 1, '完整物資垃圾桶管理權限')
ON CONFLICT (role, permission_key) DO UPDATE SET
  can_view = 1, can_create = 0, can_edit = 1, can_delete = 1, can_manage = 1,
  permission_name = '物資垃圾桶', permission_category = '垃圾桶管理',
  description = '完整物資垃圾桶管理權限';
