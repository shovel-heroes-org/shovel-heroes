import React, { useState } from 'react';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Grid, User } from '@/api/entities';
import { Plus, Trash2 } from 'lucide-react';

export default function AddSupplyRequestModal({ isOpen, onClose, onSuccess, grids }) {
  const [selectedGridId, setSelectedGridId] = useState('');
  const [supplies, setSupplies] = useState([{ name: '', quantity: '', unit: '' }]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [user, setUser] = useState(null);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  React.useEffect(() => {
    (async () => {
      try {
        const u = await User.me();
        setUser(u);
      } catch (e) {
        setUser(null);
      }
    })();
  }, []);

  const handleAddSupply = () => {
    setSupplies([...supplies, { name: '', quantity: '', unit: '' }]);
  };

  const handleRemoveSupply = (index) => {
    const newSupplies = supplies.filter((_, i) => i !== index);
    setSupplies(newSupplies);
  };

  const handleSupplyChange = (index, field, value) => {
    const newSupplies = [...supplies];
    newSupplies[index][field] = value;
    setSupplies(newSupplies);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedGridId || supplies.some(s => !s.name || !s.quantity || !s.unit)) {
      setError('請選擇救援網格並填寫所有物資欄位。');
      return;
    }
    if (!agreedToTerms) {
      setError('請先同意並理解相關條款。');
      return;
    }
    setError('');
    setSubmitting(true);

    try {
  const grid = await Grid.get(selectedGridId);
  const baseSupplies = Array.isArray(grid.supplies_needed) ? grid.supplies_needed : [];
  const updatedSupplies = [...baseSupplies];

      for (const supply of supplies) {
        const existingSupplyIndex = updatedSupplies.findIndex(s => s.name === supply.name);
        
        if (existingSupplyIndex > -1) {
          updatedSupplies[existingSupplyIndex].quantity += parseInt(supply.quantity, 10);
        } else {
          updatedSupplies.push({
            name: supply.name,
            quantity: parseInt(supply.quantity, 10),
            unit: supply.unit,
            received: 0,
          });
        }
      }

      await Grid.update(selectedGridId, { supplies_needed: updatedSupplies });
      onSuccess();
    } catch (err) {
      console.error('Failed to add supply request:', err);
      setError('新增物資需求失敗，請稍後再試。');
    } finally {
      setSubmitting(false);
    }
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>新增物資需求</DialogTitle>
          <DialogDescription>
            為指定的救援網格新增需要的物資。如果物資已存在，將會累加數量。
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto pr-2">
          <div>
            <Label htmlFor="grid-select" className="mb-2 block">救援網格 *</Label>
            <Select value={selectedGridId} onValueChange={setSelectedGridId}>
              <SelectTrigger id="grid-select">
                <SelectValue placeholder="請選擇網格" />
              </SelectTrigger>
              <SelectContent>
                {grids.filter(g => g.status === 'open').map(grid => (
                  <SelectItem key={grid.id} value={grid.id}>{grid.code}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-4">
            {supplies.map((supply, index) => (
              <div key={index} className="flex items-end gap-2 p-4 border rounded-lg">
                <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-2">
                   <div>
                      <Label htmlFor={`supply-name-${index}`}>物資內容 *</Label>
                      <Input 
                        id={`supply-name-${index}`} 
                        value={supply.name} 
                        onChange={(e) => handleSupplyChange(index, 'name', e.target.value)} 
                        placeholder="例如：瓶裝水"
                      />
                    </div>
                    <div>
                      <Label htmlFor={`quantity-${index}`}>需求數量 *</Label>
                      <Input 
                        id={`quantity-${index}`} 
                        type="number" 
                        value={supply.quantity} 
                        onChange={(e) => handleSupplyChange(index, 'quantity', e.target.value)} 
                        min="1"
                      />
                    </div>
                    <div>
                      <Label htmlFor={`unit-${index}`}>單位 *</Label>
                      <Input 
                        id={`unit-${index}`} 
                        value={supply.unit} 
                        onChange={(e) => handleSupplyChange(index, 'unit', e.target.value)} 
                        placeholder="例如：箱"
                      />
                    </div>
                </div>
                {supplies.length > 1 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveSupply(index)}
                    className="text-red-500 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>

          <Button variant="outline" onClick={handleAddSupply} className="w-full">
            <Plus className="w-4 h-4 mr-2" />
            新增一項物資
          </Button>

          <div className="flex items-start space-x-2 p-4 bg-gray-50 rounded-lg">
            <input
              type="checkbox"
              id="terms-checkbox"
              checked={agreedToTerms}
              onChange={(e) => setAgreedToTerms(e.target.checked)}
              className="mt-1 h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
            />
            <label htmlFor="terms-checkbox" className="text-sm text-gray-700 leading-relaxed">
              我已經同意並理解：本站為緊急救災平台，我所提供的聯絡資訊將提供需求方參考，以利志工與需求方互相聯繫。
            </label>
          </div>

          {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
        </div>
        <DialogFooter className="flex flex-col items-stretch space-y-2">
          <div className="flex w-full justify-end gap-2">
            <Button variant="outline" onClick={onClose}>取消</Button>
            <Button
              onClick={handleSubmit}
              disabled={submitting || !user || !agreedToTerms}
              className={!user || !agreedToTerms ? 'bg-gray-400 cursor-not-allowed' : ''}
            >
              {submitting ? '新增中...' : '確認新增'}
            </Button>
          </div>
          {!user && (
            <div className="text-xs text-gray-500 text-center space-y-1">
              <p>請先登入以新增物資需求。</p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => User.login()}
              >立即登入</Button>
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}