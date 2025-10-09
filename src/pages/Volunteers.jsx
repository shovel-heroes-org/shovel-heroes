
import React, { useState, useEffect, useCallback } from "react";
import { VolunteerRegistration, Grid, User } from "@/api/entities";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Users, Clock, CheckCircle2, AlertCircle, MapPin,
  Phone, Calendar, Wrench, HardHat, X, Filter, Edit
} from "lucide-react";
import { getVolunteers } from "@/api/functions"; // New import
import { useAuth } from '@/context/AuthContext';
import UnauthorizedAccess from "@/components/common/UnauthorizedAccess";
import { usePermission } from "@/hooks/usePermission";
import EditVolunteerModal from "@/components/volunteers/EditVolunteerModal";

export default function VolunteersPage() {
  const { user, actingRole } = useAuth();
  const [registrations, setRegistrations] = useState([]);
  const [grids, setGrids] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [canViewPhone, setCanViewPhone] = useState(false); // New state for phone visibility
  const [canEditSelf, setCanEditSelf] = useState(false); // 編輯自己的志工報名
  const [canEditOthers, setCanEditOthers] = useState(false); // 編輯別人的志工報名
  const [currentUserId, setCurrentUserId] = useState(null); // 當前用戶 ID
  // UI filter states (now URL-synchronized)
  const [selectedGrid, setSelectedGrid] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    confirmed: 0,
    completed: 0
  });

  // 權限檢查
  const { canEdit, canManage, hasPermission } = usePermission();

  // 志工報名相關權限（volunteer_registrations）
  const canEditVolunteer = hasPermission('volunteer_registrations', 'edit');
  const canManageVolunteer = hasPermission('volunteer_registrations', 'manage');

  // 志工狀態管理權限（volunteer_status_management）
  const canManageVolunteerStatus = hasPermission('volunteer_status_management', 'view');

  // 編輯相關狀態
  const [editingRegistration, setEditingRegistration] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);

  // Parse initial filters from URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlGrid = params.get('grid');
    const urlStatus = params.get('status');
    if (urlGrid) setSelectedGrid(urlGrid);
    if (urlStatus && ['all','pending','confirmed','completed'].includes(urlStatus)) {
      setSelectedStatus(urlStatus);
    }
  }, []);

  // Keep URL updated when filters change
  useEffect(() => {
    const params = new URLSearchParams();
    if (selectedGrid && selectedGrid !== 'all') params.set('grid', selectedGrid);
    if (selectedStatus && selectedStatus !== 'all') params.set('status', selectedStatus);
    const qs = params.toString();
    const newUrl = `${window.location.pathname}${qs ? '?' + qs : ''}`;
    // Use replaceState to avoid polluting history for each small change
    window.history.replaceState(null, '', newUrl);
  }, [selectedGrid, selectedStatus]);

  // Support browser back/forward navigation affecting query params
  useEffect(() => {
    const onPop = () => {
      const params = new URLSearchParams(window.location.search);
      const urlGrid = params.get('grid') || 'all';
      const urlStatus = params.get('status') || 'all';
      setSelectedGrid(urlGrid);
      setSelectedStatus(['all', 'pending', 'confirmed', 'completed'].includes(urlStatus) ? urlStatus : 'all');
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [volunteersResponse, gridsData] = await Promise.all([
        getVolunteers(),
        Grid.list()
      ]);

      // DEBUG: 記錄原始回應
      // console.log('🔍 [Volunteers] API 原始回應:', volunteersResponse);

      // Normalize various possible shapes safely without ever touching undefined.data
      // Supported shapes:
      // 1. { data: [...] , can_view_phone?: boolean, can_edit?: boolean, can_manage?: boolean, user_id?: string }
      // 2. Legacy (unlikely now): [...]
      // 3. Defensive: anything else -> []
      let list = [];
      let canView = false;
      let canEdit = false;
      let canManage = false;
      let userId = null;

      if (Array.isArray(volunteersResponse)) {
        list = volunteersResponse;
      } else if (volunteersResponse && Array.isArray(volunteersResponse.data)) {
        list = volunteersResponse.data;
        canView = Boolean(volunteersResponse.can_view_phone);
        canEdit = Boolean(volunteersResponse.can_edit);
        canManage = Boolean(volunteersResponse.can_manage);
        userId = volunteersResponse.user_id || null;
      } else if (volunteersResponse && volunteersResponse.data && Array.isArray(volunteersResponse.data.data)) {
        // Extremely defensive nested case (should not happen now)
        list = volunteersResponse.data.data;
        canView = Boolean(volunteersResponse.data.can_view_phone || volunteersResponse.can_view_phone);
        canEdit = Boolean(volunteersResponse.data.can_edit || volunteersResponse.can_edit);
        canManage = Boolean(volunteersResponse.data.can_manage || volunteersResponse.can_manage);
        userId = volunteersResponse.data.user_id || volunteersResponse.user_id || null;
      }

      // Ensure every item has minimal required fields to avoid downstream optional chaining issues
      const finalRegs = list.map(r => ({
        id: r.id,
        grid_id: r.grid_id,
        user_id: r.user_id || null,  // 保留 user_id (可能為 null)
        created_by_id: r.created_by_id || null,  // 保留 created_by_id (可能為 null)
        volunteer_name: r.volunteer_name || r.name || '匿名志工',
        // 保留 volunteer_phone 的原始值
        // 'NO_ACCESS_PERMISSION' = 有填但沒權限看
        // null = 沒填電話
        // '' = 沒填電話
        // string = 有填且有權限看
        volunteer_phone: r.volunteer_phone,
        status: r.status || 'pending',
        available_time: r.available_time || r.time || null,
        skills: Array.isArray(r.skills) ? r.skills : [],
        equipment: Array.isArray(r.equipment) ? r.equipment : [],
        notes: r.notes || '',
        created_date: r.created_date || r.created_at || new Date().toISOString()
      }));

      // DEBUG: 記錄解析後的權限
      // console.log('🔍 [Volunteers] 解析後的權限:', {
      //   canView,
      //   canEdit,
      //   canManage,
      //   userId,
      //   registrationsCount: finalRegs.length
      // });

      setCanViewPhone(canView);
      setCanEditSelf(canEdit);
      setCanEditOthers(canManage);
      setCurrentUserId(userId);
      setRegistrations(finalRegs);
      setGrids(gridsData);
      setCurrentUser(user);

      // DEBUG: 暴露到全域 (用於除錯)
      window.__VOLUNTEERS_DEBUG__ = {
        canEditSelf: canEdit,
        canEditOthers: canManage,
        canCreate: volunteersResponse.can_create,
        currentUserId: userId,
        registrations: finalRegs,
        apiResponse: volunteersResponse,
        actingRole
      };

      // console.log('🔍 [Volunteers] 權限資訊:', {
      //   canEditSelf: canEdit,
      //   canEditOthers: canManage,
      //   canCreate: volunteersResponse.can_create,
      //   currentUserId: userId,
      //   actingRole,
      //   totalRegistrations: finalRegs.length
      // });

      setStats({
        total: finalRegs.length,
        pending: finalRegs.filter(r => r.status === 'pending').length,
        confirmed: finalRegs.filter(r => r.status === 'confirmed').length,
        completed: finalRegs.filter(r => r.status === 'completed').length,
      });
    } catch (error) {
      if (error?.status === 401) {
        setRegistrations([]);
        setGrids([]);
        setCurrentUser(null);
        setCanViewPhone(false);
        setStats({ total: 0, pending: 0, confirmed: 0, completed: 0 });
      } else {
        console.error('Failed to load data:', error);
      }
    } finally {
      setLoading(false);
    }
  }, [user, actingRole]);

  // 當使用者或視角變更時重新載入資料
  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleStatusUpdate = async (registration, newStatus) => {
    try {
      // Update volunteer registration status - no client-side permission check here as per requirement
      await VolunteerRegistration.update(registration.id, { status: newStatus });

      // If confirming a volunteer, update the grid's registered count
      if (newStatus === 'confirmed' && registration.status === 'pending') {
        const grid = grids.find(g => g.id === registration.grid_id);
        if (grid) {
          await Grid.update(grid.id, {
            volunteer_registered: (grid.volunteer_registered || 0) + 1
          });
        }
      }
      // If rejecting a previously confirmed volunteer, decrease the count
      else if (newStatus === 'cancelled' && registration.status === 'confirmed') {
        const grid = grids.find(g => g.id === registration.grid_id);
        if (grid) {
          await Grid.update(grid.id, {
            volunteer_registered: Math.max((grid.volunteer_registered || 0) - 1, 0)
          });
        }
      }

      loadData(); // Reload all data
    } catch (error) {
      console.error('Failed to update volunteer status:', error);
      alert('更新志工狀態失敗，請稍後再試。');
    }
  };

  const handleEditRegistration = (registration) => {
    setEditingRegistration(registration);
    setShowEditModal(true);
  };

  const handleEditSuccess = () => {
    setShowEditModal(false);
    setEditingRegistration(null);
    loadData(); // 重新載入資料
  };

  const getGridInfo = (gridId) => {
    return grids.find(g => g.id === gridId) || {};
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'confirmed': return 'bg-blue-100 text-blue-800';
      case 'arrived': return 'bg-purple-100 text-purple-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'declined': return 'bg-red-100 text-red-800';
      case 'cancelled': return 'bg-gray-200 text-gray-700';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'pending': return '待確認';
      case 'confirmed': return '已確認';
      case 'arrived': return '已到場';
      case 'completed': return '已完成';
      case 'declined': return '已婉拒';
      case 'cancelled': return '已取消';
      default: return status;
    }
  };

  const filterRegistrations = useCallback((status) => {
    let filtered = registrations;
    const effectiveStatus = status || selectedStatus;
    if (effectiveStatus !== 'all') {
      filtered = filtered.filter(r => r.status === effectiveStatus);
    }
    if (selectedGrid !== 'all') {
      filtered = filtered.filter(r => r.grid_id === selectedGrid);
    }
    return filtered;
  }, [registrations, selectedGrid, selectedStatus]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // 權限檢查：必須有 volunteers 檢視權限才能訪問志工中心
  const canViewVolunteers = hasPermission('volunteers', 'view');

  if (!user) {
    return (
      <UnauthorizedAccess
        title="無權限訪問志工中心"
        message="志工中心需要登入後才能使用。請先登入以查看和管理志工報名資訊。"
      />
    );
  }

  // 檢查實際角色 (actingRole 可能為 undefined, 需要回退到 user.role)
  const effectiveRole = actingRole || user.role || 'guest';
  if (effectiveRole === 'guest') {
    return (
      <UnauthorizedAccess
        title="無權限訪問志工中心"
        message="訪客模式無法訪問志工中心。請切換到其他角色以查看和管理志工報名資訊。"
      />
    );
  }

  // 權限檢查：必須有 view_volunteer_contact 檢視權限
  if (!canViewVolunteers) {
    return (
      <UnauthorizedAccess
        title="無權限訪問志工中心"
        message="您目前的角色沒有訪問志工中心的權限。請聯繫管理員調整權限設定。"
      />
    );
  }

  return (
    <div className="px-4 py-[1.2rem] min-w-[436px]">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">志工管理中心</h1>
        <p className="text-gray-600">管理志工報名狀況與協調救援工作</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-[1.2rem]">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 rounded-lg flex-shrink-0">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
              <div className="min-w-0">
                <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
                <p className="text-sm text-gray-600 whitespace-nowrap">總報名數</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-yellow-500">
          <CardContent className="p-[1.2rem]">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-yellow-100 rounded-lg flex-shrink-0">
                <Clock className="w-6 h-6 text-yellow-600" />
              </div>
              <div className="min-w-0">
                <p className="text-3xl font-bold text-gray-900">{stats.pending}</p>
                <p className="text-sm text-gray-600 whitespace-nowrap">待確認</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-[1.2rem]">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 rounded-lg flex-shrink-0">
                <CheckCircle2 className="w-6 h-6 text-blue-600" />
              </div>
              <div className="min-w-0">
                <p className="text-3xl font-bold text-gray-900">{stats.confirmed}</p>
                <p className="text-sm text-gray-600 whitespace-nowrap">已確認</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardContent className="p-[1.2rem]">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-100 rounded-lg flex-shrink-0">
                <CheckCircle2 className="w-6 h-6 text-green-600" />
              </div>
              <div className="min-w-0">
                <p className="text-3xl font-bold text-gray-900">{stats.completed}</p>
                <p className="text-sm text-gray-600 whitespace-nowrap">已完成</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Volunteer List */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <CardTitle>志工報名清單</CardTitle>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-gray-500" />
                <Select value={selectedGrid} onValueChange={setSelectedGrid}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="選擇救援網格" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">所有網格</SelectItem>
                    {grids.map(grid => (
                      <SelectItem key={grid.id} value={grid.id}>
                        {grid.code}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={selectedStatus} onValueChange={setSelectedStatus}>
            <TabsList className="mb-6">
              <TabsTrigger value="all">全部</TabsTrigger>
              <TabsTrigger value="pending">待確認</TabsTrigger>
              <TabsTrigger value="confirmed">已確認</TabsTrigger>
              <TabsTrigger value="completed">已完成</TabsTrigger>
            </TabsList>

            {['all', 'pending', 'confirmed', 'completed'].map(tabValue => (
              <TabsContent key={tabValue} value={tabValue}>
                <div className="space-y-4">
                  {filterRegistrations(tabValue).map((registration) => {
                    const grid = getGridInfo(registration.grid_id);
                    // The canViewPhone state now directly reflects the backend's decision
                    // so no client-side role check is needed here.

                    return (
                      <Card key={registration.id} className="border border-gray-200">
                        <CardContent className="p-6">
                          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-3">
                                <h3 className="text-lg font-semibold text-gray-900">
                                  {registration.volunteer_name}
                                </h3>
                                <Badge className={getStatusColor(registration.status)}>
                                  {getStatusText(registration.status)}
                                </Badge>
                                {grid.code && (
                                  <Badge variant="outline" className="bg-blue-50 text-blue-700">
                                    {grid.code}
                                  </Badge>
                                )}
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                                <div className="flex items-center gap-2">
                                  <MapPin className="w-4 h-4" />
                                  <span>救援區域: {grid.code || '未知區域'}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Phone className="w-4 h-4" />
                                  {(() => {
                                    // 檢查是否為特殊字串 NO_ACCESS_PERMISSION
                                    if (registration.volunteer_phone === 'NO_ACCESS_PERMISSION') {
                                      return <span className="text-gray-400 italic text-xs">(需要隱私權限且為管理員/相關格主/志工本人才能查看聯絡資訊)</span>;
                                    }
                                    // 有值：顯示電話
                                    if (registration.volunteer_phone && typeof registration.volunteer_phone === 'string' && registration.volunteer_phone.trim() !== '') {
                                      return <span>{registration.volunteer_phone}</span>;
                                    }
                                    // null 或空字串：使用者沒填電話
                                    return <span className="text-gray-400 italic text-xs">未提供</span>;
                                  })()}
                                </div>
                                {registration.available_time && (
                                  <div className="flex items-center gap-2">
                                    <Calendar className="w-4 h-4" />
                                    <span>可服務時間: {registration.available_time}</span>
                                  </div>
                                )}
                                <div className="flex items-center gap-2">
                                  <Clock className="w-4 h-4" />
                                  <span>報名時間: {new Date(registration.created_date).toLocaleString('zh-TW')}</span>
                                </div>
                              </div>

                              {(registration.skills?.length > 0 || registration.equipment?.length > 0) && (
                                <div className="mt-3 space-y-2">
                                  {registration.skills?.length > 0 && (
                                    <div className="flex items-center gap-2 text-sm">
                                      <HardHat className="w-4 h-4 text-blue-600" />
                                      <span className="font-medium">專業技能:</span>
                                      <span className="text-gray-600">
                                        {registration.skills.join(', ')}
                                      </span>
                                    </div>
                                  )}
                                  {registration.equipment?.length > 0 && (
                                    <div className="flex items-center gap-2 text-sm">
                                      <Wrench className="w-4 h-4 text-green-600" />
                                      <span className="font-medium">攜帶工具:</span>
                                      <span className="text-gray-600">
                                        {registration.equipment.join(', ')}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              )}

                              {registration.notes && (
                                <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                                  <p className="text-sm text-gray-700">{registration.notes}</p>
                                </div>
                              )}
                            </div>

                            {/* 狀態操作按鈕 */}
                            <div className="flex flex-col sm:flex-row gap-2">
                              {/* 編輯按鈕：根據 API 返回的權限控制（參考 canViewPhone 的實作方式）*/}
                              {(() => {
                                // 判斷是否為志工本人（使用 API 返回的 currentUserId）
                                const isSelf = currentUserId && (
                                  registration.user_id === currentUserId ||
                                  registration.created_by_id === currentUserId
                                );

                                // 編輯權限邏輯（從 API 取得）：
                                // 1. canEditSelf (can_edit) + 是自己 → 可以編輯自己的
                                // 2. canEditOthers (can_manage) + 是別人 → 可以編輯別人的
                                const canEditThis = (canEditSelf && isSelf) || (canEditOthers && !isSelf);

                                return canEditThis && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="text-blue-600 hover:text-blue-700"
                                    onClick={() => handleEditRegistration(registration)}
                                  >
                                    <Edit className="w-4 h-4 mr-1" />
                                    編輯
                                  </Button>
                                );
                              })()}

                              {/* 確認報名/婉拒按鈕：根據 volunteer_status_management 的 view 權限控制 */}
                              {registration.status === 'pending' && canManageVolunteerStatus && (
                                <>
                                  <Button
                                    size="sm"
                                    className="bg-green-600 hover:bg-green-700"
                                    onClick={() => handleStatusUpdate(registration, 'confirmed')}
                                  >
                                    <CheckCircle2 className="w-4 h-4 mr-2" />
                                    確認報名
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="text-red-600 hover:text-red-700 border-red-200 hover:border-red-300"
                                    onClick={() => handleStatusUpdate(registration, 'declined')}
                                  >
                                    <X className="w-4 h-4 mr-2" />
                                    婉拒
                                  </Button>
                                </>
                              )}
                              {/* 標記到場按鈕：根據 volunteer_status_management 的 view 權限控制 */}
                              {registration.status === 'confirmed' && canManageVolunteerStatus && (
                                <Button
                                  size="sm"
                                  className="bg-purple-600 hover:bg-purple-700"
                                  onClick={() => handleStatusUpdate(registration, 'arrived')}
                                >
                                  <MapPin className="w-4 h-4 mr-2" />
                                  標記到場
                                </Button>
                              )}
                              {/* 標記完成按鈕：根據 volunteer_status_management 的 view 權限控制 */}
                              {registration.status === 'arrived' && canManageVolunteerStatus && (
                                <Button
                                  size="sm"
                                  className="bg-green-600 hover:bg-green-700"
                                  onClick={() => handleStatusUpdate(registration, 'completed')}
                                >
                                  <CheckCircle2 className="w-4 h-4 mr-2" />
                                  標記完成
                                </Button>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}

                  {filterRegistrations(tabValue).length === 0 && (
                    <div className="text-center py-12 text-gray-500">
                      <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>目前沒有符合條件的志工報名</p>
                    </div>
                  )}
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>

      {/* 編輯志工報名 Modal */}
      {showEditModal && editingRegistration && (
        <EditVolunteerModal
          registration={editingRegistration}
          grids={grids}
          canEditSelf={canEditSelf}
          canEditOthers={canEditOthers}
          currentUserId={currentUserId}
          onSuccess={handleEditSuccess}
          onClose={() => {
            setShowEditModal(false);
            setEditingRegistration(null);
          }}
        />
      )}
    </div>
  );
}
