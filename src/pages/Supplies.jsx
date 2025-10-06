import { useState, useRef, useCallback, useEffect } from "react";
import { SupplyDonation } from "@/api/entities";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Package, Truck, CheckCircle2, Clock, MapPin, 
  Phone, Calendar, AlertCircle, Plus, ShoppingCart,
  CalendarClock
} from "lucide-react";
import AddSupplyRequestModal from "@/components/supplies/AddSupplyRequestModal";
import GridDetailModal from "@/components/map/GridDetailModal"; // 新增導入
import { formatCreatedDate } from "@/lib/utils";
import { useSuppliesData } from "@/hooks/use-supplies-data";

export default function SuppliesPage() {
  const {
    donations,
    grids,
    currentUser,
    stats,
    unfulfilledRequests,
    isLoading,
    mutate: reloadData
  } = useSuppliesData();

  const [showAddRequestModal, setShowAddRequestModal] = useState(false);
  const [selectedGridForDonation, setSelectedGridForDonation] = useState(null); // 彈窗選取之網格
  const [gridDetailTab, setGridDetailTab] = useState('supply'); // 控制 GridDetailModal 分頁 (與 URL 同步)
  const initialQueryApplied = useRef(false);

  useEffect(() => {
    // 首次載入後解析 URL 以開啟指定 grid/tab
    if (!initialQueryApplied.current && grids.length > 0) {
      const params = new URLSearchParams(window.location.search);
      const gridParam = params.get('grid');
      const tabParam = params.get('tab');

      if (gridParam) {
        const found = grids.find(g => g.id === gridParam || g.code === gridParam);
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
  }, [grids]);

  const handleStatusUpdate = async (donationId, newStatus) => {
    try {
      await SupplyDonation.update(donationId, { status: newStatus });
      reloadData();
    } catch (error) {
      console.error(`Failed to update donation status to ${newStatus}:`, error);
      alert('更新狀態失敗，請稍後再試。');
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
    setShowAddRequestModal(true);
  };

  const handleDonateToRequest = async (request) => {
    // 移除強制登入邏輯，允許未登入用戶直接開啟捐贈表單。
    // 登入驗證將由 GridDetailModal 或 SupplyDonation 實體內部處理。
    
    // 找到對應的網格
    const grid = grids.find(g => g.id === request.gridId);
    if (grid) {
      setSelectedGridForDonation(grid);
      setGridDetailTab('supply');
    } else {
      alert('找不到對應的救援網格，請稍後再試。');
    }
  };

  const handleDonationModalClose = () => {
    setSelectedGridForDonation(null);
    setGridDetailTab('supply');
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <div className="px-4 py-[1.2rem] min-w-xxs">
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

      <Tabs defaultValue="needed" className="space-y-6">
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

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600 mb-2">
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
                        const canViewPhone = currentUser && (
                          currentUser.role === 'admin' || 
                          (currentUser.role === 'grid_manager' && currentUser.id === grid.grid_manager_id)
                        );

                        return (
                          <Card key={donation.id} className="border border-gray-200">
                            <CardContent className="p-6">
                              <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                                <div className="flex-1">
                                  <div className="flex items-center gap-3 mb-3">
                                    <h3 className="text-lg font-semibold text-gray-900">
                                      {donation.supply_name}
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
                                        <span>{donation.donor_name} - {donation.donor_phone}</span>
                                      ) : (
                                        <span className="flex items-center">
                                          {donation.donor_name}
                                          <span className="text-gray-400 italic text-xs ml-2">(僅限管理員/相關格主查看電話)</span>
                                        </span>
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

                                  <div className="mt-2 text-xs text-gray-500">
                                    捐贈時間: {new Date(donation.created_date).toLocaleString('zh-TW')}
                                  </div>
                                </div>

                                <div className="flex flex-col sm:flex-row gap-2">
                                  {donation.status === 'pledged' && (
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
                                  {donation.status === 'confirmed' && (
                                    <Button
                                      size="sm"
                                      className="bg-yellow-600 hover:bg-yellow-700"
                                      onClick={() => handleStatusUpdate(donation.id, 'in_transit')}
                                    >
                                      標記運送中
                                    </Button>
                                  )}
                                  {donation.status === 'in_transit' && (
                                    <Button
                                      size="sm"
                                      className="bg-green-600 hover:bg-green-700"
                                      onClick={() => handleStatusUpdate(donation.id, 'delivered')}
                                    >
                                      確認送達
                                    </Button>
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
            reloadData();
          }}
          grids={grids}
        />
      )}
      
      {/* 新增：物資捐贈彈窗 */}
      {selectedGridForDonation && (
        <GridDetailModal
          grid={selectedGridForDonation}
          onClose={handleDonationModalClose}
          onUpdate={reloadData}
          defaultTab={gridDetailTab}
          onTabChange={setGridDetailTab}
        />
      )}
    </div>
  );
}
