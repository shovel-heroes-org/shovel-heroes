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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Info, Package, Truck, User, Phone, Mail, MapPin, Calendar, FileText } from "lucide-react";

export default function EditSupplyDonationModal({
  isOpen,
  onClose,
  donation,
  onSave
}) {
  const [formData, setFormData] = useState({
    supply_name: '',
    quantity: '',
    unit: '',
    donor_name: '',
    donor_phone: '',
    donor_email: '',
    delivery_method: 'direct',
    delivery_time: '',
    delivery_address: '',
    notes: '',
    status: 'pledged'
  });

  useEffect(() => {
    if (donation) {
      setFormData({
        supply_name: donation.supply_name || donation.name || '',
        quantity: donation.quantity || '',
        unit: donation.unit || '',
        donor_name: donation.donor_name || '',
        donor_phone: donation.donor_phone || '',
        donor_email: donation.donor_email || '',
        delivery_method: donation.delivery_method || 'direct',
        delivery_time: donation.delivery_time || '',
        delivery_address: donation.delivery_address || '',
        notes: donation.notes || '',
        status: donation.status || 'pledged'
      });
    }
  }, [donation]);

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

  const handleSubmit = (e) => {
    e.preventDefault();

    // 驗證必填欄位
    if (!formData.supply_name || !formData.quantity || !formData.unit) {
      alert('請填寫物資名稱、數量和單位');
      return;
    }

    // 呼叫儲存函數
    onSave(formData);
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <Package className="w-5 h-5" />
            編輯物資捐贈資訊
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 物資資訊卡片 */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Package className="w-4 h-4" />
                物資資訊
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-1">
                  <Label htmlFor="supply_name" className="flex items-center gap-1">
                    物資名稱 <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="supply_name"
                    name="supply_name"
                    value={formData.supply_name}
                    onChange={handleChange}
                    placeholder="例如：礦泉水"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="quantity" className="flex items-center gap-1">
                    數量 <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="quantity"
                    name="quantity"
                    type="number"
                    value={formData.quantity}
                    onChange={handleChange}
                    placeholder="例如：100"
                    required
                    min="1"
                  />
                </div>
                <div>
                  <Label htmlFor="unit" className="flex items-center gap-1">
                    單位 <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="unit"
                    name="unit"
                    value={formData.unit}
                    onChange={handleChange}
                    placeholder="例如：箱、個"
                    required
                  />
                </div>
              </div>

              {/* 狀態選擇 */}
              <div>
                <Label htmlFor="status" className="flex items-center gap-2 mb-2">
                  <Info className="w-4 h-4" />
                  捐贈狀態
                </Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => handleSelectChange('status', value)}
                >
                  <SelectTrigger className={getStatusColor(formData.status)}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pledged">已承諾</SelectItem>
                    <SelectItem value="confirmed">已確認</SelectItem>
                    <SelectItem value="in_transit">運送中</SelectItem>
                    <SelectItem value="delivered">已送達</SelectItem>
                    <SelectItem value="received">已收到</SelectItem>
                    <SelectItem value="cancelled">已取消</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* 捐贈者資訊卡片 */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <User className="w-4 h-4" />
                捐贈者資訊
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="donor_name" className="flex items-center gap-1">
                    <User className="w-3 h-3" />
                    姓名
                  </Label>
                  <Input
                    id="donor_name"
                    name="donor_name"
                    value={formData.donor_name}
                    onChange={handleChange}
                    placeholder="請輸入捐贈者姓名"
                  />
                </div>
                <div>
                  <Label htmlFor="donor_phone" className="flex items-center gap-1">
                    <Phone className="w-3 h-3" />
                    電話
                  </Label>
                  <Input
                    id="donor_phone"
                    name="donor_phone"
                    value={formData.donor_phone}
                    onChange={handleChange}
                    placeholder="請輸入聯絡電話"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="donor_email" className="flex items-center gap-1">
                  <Mail className="w-3 h-3" />
                  電子郵件
                </Label>
                <Input
                  id="donor_email"
                  name="donor_email"
                  type="email"
                  value={formData.donor_email}
                  onChange={handleChange}
                  placeholder="請輸入電子郵件"
                />
              </div>
              <p className="text-xs text-gray-500 flex items-center gap-1 bg-gray-50 p-2 rounded">
                <Info className="w-3 h-3"/>
                捐贈者的聯絡資訊將根據隱私設定，僅對相關人員顯示
              </p>
            </CardContent>
          </Card>

          {/* 配送資訊卡片 */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Truck className="w-4 h-4" />
                配送資訊
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="delivery_method" className="flex items-center gap-1 mb-2">
                  <Truck className="w-3 h-3" />
                  配送方式
                </Label>
                <Select
                  value={formData.delivery_method}
                  onValueChange={(value) => handleSelectChange('delivery_method', value)}
                >
                  <SelectTrigger id="delivery_method">
                    <SelectValue placeholder="選擇配送方式" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="direct">直接送達</SelectItem>
                    <SelectItem value="pickup_point">轉運點</SelectItem>
                    <SelectItem value="volunteer_pickup">志工取貨</SelectItem>
                    <SelectItem value="delivery">物流配送</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-1">
                  <Label htmlFor="delivery_address" className="flex items-center gap-1 mb-2">
                    <MapPin className="w-3 h-3" />
                    送達地址
                  </Label>
                  <Input
                    id="delivery_address"
                    name="delivery_address"
                    value={formData.delivery_address}
                    onChange={handleChange}
                    placeholder="請輸入送達地址"
                  />
                </div>
                <div>
                  <Label htmlFor="delivery_time" className="flex items-center gap-1 mb-2">
                    <Calendar className="w-3 h-3" />
                    預計送達時間
                  </Label>
                  <Input
                    id="delivery_time"
                    name="delivery_time"
                    value={formData.delivery_time}
                    onChange={handleChange}
                    placeholder="例：今日下午 3:00"
                  />
                </div>
              </div>

              {/* 備註 */}
              <div>
                <Label htmlFor="notes" className="flex items-center gap-1 mb-2">
                  <FileText className="w-3 h-3" />
                  備註
                </Label>
                <Textarea
                  id="notes"
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  placeholder="請輸入備註（選填）"
                  rows={3}
                  className="resize-none"
                />
              </div>
            </CardContent>
          </Card>

          {/* 按鈕區域 */}
          <div className="flex gap-3 justify-end pt-2 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="min-w-[100px]"
            >
              取消
            </Button>
            <Button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 min-w-[100px]"
            >
              儲存變更
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}