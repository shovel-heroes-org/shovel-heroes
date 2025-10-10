import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Users, Phone, Clock, Wrench, HardHat, MapPin, FileText, Info } from "lucide-react";
import { VolunteerRegistration } from "@/api/entities";
import { usePermission } from "@/hooks/usePermission";

export default function EditVolunteerModal({
  registration,
  grids,
  canEditSelf,      // 從 API 取得的 can_edit 權限
  canEditOthers,    // 從 API 取得的 can_manage 權限
  currentUserId,    // 從 API 取得的當前用戶 ID
  onSuccess,
  onClose
}) {
  // 僅用於 volunteer_status_management 權限
  const { hasPermission } = usePermission();
  const canManageStatus = hasPermission('volunteer_status_management', 'manage');

  // 判斷是否為志工本人（參考 privacy-filter.ts 的 isVolunteerSelf 邏輯）
  // 使用從 API 取得的 currentUserId
  const isSelf = currentUserId && registration && (
    registration.user_id === currentUserId ||
    registration.created_by_id === currentUserId
  );

  // 編輯權限邏輯（使用從 API 取得的權限，參考 canViewPhone 的實作方式）：
  // 1. canEditSelf (can_edit) + 是自己 → 可以編輯自己的
  // 2. canEditOthers (can_manage) + 是別人 → 可以編輯別人的
  const canEdit = (canEditSelf && isSelf) || (canEditOthers && !isSelf);

  const [formData, setFormData] = useState({
    volunteer_name: '',
    volunteer_phone: '',
    available_time: '',
    skills: '',
    equipment: '',
    notes: '',
    status: 'pending'
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (registration) {
      // 將陣列轉換為逗號分隔的字串
      const skillsStr = Array.isArray(registration.skills)
        ? registration.skills.join(', ')
        : (registration.skills || '');
      const equipmentStr = Array.isArray(registration.equipment)
        ? registration.equipment.join(', ')
        : (registration.equipment || '');

      setFormData({
        volunteer_name: registration.volunteer_name || '',
        volunteer_phone: registration.volunteer_phone || '',
        available_time: registration.available_time || '',
        skills: skillsStr,
        equipment: equipmentStr,
        notes: registration.notes || '',
        status: registration.status || 'pending'
      });
    }
  }, [registration]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSelectChange = (name, value) => {
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // 驗證必填欄位
    if (!formData.volunteer_name) {
      alert('請填寫志工姓名');
      return;
    }

    setLoading(true);
    try {
      // 將技能和裝備從字串轉換為陣列
      const skillsArray = formData.skills
        ? formData.skills.split(',').map(s => s.trim()).filter(s => s)
        : [];
      const equipmentArray = formData.equipment
        ? formData.equipment.split(',').map(e => e.trim()).filter(e => e)
        : [];

      // 更新志工報名資料
      await VolunteerRegistration.update(registration.id, {
        volunteer_name: formData.volunteer_name,
        volunteer_phone: formData.volunteer_phone,
        available_time: formData.available_time,
        skills: skillsArray,
        equipment: equipmentArray,
        notes: formData.notes,
        status: formData.status
      });

      // 成功後的處理
      onSuccess();
    } catch (error) {
      console.error('更新志工報名失敗:', error);
      alert('更新志工報名失敗，請稍後再試');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'confirmed': return 'bg-blue-100 text-blue-800';
      case 'arrived': return 'bg-purple-100 text-purple-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'pending': return '待確認';
      case 'confirmed': return '已確認';
      case 'arrived': return '已到場';
      case 'completed': return '已完成';
      case 'cancelled': return '已取消';
      default: return status;
    }
  };

  // 取得網格資訊
  const grid = grids?.find(g => g.id === registration?.grid_id);
  // 優先使用 code (救援區域)，然後 location_name，最後 name
  const gridName = grid?.code || grid?.location_name || grid?.name || '未知區域';

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <Users className="w-5 h-5" />
            編輯志工報名資訊
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 網格資訊 */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <MapPin className="w-4 h-4" />
              <span>救援區域: {gridName}</span>
            </div>
          </div>

          {/* 基本資訊 */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">基本資訊</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="volunteer_name" className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  志工姓名 <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="volunteer_name"
                  name="volunteer_name"
                  value={formData.volunteer_name}
                  onChange={handleChange}
                  placeholder="請輸入姓名"
                  required
                  disabled={!canEdit}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="volunteer_phone" className="flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  聯絡電話
                </Label>
                <Input
                  id="volunteer_phone"
                  name="volunteer_phone"
                  value={formData.volunteer_phone}
                  onChange={handleChange}
                  placeholder="請輸入電話號碼"
                  disabled={!canEdit}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="available_time" className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                可協助時間
              </Label>
              <Input
                id="available_time"
                name="available_time"
                value={formData.available_time}
                onChange={handleChange}
                placeholder="例如：週一至週五 9:00-17:00"
                disabled={!canEdit}
              />
            </div>
          </div>

          {/* 技能與裝備 */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">技能與裝備</h3>

            <div className="space-y-2">
              <Label htmlFor="skills" className="flex items-center gap-2">
                <Wrench className="w-4 h-4" />
                專長技能
              </Label>
              <Input
                id="skills"
                name="skills"
                value={formData.skills}
                onChange={handleChange}
                placeholder="例如：搬運, 清潔, 駕駛 (請以逗號分隔)"
                disabled={!canEdit}
              />
              <p className="text-xs text-gray-500">請以逗號分隔多個技能</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="equipment" className="flex items-center gap-2">
                <HardHat className="w-4 h-4" />
                可提供裝備
              </Label>
              <Input
                id="equipment"
                name="equipment"
                value={formData.equipment}
                onChange={handleChange}
                placeholder="例如：貨車, 清潔工具, 發電機 (請以逗號分隔)"
                disabled={!canEdit}
              />
              <p className="text-xs text-gray-500">請以逗號分隔多個裝備</p>
            </div>
          </div>

          {/* 其他資訊 */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">其他資訊</h3>

            <div className="space-y-2">
              <Label htmlFor="notes" className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                備註說明
              </Label>
              <Textarea
                id="notes"
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                placeholder="請輸入其他說明或特殊需求"
                rows={3}
                disabled={!canEdit}
              />
            </div>

            <div>
              <Label htmlFor="status" className="flex items-center gap-2 mb-2">
                <Info className="w-4 h-4" />
                報名狀態
              </Label>
              <Select
                value={formData.status}
                onValueChange={(value) => handleSelectChange('status', value)}
                disabled={!canManageStatus}
              >
                <SelectTrigger className={getStatusColor(formData.status)}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">待確認</SelectItem>
                  <SelectItem value="confirmed">已確認</SelectItem>
                  <SelectItem value="arrived">已到場</SelectItem>
                  <SelectItem value="completed">已完成</SelectItem>
                  <SelectItem value="cancelled">已取消</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* 按鈕區域 */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
            >
              取消
            </Button>
            <Button
              type="submit"
              disabled={loading || !canEdit}
              className={canEdit ? "bg-blue-600 hover:bg-blue-700" : "bg-gray-400 cursor-not-allowed"}
            >
              {loading ? '儲存中...' : canEdit ? '儲存變更' : '無編輯權限'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}