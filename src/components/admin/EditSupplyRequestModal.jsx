/**
 * 編輯物資需求模態框
 *
 * 用於後台物資管理 > 物資列表分頁
 * 專門用於編輯網格(Grid)中的物資需求資訊
 */

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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Info, Package, Plus, Trash2, MapPin } from "lucide-react";

export default function EditSupplyRequestModal({
  isOpen,
  onClose,
  grid,
  onSave
}) {
  const [formData, setFormData] = useState({
    supplies_needed: []
  });

  useEffect(() => {
    if (grid) {
      setFormData({
        supplies_needed: grid.supplies_needed ? [...grid.supplies_needed] : []
      });
    }
  }, [grid]);

  // ==================== 物資需求管理 ====================

  const handleSupplyChange = (index, field, value) => {
    const newSupplies = [...formData.supplies_needed];
    newSupplies[index][field] = value;
    setFormData(prev => ({
      ...prev,
      supplies_needed: newSupplies
    }));
  };

  const handleAddSupply = () => {
    setFormData(prev => ({
      ...prev,
      supplies_needed: [
        ...prev.supplies_needed,
        { name: '', quantity: 0, received: 0, unit: '' }
      ]
    }));
  };

  const handleRemoveSupply = (index) => {
    setFormData(prev => ({
      ...prev,
      supplies_needed: prev.supplies_needed.filter((_, i) => i !== index)
    }));
  };

  // ==================== 表單送出 ====================

  const handleSubmit = (e) => {
    e.preventDefault();

    // 驗證物資資料
    const hasInvalidSupply = formData.supplies_needed.some(
      supply => !supply.name || !supply.unit
    );

    if (hasInvalidSupply) {
      alert('請確保所有物資都填寫了名稱和單位');
      return;
    }

    // 轉換數值型別
    const processedData = {
      ...formData,
      supplies_needed: formData.supplies_needed.map(s => ({
        ...s,
        quantity: parseInt(s.quantity, 10) || 0,
        received: parseInt(s.received, 10) || 0
      }))
    };

    // 呼叫儲存函數
    onSave(processedData);
  };

  // ==================== 輔助函數 ====================

  const calculateProgress = (received, needed) => {
    if (!needed || needed === 0) return 100;
    return Math.min((received / needed) * 100, 100);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <Package className="w-6 h-6" />
            編輯物資需求
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 網格資訊顯示 (唯讀) */}
          {grid && (
            <Card className="border-blue-200 bg-blue-50">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-900 space-y-1">
                    <p className="font-semibold">網格資訊</p>
                    <p><span className="font-medium">網格代碼:</span> {grid.code}</p>
                    {grid.area_name && (
                      <p><span className="font-medium">救災地點:</span> {grid.area_name}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* 物資需求清單 */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Package className="w-4 h-4" />
                物資需求清單
              </CardTitle>
              <Button
                type="button"
                size="sm"
                onClick={handleAddSupply}
                className="flex items-center gap-1"
              >
                <Plus className="w-4 h-4" />
                新增物資
              </Button>
            </CardHeader>
            <CardContent>
              {formData.supplies_needed.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Package className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>尚未新增任何物資需求</p>
                  <p className="text-sm">點擊上方「新增物資」按鈕開始新增</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {formData.supplies_needed.map((supply, index) => {
                    const progress = calculateProgress(
                      parseInt(supply.received, 10) || 0,
                      parseInt(supply.quantity, 10) || 0
                    );

                    return (
                      <Card key={index} className="border border-gray-200">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-3">
                            <h4 className="font-semibold text-sm">物資 #{index + 1}</h4>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={() => handleRemoveSupply(index)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50 h-7 w-7 p-0"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                            {/* 物資名稱 */}
                            <div className="md:col-span-2">
                              <Label className="text-xs">
                                物資名稱 <span className="text-red-500">*</span>
                              </Label>
                              <Input
                                value={supply.name}
                                onChange={(e) => handleSupplyChange(index, 'name', e.target.value)}
                                placeholder="例: 礦泉水"
                                required
                              />
                            </div>

                            {/* 需求數量 */}
                            <div>
                              <Label className="text-xs">需求數量</Label>
                              <Input
                                type="number"
                                min="0"
                                value={supply.quantity}
                                onChange={(e) => handleSupplyChange(index, 'quantity', e.target.value)}
                                placeholder="0"
                              />
                            </div>

                            {/* 單位 */}
                            <div>
                              <Label className="text-xs">
                                單位 <span className="text-red-500">*</span>
                              </Label>
                              <Input
                                value={supply.unit}
                                onChange={(e) => handleSupplyChange(index, 'unit', e.target.value)}
                                placeholder="例: 箱"
                                required
                              />
                            </div>

                            {/* 已收到數量 */}
                            <div className="md:col-span-2">
                              <Label className="text-xs">已收到數量</Label>
                              <Input
                                type="number"
                                min="0"
                                value={supply.received}
                                onChange={(e) => handleSupplyChange(index, 'received', e.target.value)}
                                placeholder="0"
                              />
                            </div>

                            {/* 進度顯示 */}
                            <div className="md:col-span-2 flex items-end">
                              <div className="w-full">
                                <Label className="text-xs mb-1 block">
                                  收集進度
                                </Label>
                                <div className="flex items-center gap-2">
                                  <div className="flex-1 bg-gray-200 rounded-full h-2.5">
                                    <div
                                      className={`h-2.5 rounded-full ${
                                        progress >= 100 ? 'bg-green-600' :
                                        progress >= 80 ? 'bg-green-500' :
                                        progress >= 50 ? 'bg-yellow-500' :
                                        'bg-red-500'
                                      }`}
                                      style={{ width: `${progress}%` }}
                                    />
                                  </div>
                                  <span className="text-xs font-semibold text-gray-700 min-w-[45px]">
                                    {progress.toFixed(0)}%
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* 提示資訊 */}
          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-900 space-y-1">
                  <p className="font-semibold">編輯提示</p>
                  <ul className="list-disc list-inside space-y-0.5 text-xs">
                    <li>此處只編輯物資需求清單,網格基本資訊請至其他功能編輯</li>
                    <li>物資名稱和單位為必填欄位</li>
                    <li>進度會自動限制在 100% (即使已收到超過需求)</li>
                    <li>刪除物資需求時請謹慎,刪除後無法復原</li>
                    <li>儲存後會立即更新資料,並重新載入物資列表</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 操作按鈕 */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
            >
              取消
            </Button>
            <Button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700"
            >
              儲存變更
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
