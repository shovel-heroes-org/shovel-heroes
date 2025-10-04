import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DisasterArea } from '@/api/entities';

export default function EditAreaModal({ isOpen, onClose, onSuccess, area }) {
  const [formData, setFormData] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (area) {
      setFormData({
        name: area.name || '',
        county: area.county || '',
        township: area.township || '',
        description: area.description || '',
        status: area.status || 'active'
      });
    }
  }, [area]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleStatusChange = (value) => {
    setFormData((prev) => ({ ...prev, status: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // 驗證必填欄位
    if (!formData.name || !formData.county || !formData.township) {
      setError('名稱、縣市、鄉鎮為必填項。');
      return;
    }

    setError('');
    setSubmitting(true);

    try {
      await DisasterArea.update(area.id, formData);
      onSuccess();
      onClose();
    } catch (err) {
      console.error('Failed to update disaster area:', err);
      setError('更新災區失敗，請稍後再試。');
    } finally {
      setSubmitting(false);
    }
  };

  if (!area) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>編輯災區: {area.name}</DialogTitle>
          <DialogDescription>
            修改災區的基本資訊與狀態
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="py-4 space-y-4 max-h-[60vh] overflow-y-auto pr-2">
            {/* 基本資訊 */}
            <div className="space-y-4">
              <h4 className="font-semibold text-lg border-b pb-2">基本資訊</h4>

              <div>
                <Label htmlFor="name">
                  災區名稱 <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="name"
                  name="name"
                  value={formData.name || ''}
                  onChange={handleInputChange}
                  placeholder="例如：台南市安南區淹水區"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="county">
                    縣市 <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="county"
                    name="county"
                    value={formData.county || ''}
                    onChange={handleInputChange}
                    placeholder="例如：台南市"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="township">
                    鄉鎮區 <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="township"
                    name="township"
                    value={formData.township || ''}
                    onChange={handleInputChange}
                    placeholder="例如：安南區"
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="description">描述</Label>
                <Textarea
                  id="description"
                  name="description"
                  value={formData.description || ''}
                  onChange={handleInputChange}
                  placeholder="災區的詳細描述、災情說明等..."
                  rows={4}
                />
              </div>

              <div>
                <Label htmlFor="status">狀態</Label>
                <Select
                  value={formData.status || 'active'}
                  onValueChange={handleStatusChange}
                >
                  <SelectTrigger id="status">
                    <SelectValue placeholder="選擇狀態" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">進行中</SelectItem>
                    <SelectItem value="completed">已完成</SelectItem>
                    <SelectItem value="suspended">已暫停</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {error && (
            <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">
              {error}
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
              取消
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? '儲存中...' : '儲存變更'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
