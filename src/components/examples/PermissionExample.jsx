import React from 'react';
import { usePermission } from '@/hooks/usePermission';
import { PermissionGate, PermissionButton, RoleGate, PermissionGuard } from '@/components/common/PermissionGate';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Plus, Edit, Trash2, Shield } from 'lucide-react';

/**
 * 權限控制使用範例組件
 * 展示如何在實際頁面中使用權限檢查功能
 */
export default function PermissionExample() {
  const {
    hasPermission,
    canCreate,
    canEdit,
    canDelete,
    isAdmin,
    isSuperAdmin,
    currentRole
  } = usePermission();

  return (
    <div className="space-y-6 p-6">
      {/* 當前角色資訊 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            當前角色: {currentRole}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <p>• 是否為管理員: {isAdmin ? '是' : '否'}</p>
            <p>• 是否為超級管理員: {isSuperAdmin ? '是' : '否'}</p>
            <p>• 可以建立網格: {canCreate('grids') ? '是' : '否'}</p>
            <p>• 可以編輯災區: {canEdit('disaster_areas') ? '是' : '否'}</p>
            <p>• 可以刪除志工: {canDelete('volunteers') ? '是' : '否'}</p>
          </div>
        </CardContent>
      </Card>

      {/* 範例 1: 基本權限閘道 */}
      <Card>
        <CardHeader>
          <CardTitle>範例 1: 基本權限閘道 (PermissionGate)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            {/* 只有有建立權限的人才能看到 */}
            <PermissionGate permission="grids" action="create">
              <Button className="bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4 mr-2" />
                新增網格
              </Button>
            </PermissionGate>

            {/* 只有有編輯權限的人才能看到 */}
            <PermissionGate permission="grids" action="edit">
              <Button variant="outline">
                <Edit className="w-4 h-4 mr-2" />
                編輯網格
              </Button>
            </PermissionGate>

            {/* 只有有刪除權限的人才能看到 */}
            <PermissionGate permission="grids" action="delete">
              <Button variant="destructive">
                <Trash2 className="w-4 h-4 mr-2" />
                刪除網格
              </Button>
            </PermissionGate>
          </div>
          <p className="text-sm text-gray-500 mt-4">
            💡 提示: 根據您的角色,您可能看不到某些按鈕
          </p>
        </CardContent>
      </Card>

      {/* 範例 2: 權限按鈕 */}
      <Card>
        <CardHeader>
          <CardTitle>範例 2: 權限按鈕 (PermissionButton)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            {/* 按鈕會根據權限自動禁用 */}
            <PermissionButton
              permission="disaster_areas"
              action="create"
              onClick={() => alert('建立災區')}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded"
              noPermissionTitle="您沒有建立災區的權限"
            >
              <Plus className="w-4 h-4 mr-2 inline" />
              建立災區
            </PermissionButton>

            <PermissionButton
              permission="volunteers"
              action="edit"
              onClick={() => alert('編輯志工')}
              className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Edit className="w-4 h-4 mr-2 inline" />
              編輯志工
            </PermissionButton>
          </div>
          <p className="text-sm text-gray-500 mt-4">
            💡 提示: 沒有權限的按鈕會被禁用,滑鼠移上去可看到提示
          </p>
        </CardContent>
      </Card>

      {/* 範例 3: 角色限制 */}
      <Card>
        <CardHeader>
          <CardTitle>範例 3: 角色限制 (RoleGate)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <RoleGate roles="super_admin">
              <div className="p-4 bg-purple-50 border border-purple-200 rounded">
                ⭐ 只有超級管理員能看到這個區域
              </div>
            </RoleGate>

            <RoleGate roles={['admin', 'super_admin']}>
              <div className="p-4 bg-blue-50 border border-blue-200 rounded">
                🔐 管理員和超級管理員能看到這個區域
              </div>
            </RoleGate>

            <RoleGate roles={['grid_manager', 'admin', 'super_admin']}>
              <div className="p-4 bg-green-50 border border-green-200 rounded">
                📊 網格管理員、管理員和超級管理員能看到這個區域
              </div>
            </RoleGate>

            <RoleGate
              roles="guest"
              fallback={<div className="p-4 bg-gray-50 border border-gray-200 rounded">✅ 您已登入</div>}
            >
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded">
                👋 您目前是訪客模式
              </div>
            </RoleGate>
          </div>
        </CardContent>
      </Card>

      {/* 範例 4: 多重權限檢查 */}
      <Card>
        <CardHeader>
          <CardTitle>範例 4: 多重權限檢查 (PermissionGuard)</CardTitle>
        </CardHeader>
        <CardContent>
          <PermissionGuard
            requires={[
              { permission: 'grids', action: 'manage' },
              { permission: 'volunteers', action: 'manage' }
            ]}
            fallback={
              <div className="p-4 bg-red-50 border border-red-200 rounded text-red-700">
                ❌ 您需要同時擁有「網格管理」和「志工管理」權限才能看到此區域
              </div>
            }
          >
            <div className="p-4 bg-green-50 border border-green-200 rounded text-green-700">
              ✅ 您擁有完整的網格和志工管理權限
            </div>
          </PermissionGuard>
        </CardContent>
      </Card>

      {/* 範例 5: Hook 直接使用 */}
      <Card>
        <CardHeader>
          <CardTitle>範例 5: Hook 直接使用</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {hasPermission('supplies', 'create') && (
              <div className="p-3 bg-blue-50 rounded">
                ✅ 您可以建立物資需求
              </div>
            )}

            {hasPermission('announcements', 'edit') && (
              <div className="p-3 bg-green-50 rounded">
                ✅ 您可以編輯公告
              </div>
            )}

            {hasPermission('users', 'manage') && (
              <div className="p-3 bg-purple-50 rounded">
                ✅ 您可以管理使用者
              </div>
            )}

            {hasPermission('role_permissions', 'manage') && (
              <div className="p-3 bg-orange-50 rounded">
                ✅ 您可以管理權限設定
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
