
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
import { Textarea } from '@/components/ui/textarea';
import { DisasterArea } from '@/api/entities';
import "leaflet/dist/leaflet.css";
import { Loader2 } from 'lucide-react';

// Re-initialize Leaflet icons
if (typeof window !== 'undefined' && window.L) {
  delete window.L.Icon.Default.prototype._getIconUrl;
  window.L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  });
}

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
              <Popup>災區中心點 - 拖動以微調位置</Popup>
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

export default function AddAreaModal({ isOpen, onClose, onSuccess }) {
  const initialMapCenter = { lat: 23.8751, lng: 121.5780 };
  const [formData, setFormData] = useState({
    name: '',
    township: '',
    county: '花蓮縣',
    description: '',
  });
  const [position, setPosition] = useState(initialMapCenter);
  const [mapCenter, setMapCenter] = useState([initialMapCenter.lat, initialMapCenter.lng]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [addressQuery, setAddressQuery] = useState('');
  const [isGeocoding, setIsGeocoding] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleAddressSearch = async () => {
    if (!addressQuery.trim()) {
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
        setMapCenter([newPosition.lat, newPosition.lng]); // Update map center to trigger MapController
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
    if (!formData.name || !formData.township || !position) {
      setError('請填寫災區名稱、鄉鎮，並在地圖上選擇位置。');
      return;
    }
    setError('');
    setSubmitting(true);

    try {
      // The current implementation directly calls DisasterArea.create without any explicit frontend login check.
      // To "remove login restrictions", ensure that the DisasterArea.create method itself (likely a backend call)
      // does not require authentication or that the backend endpoint is public.
      // No changes are needed in this frontend component for this specific requirement,
      // as it does not impose a login restriction on its own.
      await DisasterArea.create({
        ...formData,
        center_lat: position.lat,
        center_lng: position.lng,
        bounds: {
          north: position.lat + 0.01,
          south: position.lat - 0.01,
          east: position.lng + 0.01,
          west: position.lng - 0.01,
        },
        grid_size: 200,
        status: 'active'
      });
      onSuccess();
    } catch (err) {
      console.error('Failed to create area:', err);
      setError('建立災區失敗，請稍後再試。');
    } finally {
      setSubmitting(false);
    }
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>新增災區</DialogTitle>
          <DialogDescription>
            填寫災區資訊並在地圖上標註中心位置。點擊地圖或搜尋地址即可設定災區中心點。
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">
                災區名稱 <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="例如：光復鄉重災區"
                required
              />
            </div>
            <div>
              <Label htmlFor="township">
                鄉鎮 <span className="text-red-500">*</span>
              </Label>
              <Input
                id="township"
                name="township"
                value={formData.township}
                onChange={handleInputChange}
                placeholder="例如：光復鄉"
                required
              />
            </div>
            <div>
              <Label htmlFor="county">縣市</Label>
              <Input
                id="county"
                name="county"
                value={formData.county}
                onChange={handleInputChange}
                placeholder="花蓮縣"
              />
            </div>
            <div>
              <Label htmlFor="description">災區描述</Label>
              <Textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="描述災區的狀況、特殊注意事項等..."
                rows={4}
              />
            </div>
            {position && (
              <div className="p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-800">
                  選擇位置：{position.lat.toFixed(4)}, {position.lng.toFixed(4)}
                </p>
              </div>
            )}
          </div>
          <div className="flex flex-col">
            <div className="h-96 w-full rounded-md overflow-hidden border">
               <MapContainer center={mapCenter} zoom={11} className="h-full w-full">
                  <TileLayer
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  />
                  <LocationPicker position={position} setPosition={setPosition} />
                  <MapController center={mapCenter} zoom={14} /> {/* Control map view */}
              </MapContainer>
            </div>
            <div className="mt-4 flex gap-2">
              <Input
                placeholder="輸入鄉鎮或地標進行搜尋定位"
                value={addressQuery}
                onChange={(e) => setAddressQuery(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleAddressSearch(); }}
              />
              <Button onClick={handleAddressSearch} disabled={isGeocoding} className="w-24">
                {isGeocoding ? <Loader2 className="animate-spin w-4 h-4" /> : '搜尋定位'}
              </Button>
            </div>
          </div>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>取消</Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? '建立中...' : '建立災區'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
