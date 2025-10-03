
import React, { useState, useEffect } from "react";
import { VolunteerRegistration, Grid, User } from "@/api/entities";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Users, Clock, CheckCircle2, AlertCircle, MapPin,
  Phone, Calendar, Wrench, HardHat, X, Filter
} from "lucide-react";
import { getVolunteers } from "@/api/functions"; // New import

export default function VolunteersPage() {
  const [registrations, setRegistrations] = useState([]);
  const [grids, setGrids] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [canViewPhone, setCanViewPhone] = useState(false); // New state for phone visibility
  const [selectedGrid, setSelectedGrid] = useState("all");
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    confirmed: 0,
    completed: 0
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [volunteersResponse, gridsData, userData] = await Promise.all([
        getVolunteers(),
        Grid.list(),
        User.me().catch(() => null) // 用戶未登入時返回 null
      ]);
      // Normalize various possible shapes safely without ever touching undefined.data
      // Supported shapes:
      // 1. { data: [...] , can_view_phone?: boolean, total?: number }
      // 2. Legacy (unlikely now): [...]
      // 3. Defensive: anything else -> []
      let list = [];
      let canView = false;
      if (Array.isArray(volunteersResponse)) {
        list = volunteersResponse;
      } else if (volunteersResponse && Array.isArray(volunteersResponse.data)) {
        list = volunteersResponse.data;
        canView = Boolean(volunteersResponse.can_view_phone);
      } else if (volunteersResponse && volunteersResponse.data && Array.isArray(volunteersResponse.data.data)) {
        // Extremely defensive nested case (should not happen now)
        list = volunteersResponse.data.data;
        canView = Boolean(volunteersResponse.data.can_view_phone || volunteersResponse.can_view_phone);
      }

      // Ensure every item has minimal required fields to avoid downstream optional chaining issues
      const finalRegs = list.map(r => ({
        id: r.id,
        grid_id: r.grid_id,
        volunteer_name: r.volunteer_name || r.name || '匿名志工',
        volunteer_phone: r.volunteer_phone,
        status: r.status || 'pending',
        available_time: r.available_time || r.time || null,
        skills: Array.isArray(r.skills) ? r.skills : [],
        equipment: Array.isArray(r.equipment) ? r.equipment : [],
        notes: r.notes || '',
        created_date: r.created_date || r.created_at || new Date().toISOString()
      }));

      setCanViewPhone(canView);
      setRegistrations(finalRegs);
      setGrids(gridsData);
      setCurrentUser(userData);

      setStats({
        total: finalRegs.length,
        pending: finalRegs.filter(r => r.status === 'pending').length,
        confirmed: finalRegs.filter(r => r.status === 'confirmed').length,
        completed: finalRegs.filter(r => r.status === 'completed').length,
      });
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

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

  const filterRegistrations = (status) => {
    let filtered = registrations;

    // Filter by status
    if (status !== 'all') {
      filtered = filtered.filter(r => r.status === status);
    }

    // Filter by grid
    if (selectedGrid !== 'all') {
      filtered = filtered.filter(r => r.grid_id === selectedGrid);
    }

    return filtered;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
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
          <Tabs defaultValue="all">
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
                                {registration.volunteer_phone ? (
                                  <div className="flex items-center gap-2">
                                    <Phone className="w-4 h-4" />
                                    <span>{registration.volunteer_phone}</span>
                                  </div>
                                ) : canViewPhone ? null : ( // If no phone number from backend AND current user cannot view phones, show message
                                  <div className="flex items-center gap-2">
                                    <Phone className="w-4 h-4" />
                                    <span className="text-gray-500 italic text-xs">僅限管理員查看</span>
                                  </div>
                                )}
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

                            {/* Status management buttons - Removed client-side permission checks */}
                            <div className="flex flex-col sm:flex-row gap-2">
                              {registration.status === 'pending' && (
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
                              {registration.status === 'confirmed' && (
                                <Button
                                  size="sm"
                                  className="bg-purple-600 hover:bg-purple-700"
                                  onClick={() => handleStatusUpdate(registration, 'arrived')}
                                >
                                  <MapPin className="w-4 h-4 mr-2" />
                                  標記到場
                                </Button>
                              )}
                              {registration.status === 'arrived' && (
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
    </div>
  );
}
