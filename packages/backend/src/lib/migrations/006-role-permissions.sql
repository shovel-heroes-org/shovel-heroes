-- 權限授權設定資料表
-- 此資料表用於管理不同角色對各功能的存取權限

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
) ON CONFLICT (role, permission_key) DO NOTHING;

-- 建立索引以提升查詢效能
CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON role_permissions(role) ON CONFLICT (role, permission_key) DO NOTHING;
CREATE INDEX IF NOT EXISTS idx_role_permissions_key ON role_permissions(permission_key) ON CONFLICT (role, permission_key) DO NOTHING;
CREATE INDEX IF NOT EXISTS idx_role_permissions_role_key ON role_permissions(role, permission_key) ON CONFLICT (role, permission_key) DO NOTHING;

-- 插入預設權限設定

-- ========== 訪客（guest）權限 ==========
-- 災區管理
INSERT INTO role_permissions (role, permission_key, permission_name, permission_category, can_view, can_create, can_edit, can_delete, can_manage, description)
VALUES ('guest', 'disaster_areas', '災區管理', '基礎管理', 1, 0, 0, 0, 0, '可檢視災區列表和詳細資訊') ON CONFLICT (role, permission_key) DO NOTHING;

-- 網格管理
INSERT INTO role_permissions (role, permission_key, permission_name, permission_category, can_view, can_create, can_edit, can_delete, can_manage, description)
VALUES ('guest', 'grids', '網格管理', '基礎管理', 1, 0, 0, 0, 0, '可檢視網格資訊') ON CONFLICT (role, permission_key) DO NOTHING;

-- 志工管理
INSERT INTO role_permissions (role, permission_key, permission_name, permission_category, can_view, can_create, can_edit, can_delete, can_manage, description)
VALUES ('guest', 'volunteers', '志工管理', '人員管理', 1, 0, 0, 0, 0, '可檢視志工列表') ON CONFLICT (role, permission_key) DO NOTHING;

-- 物資管理
INSERT INTO role_permissions (role, permission_key, permission_name, permission_category, can_view, can_create, can_edit, can_delete, can_manage, description)
VALUES ('guest', 'supplies', '物資管理', '資源管理', 1, 0, 0, 0, 0, '可檢視物資資訊') ON CONFLICT (role, permission_key) DO NOTHING;

-- ========== 一般使用者（user）權限 ==========
-- 災區管理
INSERT INTO role_permissions (role, permission_key, permission_name, permission_category, can_view, can_create, can_edit, can_delete, can_manage, description)
VALUES ('user', 'disaster_areas', '災區管理', '基礎管理', 1, 0, 0, 0, 0, '可檢視災區列表和詳細資訊') ON CONFLICT (role, permission_key) DO NOTHING;

-- 網格管理
INSERT INTO role_permissions (role, permission_key, permission_name, permission_category, can_view, can_create, can_edit, can_delete, can_manage, description)
VALUES ('user', 'grids', '網格管理', '基礎管理', 1, 1, 1, 0, 0, '可建立和編輯自己的網格') ON CONFLICT (role, permission_key) DO NOTHING;

-- 志工管理
INSERT INTO role_permissions (role, permission_key, permission_name, permission_category, can_view, can_create, can_edit, can_delete, can_manage, description)
VALUES ('user', 'volunteers', '志工管理', '人員管理', 1, 0, 0, 0, 0, '可檢視志工列表') ON CONFLICT (role, permission_key) DO NOTHING;

-- 志工報名
INSERT INTO role_permissions (role, permission_key, permission_name, permission_category, can_view, can_create, can_edit, can_delete, can_manage, description)
VALUES ('user', 'volunteer_registrations', '志工報名', '人員管理', 1, 1, 1, 0, 0, '可報名成為志工並管理自己的報名') ON CONFLICT (role, permission_key) DO NOTHING;

-- 物資管理
INSERT INTO role_permissions (role, permission_key, permission_name, permission_category, can_view, can_create, can_edit, can_delete, can_manage, description)
VALUES ('user', 'supplies', '物資管理', '資源管理', 1, 1, 0, 0, 0, '可檢視物資資訊並建立需求') ON CONFLICT (role, permission_key) DO NOTHING;

-- 公告
INSERT INTO role_permissions (role, permission_key, permission_name, permission_category, can_view, can_create, can_edit, can_delete, can_manage, description)
VALUES ('user', 'announcements', '公告管理', '資訊管理', 1, 0, 0, 0, 0, '可檢視公告') ON CONFLICT (role, permission_key) DO NOTHING;

-- ========== 網格管理員（grid_manager）權限 ==========
-- 災區管理
INSERT INTO role_permissions (role, permission_key, permission_name, permission_category, can_view, can_create, can_edit, can_delete, can_manage, description)
VALUES ('grid_manager', 'disaster_areas', '災區管理', '基礎管理', 1, 0, 1, 0, 0, '可檢視和編輯災區資訊') ON CONFLICT (role, permission_key) DO NOTHING;

-- 網格管理
INSERT INTO role_permissions (role, permission_key, permission_name, permission_category, can_view, can_create, can_edit, can_delete, can_manage, description)
VALUES ('grid_manager', 'grids', '網格管理', '基礎管理', 1, 1, 1, 1, 0, '可完整管理所有網格') ON CONFLICT (role, permission_key) DO NOTHING;

-- 志工管理
INSERT INTO role_permissions (role, permission_key, permission_name, permission_category, can_view, can_create, can_edit, can_delete, can_manage, description)
VALUES ('grid_manager', 'volunteers', '志工管理', '人員管理', 1, 1, 1, 0, 0, '可管理志工資訊') ON CONFLICT (role, permission_key) DO NOTHING;

-- 志工報名
INSERT INTO role_permissions (role, permission_key, permission_name, permission_category, can_view, can_create, can_edit, can_delete, can_manage, description)
VALUES ('grid_manager', 'volunteer_registrations', '志工報名', '人員管理', 1, 1, 1, 1, 0, '可管理志工報名') ON CONFLICT (role, permission_key) DO NOTHING;

-- 物資管理
INSERT INTO role_permissions (role, permission_key, permission_name, permission_category, can_view, can_create, can_edit, can_delete, can_manage, description)
VALUES ('grid_manager', 'supplies', '物資管理', '資源管理', 1, 1, 1, 0, 0, '可管理物資資訊') ON CONFLICT (role, permission_key) DO NOTHING;

-- 公告
INSERT INTO role_permissions (role, permission_key, permission_name, permission_category, can_view, can_create, can_edit, can_delete, can_manage, description)
VALUES ('grid_manager', 'announcements', '公告管理', '資訊管理', 1, 1, 1, 1, 0, '可管理公告') ON CONFLICT (role, permission_key) DO NOTHING;

-- ========== 管理員（admin）權限 ==========
-- 災區管理
INSERT INTO role_permissions (role, permission_key, permission_name, permission_category, can_view, can_create, can_edit, can_delete, can_manage, description)
VALUES ('admin', 'disaster_areas', '災區管理', '基礎管理', 1, 1, 1, 1, 1, '可完整管理災區') ON CONFLICT (role, permission_key) DO NOTHING;

-- 網格管理
INSERT INTO role_permissions (role, permission_key, permission_name, permission_category, can_view, can_create, can_edit, can_delete, can_manage, description)
VALUES ('admin', 'grids', '網格管理', '基礎管理', 1, 1, 1, 1, 1, '可完整管理所有網格') ON CONFLICT (role, permission_key) DO NOTHING;

-- 志工管理
INSERT INTO role_permissions (role, permission_key, permission_name, permission_category, can_view, can_create, can_edit, can_delete, can_manage, description)
VALUES ('admin', 'volunteers', '志工管理', '人員管理', 1, 1, 1, 1, 1, '可完整管理志工') ON CONFLICT (role, permission_key) DO NOTHING;

-- 志工報名
INSERT INTO role_permissions (role, permission_key, permission_name, permission_category, can_view, can_create, can_edit, can_delete, can_manage, description)
VALUES ('admin', 'volunteer_registrations', '志工報名', '人員管理', 1, 1, 1, 1, 1, '可完整管理志工報名') ON CONFLICT (role, permission_key) DO NOTHING;

-- 物資管理
INSERT INTO role_permissions (role, permission_key, permission_name, permission_category, can_view, can_create, can_edit, can_delete, can_manage, description)
VALUES ('admin', 'supplies', '物資管理', '資源管理', 1, 1, 1, 1, 1, '可完整管理物資') ON CONFLICT (role, permission_key) DO NOTHING;

-- 公告
INSERT INTO role_permissions (role, permission_key, permission_name, permission_category, can_view, can_create, can_edit, can_delete, can_manage, description)
VALUES ('admin', 'announcements', '公告管理', '資訊管理', 1, 1, 1, 1, 1, '可完整管理公告') ON CONFLICT (role, permission_key) DO NOTHING;

-- 使用者管理
INSERT INTO role_permissions (role, permission_key, permission_name, permission_category, can_view, can_create, can_edit, can_delete, can_manage, description)
VALUES ('admin', 'users', '使用者管理', '系統管理', 1, 1, 1, 0, 1, '可管理一般使用者（不含超級管理員）') ON CONFLICT (role, permission_key) DO NOTHING;

-- 黑名單管理
INSERT INTO role_permissions (role, permission_key, permission_name, permission_category, can_view, can_create, can_edit, can_delete, can_manage, description)
VALUES ('admin', 'blacklist', '黑名單管理', '系統管理', 1, 1, 1, 1, 1, '可管理使用者黑名單') ON CONFLICT (role, permission_key) DO NOTHING;

-- ========== 超級管理員（super_admin）權限 ==========
-- 災區管理
INSERT INTO role_permissions (role, permission_key, permission_name, permission_category, can_view, can_create, can_edit, can_delete, can_manage, description)
VALUES ('super_admin', 'disaster_areas', '災區管理', '基礎管理', 1, 1, 1, 1, 1, '完整災區管理權限') ON CONFLICT (role, permission_key) DO NOTHING;

-- 網格管理
INSERT INTO role_permissions (role, permission_key, permission_name, permission_category, can_view, can_create, can_edit, can_delete, can_manage, description)
VALUES ('super_admin', 'grids', '網格管理', '基礎管理', 1, 1, 1, 1, 1, '完整網格管理權限') ON CONFLICT (role, permission_key) DO NOTHING;

-- 志工管理
INSERT INTO role_permissions (role, permission_key, permission_name, permission_category, can_view, can_create, can_edit, can_delete, can_manage, description)
VALUES ('super_admin', 'volunteers', '志工管理', '人員管理', 1, 1, 1, 1, 1, '完整志工管理權限') ON CONFLICT (role, permission_key) DO NOTHING;

-- 志工報名
INSERT INTO role_permissions (role, permission_key, permission_name, permission_category, can_view, can_create, can_edit, can_delete, can_manage, description)
VALUES ('super_admin', 'volunteer_registrations', '志工報名', '人員管理', 1, 1, 1, 1, 1, '完整志工報名管理權限') ON CONFLICT (role, permission_key) DO NOTHING;

-- 物資管理
INSERT INTO role_permissions (role, permission_key, permission_name, permission_category, can_view, can_create, can_edit, can_delete, can_manage, description)
VALUES ('super_admin', 'supplies', '物資管理', '資源管理', 1, 1, 1, 1, 1, '完整物資管理權限') ON CONFLICT (role, permission_key) DO NOTHING;

-- 公告
INSERT INTO role_permissions (role, permission_key, permission_name, permission_category, can_view, can_create, can_edit, can_delete, can_manage, description)
VALUES ('super_admin', 'announcements', '公告管理', '資訊管理', 1, 1, 1, 1, 1, '完整公告管理權限') ON CONFLICT (role, permission_key) DO NOTHING;

-- 使用者管理
INSERT INTO role_permissions (role, permission_key, permission_name, permission_category, can_view, can_create, can_edit, can_delete, can_manage, description)
VALUES ('super_admin', 'users', '使用者管理', '系統管理', 1, 1, 1, 1, 1, '完整使用者管理權限，包含角色變更') ON CONFLICT (role, permission_key) DO NOTHING;

-- 黑名單管理
INSERT INTO role_permissions (role, permission_key, permission_name, permission_category, can_view, can_create, can_edit, can_delete, can_manage, description)
VALUES ('super_admin', 'blacklist', '黑名單管理', '系統管理', 1, 1, 1, 1, 1, '完整黑名單管理權限') ON CONFLICT (role, permission_key) DO NOTHING;

-- 權限設定管理（僅超級管理員）
INSERT INTO role_permissions (role, permission_key, permission_name, permission_category, can_view, can_create, can_edit, can_delete, can_manage, description)
VALUES ('super_admin', 'role_permissions', '權限設定', '系統管理', 1, 1, 1, 1, 1, '可管理所有角色的權限設定') ON CONFLICT (role, permission_key) DO NOTHING;

-- 稽核日誌
INSERT INTO role_permissions (role, permission_key, permission_name, permission_category, can_view, can_create, can_edit, can_delete, can_manage, description)
VALUES ('super_admin', 'audit_logs', '稽核日誌', '系統管理', 1, 0, 0, 0, 1, '可檢視和匯出系統稽核日誌') ON CONFLICT (role, permission_key) DO NOTHING;

-- 系統設定
INSERT INTO role_permissions (role, permission_key, permission_name, permission_category, can_view, can_create, can_edit, can_delete, can_manage, description)
VALUES ('super_admin', 'system_settings', '系統設定', '系統管理', 1, 1, 1, 0, 1, '可管理系統設定') ON CONFLICT (role, permission_key) DO NOTHING;
