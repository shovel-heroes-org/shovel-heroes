import React, { useState, useEffect } from "react";
import { VolunteerRegistration, SupplyDonation } from "@/api/entities";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Users, Package, MapPin, Clock, Phone, Mail,
  Calendar, AlertCircle, CheckCircle2, Wrench,
  ShoppingBag, Info
} from "lucide-react";

/**
 * GridViewModal - 網格詳細資訊查看模式（唯讀）
 * 用於後台管理的「查看」功能，只顯示資訊，不包含互動操作
 */
export default function GridViewModal({ grid, onClose }) {
  const [volunteers, setVolunteers] = useState([]);
  const [supplies, setSupplies] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [grid.id]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [volunteersData, suppliesData] = await Promise.all([
        VolunteerRegistration.filter({ grid_id: grid.id }),
        SupplyDonation.filter({ grid_id: grid.id })
      ]);
      setVolunteers(volunteersData || []);
      setSupplies(suppliesData || []);
    } catch (error) {
      console.error('Failed to load grid data:', error);
    } finally {
      setLoading(false);
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
    return types[type] || type;
  };

  const getStatusBadge = (status) => {
    const config = {
      completed: { bg: 'bg-green-100', text: 'text-green-800', label: '已完成' },
      open: { bg: 'bg-blue-100', text: 'text-blue-800', label: '開放中' },
      closed: { bg: 'bg-gray-100', text: 'text-gray-800', label: '已關閉' },
      in_progress: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: '進行中' },
      preparing: { bg: 'bg-purple-100', text: 'text-purple-800', label: '準備中' }
    };
    const style = config[status] || config.preparing;
    return <Badge className={`${style.bg} ${style.text}`}>{style.label}</Badge>;
  };

  const getVolunteerStatusBadge = (status) => {
    const config = {
      pending: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: '待確認' },
      confirmed: { bg: 'bg-blue-100', text: 'text-blue-800', label: '已確認' },
      arrived: { bg: 'bg-green-100', text: 'text-green-800', label: '已到場' },
      completed: { bg: 'bg-green-200', text: 'text-green-900', label: '已完成' },
      declined: { bg: 'bg-red-100', text: 'text-red-800', label: '已婉拒' },
      cancelled: { bg: 'bg-gray-100', text: 'text-gray-800', label: '已取消' }
    };
    const style = config[status] || config.pending;
    return <Badge className={`${style.bg} ${style.text} text-xs`}>{style.label}</Badge>;
  };

  const getSupplyStatusBadge = (status) => {
    const config = {
      pledged: { bg: 'bg-blue-100', text: 'text-blue-800', label: '已承諾' },
      confirmed: { bg: 'bg-green-100', text: 'text-green-800', label: '已確認' },
      in_transit: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: '運送中' },
      delivered: { bg: 'bg-green-100', text: 'text-green-800', label: '已送達' },
      received: { bg: 'bg-green-200', text: 'text-green-900', label: '已收到' },
      cancelled: { bg: 'bg-red-100', text: 'text-red-800', label: '已取消' }
    };
    const style = config[status] || config.pledged;
    return <Badge className={`${style.bg} ${style.text} text-xs`}>{style.label}</Badge>;
  };

  const shortage = grid.volunteer_needed > 0
    ? (grid.volunteer_needed - (grid.volunteer_registered || 0)) / grid.volunteer_needed
    : 0;
  const shortagePercentage = (shortage * 100).toFixed(0);

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl font-bold">{grid.code}</span>
              {getStatusBadge(grid.status)}
              <Badge variant="secondary">{getGridTypeText(grid.grid_type)}</Badge>
            </div>
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="h-[calc(90vh-120px)] pr-4">
          <div className="space-y-6">
            {/* 基本資訊區塊 */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Info className="w-5 h-5 text-blue-600" />
                  <h3 className="text-lg font-semibold">基本資訊</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* 集合地點 */}
                  {grid.meeting_point && (
                    <div className="flex items-start gap-3">
                      <MapPin className="w-5 h-5 text-gray-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <div className="text-sm text-gray-600">集合地點</div>
                        <div className="font-medium">{grid.meeting_point}</div>
                      </div>
                    </div>
                  )}

                  {/* 聯絡方式 */}
                  {grid.contact_info && (
                    <div className="flex items-start gap-3">
                      <Phone className="w-5 h-5 text-gray-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <div className="text-sm text-gray-600">聯絡方式</div>
                        <div className="font-medium">{grid.contact_info}</div>
                      </div>
                    </div>
                  )}

                  {/* 工作時間 */}
                  {grid.work_time && (
                    <div className="flex items-start gap-3">
                      <Clock className="w-5 h-5 text-gray-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <div className="text-sm text-gray-600">工作時間</div>
                        <div className="font-medium">{grid.work_time}</div>
                      </div>
                    </div>
                  )}

                  {/* 創建時間 */}
                  <div className="flex items-start gap-3">
                    <Calendar className="w-5 h-5 text-gray-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="text-sm text-gray-600">創建時間</div>
                      <div className="font-medium">
                        {grid.created_at ? new Date(grid.created_at).toLocaleString('zh-TW') : '未記錄'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 備註 */}
                {grid.notes && (
                  <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                    <div className="text-sm text-gray-600 mb-1">備註</div>
                    <div className="text-sm">{grid.notes}</div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 志工需求區塊 */}
            {grid.grid_type === 'manpower' && (
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Users className="w-5 h-5 text-blue-600" />
                      <h3 className="text-lg font-semibold">志工需求</h3>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-2xl font-bold">
                        {grid.volunteer_registered || 0}/{grid.volunteer_needed}
                      </span>
                      {shortage > 0.6 && (
                        <Badge className="bg-red-100 text-red-800">
                          急缺 {shortagePercentage}%
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* 志工列表 */}
                  {loading ? (
                    <div className="text-center py-4 text-gray-500">載入中...</div>
                  ) : volunteers.length > 0 ? (
                    <div className="space-y-3">
                      {volunteers.map((volunteer, idx) => (
                        <div key={idx} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                                <span className="text-sm font-medium text-blue-700">{idx + 1}</span>
                              </div>
                              <div>
                                <div className="font-medium text-base">{volunteer.volunteer_name || '匿名志工'}</div>
                                {volunteer.available_time && (
                                  <div className="text-xs text-gray-500 mt-0.5">可用時間: {volunteer.available_time}</div>
                                )}
                              </div>
                            </div>
                            {getVolunteerStatusBadge(volunteer.status)}
                          </div>

                          {/* 聯絡資訊 - 根據權限顯示 */}
                          {(volunteer.volunteer_phone || volunteer.volunteer_email) && (
                            <div className="mt-3 pt-3 border-t border-gray-200 space-y-1">
                              {volunteer.volunteer_phone && (
                                <div className="flex items-center gap-2 text-sm">
                                  <Phone className="w-4 h-4 text-gray-400" />
                                  <span className="text-gray-700">{volunteer.volunteer_phone}</span>
                                </div>
                              )}
                              {volunteer.volunteer_email && (
                                <div className="flex items-center gap-2 text-sm">
                                  <Mail className="w-4 h-4 text-gray-400" />
                                  <span className="text-gray-700">{volunteer.volunteer_email}</span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-4 text-gray-500">尚無志工報名</div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* 物資需求區塊 */}
            {(grid.supplies_needed?.length > 0 || supplies.length > 0) && (
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Package className="w-5 h-5 text-green-600" />
                    <h3 className="text-lg font-semibold">物資需求</h3>
                  </div>

                  {/* 需求物資 */}
                  {grid.supplies_needed?.length > 0 && (
                    <div className="mb-4">
                      <div className="text-sm text-gray-600 mb-2">需求清單</div>
                      <div className="space-y-2">
                        {grid.supplies_needed.map((supply, idx) => (
                          <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-center gap-3">
                              <ShoppingBag className="w-4 h-4 text-gray-500" />
                              <span className="font-medium">{supply.name}</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-sm">
                                已收到: <span className="font-medium">{supply.received || 0}</span> /
                                需要: <span className="font-medium">{supply.quantity}</span> {supply.unit}
                              </span>
                              {(supply.received || 0) >= supply.quantity ? (
                                <CheckCircle2 className="w-5 h-5 text-green-600" />
                              ) : (
                                <AlertCircle className="w-5 h-5 text-orange-600" />
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 捐贈紀錄 */}
                  {supplies.length > 0 && (
                    <div>
                      <Separator className="my-4" />
                      <div className="text-sm text-gray-600 mb-2">捐贈紀錄（{supplies.length} 筆）</div>
                      <div className="space-y-2">
                        {supplies.slice(0, 5).map((supply, idx) => (
                          <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div>
                              <div className="font-medium">{supply.supply_name || supply.name}</div>
                              <div className="text-xs text-gray-500">
                                數量: {supply.quantity} {supply.unit} ·
                                捐贈者: {supply.donor_name || '匿名'}
                              </div>
                            </div>
                            {getSupplyStatusBadge(supply.status)}
                          </div>
                        ))}
                        {supplies.length > 5 && (
                          <div className="text-center text-sm text-gray-500 py-2">
                            還有 {supplies.length - 5} 筆捐贈紀錄...
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {!loading && supplies.length === 0 && (
                    <div className="text-center py-4 text-gray-500">尚無物資捐贈</div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
