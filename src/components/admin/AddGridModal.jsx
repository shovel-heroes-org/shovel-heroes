
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
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
import { Textarea } from '@/components/ui/textarea';
import { Grid } from '@/api/entities';
import { User } from '@/api/entities';
import "leaflet/dist/leaflet.css";
import { Loader2, Info } from 'lucide-react';

const LocationPicker = ({ position, setPosition }) => {
  const map = useMap();

  useMapEvents({
    click(e) {
      setPosition(e.latlng);
      map.flyTo(e.latlng, map.getZoom());
    },
  });

  const handleDragEnd = useCallback((e) => {
    setPosition(e.target.getLatLng());
  }, [setPosition]);

  const marker = useMemo(() => (
      position ? (
          <Marker
              position={position}
              draggable={true}
              eventHandlers={{ dragend: handleDragEnd }}
          >
              <Popup>拖動以微調位置</Popup>
          </Marker>
      ) : null
  ), [position, handleDragEnd]);

  return marker;
};

const MapController = ({ center, zoom }) => {
    const map = useMap();
    useEffect(() => {
        if (center) {
            map.flyTo(center, zoom || map.getZoom());
        }
    }, [center, zoom, map]);
    return null;
}

export default function AddGridModal({ isOpen, onClose, onSuccess, disasterAreas }) {
  const [formData, setFormData] = useState({
    code: '',
    grid_type: 'manpower',
    disaster_area_id: '',
    volunteer_needed: '0',
    meeting_point: '',
    risks_notes: '',
    contact_info: '',
  });
  const [position, setPosition] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [mapCenter, setMapCenter] = useState([23.8751, 121.5780]);
  const [currentUser, setCurrentUser] = useState(null);
  const [addressQuery, setAddressQuery] = useState('');
  const [isGeocoding, setIsGeocoding] = useState(false);

  useEffect(() => {
    // Re-initialize Leaflet icons when the modal is open
    // Moving this inside useEffect fixes the "RequestHelp blank page" issue,
    // as it ensures Leaflet icons are correctly configured only when the component is mounted
    // and `window.L` is available, preventing issues during SSR or initial load.
    if (isOpen && typeof window !== 'undefined' && window.L) {
      delete window.L.Icon.Default.prototype._getIconUrl;
      window.L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
      });
    }

    const loadUser = async () => {
      try {
        const user = await User.me();
        setCurrentUser(user);
      } catch (e) {
        // 用戶未登入是正常情況，不需要拋出錯誤
        setCurrentUser(null);
      }
    };

    if (isOpen) {
      loadUser();
      
      // 當 modal 打開時，確保地圖已收起
      localStorage.setItem('collapseMapForModal', 'true');
      window.dispatchEvent(new Event('collapseMap'));
      
      // 找到光復鄉重災區並設為預設值
      const defaultArea = disasterAreas.find(area => 
        area.name === '光復鄉重災區' || 
        area.name.includes('光復鄉')
      );
      
      // Reset form data and errors when modal opens
      setFormData({
        code: '',
        grid_type: 'manpower',
        disaster_area_id: defaultArea ? defaultArea.id : '',
        volunteer_needed: '0',
        meeting_point: '',
        risks_notes: '',
        contact_info: '',
      });
      
      // 如果找到預設災區，也設定地圖中心點
      if (defaultArea) {
        const newPos = { lat: defaultArea.center_lat, lng: defaultArea.center_lng };
        setMapCenter([newPos.lat, newPos.lng]);
        setPosition(newPos);
      } else {
        setPosition(null);
      }
      
      setError('');
      setAddressQuery('');
    }
  }, [isOpen, disasterAreas]);

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

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name, value) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (name === 'disaster_area_id') {
      const area = disasterAreas.find(a => a.id === value);
      if (area) {
        const newPos = { lat: area.center_lat, lng: area.center_lng };
        setMapCenter([newPos.lat, newPos.lng]);
        setPosition(newPos);
      }
    }
  };

  const handleAddressSearch = async () => {
    if (!addressQuery) {
      setError('請輸入地址進行搜尋。');
      return;
    }
    setIsGeocoding(true);
    setError('');
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(addressQuery)}&countrycodes=tw&limit=1`);
      if (!response.ok) throw new Error('Network response was not ok');
      const data = await response.json();
      if (data && data.length > 0) {
        const { lat, lon } = data[0];
        const newPosition = { lat: parseFloat(lat), lng: parseFloat(lon) };
        setPosition(newPosition);
        setMapCenter([newPosition.lat, newPosition.lng]);
      } else {
        setError('找不到該地址，請嘗試更詳細的地址或直接在地圖上點擊。');
      }
    } catch (err) {
      console.error('Geocoding failed:', err);
      setError('地址搜尋失敗，請檢查網路連線或稍後再試。');
    } finally {
      setIsGeocoding(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.code || !formData.disaster_area_id || !formData.contact_info || !position) {
      setError('請填寫完整資訊（包含聯絡資訊）。');
      return;
    }
    
    // Check for duplicate grid code
    try {
      const existingGrids = await Grid.list();
      const duplicateGrid = existingGrids.find(grid => 
        grid.code.toLowerCase() === formData.code.toLowerCase()
      );
      
      if (duplicateGrid) {
        setError(`網格代碼 "${formData.code}" 已存在，請選擇其他代碼。`);
        return;
      }
    } catch (err) {
      console.error('Failed to check existing grids:', err);
      setError('檢查網格代碼時發生錯誤，請稍後再試。');
      return;
    }

    setError('');
    setSubmitting(true);

    try {
      const gridSizeDegrees = 0.001;
      const payload = {
        ...formData,
        volunteer_needed: parseInt(formData.volunteer_needed, 10) || 0,
        volunteer_registered: 0,
        center_lat: position.lat,
        center_lng: position.lng,
        bounds: {
          north: position.lat + gridSizeDegrees,
          south: position.lat - gridSizeDegrees,
          east: position.lng + gridSizeDegrees,
          west: position.lng - gridSizeDegrees,
        },
        status: 'open',
        supplies_needed: [],
      };
      
      // 如果用戶已登入，則將其設為格主，否則留空
      if (currentUser) {
        payload.grid_manager_id = currentUser.id;
      }
      // 注意：不設置 grid_manager_id 時，該欄位將為空
      
      await Grid.create(payload);
      onSuccess();
    } catch (err) {
      console.error('Failed to create grid:', err);
      setError('建立網格失敗，請稍後再試。');
    } finally {
      setSubmitting(false);
    }
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>新增救援網格</DialogTitle>
          <DialogDescription>
            填寫網格資訊並在地圖上標註位置。點擊地圖或搜尋地址即可設定中心點。
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
          <div className="space-y-4">
            <div>
              <Label htmlFor="disaster_area_id">所屬災區 *</Label>
              <Select
                value={formData.disaster_area_id}
                onValueChange={(value) => handleSelectChange('disaster_area_id', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="請選擇災區" />
                </SelectTrigger>
                <SelectContent>
                  {disasterAreas.map(area => (
                    <SelectItem key={area.id} value={area.id}>{area.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="grid_type">網格類型 *</Label>
              <Select
                value={formData.grid_type}
                onValueChange={(value) => handleSelectChange('grid_type', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="請選擇網格類型" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manpower">人力任務</SelectItem>
                  <SelectItem value="mud_disposal">污泥暫置場</SelectItem>
                  <SelectItem value="supply_storage">物資停放處</SelectItem>
                  <SelectItem value="accommodation">住宿地點</SelectItem>
                  <SelectItem value="food_area">領吃食區域</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="code">網格代碼 *</Label>
              <Input id="code" name="code" value={formData.code} onChange={handleInputChange} placeholder="例如：A-3, B-4"/>
            </div>

            <div>
              <Label htmlFor="volunteer_needed">需求志工人數 *</Label>
              <Input id="volunteer_needed" name="volunteer_needed" type="number" value={formData.volunteer_needed} onChange={handleInputChange} />
            </div>

            <div>
              <Label htmlFor="meeting_point">集合地點</Label>
              <Input id="meeting_point" name="meeting_point" value={formData.meeting_point} onChange={handleInputChange} />
            </div>

            <div>
              <Label htmlFor="risks_notes">風險注意事項</Label>
              <Textarea id="risks_notes" name="risks_notes" value={formData.risks_notes} onChange={handleInputChange} placeholder="例如：土石鬆軟、有積水"/>
            </div>

            <div>
              <Label htmlFor="contact_info">聯絡資訊</Label>
              <Input 
                id="contact_info" 
                name="contact_info" 
                value={formData.contact_info} 
                onChange={handleInputChange} 
                placeholder="提供手機或 Line ID 以便聯繫"
              />
              <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                <Info className="w-3 h-3"/>
                您所提供的聯絡資訊將公開顯示於相關頁面，以便彼此聯繫。請自行評估是否提供。
              </p>
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="h-96 w-full rounded-md overflow-hidden border">
               <MapContainer center={mapCenter} zoom={13} className="h-full w-full">
                  <TileLayer
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  />
                  <MapController center={mapCenter} zoom={16} />
                  <LocationPicker position={position} setPosition={setPosition} />
              </MapContainer>
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="輸入地址或地標進行搜尋定位"
                value={addressQuery}
                onChange={(e) => setAddressQuery(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleAddressSearch(); }}
              />
              <Button onClick={handleAddressSearch} disabled={isGeocoding} className="w-24 flex-shrink-0">
                {isGeocoding ? <Loader2 className="animate-spin w-4 h-4" /> : '搜尋定位'}
              </Button>
            </div>
          </div>
        </div>
        {error && <p className="text-sm text-red-600 mt-4">{error}</p>}
        <DialogFooter className="mt-6 flex flex-col items-stretch space-y-2">
          <div className="flex justify-end gap-2 w-full">
            <Button variant="outline" onClick={onClose}>取消</Button>
            <Button
              onClick={handleSubmit}
              disabled={submitting || !currentUser}
              className={!currentUser ? 'bg-gray-400 cursor-not-allowed' : ''}
            >
              {submitting ? '建立中...' : '建立網格'}
            </Button>
          </div>
          {!currentUser && (
            <div className="text-xs text-gray-500 text-center space-y-1">
              <p>請先登入以建立新救援網格。</p>
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
