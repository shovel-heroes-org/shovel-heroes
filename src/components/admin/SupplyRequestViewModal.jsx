import React, { useState, useEffect } from "react";
import { VolunteerRegistration, SupplyDonation } from "@/api/entities";
import { usePermission } from "@/hooks/usePermission";
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
import { Progress } from "@/components/ui/progress";
import {
  Users, Package, MapPin, Clock, Phone, Mail,
  Calendar, AlertCircle, CheckCircle2, Info,
  ShoppingBag, User, Truck, Eye, EyeOff
} from "lucide-react";

/**
 * SupplyRequestViewModal - 物資需求查看模態框（唯讀）
 * 顯示網格的物資需求詳細資訊，包含志工需求、物資需求列表和捐贈紀錄
 *
 * @param {Object} grid - 網格物件（包含 supplies_needed）
 * @param {Function} onClose - 關閉回調
 */
export default function SupplyRequestViewModal({ grid, onClose }) {
  const [volunteers, setVolunteers] = useState([]);
  const [donations, setDonations] = useState([]);
  const [loading, setLoading] = useState(true);

  const { hasPermission } = usePermission();

  // 權限檢查
  const canViewGridContact = hasPermission('view_grid_contact', 'view');
  const canViewVolunteerContact = hasPermission('view_volunteer_contact', 'view');
  const canViewDonorContact = hasPermission('view_donor_contact', 'view');

  useEffect(() => {
    loadData();
  }, [grid.id]);

  /**
   * 載入志工和捐贈資料
   */
  const loadData = async () => {
    try {
      setLoading(true);
      const [volunteersData, donationsData] = await Promise.all([
        VolunteerRegistration.filter({ grid_id: grid.id }),
        SupplyDonation.filter({ grid_id: grid.id })
      ]);
      setVolunteers(volunteersData || []);
      setDonations(donationsData || []);
    } catch (error) {
      console.error('Failed to load grid data:', error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * 獲取網格類型文字
   */
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

  /**
   * 獲取網格狀態徽章
   */
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

  /**
   * 獲取志工狀態徽章
   */
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

  /**
   * 獲取捐贈狀態徽章
   */
  const getDonationStatusBadge = (status) => {
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

  /**
   * 計算物資進度百分比
   */
  const calculateProgress = (received, needed) => {
    if (!needed || needed === 0) return 100;
    const progress = (received / needed) * 100;
    return Math.min(progress, 100);
  };

  /**
   * 判斷物資是否急需
   */
  const isUrgent = (received, needed) => {
    const progress = calculateProgress(received, needed);
    return progress < 50;
  };

  /**
   * 判斷物資是否已完成
   */
  const isCompleted = (received, needed) => {
    const progress = calculateProgress(received, needed);
    return progress >= 100;
  };

  /**
   * 計算志工缺額百分比
   */
  const volunteerShortage = grid.volunteer_needed > 0
    ? ((grid.volunteer_needed - (grid.volunteer_registered || 0)) / grid.volunteer_needed) * 100
    : 0;

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Package className="w-6 h-6 text-green-600" />
              <span className="text-2xl font-bold">{grid.code}</span>
              {getStatusBadge(grid.status)}
              <Badge variant="secondary">{getGridTypeText(grid.grid_type)}</Badge>
            </div>
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="h-[calc(90vh-120px)] pr-4">
          <div className="space-y-6">
            {/* 網格基本資訊區塊 */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Info className="w-5 h-5 text-blue-600" />
                  <h3 className="text-lg font-semibold">網格基本資訊</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* 救災地點 */}
                  {grid.meeting_point && (
                    <div className="flex items-start gap-3">
                      <MapPin className="w-5 h-5 text-gray-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <div className="text-sm text-gray-600">救災地點</div>
                        <div className="font-medium">{grid.meeting_point}</div>
                      </div>
                    </div>
                  )}

                  {/* 聯絡方式 - 根據權限顯示 */}
                  {grid.contact_info && (
                    <div className="flex items-start gap-3">
                      <Phone className="w-5 h-5 text-gray-500 mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <div className="text-sm text-gray-600 flex items-center gap-2">
                          聯絡方式
                          {!canViewGridContact && (
                            <EyeOff className="w-3 h-3 text-gray-400" />
                          )}
                        </div>
                        {canViewGridContact ? (
                          <div className="font-medium">{grid.contact_info}</div>
                        ) : (
                          <span className="text-gray-400 italic text-xs">(需要相關權限查看)</span>
                        )}
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

                  {/* 建立時間 */}
                  <div className="flex items-start gap-3">
                    <Calendar className="w-5 h-5 text-gray-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="text-sm text-gray-600">建立時間</div>
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
                      {volunteerShortage > 60 && (
                        <Badge className="bg-red-100 text-red-800">
                          急缺 {volunteerShortage.toFixed(0)}%
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
                                  <div className="text-xs text-gray-500 mt-0.5">
                                    可用時間: {volunteer.available_time}
                                  </div>
                                )}
                              </div>
                            </div>
                            {getVolunteerStatusBadge(volunteer.status)}
                          </div>

                          {/* 志工聯絡資訊 - 根據權限顯示 */}
                          <div className="mt-3 pt-3 border-t border-gray-200 space-y-1">
                            {/* 電話顯示邏輯 */}
                            <div className="flex items-center gap-2 text-sm">
                              <Phone className="w-4 h-4 text-gray-400" />
                              {(() => {
                                // 檢查是否為 NO_ACCESS_PERMISSION
                                if (volunteer.volunteer_phone === 'NO_ACCESS_PERMISSION') {
                                  return (
                                    <span className="text-gray-400 italic text-xs flex items-center gap-1">
                                      <EyeOff className="w-3 h-3" />
                                      (需要隱私權限且為管理員/相關格主/志工本人才能查看聯絡資訊)
                                    </span>
                                  );
                                }
                                // 有值且有權限
                                if (volunteer.volunteer_phone && typeof volunteer.volunteer_phone === 'string' && volunteer.volunteer_phone.trim() !== '') {
                                  return <span className="text-gray-700">{volunteer.volunteer_phone}</span>;
                                }
                                // null 或空字串：使用者沒填電話
                                return <span className="text-gray-400 italic text-xs">未提供</span>;
                              })()}
                            </div>

                            {/* Email 顯示邏輯 */}
                            <div className="flex items-center gap-2 text-sm">
                              <Mail className="w-4 h-4 text-gray-400" />
                              {(() => {
                                // 檢查是否為 NO_ACCESS_PERMISSION
                                if (volunteer.volunteer_email === 'NO_ACCESS_PERMISSION') {
                                  return (
                                    <span className="text-gray-400 italic text-xs flex items-center gap-1">
                                      <EyeOff className="w-3 h-3" />
                                      (需要隱私權限且為管理員/相關格主/志工本人才能查看聯絡資訊)
                                    </span>
                                  );
                                }
                                // 有值且有權限
                                if (volunteer.volunteer_email && typeof volunteer.volunteer_email === 'string' && volunteer.volunteer_email.trim() !== '') {
                                  return <span className="text-gray-700">{volunteer.volunteer_email}</span>;
                                }
                                // null 或空字串：使用者沒填 email
                                return <span className="text-gray-400 italic text-xs">未提供</span>;
                              })()}
                            </div>
                          </div>
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
            {grid.supplies_needed?.length > 0 && (
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Package className="w-5 h-5 text-green-600" />
                    <h3 className="text-lg font-semibold">物資需求清單</h3>
                  </div>

                  <div className="space-y-3">
                    {grid.supplies_needed.map((supply, idx) => {
                      const received = supply.received || 0;
                      const needed = supply.quantity;
                      const progress = calculateProgress(received, needed);
                      const urgent = isUrgent(received, needed);
                      const completed = isCompleted(received, needed);

                      return (
                        <div key={idx} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-3 flex-1">
                              <ShoppingBag className="w-5 h-5 text-gray-500 flex-shrink-0" />
                              <div className="flex-1">
                                <div className="font-medium text-base">{supply.name}</div>
                                <div className="text-sm text-gray-600 mt-1">
                                  已收到 <span className="font-medium text-green-600">{received}</span> /
                                  需要 <span className="font-medium">{needed}</span> {supply.unit}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              {completed ? (
                                <Badge className="bg-green-100 text-green-800 flex items-center gap-1">
                                  <CheckCircle2 className="w-3 h-3" />
                                  已完成
                                </Badge>
                              ) : urgent ? (
                                <Badge className="bg-red-100 text-red-800 flex items-center gap-1">
                                  <AlertCircle className="w-3 h-3" />
                                  急需
                                </Badge>
                              ) : (
                                <Badge className="bg-yellow-100 text-yellow-800">
                                  進行中
                                </Badge>
                              )}
                            </div>
                          </div>

                          {/* 進度條 */}
                          <div className="space-y-1">
                            <Progress
                              value={progress}
                              className={`h-2 ${
                                completed ? 'bg-green-100' :
                                urgent ? 'bg-red-100' :
                                'bg-yellow-100'
                              }`}
                            />
                            <div className="text-xs text-right text-gray-600">
                              {progress.toFixed(0)}% 已達成
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* 物資捐贈紀錄區塊 */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Truck className="w-5 h-5 text-purple-600" />
                  <h3 className="text-lg font-semibold">
                    物資捐贈紀錄
                    {donations.length > 0 && (
                      <span className="ml-2 text-sm text-gray-500">({donations.length} 筆)</span>
                    )}
                  </h3>
                </div>

                {loading ? (
                  <div className="text-center py-4 text-gray-500">載入中...</div>
                ) : donations.length > 0 ? (
                  <div className="space-y-3">
                    {donations.map((donation, idx) => (
                      <div key={idx} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <div className="font-medium text-base">
                              {donation.supply_name || donation.name}
                            </div>
                            <div className="text-sm text-gray-600 mt-1">
                              數量: <span className="font-medium">{donation.quantity}</span> {donation.unit}
                            </div>
                          </div>
                          {getDonationStatusBadge(donation.status)}
                        </div>

                        <div className="mt-2 space-y-1">
                          {/* 捐贈者 - 根據權限顯示 */}
                          <div className="flex items-center gap-2 text-sm">
                            <User className="w-4 h-4 text-gray-400" />
                            <span className="text-gray-600">捐贈者:</span>
                            {canViewDonorContact ? (
                              <span className="text-gray-700 font-medium">
                                {donation.donor_name || '匿名'}
                              </span>
                            ) : (
                              <span className="text-gray-400 italic text-xs flex items-center gap-1">
                                <EyeOff className="w-3 h-3" />
                                (需要相關權限查看)
                              </span>
                            )}
                          </div>

                          {/* 捐贈時間 */}
                          <div className="flex items-center gap-2 text-sm">
                            <Calendar className="w-4 h-4 text-gray-400" />
                            <span className="text-gray-600">捐贈時間:</span>
                            <span className="text-gray-700">
                              {donation.created_at
                                ? new Date(donation.created_at).toLocaleString('zh-TW')
                                : '未記錄'}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Package className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                    <p>尚無物資捐贈紀錄</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
