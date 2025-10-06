
import React, { useState, useEffect, useCallback } from "react";
import { useLocation, useNavigate } from 'react-router-dom';
import { User, DisasterArea, Grid, VolunteerRegistration, SupplyDonation } from "@/api/entities";
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Shield, MapPin, Users, Package, AlertTriangle,
  Plus, Settings, BarChart3, Clock, CheckCircle2, Trash2, UserCog
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import AddGridModal from "@/components/admin/AddGridModal";
import AddAreaModal from "@/components/admin/AddAreaModal";
import EditGridModal from "@/components/admin/EditGridModal";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { fixGridBounds } from "@/api/functions";
import GridImportExportButtons from "@/components/admin/GridImportExportButtons";
import { getUsers } from "@/api/functions"; // Added import

export default function AdminPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const isUsersRoute = location.pathname.toLowerCase() === '/admin/users' || location.pathname.toLowerCase() === '/admin/user';
  // Use global auth context so we can respect actingRole (admin vs user perspective)
  const { user, actingRole } = useAuth();
  const [disasterAreas, setDisasterAreas] = useState([]);
  const [grids, setGrids] = useState([]);
  const [registrations, setRegistrations] = useState([]);
  const [donations, setDonations] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  // Initialize from URL query if present
  const params = new URLSearchParams(location.search);
  // Support both old (page/pageSize) and new (offset/limit) URL params for backward compat
  const initialLimit = Number(params.get('limit') || params.get('pageSize') || '20') || 20;
  const initialOffset = Number(params.get('offset') || '0') || 0;
  const initialPage = Number(params.get('page') || String(Math.floor(initialOffset / initialLimit) + 1)) || 1;
  const initialPageSize = initialLimit;
  const initialRole = params.get('role') || '';
  const initialQ = params.get('q') || '';
  const [userPage, setUserPage] = useState(initialPage);
  const [userPageSize, setUserPageSize] = useState(initialPageSize);
  const [userRoleFilter, setUserRoleFilter] = useState(initialRole);
  const [userQuery, setUserQuery] = useState(initialQ);
  const [userTotalPages, setUserTotalPages] = useState(1);
  const [userTotal, setUserTotal] = useState(0);
  const [coreLoading, setCoreLoading] = useState(true);
  const [usersLoading, setUsersLoading] = useState(false);
  const [stats, setStats] = useState({
    totalAreas: 0,
    totalGrids: 0,
    totalVolunteers: 0,
    totalSupplies: 0,
    completedGrids: 0,
    urgentGrids: 0
  });
  const [showNewAreaModal, setShowNewAreaModal] = useState(false);
  const [showNewGridModal, setShowNewGridModal] = useState(false);
  const [editingArea, setEditingArea] = useState(null);
  const [showEditGridModal, setShowEditGridModal] = useState(false);
  const [editingGrid, setEditingGrid] = useState(null);
  const [selectedGridType, setSelectedGridType] = useState('all');
  const [isFixingBounds, setIsFixingBounds] = useState(false);

  const loadCoreData = useCallback(async () => {
    try {
      setCoreLoading(true);
      const [areasData, gridsData, registrationsData, donationsData] = await Promise.all([
        DisasterArea.list(),
        Grid.list(),
        VolunteerRegistration.list(),
        SupplyDonation.list(),
      ]);
      setDisasterAreas(areasData || []);
      setGrids(gridsData || []);
      setRegistrations(registrationsData || []);
      setDonations(donationsData || []);
      // Calculate stats
      const completedGrids = (gridsData || []).filter(g => g.status === 'completed').length;
      const urgentGrids = (gridsData || []).filter(g => {
        if (!g.volunteer_needed || g.volunteer_needed === 0) return false;
        const shortage = (g.volunteer_needed - g.volunteer_registered) / g.volunteer_needed;
        return shortage >= 0.6;
      }).length;
      setStats({
        totalAreas: (areasData || []).length,
        totalGrids: (gridsData || []).length,
        totalVolunteers: (registrationsData || []).length,
        totalSupplies: (donationsData || []).length,
        completedGrids,
        urgentGrids
      });
    } catch (error) {
      console.error('Failed to load core data:', error);
    } finally {
      setCoreLoading(false);
    }
  }, []);

  const loadUsers = useCallback(async () => {
    try {
      setUsersLoading(true);
      const offset = (userPage - 1) * userPageSize;
      const { data: rows, total } = await getUsers({ offset, limit: userPageSize, role: userRoleFilter || undefined, q: userQuery || undefined });
      const safeUsers = (rows || []).map(u => ({
        ...u,
        full_name: u.full_name || u.name || u.email || '未命名用戶'
      }));
      setAllUsers(safeUsers);
      setUserTotal(total || 0);
      setUserTotalPages(Math.max(1, Math.ceil((total || 0) / userPageSize)));
    } catch (error) {
      console.error('Failed to load users:', error);
      setAllUsers([]);
      setUserTotal(0);
      setUserTotalPages(1);
    } finally {
      setUsersLoading(false);
    }
  }, [userPage, userPageSize, userRoleFilter, userQuery]);

  // user 來自 AuthContext，已集中管理，這裡不再自行抓取

  // Push URL query when filters or page change (only while on users tab route)
  useEffect(() => {
    // If on users route, reflect state to URL (canonicalize to /admin/users)
    if (isUsersRoute) {
      const qs = new URLSearchParams();
  const limit = userPageSize;
  const offset = (userPage - 1) * userPageSize;
  if (offset) qs.set('offset', String(offset));
  if (limit && limit !== 20) qs.set('limit', String(limit));
      if (userRoleFilter) qs.set('role', userRoleFilter);
      if (userQuery) qs.set('q', userQuery);
      const search = qs.toString();
      const next = `/admin/users${search ? `?${search}` : ''}`;
      if (location.pathname + location.search !== next) {
        navigate(next, { replace: true });
      }
    }
    if (isUsersRoute) {
      loadUsers();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userPage, userPageSize, userRoleFilter, userQuery, location.pathname]);

  // Initial core data load once
  useEffect(() => {
    loadCoreData();
  }, [loadCoreData]);

  const handleAreaSettings = (area) => {
    setEditingArea(area);
    alert(`編輯災區: ${area.name}\n功能開發中...`);
  };

  const handleAreaDelete = async (area) => {
    const isAdminActing = user && user.role === 'admin' && actingRole === 'admin';
    if (!isAdminActing) {
      alert('只有管理員（管理模式）才能刪除災區');
      return;
    }
    if (window.confirm(`確定要刪除災區 "${area.name}" 嗎？此操作無法復原。`)) {
      try {
  await DisasterArea.delete(area.id);
  loadCoreData();
      } catch (error) {
        console.error('Failed to delete disaster area:', error);
        alert('刪除災區失敗，請稍後再試。');
      }
    }
  };

  const handleGridEdit = (grid) => {
    // 移除登入和管理員權限檢查 - 任何人都可以編輯網格
    setEditingGrid(grid);
    setShowEditGridModal(true);
  };

  const handleGridView = (grid) => {
    // For now, show grid details in an alert. Later we can implement a detailed view
    const shortageValue = grid.volunteer_needed > 0 ?
      ((grid.volunteer_needed - grid.volunteer_registered) / grid.volunteer_needed) : 0;
    const shortagePercentage = (shortageValue * 100).toFixed(0);

    alert(`網格詳情: ${grid.code}\n志工需求: ${grid.volunteer_registered}/${grid.volunteer_needed}\n缺口率: ${shortagePercentage}%\n集合地點: ${grid.meeting_point || '未設定'}\n聯絡方式: ${grid.contact_info || '未設定'}`);
  };

  const handleGridDelete = async (grid) => {
    if (!user) {
      alert('需登入才能刪除網格');
      return;
    }
    const isAdminActing = user.role === 'admin' && actingRole === 'admin';
    const isOwnerOrManager = user.id === grid.created_by_id || user.id === grid.grid_manager_id;
    if (!(isAdminActing || isOwnerOrManager)) {
      alert('您沒有刪除此網格的權限');
      return;
    }

    if (window.confirm(`確定要刪除網格 "${grid.code}" 嗎？\n\n此操作將會：\n• 刪除該網格的所有志工報名記錄\n• 刪除該網格的所有物資捐贈記錄\n• 刪除該網格的討論記錄 (如果存在)\n\n此操作無法復原，請謹慎考慮！`)) {
      try {
        // First, get all related records
        const [volunteerRegs, supplyDonations] = await Promise.all([
          VolunteerRegistration.filter({ grid_id: grid.id }),
          SupplyDonation.filter({ grid_id: grid.id })
        ]);

        // Delete all related records first
        const deletePromises = [
          // Delete volunteer registrations
          ...volunteerRegs.map(reg => VolunteerRegistration.delete(reg.id)),
          // Delete supply donations
          ...supplyDonations.map(donation => SupplyDonation.delete(donation.id)),
          // Delete grid discussions if they exist
          // ...gridDiscussions.map(discussion => GridDiscussion.delete(discussion.id))
        ];

        await Promise.all(deletePromises);
        try {
          await Grid.delete(grid.id);
        } catch (err) {
          // If backend returns 409, surface clearer message
          const msg = String(err.message || err);
          if (msg.includes('409')) {
            throw new Error('仍有相關紀錄未刪除，請稍後再試或重新整理後確認。');
          }
          throw err;
        }

  alert(`網格 "${grid.code}" 及其相關記錄已成功刪除`);
  loadCoreData(); // Reload core data only
      } catch (error) {
        console.error('Failed to delete grid:', error);
        alert('刪除網格失敗，請稍後再試。如果問題持續，請聯絡系統管理員。');
      }
    }
  };

  const getGridTypeText = (type) => {
    const types = {
      mud_disposal: '污泥暫置場',
      manpower: '人力任務',
      supply_storage: '物資停放處',
      accommodation: '住宿地點',
      food_area: '領吃食區域'
    };
    return types[type] || '其他';
  };

  const filteredGrids = selectedGridType === 'all'
    ? grids
    : grids.filter(g => g.grid_type === selectedGridType);

  const handleFixGridBounds = async () => {
    if (!user || user.role !== 'admin') {
      alert('只有管理員才能執行此操作');
      return;
    }

    if (window.confirm('確定要修復所有缺失邊界資料的網格嗎？\n\n此操作會根據現有的中心座標自動計算邊界，通常是安全的操作。')) {
      setIsFixingBounds(true);
      try {
  const response = await fixGridBounds();
        alert(`修復完成！\n${response.data.message}\n\n總網格數：${response.data.totalGrids}\n已修復：${response.data.updatedCount}`);
  loadCoreData(); // Reload core data after fixing
      } catch (error) {
        console.error('Failed to fix grid bounds:', error);
        alert('修復失敗，請稍後再試或聯絡系統管理員。');
      } finally {
        setIsFixingBounds(false);
      }
    }
  };

  const handleRoleChange = async (targetUserId, newRole) => {
    if (user.id === targetUserId) {
      alert('您無法變更自己的權限');
      return;
    }

    const targetUser = allUsers.find(u => u.id === targetUserId);
    if (window.confirm(`確定要將用戶 ${targetUser?.full_name || ''} 的權限變更為 ${newRole} 嗎？`)) {
      try {
  await User.update(targetUserId, { role: newRole });
        alert('用戶權限已更新');
  loadUsers();
      } catch (error) {
        console.error('Failed to update user role:', error);
        alert('更新權限失敗，請稍後再試。');
      }
    }
  };

  if (coreLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="px-4 py-6 min-w-xxs">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4 justify-between">
          <div className="flex items-center gap-3">
            <Shield className="w-8 h-8 text-blue-600" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900">管理後台</h1>
              <p className="text-gray-600">系統管理與營運監控</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* 僅在管理模式下顯示 */}
            {user && user.role === 'admin' && actingRole === 'admin' && (
              <Button
                onClick={handleFixGridBounds}
                disabled={isFixingBounds}
                className="bg-gray-600 hover:bg-gray-700"
                size="sm"
              >
                {isFixingBounds ? '修復中...' : '修復網格邊界'}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6 mb-8">
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-4">
            <div className="text-center">
              <MapPin className="w-8 h-8 text-blue-600 mx-auto mb-2 flex-shrink-0" />
              <p className="text-2xl font-bold text-gray-900">{stats.totalAreas}</p>
              <p className="text-sm text-gray-600 whitespace-nowrap">災區數量</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardContent className="p-4">
            <div className="text-center">
              <BarChart3 className="w-8 h-8 text-purple-600 mx-auto mb-2 flex-shrink-0" />
              <p className="text-2xl font-bold text-gray-900">{stats.totalGrids}</p>
              <p className="text-sm text-gray-600 whitespace-nowrap">網格總數</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardContent className="p-4">
            <div className="text-center">
              <Users className="w-8 h-8 text-green-600 mx-auto mb-2 flex-shrink-0" />
              <p className="text-2xl font-bold text-gray-900">{stats.totalVolunteers}</p>
              <p className="text-sm text-gray-600 whitespace-nowrap">志工報名</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-500">
          <CardContent className="p-4">
            <div className="text-center">
              <Package className="w-8 h-8 text-orange-600 mx-auto mb-2 flex-shrink-0" />
              <p className="text-2xl font-bold text-gray-900">{stats.totalSupplies}</p>
              <p className="text-sm text-gray-600 whitespace-nowrap">物資捐贈</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardContent className="p-4">
            <div className="text-center">
              <CheckCircle2 className="w-8 h-8 text-green-600 mx-auto mb-2 flex-shrink-0" />
              <p className="text-2xl font-bold text-gray-900">{stats.completedGrids}</p>
              <p className="text-sm text-gray-600 whitespace-nowrap">已完成</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-red-500">
          <CardContent className="p-4">
            <div className="text-center">
              <AlertTriangle className="w-8 h-8 text-red-600 mx-auto mb-2 flex-shrink-0" />
              <p className="text-2xl font-bold text-gray-900">{stats.urgentGrids}</p>
              <p className="text-sm text-gray-600 whitespace-nowrap">急需支援</p>
            </div>
          </CardContent>
        </Card>
      </div>

  <Tabs defaultValue={isUsersRoute ? 'users' : 'grids'} className="space-y-6">
        <TabsList>
          <TabsTrigger value="areas">災區管理</TabsTrigger>
          <TabsTrigger value="grids">需求管理</TabsTrigger>
          <TabsTrigger value="volunteers">志工管理</TabsTrigger>
          <TabsTrigger value="supplies">物資管理</TabsTrigger>
          {user && actingRole === 'admin' && (
            <TabsTrigger value="users" onClick={() => { if (location.pathname.toLowerCase() !== '/admin/users') navigate('/admin/users'); }}>用戶管理</TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="areas">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>災區清單</CardTitle>
              <Button
                className="bg-blue-600 hover:bg-blue-700"
                onClick={() => setShowNewAreaModal(true)}
              >
                <Plus className="w-4 h-4 mr-2" />
                新增災區
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {disasterAreas.map((area) => (
                  <Card key={area.id} className="border border-gray-200">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">{area.name}</h3>
                          <p className="text-sm text-gray-600">{area.county} {area.township}</p>
                          <p className="text-xs text-gray-500 mt-1">{area.description}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge
                            className={area.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}
                          >
                            {area.status === 'active' ? '進行中' : area.status}
                          </Badge>
                          {user && user.role === 'admin' && actingRole === 'admin' && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="outline"
                                >
                                  <Settings className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleAreaSettings(area)}>
                                  <Settings className="w-4 h-4 mr-2" />
                                  編輯
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-red-600 focus:text-red-600 focus:bg-red-50"
                                  onClick={() => handleAreaDelete(area)}>
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  刪除
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="grids">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>地區需求調整</CardTitle>
              <div className="flex items-center gap-3">
                {user && user.role === 'admin' && actingRole === 'admin' && (
                  <GridImportExportButtons onImportSuccess={loadCoreData} />
                )}
                {/* 保留原有的新增網格按鈕，但改為較小的樣式 */}
                <Button
                  className="bg-purple-600 hover:bg-purple-700"
                  onClick={() => setShowNewGridModal(true)}
                  size="sm"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  新增網格
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2 mb-6">
                <Button size="sm" variant={selectedGridType === 'all' ? 'default' : 'outline'} onClick={() => setSelectedGridType('all')}>全部 ({grids.length})</Button>
                <Button size="sm" variant={selectedGridType === 'manpower' ? 'default' : 'outline'} onClick={() => setSelectedGridType('manpower')}>人力任務 ({grids.filter(g=>g.grid_type === 'manpower').length})</Button>
                <Button size="sm" variant={selectedGridType === 'mud_disposal' ? 'default' : 'outline'} onClick={() => setSelectedGridType('mud_disposal')}>污泥暫置場 ({grids.filter(g=>g.grid_type === 'mud_disposal').length})</Button>
                <Button size="sm" variant={selectedGridType === 'supply_storage' ? 'default' : 'outline'} onClick={() => setSelectedGridType('supply_storage')}>物資停放處 ({grids.filter(g=>g.grid_type === 'supply_storage').length})</Button>
                <Button size="sm" variant={selectedGridType === 'accommodation' ? 'default' : 'outline'} onClick={() => setSelectedGridType('accommodation')}>住宿地點 ({grids.filter(g=>g.grid_type === 'accommodation').length})</Button>
                <Button size="sm" variant={selectedGridType === 'food_area' ? 'default' : 'outline'} onClick={() => setSelectedGridType('food_area')}>領吃食區域 ({grids.filter(g=>g.grid_type === 'food_area').length})</Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredGrids.map((grid) => {
                  const shortage = grid.volunteer_needed ? (grid.volunteer_needed - grid.volunteer_registered) / grid.volunteer_needed : 0;
                  const urgency = shortage >= 0.6 ? 'urgent' : shortage >= 0.4 ? 'moderate' : 'low';

                  return (
                    <Card key={grid.id} className={`border-l-4 ${
                      urgency === 'urgent' ? 'border-l-red-500' :
                      urgency === 'moderate' ? 'border-l-orange-500' :
                      'border-l-green-500'
                    }`}>
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start mb-3">
                          <h3 className="font-bold text-lg">{grid.code}</h3>
                          <div className="flex flex-col items-end gap-1">
                            <Badge className={
                              grid.status === 'completed' ? 'bg-green-100 text-green-800' :
                              grid.status === 'open' ? 'bg-blue-100 text-blue-800' :
                              'bg-gray-100 text-gray-800'
                            }>
                              {grid.status === 'completed' ? '已完成' :
                               grid.status === 'open' ? '開放中' : '準備中'}
                            </Badge>
                             <Badge variant="secondary" className="text-xs">
                              {getGridTypeText(grid.grid_type)}
                            </Badge>
                          </div>
                        </div>

                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600">志工:</span>
                            <span className="font-medium">
                              {grid.volunteer_registered}/{grid.volunteer_needed}
                            </span>
                          </div>

                          {grid.supplies_needed?.length > 0 && (
                            <div className="flex justify-between">
                              <span className="text-gray-600">物資:</span>
                              <span className="font-medium">
                                {grid.supplies_needed.length} 項目
                              </span>
                            </div>
                          )}

                          {grid.meeting_point && (
                            <div className="text-xs text-gray-500 mt-2">
                              集合: {grid.meeting_point}
                            </div>
                          )}
                        </div>

                        <div className="mt-4 flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1"
                            onClick={() => handleGridEdit(grid)}
                          >
                            編輯
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1"
                            onClick={() => handleGridView(grid)}
                          >
                            查看
                          </Button>
                          {/* Delete: admin OR creator OR grid_manager */}
                          {(() => {
                            if (!user) return null;
                            const isAdminActing = user.role === 'admin' && actingRole === 'admin';
                            const isOwnerOrManager = user.id === grid.created_by_id || user.id === grid.grid_manager_id;
                            const canDelete = isAdminActing || isOwnerOrManager;
                            if (!canDelete) return null;
                            return (
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-red-600 hover:text-red-700 hover:border-red-300 border-red-200"
                                onClick={() => handleGridDelete(grid)}
                                title="刪除網格（管理模式下的管理員或建立者/指派管理者）"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            );
                          })()}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="volunteers">
          <div className="space-y-6">
            {/* Stats Overview */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
              <Card className="border-l-4 border-l-yellow-500">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-yellow-100 rounded-lg">
                      <Clock className="w-6 h-6 text-yellow-600" />
                    </div>
                    <div>
                      <p className="text-3xl font-bold text-gray-900">
                        {registrations.filter(r => r.status === 'pending').length}
                      </p>
                      <p className="text-sm text-gray-600">待確認</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-blue-500">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-blue-100 rounded-lg">
                      <CheckCircle2 className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-3xl font-bold text-gray-900">
                        {registrations.filter(r => r.status === 'confirmed').length}
                      </p>
                      <p className="text-sm text-gray-600">已確認</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-green-500">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-green-100 rounded-lg">
                      <Users className="w-6 h-6 text-green-600" />
                    </div>
                    <div>
                      <p className="text-3xl font-bold text-gray-900">
                        {registrations.filter(r => r.status === 'completed').length}
                      </p>
                      <p className="text-sm text-gray-600">已完成</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* 詳細志工管理按鈕 */}
            <div className="text-center">
              <Link to={createPageUrl("Volunteers")}>
                <Button className="bg-green-600 hover:bg-green-700">
                  查看詳細志工管理
                </Button>
              </Link>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="supplies">
          <Card>
            <CardHeader>
              <CardTitle>物資管理概覽</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <Card className="border border-gray-200">
                  <CardContent className="p-4 text-center">
                    <Clock className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-gray-900">
                      {donations.filter(d => d.status === 'pledged').length}
                    </p>
                    <p className="text-sm text-gray-600">已承諾</p>
                  </CardContent>
                </Card>

                <Card className="border border-gray-200">
                  <CardContent className="p-4 text-center">
                    <Package className="w-8 h-8 text-yellow-600 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-gray-900">
                      {donations.filter(d => d.status === 'in_transit').length}
                    </p>
                    <p className="text-sm text-gray-600">運送中</p>
                  </CardContent>
                </Card>

                <Card className="border border-gray-200">
                  <CardContent className="p-4 text-center">
                    <CheckCircle2 className="w-8 h-8 text-green-600 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-gray-900">
                      {donations.filter(d => d.status === 'delivered').length}
                    </p>
                    <p className="text-sm text-gray-600">已送達</p>
                  </CardContent>
                </Card>
              </div>

              <div className="text-center">
                <Link to={createPageUrl("Supplies")}>
                  <Button className="bg-orange-600 hover:bg-orange-700">
                    查看詳細物資管理
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {user && actingRole === 'admin' && (
          <TabsContent value="users">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserCog className="w-5 h-5 text-indigo-600" />
                  用戶權限管理
                </CardTitle>
              </CardHeader>
              <CardContent>
                {/* Filters */}
                <div className="flex flex-wrap items-center gap-3 mb-4">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={userQuery}
                      onChange={(e) => { setUserPage(1); setUserQuery(e.target.value); }}
                      placeholder="搜尋姓名/Email/ID"
                      className="border rounded px-3 py-2 text-sm"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Select
                      value={userRoleFilter || 'all'}
                      onValueChange={(v) => { setUserPage(1); setUserRoleFilter(v === 'all' ? '' : v); }}
                    >
                      <SelectTrigger className="w-40">
                        <SelectValue placeholder="角色篩選" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">全部角色</SelectItem>
                        <SelectItem value="user">user</SelectItem>
                        <SelectItem value="grid_manager">grid_manager</SelectItem>
                        <SelectItem value="admin">admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-2 ml-auto">
                    <Select
                      value={String(userPageSize)}
                      onValueChange={(v) => { setUserPage(1); setUserPageSize(Number(v)); }}
                    >
                      <SelectTrigger className="w-28">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="10">每頁 10 筆</SelectItem>
                        <SelectItem value="20">每頁 20 筆</SelectItem>
                        <SelectItem value="50">每頁 50 筆</SelectItem>
                        <SelectItem value="100">每頁 100 筆</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                {(usersLoading && allUsers.length === 0) ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                  </div>
                ) : allUsers.length > 0 ? (
                  <div className="space-y-4">
                    {allUsers.map((u) => (
                      <div key={u.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            {u.avatar_url ? (
                              <AvatarImage src={u.avatar_url} alt={u.full_name || u.name || 'avatar'} />
                            ) : null}
                            <AvatarFallback>
                              {(u.full_name || u.name || 'U').slice(0,1).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <p className="font-semibold text-lg">{u.full_name}</p>
                        </div>
                        <div className="flex items-center gap-4">
                          <Badge variant="secondary">{u.role}</Badge>
                          <Select
                            value={u.role}
                            onValueChange={(newRole) => handleRoleChange(u.id, newRole)}
                            disabled={
                              actingRole !== 'admin' ||
                              user.id === u.id
                            }
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="user">user</SelectItem>
                              <SelectItem value="grid_manager">grid_manager</SelectItem>
                              <SelectItem value="admin">admin</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    ))}
                    {usersLoading && (
                      <div className="flex items-center justify-center py-6">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
                      </div>
                    )}
                    {/* Pagination Controls */}
                    <div className="flex items-center justify-between pt-2">
                      <div className="text-sm text-gray-600">共 {userTotal} 筆，頁 {userPage} / {userTotalPages}</div>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => setUserPage(1)} disabled={userPage === 1}>«</Button>
                        <Button variant="outline" size="sm" onClick={() => setUserPage(p => Math.max(1, p - 1))} disabled={userPage === 1}>上一頁</Button>
                        <Button variant="outline" size="sm" onClick={() => setUserPage(p => Math.min(userTotalPages, p + 1))} disabled={userPage >= userTotalPages}>下一頁</Button>
                        <Button variant="outline" size="sm" onClick={() => setUserPage(userTotalPages)} disabled={userPage >= userTotalPages}>»</Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <UserCog className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>無法載入用戶列表或您沒有權限查看</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      {/* New Area Modal with Map */}
      {showNewAreaModal && (
        <AddAreaModal
          isOpen={showNewAreaModal}
          onClose={() => setShowNewAreaModal(false)}
          onSuccess={() => {
            setShowNewAreaModal(false);
            loadCoreData();
          }}
        />
      )}

      {/* New Grid Modal */}
      {showNewGridModal && (
        <AddGridModal
          isOpen={showNewGridModal}
          onClose={() => setShowNewGridModal(false)}
          onSuccess={() => {
            setShowNewGridModal(false);
            loadCoreData();
          }}
          disasterAreas={disasterAreas}
        />
      )}

      {/* Edit Grid Modal */}
      {showEditGridModal && (
        <EditGridModal
          isOpen={showEditGridModal}
          onClose={() => setShowEditGridModal(false)}
          onSuccess={() => {
            setShowEditGridModal(false);
            loadCoreData();
          }}
          grid={editingGrid}
        />
      )}
    </div>
  );
}
