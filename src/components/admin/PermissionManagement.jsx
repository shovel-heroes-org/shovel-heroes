import React, { useState, useEffect } from 'react';
import {
  getAllPermissions,
  updatePermission,
  batchUpdatePermissions,
  resetRolePermissions,
  exportPermissions,
  importPermissions
} from '@/api/permissions';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Shield, Save, RotateCcw, CheckCircle2, XCircle, ChevronDown, ChevronUp, ExternalLink, Download, Upload } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const ROLES = [
  { value: 'all', label: '所有角色', color: 'bg-gray-500' },
  { value: 'super_admin', label: '超級管理員', color: 'bg-purple-500' },
  { value: 'admin', label: '管理員', color: 'bg-blue-500' },
  { value: 'grid_manager', label: '網格管理員', color: 'bg-green-500' },
  { value: 'user', label: '一般使用者', color: 'bg-yellow-500' },
  { value: 'guest', label: '訪客', color: 'bg-gray-400' }
];

const PERMISSION_ACTIONS = [
  { key: 'can_view', label: '檢視' },
  { key: 'can_create', label: '建立' },
  { key: 'can_edit', label: '編輯' },
  { key: 'can_delete', label: '刪除' },
  { key: 'can_manage', label: '管理' }
];

// 垃圾桶權限只顯示：檢視、編輯(還原)、刪除(永久刪除)
const TRASH_PERMISSION_ACTIONS = [
  { key: 'can_view', label: '檢視' },
  { key: 'can_edit', label: '編輯(還原)' },
  { key: 'can_delete', label: '刪除(永久)' }
];

// 隱私管理權限只顯示：檢視
const PRIVACY_PERMISSION_ACTIONS = [
  { key: 'can_view', label: '檢視' }
];

// 判斷是否為垃圾桶權限
const isTrashPermission = (permissionKey) => {
  return permissionKey?.startsWith('trash_');
};

// 判斷是否為隱私管理權限
const isPrivacyPermission = (permissionCategory) => {
  return permissionCategory === '隱私管理';
};

// 權限項目與管理後台頁籤的對應關係
const PERMISSION_TAB_MAP = {
  'disaster_areas': { tab: 'areas', label: '災區管理' },
  'grids': { tab: 'grids', label: '需求管理' },
  'volunteers': { tab: 'volunteers', label: '志工管理' },
  'supplies': { tab: 'supplies', label: '物資管理' },
  'users': { tab: 'users', label: '用戶管理' },
  'blacklist': { tab: 'blacklist', label: '黑名單用戶' },
  'role_permissions': { tab: 'permissions', label: '權限管理' },
  'audit_logs': { tab: 'audit-logs', label: '日誌管理' },
  'announcements': { tab: 'announcements', label: '公告管理' },
  'trash_grids': { tab: 'grids', label: '需求管理（垃圾桶）' },
  'trash_areas': { tab: 'areas', label: '災區管理（垃圾桶）' },
  'trash_announcements': { tab: 'announcements', label: '公告管理（垃圾桶）' },
  'admin_panel': { tab: 'grids', label: '需求管理' }, // 後台訪問導向需求管理
  // 隱私管理權限對應頁面
  'view_volunteer_contact': { path: '/Volunteers', label: '志工管理中心' },
  'view_donor_contact': { path: '/Supplies', label: '物資管理中心' },
  'view_grid_contact': { path: '/Map', label: '地圖（網格聯絡資訊）' },
};

export default function PermissionManagement() {
  const navigate = useNavigate();
  const [permissions, setPermissions] = useState([]);
  const [filteredPermissions, setFilteredPermissions] = useState([]);
  const [selectedRole, setSelectedRole] = useState('all');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [changes, setChanges] = useState({});
  const [message, setMessage] = useState(null);
  const [expandedCategories, setExpandedCategories] = useState(() => {
    // 從 localStorage 讀取上次展開的分類
    try {
      const saved = localStorage.getItem('permission-expanded-categories');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);

  // 載入權限資料
  useEffect(() => {
    loadPermissions();
  }, []);

  // 當展開狀態變更時，儲存到 localStorage
  useEffect(() => {
    try {
      localStorage.setItem('permission-expanded-categories', JSON.stringify(expandedCategories));
    } catch (error) {
      console.error('儲存展開狀態失敗:', error);
    }
  }, [expandedCategories]);

  // 根據選擇的角色過濾權限
  useEffect(() => {
    if (selectedRole === 'all') {
      setFilteredPermissions(permissions);
    } else {
      setFilteredPermissions(permissions.filter(p => p.role === selectedRole));
    }
  }, [selectedRole, permissions]);

  const loadPermissions = async () => {
    try {
      setLoading(true);
      const data = await getAllPermissions();
      setPermissions(data);
      setFilteredPermissions(data);
    } catch (error) {
      console.error('載入權限設定失敗:', error);
      const errorMessage = error.response?.data?.message || error.message || '載入權限設定失敗';
      showMessage(`載入權限設定失敗: ${errorMessage}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handlePermissionChange = (permissionId, actionKey, value) => {
    setChanges(prev => ({
      ...prev,
      [permissionId]: {
        ...(prev[permissionId] || {}),
        id: permissionId,
        [actionKey]: value ? 1 : 0
      }
    }));

    // 同步更新顯示
    setPermissions(prev => prev.map(p =>
      p.id === permissionId ? { ...p, [actionKey]: value ? 1 : 0 } : p
    ));
  };

  const handleSaveChanges = async () => {
    if (Object.keys(changes).length === 0) {
      showMessage('沒有需要儲存的變更', 'info');
      return;
    }

    try {
      setSaving(true);
      const permissionsToUpdate = Object.values(changes);
      console.log('準備更新的權限:', permissionsToUpdate);
      await batchUpdatePermissions(permissionsToUpdate);
      setChanges({});
      showMessage('權限設定已成功更新', 'success');

      // 🔥 重要：廣播權限更新事件，清除所有權限快取
      window.dispatchEvent(new CustomEvent('permission-updated'));

      await loadPermissions();
    } catch (error) {
      console.error('儲存權限設定失敗:', error);
      const errorMessage = error.response?.data?.message || error.message || '未知錯誤';
      showMessage(`儲存權限設定失敗: ${errorMessage}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleResetRole = async () => {
    if (selectedRole === 'all') {
      showMessage('請選擇特定角色後再重置', 'info');
      return;
    }

    if (!confirm(`確定要重置 ${ROLES.find(r => r.value === selectedRole)?.label} 的權限為預設值嗎？`)) {
      return;
    }

    try {
      setSaving(true);
      await resetRolePermissions(selectedRole);
      setChanges({});
      showMessage('角色權限已重置為預設值', 'success');

      // 🔥 重要：廣播權限更新事件，清除所有權限快取
      window.dispatchEvent(new CustomEvent('permission-updated'));

      await loadPermissions();
    } catch (error) {
      console.error('重置角色權限失敗:', error);
      showMessage('重置角色權限失敗', 'error');
    } finally {
      setSaving(false);
    }
  };

  const showMessage = (text, type = 'info') => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 3000);
  };

  const getRoleBadgeColor = (role) => {
    return ROLES.find(r => r.value === role)?.color || 'bg-gray-500';
  };

  const getRoleLabel = (role) => {
    return ROLES.find(r => r.value === role)?.label || role;
  };

  // 按分類和角色組織權限
  const groupedPermissions = filteredPermissions.reduce((acc, perm) => {
    const category = perm.permission_category;
    if (!acc[category]) {
      acc[category] = {};
    }
    if (!acc[category][perm.role]) {
      acc[category][perm.role] = [];
    }
    acc[category][perm.role].push(perm);
    return acc;
  }, {});

  // 切換分類展開/收起狀態
  const toggleCategory = (category) => {
    setExpandedCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };

  // 全部展開
  const expandAll = () => {
    const allExpanded = {};
    Object.keys(groupedPermissions).forEach(category => {
      allExpanded[category] = true;
    });
    setExpandedCategories(allExpanded);
  };

  // 全部收起
  const collapseAll = () => {
    setExpandedCategories({});
  };

  // 導航到對應的管理後台頁籤或獨立頁面
  const handleNavigateToTab = (permissionKey) => {
    console.log('導航權限 key:', permissionKey);
    const mapping = PERMISSION_TAB_MAP[permissionKey];
    console.log('對應的 mapping:', mapping);
    if (mapping) {
      let targetUrl;
      if (mapping.path) {
        // 隱私權限：直接導航到獨立頁面
        targetUrl = mapping.path;
      } else if (mapping.tab) {
        // 一般權限：導航到管理後台的特定頁籤
        targetUrl = `/admin?tab=${mapping.tab}`;
      }
      console.log('導航到:', targetUrl);
      navigate(targetUrl);
      // 滾動到頁面頂部
      setTimeout(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }, 100);
      showMessage(`已導航至 ${mapping.label}`, 'success');
    } else {
      console.warn('找不到對應的頁籤:', permissionKey);
    }
  };

  // 匯出權限
  const handleExport = async () => {
    try {
      setExporting(true);
      console.log('[PermissionManagement] 開始匯出權限');
      await exportPermissions();
      showMessage('權限設定已成功匯出', 'success');
      console.log('[PermissionManagement] 匯出完成');
    } catch (error) {
      console.error('[PermissionManagement] 匯出權限設定失敗:', error);
      showMessage(`匯出失敗: ${error.message}`, 'error');
    } finally {
      setExporting(false);
    }
  };

  // 匯入權限
  const handleImport = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      showMessage('請選擇 CSV 檔案', 'error');
      return;
    }

    try {
      setImporting(true);
      const result = await importPermissions(file);

      if (result.errorCount > 0) {
        showMessage(
          `匯入完成：成功 ${result.successCount} 筆，失敗 ${result.errorCount} 筆`,
          'warning'
        );
        console.error('匯入錯誤:', result.errors);
      } else {
        showMessage(`成功匯入 ${result.successCount} 筆權限設定`, 'success');
      }

      // 🔥 重要：廣播權限更新事件，清除所有權限快取
      window.dispatchEvent(new CustomEvent('permission-updated'));

      await loadPermissions();
    } catch (error) {
      console.error('匯入權限設定失敗:', error);
      showMessage(`匯入失敗: ${error.message}`, 'error');
    } finally {
      setImporting(false);
      // 清除 input 值以允許重複選擇同一檔案
      event.target.value = '';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">載入權限設定中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 標題與操作列 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="w-6 h-6 text-purple-500" />
          <h2 className="text-2xl font-bold">權限授權設定</h2>
        </div>
        <div className="flex items-center gap-3">
          {Object.keys(changes).length > 0 && (
            <Badge variant="outline" className="bg-yellow-50">
              {Object.keys(changes).length} 項待儲存變更
            </Badge>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={expandAll}
          >
            全部展開
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={collapseAll}
          >
            全部收起
          </Button>
          <Select value={selectedRole} onValueChange={setSelectedRole}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="選擇角色" />
            </SelectTrigger>
            <SelectContent>
              {ROLES.map(role => (
                <SelectItem key={role.value} value={role.value}>
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${role.color}`} />
                    {role.label}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            onClick={handleExport}
            size="sm"
            disabled={exporting}
          >
            <Download className="w-4 h-4 mr-2" />
            {exporting ? '匯出中...' : '匯出'}
          </Button>
          <label>
            <input
              type="file"
              accept=".csv"
              onChange={handleImport}
              disabled={importing}
              className="hidden"
            />
            <Button
              variant="outline"
              size="sm"
              disabled={importing}
              onClick={(e) => e.currentTarget.previousElementSibling?.click()}
            >
              <Upload className="w-4 h-4 mr-2" />
              {importing ? '匯入中...' : '匯入'}
            </Button>
          </label>
          {selectedRole !== 'all' && (
            <Button
              variant="outline"
              onClick={handleResetRole}
              disabled={saving}
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              重置為預設值
            </Button>
          )}
          <Button
            onClick={handleSaveChanges}
            disabled={saving || Object.keys(changes).length === 0}
          >
            <Save className="w-4 h-4 mr-2" />
            {saving ? '儲存中...' : '儲存變更'}
          </Button>
        </div>
      </div>

      {/* 訊息提示 */}
      {message && (
        <div className={`p-4 rounded-lg flex items-center gap-2 ${
          message.type === 'success' ? 'bg-green-50 text-green-800' :
          message.type === 'error' ? 'bg-red-50 text-red-800' :
          'bg-blue-50 text-blue-800'
        }`}>
          {message.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
          {message.text}
        </div>
      )}

      {/* 權限列表 - 風琴式設計 */}
      {Object.entries(groupedPermissions).map(([category, roleGroups]) => {
        const isExpanded = expandedCategories[category];
        const permCount = Object.values(roleGroups).reduce((sum, perms) => sum + perms.length, 0);

        return (
          <Card key={category}>
            <Collapsible open={isExpanded} onOpenChange={() => toggleCategory(category)}>
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <CardTitle className="text-lg">{category}</CardTitle>
                      <Badge variant="outline" className="text-xs">
                        {permCount} 項權限
                      </Badge>
                    </div>
                    {isExpanded ? (
                      <ChevronUp className="w-5 h-5 text-gray-500" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-500" />
                    )}
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-40">角色</TableHead>
                          <TableHead className="w-48">權限項目</TableHead>
                          <TableHead>說明</TableHead>
                          {(() => {
                            // 檢查此分類的權限類型，決定顯示哪些操作欄位
                            const allPerms = Object.values(roleGroups).flat();
                            const isAllTrash = allPerms.every(p => isTrashPermission(p.permission_key));
                            const isAllPrivacy = allPerms.every(p => isPrivacyPermission(p.permission_category));

                            let actions;
                            if (isAllPrivacy) {
                              actions = PRIVACY_PERMISSION_ACTIONS; // 隱私管理只顯示「檢視」
                            } else if (isAllTrash) {
                              actions = TRASH_PERMISSION_ACTIONS; // 垃圾桶顯示特定欄位
                            } else {
                              actions = PERMISSION_ACTIONS; // 其他顯示全部欄位
                            }

                            return actions.map(action => (
                              <TableHead key={action.key} className="text-center w-24">
                                {action.label}
                              </TableHead>
                            ));
                          })()}
                          <TableHead className="text-center w-32">前往功能</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {Object.entries(roleGroups).map(([role, perms]) =>
                          perms.map((perm, idx) => {
                            // 根據該權限的類型決定顯示的欄位
                            const isTrash = isTrashPermission(perm.permission_key);
                            const isPrivacy = isPrivacyPermission(perm.permission_category);

                            let actions;
                            if (isPrivacy) {
                              actions = PRIVACY_PERMISSION_ACTIONS; // 隱私管理只顯示「檢視」
                            } else if (isTrash) {
                              actions = TRASH_PERMISSION_ACTIONS; // 垃圾桶顯示特定欄位
                            } else {
                              actions = PERMISSION_ACTIONS; // 其他顯示全部欄位
                            }

                            return (
                              <TableRow key={perm.id}>
                                {idx === 0 && (
                                  <TableCell rowSpan={perms.length} className="align-top">
                                    <Badge className={`${getRoleBadgeColor(role)} text-white`}>
                                      {getRoleLabel(role)}
                                    </Badge>
                                  </TableCell>
                                )}
                                <TableCell className="font-medium">
                                  {perm.permission_name}
                                </TableCell>
                                <TableCell className="text-sm text-gray-600">
                                  {perm.description}
                                </TableCell>
                                {actions.map(action => (
                                  <TableCell key={action.key} className="text-center">
                                    <Checkbox
                                      checked={perm[action.key] === 1}
                                      onCheckedChange={(checked) =>
                                        handlePermissionChange(perm.id, action.key, checked)
                                      }
                                    />
                                  </TableCell>
                                ))}
                                <TableCell className="text-center">
                                  {PERMISSION_TAB_MAP[perm.permission_key] ? (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleNavigateToTab(perm.permission_key)}
                                      className="h-8 text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                                    >
                                      <ExternalLink className="w-4 h-4" />
                                    </Button>
                                  ) : (
                                    <span className="text-gray-400 text-xs">無對應頁面</span>
                                  )}
                                </TableCell>
                              </TableRow>
                            );
                          })
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Collapsible>
          </Card>
        );
      })}

      {filteredPermissions.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-gray-500">
            沒有找到權限設定
          </CardContent>
        </Card>
      )}
    </div>
  );
}
