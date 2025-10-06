
import React, { useState, useEffect, useRef, useCallback } from "react";
import { SupplyDonation, Grid, User } from "@/api/entities";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Package, Truck, CheckCircle2, Clock, MapPin,
  Phone, Calendar, AlertCircle, Plus, ShoppingCart, Edit,
  CalendarClock
} from "lucide-react";
import AddSupplyRequestModal from "@/components/supplies/AddSupplyRequestModal";
import EditSupplyDonationModal from "@/components/supplies/EditSupplyDonationModal";
import GridDetailModal from "@/components/map/GridDetailModal"; // 新增導入
import { useRequireLogin } from "@/hooks/useRequireLogin";
import { usePermission } from "@/hooks/usePermission";
import { formatCreatedDate } from "@/lib/utils";
import { useSuppliesData } from "@/hooks/use-supplies-data";
import LoginRequiredDialog from "@/components/common/LoginRequiredDialog";

export default function SuppliesPage() {
  const [donations, setDonations] = useState([]);
  const [grids, setGrids] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddRequestModal, setShowAddRequestModal] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [stats, setStats] = useState({
    total: 0,
    pledged: 0,
    confirmed: 0,
    delivered: 0
  });
  const [unfulfilledRequests, setUnfulfilledRequests] = useState([]);
  const [selectedGridForDonation, setSelectedGridForDonation] = useState(null); // 彈窗選取之網格
  const [gridDetailTab, setGridDetailTab] = useState('supply'); // 控制 GridDetailModal 分頁 (與 URL 同步)
  const [mainTab, setMainTab] = useState("needed"); // 控制主 Tab (急需物資 / 物資捐贈清單)
  const initialQueryApplied = useRef(false);
  const [editingDonation, setEditingDonation] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);

  // 權限狀態
  const [canViewDonorContact, setCanViewDonorContact] = useState(false);
  const [canView, setCanView] = useState(false);
  const [canCreate, setCanCreate] = useState(false);
  const [canEditSelf, setCanEditSelf] = useState(false);
  const [canEditOthers, setCanEditOthers] = useState(false);
  const [canDelete, setCanDelete] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null);

  // 權限檢查
  const { canEdit, canManage, hasPermission } = usePermission();

  // 檢查物資狀態管理權限
  const hasStatusManagementPermission = hasPermission('supplies_status_management', 'view');

  // 登入檢查
  const addSupplyLogin = useRequireLogin("新增物資需求");
  const donateSupplyLogin = useRequireLogin("捐贈物資");
  const editSupplyLogin = useRequireLogin("編輯物資資訊");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [donationsResponse, gridsData, userData] = await Promise.all([
        SupplyDonation.list('-created_date'),
        Grid.list(),
        User.me().catch(() => null), // 用戶未登入時返回 null，避免 401 錯誤
      ]);

      // console.log('🔍 [Supplies] API 原始回應:', donationsResponse);

      // 解析權限資訊
      const donationsData = donationsResponse.data || donationsResponse;
      setDonations(donationsData);
      setGrids(gridsData);
      setCurrentUser(userData);

      // 設定權限狀態
      if (donationsResponse.can_view_donor_contact !== undefined) {
        setCanViewDonorContact(donationsResponse.can_view_donor_contact);
      }
      if (donationsResponse.can_view !== undefined) {
        setCanView(donationsResponse.can_view);
      }
      if (donationsResponse.can_create !== undefined) {
        setCanCreate(donationsResponse.can_create);
      }
      if (donationsResponse.can_edit !== undefined) {
        setCanEditSelf(donationsResponse.can_edit);
      }
      if (donationsResponse.can_manage !== undefined) {
        setCanEditOthers(donationsResponse.can_manage);
      }
      if (donationsResponse.can_delete !== undefined) {
        setCanDelete(donationsResponse.can_delete);
      }
      if (donationsResponse.user_id !== undefined) {
        setCurrentUserId(donationsResponse.user_id);
      }

      // console.log('🔐 [Supplies] 權限狀態:', {
      //   canViewDonorContact: donationsResponse.can_view_donor_contact,
      //   canView: donationsResponse.can_view,
      //   canCreate: donationsResponse.can_create,
      //   canEditSelf: donationsResponse.can_edit,
      //   canEditOthers: donationsResponse.can_manage,
      //   canDelete: donationsResponse.can_delete,
      //   currentUserId: donationsResponse.user_id
      // });

      setStats({
        total: donationsData.length,
        pledged: donationsData.filter(d => d.status === 'pledged').length,
        confirmed: donationsData.filter(d => d.status === 'confirmed').length,
        delivered: donationsData.filter(d => d.status === 'delivered').length,
      });

      // Calculate unfulfilled supply requests
      const unfulfilled = [];
      gridsData.forEach(grid => {
        if (grid.supplies_needed && grid.supplies_needed.length > 0) {
          grid.supplies_needed.forEach(supply => {
            const remaining = supply.quantity - (supply.received || 0);
            if (remaining > 0) {
              unfulfilled.push({
                gridId: grid.id,
                gridCode: grid.code,
                gridType: grid.grid_type,
                supplyName: supply.name,
                totalNeeded: supply.quantity,
                received: supply.received || 0,
                remaining: remaining,
                unit: supply.unit,
                createdDate: grid.created_date // 新增：需求創建時間
              });
            }
          });
        }
      });
      setUnfulfilledRequests(unfulfilled);

      // 首次載入後解析 URL 以開啟指定 grid/tab
      if (!initialQueryApplied.current) {
        const params = new URLSearchParams(window.location.search);
        const gridParam = params.get('grid');
        const tabParam = params.get('tab');
        if (gridParam) {
          const found = gridsData.find(g => g.id === gridParam || g.code === gridParam);
          if (found) {
            setSelectedGridForDonation(found);
            if (tabParam && ['info','volunteer','supply','discussion'].includes(tabParam)) {
              setGridDetailTab(tabParam);
            } else {
              setGridDetailTab('supply');
            }
          }
        }
        initialQueryApplied.current = true;
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (donationId, newStatus) => {
    try {
      await SupplyDonation.update(donationId, { status: newStatus });
      loadData(); // Reload data to reflect the change
    } catch (error) {
      console.error(`Failed to update donation status to ${newStatus}:`, error);
      alert('更新狀態失敗，請稍後再試。');
    }
  };

  const handleEditDonation = (donation) => {
    // 檢查登入狀態（包含訪客模式）
    if (editSupplyLogin.requireLogin(() => {
      setEditingDonation(donation);
      setShowEditModal(true);
    })) {
      // 已登入，執行回調
      return;
    }
  };

  const handleSaveEdit = async (updatedData) => {
    try {
      await SupplyDonation.update(editingDonation.id, updatedData);
      setShowEditModal(false);
      setEditingDonation(null);
      loadData(); // 重新載入資料
      alert('物資資訊更新成功！');
    } catch (error) {
      console.error('Failed to update donation:', error);
      alert('更新失敗，請稍後再試。');
    }
  };

  const getGridInfo = (gridId) => {
    return grids.find(g => g.id === gridId) || {};
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pledged': return 'bg-blue-100 text-blue-800';
      case 'confirmed': return 'bg-green-100 text-green-800';
      case 'in_transit': return 'bg-yellow-100 text-yellow-800';
      case 'delivered': return 'bg-green-100 text-green-800';
      case 'received': return 'bg-green-200 text-green-900';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'pledged': return '已承諾';
      case 'confirmed': return '已確認';
      case 'in_transit': return '運送中';
      case 'delivered': return '已送達';
      case 'received': return '已收到';
      case 'cancelled': return '已取消';
      default: return status;
    }
  };

  const getDeliveryMethodText = (method) => {
    switch (method) {
      case 'direct': return '直接送達';
      case 'pickup_point': return '轉運點';
      case 'volunteer_pickup': return '志工取貨';
      default: return method;
    }
  };

  const getGridTypeText = (gridType) => {
    const types = {
      mud_disposal: '污泥暫置場',
      manpower: '人力任務',
      supply_storage: '物資停放處',
      accommodation: '住宿地點',
      food_area: '領吃食區域'
    };
    return types[gridType] || gridType;
  };

  const getGridTypeColor = (gridType) => {
    const colors = {
      mud_disposal: 'bg-amber-100 text-amber-800',
      manpower: 'bg-red-100 text-red-800',
      supply_storage: 'bg-green-100 text-green-800',
      accommodation: 'bg-purple-100 text-purple-800',
      food_area: 'bg-orange-100 text-orange-800'
    };
    return colors[gridType] || 'bg-gray-100 text-gray-800';
  };

  const filterDonations = (status) => {
    if (status === 'all') return donations;
    return donations.filter(d => d.status === status);
  };

  const handleAddSupplyRequest = () => {
    // 檢查登入狀態（包含訪客模式）
    if (addSupplyLogin.requireLogin(() => {
      setShowAddRequestModal(true);
    })) {
      // 已登入，執行回調
      return;
    }
  };

  const handleDonateToRequest = async (request) => {
    // 檢查登入狀態（包含訪客模式）
    if (donateSupplyLogin.requireLogin(() => {
      // 找到對應的網格
      const grid = grids.find(g => g.id === request.gridId);
      if (grid) {
        setSelectedGridForDonation(grid);
        setGridDetailTab('supply');
      } else {
        alert('找不到對應的救援網格，請稍後再試。');
      }
    })) {
      // 已登入，執行回調
      return;
    }
  };

  const handleDonationModalClose = () => {
    setSelectedGridForDonation(null);
    setGridDetailTab('supply');
    loadData(); // 重新載入資料以更新進度
  };

  // URL 同步函式
  const syncUrl = useCallback(({ gridId, tab }) => {
    if (!initialQueryApplied.current) return; // 避免初始階段覆寫
    const params = new URLSearchParams(window.location.search);
    if (gridId) params.set('grid', gridId); else params.delete('grid');
    if (tab && tab !== 'info') params.set('tab', tab); else params.delete('tab');
    const qs = params.toString();
    const newUrl = `${window.location.pathname}${qs ? '?' + qs : ''}`;
    window.history.replaceState(null, '', newUrl);
  }, []);

  // 狀態改變時更新 URL
  useEffect(() => {
    syncUrl({ gridId: selectedGridForDonation?.id || null, tab: selectedGridForDonation ? gridDetailTab : null });
  }, [selectedGridForDonation, gridDetailTab, syncUrl]);

  // 監聽返回/前進
  useEffect(() => {
    const onPop = () => {
      const params = new URLSearchParams(window.location.search);
      const gridParam = params.get('grid');
      const tabParam = params.get('tab');
      if (gridParam) {
        const found = grids.find(g => g.id === gridParam || g.code === gridParam);
        if (found) {
          setSelectedGridForDonation(found);
          setGridDetailTab(tabParam && ['info','volunteer','supply','discussion'].includes(tabParam) ? tabParam : 'supply');
          return;
        }
      }
      setSelectedGridForDonation(null);
      setGridDetailTab('supply');
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [grids]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <div className="px-4 py-[1.2rem] min-w-[436px]">
      <div className="mb-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">物資管理中心</h1>
            <p className="text-gray-600">管理物資捐贈與配送狀況</p>
          </div>
          <Button
            className="bg-green-600 hover:bg-green-700"
            onClick={handleAddSupplyRequest}
          >
            <Plus className="w-4 h-4 mr-2" />
            新增物資需求
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-[1.2rem]">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 rounded-lg flex-shrink-0">
                <Package className="w-6 h-6 text-blue-600" />
              </div>
              <div className="min-w-0">
                <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
                <p className="text-sm text-gray-600 whitespace-nowrap">總捐贈數</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-[1.2rem]">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 rounded-lg flex-shrink-0">
                <Clock className="w-6 h-6 text-blue-600" />
              </div>
              <div className="min-w-0">
                <p className="text-3xl font-bold text-gray-900">{stats.pledged}</p>
                <p className="text-sm text-gray-600 whitespace-nowrap">已承諾</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-yellow-500">
          <CardContent className="p-[1.2rem]">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-yellow-100 rounded-lg flex-shrink-0">
                <Truck className="w-6 h-6 text-yellow-600" />
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
                <p className="text-3xl font-bold text-gray-900">{stats.delivered}</p>
                <p className="text-sm text-gray-600 whitespace-nowrap">已送達</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={mainTab} onValueChange={setMainTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="needed">
            <ShoppingCart className="w-4 h-4 mr-2" />
            急需物資 ({unfulfilledRequests.length})
          </TabsTrigger>
          <TabsTrigger value="donations">物資捐贈清單</TabsTrigger>
        </TabsList>

        <TabsContent value="needed">
          <Card>
            <CardHeader>
              <CardTitle>急需物資清單</CardTitle>
              <p className="text-sm text-gray-600">以下是各個網格目前仍需要的物資，點擊可直接捐贈</p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {unfulfilledRequests.map((request, index) => (
                  <Card key={index} className="border border-gray-200 hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                        <div className="flex-1">
                            <div className="flex flex-row items-center gap-2 mb-2">
                              <CalendarClock className="w-4 h-4 text-teal-700" />
                              <span className="text-sm font-medium">
                                {formatCreatedDate(
                                    grids.find(g => g.id === request.gridId).created_date
                                )}
                              </span>
                            </div>
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-semibold text-gray-900">
                              {request.supplyName}
                            </h3>
                            <Badge className={getGridTypeColor(request.gridType)}>
                              {getGridTypeText(request.gridType)}
                            </Badge>
                            <Badge variant="outline" className="bg-blue-50 text-blue-700">
                              {request.gridCode}
                            </Badge>

                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm text-gray-600 mb-2">
                            <div className="flex items-center gap-2">
                              <MapPin className="w-4 h-4" />
                              <span>救援區域: {request.gridCode}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Package className="w-4 h-4" />
                              <span>已收到: {request.received}/{request.totalNeeded} {request.unit}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <AlertCircle className="w-4 h-4 text-orange-600" />
                              <span className="text-orange-600 font-medium">
                                還需要: {request.remaining} {request.unit}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Clock className="w-4 h-4" />
                              <span>創建: {request.createdDate ? new Date(request.createdDate).toLocaleString('zh-TW') : '未記錄'}</span>
                            </div>
                          </div>

                          <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                            <div
                              className="bg-green-600 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${(request.received / request.totalNeeded) * 100}%` }}
                            ></div>
                          </div>
                          <p className="text-xs text-gray-500">
                            進度: {((request.received / request.totalNeeded) * 100).toFixed(0)}% 完成
                          </p>
                        </div>

                        <div className="flex flex-col gap-2">
                          <Button
                            className="bg-green-600 hover:bg-green-700"
                            onClick={() => handleDonateToRequest(request)}
                          >
                            <Package className="w-4 h-4 mr-2" />
                            我要捐贈
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {unfulfilledRequests.length === 0 && (
                  <div className="text-center py-12 text-gray-500">
                    <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>目前所有物資需求都已滿足！</p>
                    <p className="text-sm">感謝大家的愛心捐贈</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="donations">
          <Card>
            <CardHeader>
              <CardTitle>物資捐贈清單</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="all">
                <TabsList className="mb-6">
                  <TabsTrigger value="all">全部</TabsTrigger>
                  <TabsTrigger value="pledged">已承諾</TabsTrigger>
                  <TabsTrigger value="confirmed">已確認</TabsTrigger>
                  <TabsTrigger value="delivered">已送達</TabsTrigger>
                </TabsList>

                {['all', 'pledged', 'confirmed', 'delivered'].map(tabValue => (
                  <TabsContent key={tabValue} value={tabValue}>
                    <div className="space-y-4">
                      {filterDonations(tabValue).map((donation) => {
                        const grid = getGridInfo(donation.grid_id);

                        // 捐贈者本人判斷：需要同時滿足 created_by_id 和 donor_name 與使用者一致
                        const isDonorSelf = currentUser && donation.created_by_id === currentUser.id && (
                          !donation.donor_name ||
                          donation.donor_name.trim() === '' ||
                          donation.donor_name.trim() === currentUser.name?.trim()
                        );

                        // 是否為網格建立者或管理員
                        const isGridOwner = currentUser && (
                          currentUser.id === grid?.created_by_id ||  // 網格建立者
                          currentUser.id === grid?.grid_manager_id   // 網格管理員
                        );

                        // 檢查是否有 view_donor_contact 隱私權限
                        const hasDonorContactPermission = hasPermission('view_donor_contact', 'view');

                        // 檢查是否有 supplies 管理權限（超管/管理員）
                        const hasSuppliesManagePermission = canManage('supplies');

                        // 聯絡資訊顯示邏輯：
                        // 1. 超管/管理員 + 有隱私權限：可以看到所有人
                        // 2. 網格建立者/管理員 + 有隱私權限：可以看到該網格的捐贈者
                        // 3. 捐贈者本人 + 有隱私權限：可以看到自己的
                        // 4. 其他人：看不到
                        // 5. 如果隱私權限被取消，所有人都看不到（包括捐贈者本人和網格建立者）
                        const canViewPhone = currentUser && hasDonorContactPermission && (
                          hasSuppliesManagePermission ||  // 超管/管理員（需要隱私權限）
                          isGridOwner ||                  // 網格建立者/管理員（需要隱私權限）
                          isDonorSelf                     // 捐贈者本人（需要隱私權限）
                        );

                        return (
                          <Card key={donation.id} className="border border-gray-200">
                            <CardContent className="p-6">
                              <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                                <div className="flex-1">
                                  <div className="flex items-center gap-3 mb-3">
                                    <h3 className="text-lg font-semibold text-gray-900">
                                      {donation.supply_name || donation.name}
                                    </h3>
                                    <Badge className={getStatusColor(donation.status)}>
                                      {getStatusText(donation.status)}
                                    </Badge>
                                    <div className="text-sm font-medium text-gray-700">
                                      {donation.quantity} {donation.unit}
                                    </div>
                                    {grid.code && (
                                      <Badge variant="outline" className="bg-blue-50 text-blue-700">
                                        {grid.code}
                                      </Badge>
                                    )}
                                  </div>

                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600 mb-3">
                                    <div className="flex items-center gap-2">
                                      <MapPin className="w-4 h-4" />
                                      <span>目標區域: {grid.code || '未知區域'}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <Phone className="w-4 h-4" />
                                      {canViewPhone ? (
                                        <span>
                                          {donation.donor_name || donation.donor_contact || '未提供'}
                                          {donation.donor_phone && ` - ${donation.donor_phone}`}
                                        </span>
                                      ) : (
                                        <span className="text-gray-400 italic text-xs">(需要隱私權限且為管理員/相關格主/捐贈者本人才能查看聯絡資訊)</span>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <Truck className="w-4 h-4" />
                                      <span>配送方式: {getDeliveryMethodText(donation.delivery_method)}</span>
                                    </div>
                                    {donation.delivery_time && (
                                      <div className="flex items-center gap-2">
                                        <Calendar className="w-4 h-4" />
                                        <span>預計送達: {donation.delivery_time}</span>
                                      </div>
                                    )}
                                  </div>

                                  {donation.delivery_address && (
                                    <div className="mb-3">
                                      <span className="text-sm font-medium text-gray-700">送達地址: </span>
                                      <span className="text-sm text-gray-600">{donation.delivery_address}</span>
                                    </div>
                                  )}

                                  {donation.notes && (
                                    <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                                      <p className="text-sm text-gray-700">{donation.notes}</p>
                                    </div>
                                  )}

                                  <div className="mt-2 space-y-1 text-xs text-gray-500">
                                    <div>捐贈時間: {donation.created_at ? new Date(donation.created_at).toLocaleString('zh-TW') : '尚未記錄'}</div>
                                  </div>
                                </div>

                                <div className="flex flex-col sm:flex-row gap-2">
                                  {/* 編輯和刪除按鈕權限邏輯 */}
                                  {(() => {
                                    const isSelf = currentUserId && donation.created_by_id === currentUserId;

                                    // 編輯權限：
                                    // - 編輯自己：需要 supplies.can_edit + 是自己
                                    // - 編輯他人：需要 supplies.can_manage
                                    const canEditThis = (canEditSelf && isSelf) || (canEditOthers && !isSelf);

                                    return (
                                      <>
                                        {canEditThis && (
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            className="text-blue-600 hover:text-blue-700"
                                            onClick={() => handleEditDonation(donation)}
                                          >
                                            <Edit className="w-4 h-4 mr-1" />
                                            編輯
                                          </Button>
                                        )}
                                      </>
                                    );
                                  })()}
                                  {/* 狀態按鈕需要物資狀態管理權限 */}
                                  {hasStatusManagementPermission && donation.status === 'pledged' && (
                                    <>
                                      <Button
                                        size="sm"
                                        className="bg-green-600 hover:bg-green-700"
                                        onClick={() => handleStatusUpdate(donation.id, 'confirmed')}
                                      >
                                        確認捐贈
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="text-red-600 hover:text-red-700"
                                        onClick={() => handleStatusUpdate(donation.id, 'cancelled')}
                                      >
                                        取消
                                      </Button>
                                    </>
                                  )}
                                  {hasStatusManagementPermission && donation.status === 'confirmed' && (
                                    <Button
                                      size="sm"
                                      className="bg-yellow-600 hover:bg-yellow-700"
                                      onClick={() => handleStatusUpdate(donation.id, 'in_transit')}
                                    >
                                      標記運送中
                                    </Button>
                                  )}
                                  {hasStatusManagementPermission && donation.status === 'in_transit' && (
                                    <Button
                                      size="sm"
                                      className="bg-green-600 hover:bg-green-700"
                                      onClick={() => handleStatusUpdate(donation.id, 'delivered')}
                                    >
                                      確認送達
                                    </Button>
                                  )}
                                  {hasStatusManagementPermission && donation.status === 'delivered' && (
                                    // 只有網格建立者、網格管理員或管理員可以確認收到
                                    (currentUser?.role === 'admin' ||
                                     currentUser?.role === 'super_admin' ||
                                     currentUser?.id === grid?.created_by_id ||
                                     currentUser?.id === grid?.grid_manager_id) && (
                                      <Button
                                        size="sm"
                                        className="bg-green-700 hover:bg-green-800"
                                        onClick={() => handleStatusUpdate(donation.id, 'received')}
                                      >
                                        確認收到
                                      </Button>
                                    )
                                  )}
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}

                      {filterDonations(tabValue).length === 0 && (
                        <div className="text-center py-12 text-gray-500">
                          <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
                          <p>目前沒有符合條件的物資捐贈</p>
                        </div>
                      )}
                    </div>
                  </TabsContent>
                ))}
              </Tabs>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {showAddRequestModal && (
        <AddSupplyRequestModal
          isOpen={showAddRequestModal}
          onClose={() => setShowAddRequestModal(false)}
          onSuccess={() => {
            setShowAddRequestModal(false);
            loadData();
          }}
          grids={grids}
        />
      )}

      {/* 登入請求對話框 - 新增物資需求 */}
      <LoginRequiredDialog
        open={addSupplyLogin.showLoginDialog}
        onOpenChange={addSupplyLogin.setShowLoginDialog}
        action={addSupplyLogin.action}
      />

      {/* 登入請求對話框 - 捐贈物資 */}
      <LoginRequiredDialog
        open={donateSupplyLogin.showLoginDialog}
        onOpenChange={donateSupplyLogin.setShowLoginDialog}
        action={donateSupplyLogin.action}
      />

      {/* 登入請求對話框 - 編輯物資 */}
      <LoginRequiredDialog
        open={editSupplyLogin.showLoginDialog}
        onOpenChange={editSupplyLogin.setShowLoginDialog}
        action={editSupplyLogin.action}
      />

      {/* 編輯物資 Modal */}
      {showEditModal && editingDonation && (
        <EditSupplyDonationModal
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setEditingDonation(null);
          }}
          donation={editingDonation}
          onSave={handleSaveEdit}
        />
      )}

      {/* 新增：物資捐贈彈窗 */}
      {selectedGridForDonation && (
        <GridDetailModal
          grid={selectedGridForDonation}
          onClose={handleDonationModalClose}
          onUpdate={loadData}
          defaultTab={gridDetailTab}
          onTabChange={setGridDetailTab}
        />
      )}
    </div>
  );
}
