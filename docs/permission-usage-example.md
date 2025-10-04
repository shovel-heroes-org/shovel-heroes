# 權限控制使用範例

## 📋 權限設定概覽

### 權限類別

根據 `init-permissions.ts` 的設定,系統包含以下權限類別:

1. **基礎管理** (disaster_areas, grids)
2. **人員管理** (volunteers, volunteer_registrations)
3. **資源管理** (supplies)
4. **資訊管理** (announcements)
5. **系統管理** (users, blacklist, role_permissions, audit_logs, system_settings)

### 權限動作

- `can_view`: 檢視
- `can_create`: 建立
- `can_edit`: 編輯
- `can_delete`: 刪除
- `can_manage`: 管理

### 角色權限對照表

| 資源 | 訪客 (guest) | 一般用戶 (user) | 網格管理員 (grid_manager) | 管理員 (admin) | 超級管理員 (super_admin) |
|------|-------------|----------------|-------------------------|---------------|------------------------|
| **災區** | 檢視 | 檢視 | 檢視、編輯 | 完整權限 | 完整權限 |
| **網格** | 檢視 | 檢視、建立、編輯(自己的) | 完整權限(所有網格) | 完整權限 | 完整權限 |
| **志工** | 檢視 | 檢視 | 檢視、建立、編輯 | 完整權限 | 完整權限 |
| **志工報名** | - | 檢視、建立、編輯(自己的) | 檢視、建立、編輯、刪除 | 完整權限 | 完整權限 |
| **物資** | 檢視 | 檢視、建立 | 檢視、建立、編輯 | 完整權限 | 完整權限 |
| **公告** | 檢視 | 檢視 | 完整權限 | 完整權限 | 完整權限 |
| **使用者管理** | - | - | - | 檢視、建立、編輯、管理 | 完整權限 |
| **黑名單** | - | - | - | 完整權限 | 完整權限 |
| **權限設定** | - | - | - | - | 完整權限 |
| **稽核日誌** | - | - | - | - | 檢視、管理 |

## 🔧 使用 Hook

### 基本用法

```jsx
import { usePermission } from '@/hooks/usePermission';

function MyComponent() {
  const { hasPermission, canCreate, canEdit, canDelete } = usePermission();

  // 檢查特定權限
  if (hasPermission('grids', 'create')) {
    // 可以建立網格
  }

  // 使用便捷方法
  if (canCreate('grids')) {
    // 可以建立網格
  }

  if (canEdit('disaster_areas')) {
    // 可以編輯災區
  }

  if (canDelete('volunteers')) {
    // 可以刪除志工
  }
}
```

### 角色檢查

```jsx
import { usePermission } from '@/hooks/usePermission';

function AdminPanel() {
  const { isAdmin, isSuperAdmin, isGridManager, currentRole } = usePermission();

  if (isSuperAdmin) {
    return <SuperAdminDashboard />;
  }

  if (isAdmin) {
    return <AdminDashboard />;
  }

  if (isGridManager) {
    return <GridManagerDashboard />;
  }

  return <UserDashboard />;
}
```

## 🚪 使用權限閘道組件

### PermissionGate - 基本權限控制

```jsx
import { PermissionGate } from '@/components/common/PermissionGate';

function GridManagement() {
  return (
    <div>
      {/* 只有有建立權限的人才能看到新增按鈕 */}
      <PermissionGate permission="grids" action="create">
        <Button onClick={handleAddGrid}>
          <Plus className="w-4 h-4 mr-2" />
          新增網格
        </Button>
      </PermissionGate>

      {/* 只有有編輯權限的人才能看到編輯按鈕 */}
      <PermissionGate permission="grids" action="edit">
        <Button onClick={handleEditGrid}>
          <Edit className="w-4 h-4 mr-2" />
          編輯
        </Button>
      </PermissionGate>

      {/* 無權限時顯示替代內容 */}
      <PermissionGate
        permission="grids"
        action="delete"
        fallback={<span className="text-gray-400">無刪除權限</span>}
        hideIfNoPermission={false}
      >
        <Button variant="destructive" onClick={handleDeleteGrid}>
          <Trash2 className="w-4 h-4 mr-2" />
          刪除
        </Button>
      </PermissionGate>
    </div>
  );
}
```

### PermissionButton - 智能按鈕

```jsx
import { PermissionButton } from '@/components/common/PermissionGate';

function GridActions() {
  return (
    <div className="flex gap-2">
      {/* 按鈕會根據權限自動禁用 */}
      <PermissionButton
        permission="grids"
        action="edit"
        onClick={handleEdit}
        className="btn-primary"
        noPermissionTitle="您沒有編輯網格的權限"
      >
        編輯網格
      </PermissionButton>

      <PermissionButton
        permission="grids"
        action="delete"
        onClick={handleDelete}
        className="btn-danger"
      >
        刪除網格
      </PermissionButton>
    </div>
  );
}
```

### RoleGate - 角色限制

```jsx
import { RoleGate } from '@/components/common/PermissionGate';

function AdminFeatures() {
  return (
    <>
      {/* 只有管理員和超級管理員能看到 */}
      <RoleGate roles={['admin', 'super_admin']}>
        <UserManagementPanel />
      </RoleGate>

      {/* 只有超級管理員能看到 */}
      <RoleGate roles="super_admin">
        <PermissionSettings />
      </RoleGate>

      {/* 網格管理員和以上角色能看到 */}
      <RoleGate roles={['grid_manager', 'admin', 'super_admin']}>
        <GridManagementTools />
      </RoleGate>
    </>
  );
}
```

### PermissionGuard - 多重權限檢查

```jsx
import { PermissionGuard } from '@/components/common/PermissionGate';

function AdvancedFeature() {
  return (
    <PermissionGuard
      requires={[
        { permission: 'grids', action: 'manage' },
        { permission: 'volunteers', action: 'edit' }
      ]}
      fallback={<div>您需要網格管理和志工編輯權限才能使用此功能</div>}
    >
      <AdvancedManagementPanel />
    </PermissionGuard>
  );
}
```

## 📄 在 Admin 頁面實際應用

### 災區管理

```jsx
// 新增災區按鈕
<PermissionGate permission="disaster_areas" action="create">
  <Button onClick={() => setShowNewAreaModal(true)}>
    <Plus className="w-4 h-4 mr-2" />
    新增災區
  </Button>
</PermissionGate>

// 編輯災區
<PermissionGate permission="disaster_areas" action="edit">
  <Button onClick={() => handleEditArea(area)}>編輯</Button>
</PermissionGate>

// 刪除災區
<PermissionGate permission="disaster_areas" action="delete">
  <Button onClick={() => handleDeleteArea(area)}>刪除</Button>
</PermissionGate>
```

### 網格管理

```jsx
// 新增網格按鈕
<PermissionGate permission="grids" action="create">
  <Button onClick={() => setShowNewGridModal(true)}>
    <Plus className="w-4 h-4 mr-2" />
    新增網格
  </Button>
</PermissionGate>

// 編輯網格 (需額外檢查是否為建立者)
{canEditGrid(grid) && (
  <Button onClick={() => handleEditGrid(grid)}>編輯</Button>
)}

// 刪除網格
{canDeleteGrid(grid) && (
  <Button onClick={() => handleDeleteGrid(grid)}>刪除</Button>
)}
```

### 使用者管理

```jsx
// 只有管理員以上才能管理使用者
<PermissionGate permission="users" action="manage">
  <UserManagementSection />
</PermissionGate>

// 角色變更 - 只有超級管理員和管理員(在管理視角下)
{isAdmin && (
  <Select onValueChange={(value) => handleRoleChange(user.id, value)}>
    {/* 角色選項 */}
  </Select>
)}
```

### 權限設定

```jsx
// 只有超級管理員能訪問
<RoleGate roles="super_admin">
  <TabsContent value="permissions">
    <PermissionManagement />
  </TabsContent>
</RoleGate>
```

## 🔄 權限檢查流程

1. **前端檢查**: 使用 `usePermission` Hook 或 `PermissionGate` 組件
2. **後端驗證**: API 端點使用 middleware 檢查實際權限
3. **資料庫查詢**: 從 `role_permissions` 表查詢權限設定

## 📝 最佳實踐

1. **優先使用組件**: 使用 `PermissionGate` 等組件而非手動檢查
2. **保持一致性**: 前後端權限規則應保持一致
3. **提供回饋**: 無權限時給予明確的提示訊息
4. **層級設計**: 將權限檢查放在適當的組件層級
5. **快取優化**: Hook 內建權限快取,減少重複查詢

## 🧪 測試建議

### 測試不同角色訪問

```javascript
// 訪客
- 只能檢視基本資訊
- 無法建立、編輯、刪除任何內容

// 一般用戶
- 可以建立和編輯自己的網格
- 可以報名志工
- 可以建立物資需求

// 網格管理員
- 可以管理所有網格
- 可以管理志工報名
- 可以管理公告

// 管理員
- 完整的資源管理權限
- 可以管理使用者(不含超級管理員)

// 超級管理員
- 所有權限
- 可以管理權限設定
```

### 權限測試清單

- [ ] 訪客模式無法訪問需要登入的功能
- [ ] 一般用戶只能編輯自己建立的網格
- [ ] 網格管理員可以編輯所有網格
- [ ] 管理員可以管理使用者
- [ ] 超級管理員可以訪問權限設定
- [ ] 無權限操作會顯示適當的錯誤訊息
