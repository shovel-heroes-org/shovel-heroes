import React from "react";
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
  Package, MapPin, Clock, Phone, Mail, User,
  Calendar, Info, Truck, Home, CheckCircle2,
  AlertCircle, Eye, EyeOff, ShoppingBag
} from "lucide-react";

/**
 * SupplyDonationViewModal - 物資捐贈查看模態框（唯讀）
 * 顯示單筆物資捐贈的詳細資訊，包含捐贈者資訊、目標網格資訊和物資需求進度
 *
 * @param {Object} donation - 捐贈物件
 * @param {Object} grid - 關聯的網格物件
 * @param {Function} onClose - 關閉回調
 */
export default function SupplyDonationViewModal({ donation, grid, onClose }) {
  const { hasPermission } = usePermission();

  // 權限檢查
  const canViewGridContact = hasPermission('view_grid_contact', 'view');
  const canViewDonorContact = hasPermission('view_donor_contact', 'view');

  /**
   * 獲取捐贈狀態徽章
   */
  const getStatusBadge = (status) => {
    const config = {
      pledged: { bg: 'bg-blue-100', text: 'text-blue-800', label: '已承諾' },
      confirmed: { bg: 'bg-green-100', text: 'text-green-800', label: '已確認' },
      in_transit: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: '運送中' },
      delivered: { bg: 'bg-green-100', text: 'text-green-800', label: '已送達' },
      received: { bg: 'bg-green-200', text: 'text-green-900', label: '已收到' },
      cancelled: { bg: 'bg-red-100', text: 'text-red-800', label: '已取消' }
    };
    const style = config[status] || config.pledged;
    return <Badge className={`${style.bg} ${style.text}`}>{style.label}</Badge>;
  };

  /**
   * 獲取網格狀態徽章
   */
  const getGridStatusBadge = (status) => {
    const config = {
      completed: { bg: 'bg-green-100', text: 'text-green-800', label: '已完成' },
      open: { bg: 'bg-blue-100', text: 'text-blue-800', label: '開放中' },
      closed: { bg: 'bg-gray-100', text: 'text-gray-800', label: '已關閉' },
      in_progress: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: '進行中' },
      preparing: { bg: 'bg-purple-100', text: 'text-purple-800', label: '準備中' }
    };
    const style = config[status] || config.preparing;
    return <Badge className={`${style.bg} ${style.text} text-xs`}>{style.label}</Badge>;
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
   * 獲取配送方式文字
   */
  const getDeliveryMethodText = (method) => {
    const methods = {
      self_delivery: '自行送達',
      pickup: '自取',
      courier: '物流配送',
      volunteer: '志工協助'
    };
    return methods[method] || method || '未指定';
  };

  /**
   * 計算物資需求進度
   * 找出網格中對應的物資需求，計算此捐贈在總需求中的佔比
   */
  const getSupplyProgress = () => {
    if (!grid.supplies_needed || grid.supplies_needed.length === 0) {
      return null;
    }

    // 尋找對應的物資需求
    const supplyName = donation.supply_name || donation.name;
    const matchedSupply = grid.supplies_needed.find(
      s => s.name === supplyName
    );

    if (!matchedSupply) {
      return null;
    }

    const received = matchedSupply.received || 0;
    const needed = matchedSupply.quantity;
    const progress = needed > 0 ? (received / needed) * 100 : 100;
    const donationPercentage = needed > 0 ? (donation.quantity / needed) * 100 : 0;

    return {
      needed,
      received,
      progress: Math.min(progress, 100),
      donationPercentage: Math.min(donationPercentage, 100),
      unit: matchedSupply.unit
    };
  };

  const supplyProgress = getSupplyProgress();

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Package className="w-6 h-6 text-green-600" />
              <span className="text-xl font-bold">物資捐贈詳情</span>
              {getStatusBadge(donation.status)}
            </div>
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="h-[calc(90vh-120px)] pr-4">
          <div className="space-y-6">
            {/* 捐贈基本資訊區塊 */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Info className="w-5 h-5 text-blue-600" />
                  <h3 className="text-lg font-semibold">捐贈基本資訊</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* 物資名稱 */}
                  <div className="flex items-start gap-3">
                    <ShoppingBag className="w-5 h-5 text-gray-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="text-sm text-gray-600">物資名稱</div>
                      <div className="font-medium text-lg">
                        {donation.supply_name || donation.name}
                      </div>
                    </div>
                  </div>

                  {/* 數量 */}
                  <div className="flex items-start gap-3">
                    <Package className="w-5 h-5 text-gray-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="text-sm text-gray-600">捐贈數量</div>
                      <div className="font-medium text-lg">
                        {donation.quantity} {donation.unit}
                      </div>
                    </div>
                  </div>

                  {/* 配送方式 */}
                  <div className="flex items-start gap-3">
                    <Truck className="w-5 h-5 text-gray-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="text-sm text-gray-600">配送方式</div>
                      <div className="font-medium">
                        {getDeliveryMethodText(donation.delivery_method)}
                      </div>
                    </div>
                  </div>

                  {/* 預計送達時間 */}
                  {donation.estimated_delivery_time && (
                    <div className="flex items-start gap-3">
                      <Clock className="w-5 h-5 text-gray-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <div className="text-sm text-gray-600">預計送達時間</div>
                        <div className="font-medium">
                          {new Date(donation.estimated_delivery_time).toLocaleString('zh-TW')}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 實際送達時間 */}
                  {donation.actual_delivery_time && (
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <div className="text-sm text-gray-600">實際送達時間</div>
                        <div className="font-medium text-green-700">
                          {new Date(donation.actual_delivery_time).toLocaleString('zh-TW')}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 捐贈時間 */}
                  <div className="flex items-start gap-3">
                    <Calendar className="w-5 h-5 text-gray-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="text-sm text-gray-600">捐贈時間</div>
                      <div className="font-medium">
                        {donation.created_at
                          ? new Date(donation.created_at).toLocaleString('zh-TW')
                          : '未記錄'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 備註 */}
                {donation.notes && (
                  <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                    <div className="text-sm text-gray-600 mb-1">備註</div>
                    <div className="text-sm">{donation.notes}</div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 捐贈者資訊區塊 */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <User className="w-5 h-5 text-purple-600" />
                  <h3 className="text-lg font-semibold">捐贈者資訊</h3>
                  {!canViewDonorContact && (
                    <Badge variant="outline" className="text-xs">
                      <EyeOff className="w-3 h-3 mr-1" />
                      部分資訊需權限查看
                    </Badge>
                  )}
                </div>

                <div className="space-y-3">
                  {/* 捐贈者姓名 */}
                  <div className="flex items-start gap-3">
                    <User className="w-5 h-5 text-gray-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="text-sm text-gray-600">捐贈者姓名</div>
                      <div className="font-medium">
                        {donation.donor_name || '匿名捐贈者'}
                      </div>
                    </div>
                  </div>

                  {/* 聯絡電話 - 根據權限顯示 */}
                  {donation.donor_phone && (
                    <div className="flex items-start gap-3">
                      <Phone className="w-5 h-5 text-gray-500 mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <div className="text-sm text-gray-600 flex items-center gap-2">
                          聯絡電話
                          {!canViewDonorContact && (
                            <EyeOff className="w-3 h-3 text-gray-400" />
                          )}
                        </div>
                        {canViewDonorContact ? (
                          <div className="font-medium">{donation.donor_phone}</div>
                        ) : (
                          <span className="text-gray-400 italic text-xs">(需要相關權限查看)</span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* 電子郵件 - 根據權限顯示 */}
                  {donation.donor_email && (
                    <div className="flex items-start gap-3">
                      <Mail className="w-5 h-5 text-gray-500 mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <div className="text-sm text-gray-600 flex items-center gap-2">
                          電子郵件
                          {!canViewDonorContact && (
                            <EyeOff className="w-3 h-3 text-gray-400" />
                          )}
                        </div>
                        {canViewDonorContact ? (
                          <div className="font-medium">{donation.donor_email}</div>
                        ) : (
                          <span className="text-gray-400 italic text-xs">(需要相關權限查看)</span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* 配送地址 */}
                  {donation.delivery_address && (
                    <div className="flex items-start gap-3">
                      <Home className="w-5 h-5 text-gray-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <div className="text-sm text-gray-600">配送地址</div>
                        <div className="font-medium">{donation.delivery_address}</div>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* 目標網格資訊區塊 */}
            {grid && (
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <MapPin className="w-5 h-5 text-green-600" />
                    <h3 className="text-lg font-semibold">目標網格資訊</h3>
                  </div>

                  <div className="space-y-3">
                    {/* 網格代碼和狀態 */}
                    <div className="flex items-center gap-3">
                      <div className="flex-1">
                        <div className="text-sm text-gray-600">網格代碼</div>
                        <div className="font-medium text-lg flex items-center gap-2 mt-1">
                          {grid.code}
                          {getGridStatusBadge(grid.status)}
                          <Badge variant="secondary" className="text-xs">
                            {getGridTypeText(grid.grid_type)}
                          </Badge>
                        </div>
                      </div>
                    </div>

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

                    {/* 網格聯絡方式 - 根據權限顯示 */}
                    {grid.contact_info && (
                      <div className="flex items-start gap-3">
                        <Phone className="w-5 h-5 text-gray-500 mt-0.5 flex-shrink-0" />
                        <div className="flex-1">
                          <div className="text-sm text-gray-600 flex items-center gap-2">
                            網格聯絡方式
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
                  </div>
                </CardContent>
              </Card>
            )}

            {/* 物資需求進度區塊 */}
            {supplyProgress && (
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Package className="w-5 h-5 text-orange-600" />
                    <h3 className="text-lg font-semibold">物資需求進度</h3>
                  </div>

                  <div className="space-y-4">
                    {/* 總需求資訊 */}
                    <div className="grid grid-cols-3 gap-4">
                      <div className="p-3 bg-blue-50 rounded-lg text-center">
                        <div className="text-sm text-gray-600 mb-1">總需求量</div>
                        <div className="text-2xl font-bold text-blue-700">
                          {supplyProgress.needed}
                        </div>
                        <div className="text-xs text-gray-500">{supplyProgress.unit}</div>
                      </div>

                      <div className="p-3 bg-green-50 rounded-lg text-center">
                        <div className="text-sm text-gray-600 mb-1">已收到數量</div>
                        <div className="text-2xl font-bold text-green-700">
                          {supplyProgress.received}
                        </div>
                        <div className="text-xs text-gray-500">{supplyProgress.unit}</div>
                      </div>

                      <div className="p-3 bg-purple-50 rounded-lg text-center">
                        <div className="text-sm text-gray-600 mb-1">此筆捐贈</div>
                        <div className="text-2xl font-bold text-purple-700">
                          {donation.quantity}
                        </div>
                        <div className="text-xs text-gray-500">{donation.unit}</div>
                      </div>
                    </div>

                    {/* 總體進度條 */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">總體完成進度</span>
                        <span className="font-medium">
                          {supplyProgress.progress.toFixed(0)}%
                        </span>
                      </div>
                      <Progress
                        value={supplyProgress.progress}
                        className={`h-3 ${
                          supplyProgress.progress >= 100 ? 'bg-green-100' :
                          supplyProgress.progress < 50 ? 'bg-red-100' :
                          'bg-yellow-100'
                        }`}
                      />
                      {supplyProgress.progress >= 100 ? (
                        <div className="flex items-center gap-1 text-green-700 text-sm">
                          <CheckCircle2 className="w-4 h-4" />
                          <span>需求已滿足</span>
                        </div>
                      ) : supplyProgress.progress < 50 ? (
                        <div className="flex items-center gap-1 text-red-700 text-sm">
                          <AlertCircle className="w-4 h-4" />
                          <span>急需物資</span>
                        </div>
                      ) : null}
                    </div>

                    <Separator />

                    {/* 此筆捐贈佔比 */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">此筆捐贈佔總需求比例</span>
                        <span className="font-medium text-purple-700">
                          {supplyProgress.donationPercentage.toFixed(1)}%
                        </span>
                      </div>
                      <Progress
                        value={supplyProgress.donationPercentage}
                        className="h-2 bg-purple-100"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* 如果沒有找到對應的物資需求 */}
            {!supplyProgress && grid && (
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-2 mb-2">
                    <Info className="w-5 h-5 text-gray-400" />
                    <h3 className="text-lg font-semibold text-gray-600">物資需求進度</h3>
                  </div>
                  <p className="text-sm text-gray-500">
                    此網格目前沒有對應的物資需求記錄，或該物資需求已被移除。
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
