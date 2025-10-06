import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Save, X } from 'lucide-react';

const ROLES = {
  'super_admin': { label: '超級管理員', color: 'bg-purple-500' },
  'admin': { label: '管理員', color: 'bg-blue-500' },
  'grid_manager': { label: '網格管理員', color: 'bg-green-500' },
  'user': { label: '一般使用者', color: 'bg-yellow-500' },
  'guest': { label: '訪客', color: 'bg-gray-400' }
};

/**
 * 編輯權限項目名稱和說明的模態框
 */
export default function EditPermissionModal({ permission, open, onOpenChange, onSave }) {
  const [formData, setFormData] = useState({
    permission_name: '',
    description: ''
  });
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  // 當 permission 改變時更新表單資料
  useEffect(() => {
    if (permission) {
      setFormData({
        permission_name: permission.permission_name || '',
        description: permission.description || ''
      });
      setErrors({});
    }
  }, [permission]);

  const handleChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    // 清除該欄位的錯誤
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const validate = () => {
    const newErrors = {};

    if (!formData.permission_name.trim()) {
      newErrors.permission_name = '權限項目名稱不能為空';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) {
      return;
    }

    setSaving(true);
    try {
      await onSave({
        id: permission.id,
        permission_name: formData.permission_name.trim(),
        description: formData.description.trim()
      });
      onOpenChange(false);
    } catch (error) {
      console.error('儲存失敗:', error);
      setErrors({ general: error.message || '儲存失敗' });
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    onOpenChange(false);
    setFormData({
      permission_name: permission?.permission_name || '',
      description: permission?.description || ''
    });
    setErrors({});
  };

  if (!permission) return null;

  const roleInfo = ROLES[permission.role];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            編輯權限項目
            <Badge className={`${roleInfo.color} text-white`}>
              {roleInfo.label}
            </Badge>
          </DialogTitle>
          <DialogDescription>
            修改權限項目的名稱和說明。權限鍵值 ({permission.permission_key}) 和分類無法修改。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* 權限鍵值 (唯讀) */}
          <div className="space-y-2">
            <Label htmlFor="permission_key" className="text-sm font-medium">
              權限鍵值 (唯讀)
            </Label>
            <Input
              id="permission_key"
              value={permission.permission_key}
              disabled
              className="bg-gray-50"
            />
          </div>

          {/* 權限分類 (唯讀) */}
          <div className="space-y-2">
            <Label htmlFor="permission_category" className="text-sm font-medium">
              權限分類 (唯讀)
            </Label>
            <Input
              id="permission_category"
              value={permission.permission_category}
              disabled
              className="bg-gray-50"
            />
          </div>

          {/* 權限項目名稱 */}
          <div className="space-y-2">
            <Label htmlFor="permission_name" className="text-sm font-medium">
              權限項目名稱 <span className="text-red-500">*</span>
            </Label>
            <Input
              id="permission_name"
              value={formData.permission_name}
              onChange={(e) => handleChange('permission_name', e.target.value)}
              placeholder="請輸入權限項目名稱"
              className={errors.permission_name ? 'border-red-500' : ''}
            />
            {errors.permission_name && (
              <p className="text-sm text-red-500">{errors.permission_name}</p>
            )}
          </div>

          {/* 說明 */}
          <div className="space-y-2">
            <Label htmlFor="description" className="text-sm font-medium">
              說明
            </Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              placeholder="請輸入權限項目說明"
              rows={4}
              className={errors.description ? 'border-red-500' : ''}
            />
            {errors.description && (
              <p className="text-sm text-red-500">{errors.description}</p>
            )}
          </div>

          {/* 一般錯誤訊息 */}
          {errors.general && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{errors.general}</p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={saving}
          >
            <X className="w-4 h-4 mr-2" />
            取消
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving}
          >
            <Save className="w-4 h-4 mr-2" />
            {saving ? '儲存中...' : '儲存'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
