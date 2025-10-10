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
import { Grid } from '@/api/entities';
import { Plus, Trash2 } from 'lucide-react';

export default function EditGridModal({ isOpen, onClose, onSuccess, grid }) {
  const [formData, setFormData] = useState({});
  const [supplies, setSupplies] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (grid) {
      setFormData({
        code: grid.code || '',
        volunteer_needed: grid.volunteer_needed || 0,
        volunteer_registered: grid.volunteer_registered || 0,
        meeting_point: grid.meeting_point || '',
        risks_notes: grid.risks_notes || '',
        contact_info: grid.contact_info || '',
        status: grid.status || 'open'
      });
      setSupplies(grid.supplies_needed ? [...grid.supplies_needed] : []);
    }
  }, [grid]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSupplyChange = (index, field, value) => {
    const newSupplies = [...supplies];
    newSupplies[index][field] = value;
    setSupplies(newSupplies);
  };

  const handleAddSupply = () => {
    setSupplies([...supplies, { name: '', quantity: 0, received: 0, unit: '' }]);
  };

  const handleRemoveSupply = (index) => {
    setSupplies(supplies.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.code) {
      setError('網格代碼為必填項。');
      return;
    }
    setError('');
    setSubmitting(true);

    try {
      const updateData = {
        ...formData,
        volunteer_needed: parseInt(formData.volunteer_needed, 10),
        volunteer_registered: parseInt(formData.volunteer_registered, 10),
        supplies_needed: supplies.map(s => ({
            ...s,
            quantity: parseInt(s.quantity, 10),
            received: parseInt(s.received, 10)
        }))
      };

      await Grid.update(grid.id, updateData);
      onSuccess();
    } catch (err) {
      console.error('Failed to update grid:', err);
      setError('更新網格失敗，請稍後再試。');
    } finally {
      setSubmitting(false);
    }
  };

  if (!grid) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>編輯網格: {grid.code}</DialogTitle>
          <DialogDescription>
            手動修改網格的詳細資訊、志工與物資數量。
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-6 max-h-[70vh] overflow-y-auto pr-4">
          {/* General Info */}
          <div className="space-y-4">
            <h4 className="font-semibold text-lg border-b pb-2">基本資訊</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="code">
                  網格代碼 <span className="text-red-500">*</span>
                </Label>
                <Input id="code" name="code" value={formData.code} onChange={handleInputChange} />
              </div>
              <div>
                <Label htmlFor="meeting_point">集合地點</Label>
                <Input id="meeting_point" name="meeting_point" value={formData.meeting_point} onChange={handleInputChange} />
              </div>
            </div>
            <div>
              <Label htmlFor="risks_notes">風險注意事項</Label>
              <Textarea id="risks_notes" name="risks_notes" value={formData.risks_notes} onChange={handleInputChange} />
            </div>
            <div>
              <Label htmlFor="contact_info">聯絡資訊</Label>
              <Textarea id="contact_info" name="contact_info" value={formData.contact_info} onChange={handleInputChange} />
            </div>
          </div>
          
          {/* Volunteer Info */}
          <div className="space-y-4">
            <h4 className="font-semibold text-lg border-b pb-2">志工數量</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="volunteer_needed">需求人數</Label>
                <Input id="volunteer_needed" name="volunteer_needed" type="number" value={formData.volunteer_needed} onChange={handleInputChange} />
              </div>
              <div>
                <Label htmlFor="volunteer_registered">已報名人數</Label>
                <Input id="volunteer_registered" name="volunteer_registered" type="number" value={formData.volunteer_registered} onChange={handleInputChange} />
              </div>
            </div>
          </div>

          {/* Supplies Info */}
          <div className="space-y-4">
            <h4 className="font-semibold text-lg border-b pb-2">物資清單</h4>
            <div className="space-y-3">
              {supplies.map((supply, index) => (
                <div key={index} className="flex items-end gap-2 p-3 border rounded-md">
                  <div className="grid grid-cols-4 gap-2 flex-1">
                    <div className="col-span-2">
                      <Label className="text-xs">物資名稱</Label>
                      <Input value={supply.name} onChange={(e) => handleSupplyChange(index, 'name', e.target.value)} />
                    </div>
                    <div>
                      <Label className="text-xs">需求</Label>
                      <Input type="number" value={supply.quantity} onChange={(e) => handleSupplyChange(index, 'quantity', e.target.value)} />
                    </div>
                    <div>
                      <Label className="text-xs">已收到</Label>
                      <Input type="number" value={supply.received} onChange={(e) => handleSupplyChange(index, 'received', e.target.value)} />
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => handleRemoveSupply(index)} className="text-red-500 hover:text-red-600">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
            <Button variant="outline" size="sm" onClick={handleAddSupply} className="mt-2">
              <Plus className="w-4 h-4 mr-2" /> 新增物資
            </Button>
          </div>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>取消</Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? '儲存中...' : '儲存變更'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}