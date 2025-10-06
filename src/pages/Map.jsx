import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { MapContainer, TileLayer, Rectangle, Popup, useMap, Marker, Tooltip } from "react-leaflet";
import { Grid } from "@/api/entities";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { Users, Package, AlertTriangle, MapPin, Clock, Phone, List, ChevronRight, UserPlus, PackagePlus, CalendarClock } from "lucide-react";
import GridDetailModal from "../components/map/GridDetailModal";
import AnnouncementPanel from "../components/map/AnnouncementPanel";
import MarkerClusterGroup from "../components/map/MarkerClusterGroup";
import "leaflet/dist/leaflet.css";
import { AnimatePresence } from "framer-motion";
import { formatCreatedDate } from "@/lib/utils";
import { useMapData } from "../hooks/use-map-data";

const DraggableRectangle = ({ grid, onGridClick, onGridMove }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState(null);

  if (!grid.bounds || !grid.center_lat || !grid.center_lng) {
    console.warn(`Grid ${grid.id} (${grid.code}) is missing 'bounds' or center coordinates and will not be rendered.`);
    return null;
  }

  const getGridColor = () => {
    const typeColors = {
      mud_disposal: '#8B5A2B',
      manpower: '#DC2626',
      supply_storage: '#059669',
      accommodation: '#7C3AED',
      food_area: '#EA580C'
    };

    if (grid.status === 'completed') return '#10B981';
    if (grid.status === 'closed') return '#6B7280';

    if (grid.grid_type === 'manpower') {
      if (grid.volunteer_needed === 0) return '#9CA3AF';

      const shortage = (grid.volunteer_needed - (grid.volunteer_registered || 0)) / grid.volunteer_needed;
      if (shortage >= 0.6) return '#DC2626';
      if (shortage >= 0.4) return '#EA580C';
      if (shortage > 0) return '#F59E0B';
      return '#10B981';
    }

    return typeColors[grid.grid_type] || '#6B7280';
  };

  const handleMouseDown = (e) => {
    setIsDragging(true);
    setDragStart({ x: e.latlng.lat, y: e.latlng.lng });
  };

  const handleMouseUp = (e) => {
    if (isDragging && dragStart) {
      const deltaLat = e.latlng.lat - dragStart.x;
      const deltaLng = e.latlng.lng - dragStart.y;

      const newCenter = {
        lat: grid.center_lat + deltaLat,
        lng: grid.center_lng + deltaLng
      };

      onGridMove(grid.id, newCenter);
    }
    setIsDragging(false);
    setDragStart(null);
  };

  const gridColor = getGridColor();
  const gridTypeText = {
    mud_disposal: '污',
    manpower: '人',
    supply_storage: '物',
    accommodation: '宿',
    food_area: '食'
  }[grid.grid_type] || '?';

  const gridTypeFullText = {
    mud_disposal: '污泥暫置場',
    manpower: '人力任務',
    supply_storage: '物資停放處',
    accommodation: '住宿地點',
    food_area: '領吃食區域'
  }[grid.grid_type] || '其他';

  const gridLabelIcon = typeof window !== 'undefined' && window.L ? window.L.divIcon({
    className: 'grid-label',
    html: `<div class="grid-marker" style="
      background-color: ${gridColor};
      border: 2px solid white;
      border-radius: 50%;
      width: 28px;
      height: 28px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: bold;
      font-size: 12px;
      color: white;
      box-shadow: 0 2px 6px rgba(0,0,0,0.3);
      cursor: pointer;
      transition: transform 0.2s ease, box-shadow 0.2s ease;
    ">${gridTypeText}</div>
    <style>
      .grid-marker:hover {
        transform: scale(1.3);
        box-shadow: 0 4px 12px rgba(0,0,0,0.4);
        z-index: 1000;
      }
    </style>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  }) : null;

  return (
    <>
      <Rectangle
        key={`rect-${grid.id}`}
        bounds={[
          [grid.bounds.south, grid.bounds.west],
          [grid.bounds.north, grid.bounds.east]
        ]}
        pathOptions={{
          fillColor: gridColor,
          fillOpacity: 0,
          color: gridColor,
          weight: 0,
          opacity: 0
        }}
        eventHandlers={{
          mousedown: handleMouseDown,
          mouseup: handleMouseUp,
        }}
      />

      {gridLabelIcon && (
        <Marker
          position={[grid.center_lat, grid.center_lng]}
          icon={gridLabelIcon}
          // Removed direct click handler from Marker to allow two-step interaction on mobile
        >
          {/* Tooltip - 只在電腦版 hover 時顯示 */}
          <Tooltip permanent={false} direction="top" offset={[0, -10]}>
            <div className="text-center">
              <div className="font-bold text-sm">{grid.code}</div>
              <div className="text-xs text-gray-600">{gridTypeFullText}</div>
              {grid.grid_type === 'manpower' && (
                <div className="text-xs text-blue-600 mt-1">
                  {grid.volunteer_registered}/{grid.volunteer_needed} 人
                </div>
              )}
            </div>
          </Tooltip>

          {/* Popup - 點擊時顯示，內含「查看詳情」按鈕 */}
          <Popup>
            <div className="min-w-48">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-bold text-lg">{grid.code}</h3>
                <div className="flex gap-1">
                  <Badge className="text-xs bg-blue-100 text-blue-800">
                    {gridTypeFullText}
                  </Badge>
                  <Badge className="text-xs">
                    {grid.status === 'completed' ? '已完成' :
                     grid.status === 'open' ? '開放中' :
                     grid.status === 'closed' ? '已關閉' : '準備中'}
                  </Badge>
                </div>
              </div>

              <div className="space-y-2 mb-3">
                {grid.grid_type === 'manpower' && (
                  <div className="flex items-center gap-2 text-sm">
                    <Users className="w-4 h-4 text-blue-600" />
                    <span>人力: {grid.volunteer_registered}/{grid.volunteer_needed}</span>
                  </div>
                )}

                {grid.supplies_needed?.length > 0 && (
                  <div className="flex items-center gap-2 text-sm">
                    <Package className="w-4 h-4 text-green-600" />
                    <span>物資: {grid.supplies_needed.length} 項目</span>
                  </div>
                )}
              </div>

              {/* 查看詳情按鈕 - 點擊後才打開 Modal */}
              <button
                onClick={(e) => {
                  e.stopPropagation(); // Prevent map click event propagation
                  onGridClick(grid);
                }}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2 px-4 rounded-lg transition-colors"
              >
                查看詳情與報名
              </button>
            </div>
          </Popup>
        </Marker>
      )}
    </>
  );
};

const MapFlyToController = ({ target }) => {
  const map = useMap();

  useEffect(() => {
    if (!target || !map) return;
    try {
      const [lat, lng] = target.center;
      if (isFinite(lat) && isFinite(lng) && isFinite(target.zoom)) {
        map.flyTo(target.center, target.zoom, { animate: true, duration: 1.5 });
      }
    } catch (error) {
      console.warn('Map flyTo error:', error);
    }
  }, [target, map]);

  return null;
};

const MapResizer = ({ mapCollapsed }) => {
  const map = useMap();

  useEffect(() => {
    if (!mapCollapsed && map) {
      const timer = setTimeout(() => {
        try {
          // 確保地圖容器存在且已渲染
          if (map.getContainer() && map.getContainer().offsetParent !== null) {
            map.invalidateSize();
          }
        } catch (error) {
          console.warn('Map resize error:', error);
        }
      }, 350);
      return () => clearTimeout(timer);
    }
  }, [mapCollapsed, map]);

  return null;
};

const MapBoundsFitter = ({ grids, initialLoad, onDone }) => {
  const map = useMap();
  const didFitRef = useRef(false);

  useEffect(() => {
    // 只在初次載入且沒有儲存的地圖位置時才自動調整範圍
    if (map && grids && grids.length > 0 && initialLoad && !didFitRef.current) {
      try {
        const validGrids = grids.filter(g => isFinite(g.center_lat) && isFinite(g.center_lng));
        if (validGrids.length > 0) {
          const bounds = validGrids.map(g => [g.center_lat, g.center_lng]);
          map.fitBounds(bounds, { padding: [50, 50] });
          didFitRef.current = true;
          onDone && onDone();
        }
      } catch (error) {
        console.warn('Map fitBounds error:', error);
      }
    }
  }, [grids, map, initialLoad]);

  return null;
};

const MapPositionTracker = ({ setMapPosition }) => {
  const map = useMap();
  const lastRef = useRef({ lat: undefined, lng: undefined, zoom: undefined });

  useEffect(() => {
    if (!map) return;
    const EPS = 1e-7;
    const updatePosition = () => {
      try {
        const center = map.getCenter();
        const zoom = map.getZoom();
        const lat = center.lat;
        const lng = center.lng;
        const prev = lastRef.current;
        const sameLat = typeof prev.lat === 'number' && Math.abs(prev.lat - lat) < EPS;
        const sameLng = typeof prev.lng === 'number' && Math.abs(prev.lng - lng) < EPS;
        const sameZoom = prev.zoom === zoom;
        if (sameLat && sameLng && sameZoom) return;
        lastRef.current = { lat, lng, zoom };
        setMapPosition((p) => {
          if (p && Math.abs(p.center[0] - lat) < EPS && Math.abs(p.center[1] - lng) < EPS && p.zoom === zoom) {
            return p; // avoid unnecessary updates
          }
          return { center: [lat, lng], zoom };
        });
      } catch (e) {
        // ignore
      }
    };

    map.on('moveend', updatePosition);
    map.on('zoomend', updatePosition);
    return () => {
      map.off('moveend', updatePosition);
      map.off('zoomend', updatePosition);
    };
  }, [map, setMapPosition]);

  return null;
};

export default function MapPage() {
  const { disasterAreas, grids, stats, urgentGridsList, isLoading, mutate: reloadData } = useMapData();
  const [selectedGrid, setSelectedGrid] = useState(null);
  const [gridDetailTab, setGridDetailTab] = useState('info');
  const initialQueryApplied = useRef(false); // 防止初始載入時 URL 同步提早移除 grid 參數
  const [selectedGridType, setSelectedGridType] = useState('all');
  const [mapFlyToTarget, setMapFlyToTarget] = useState(null);
  const [legendCollapsed, setLegendCollapsed] = useState(false);
  const [mapCollapsed, setMapCollapsed] = useState(false);
  const [mapKey, setMapKey] = useState(0); // 新增：用於強制重新渲染地圖
  const [mapPosition, setMapPosition] = useState({
    center: [23.6351, 121.4228],
    zoom: 11
  }); // 新增：儲存地圖位置狀態
  const [isInitialLoad, setIsInitialLoad] = useState(true); // 追蹤是否為初次載入

  useEffect(() => {
    const checkMapCollapseRequest = () => {
      const shouldCollapse = localStorage.getItem('collapseMapForModal');
      if (shouldCollapse === 'true') {
        setMapCollapsed(true);
        localStorage.removeItem('collapseMapForModal');
      }
    };

    const handleCollapseMapEvent = () => {
      setMapCollapsed(true);
      localStorage.removeItem('collapseMapForModal');
    };

    // 初次檢查
    checkMapCollapseRequest();

    // 只監聽自定義事件，不使用 setInterval
    window.addEventListener('collapseMap', handleCollapseMapEvent);

    return () => {
      window.removeEventListener('collapseMap', handleCollapseMapEvent);
    };
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.L) {
      delete window.L.Icon.Default.prototype._getIconUrl;
      window.L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
      });
    }
  }, []);

  // Parse initial URL params once (before data load) for filters
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const type = params.get('type');
    const tab = params.get('tab');
    if (type && ['all','manpower','mud_disposal','supply_storage','accommodation','food_area'].includes(type)) {
      setSelectedGridType(type);
    }
    if (tab && ['info','volunteer','supply','discussion'].includes(tab)) {
      setGridDetailTab(tab);
    }
  }, []);

  // After grids load, if URL has grid param, open it
  useEffect(() => {
    if (!grids.length || initialQueryApplied.current) return;
    const params = new URLSearchParams(window.location.search);
    const gridParam = params.get('grid');
    if (gridParam) {
      const found = grids.find(g => g.id === gridParam || g.code === gridParam);
      if (found) {
        setSelectedGrid(found);
        // 不改變地圖狀態，保持原本的展開/關閉狀態
      }
    }
    // 標記初始查詢已處理（不論是否找到 grid）
    initialQueryApplied.current = true;
  }, [grids]);

  // Sync current state to URL
  const syncUrl = useCallback((next) => {
    const params = new URLSearchParams();
    const { type, gridId, tab } = next;
    if (type && type !== 'all') params.set('type', type);
    if (gridId) params.set('grid', gridId);
    if (tab && tab !== 'info') params.set('tab', tab);
    const qs = params.toString();
    const newUrl = `${window.location.pathname}${qs ? '?' + qs : ''}`;
    window.history.replaceState(null, '', newUrl);
  }, []);

  // Effects to update URL when local state changes
  useEffect(() => {
    // 初始 query 尚未處理完成時避免覆寫 URL（會把 ?grid= 提前清掉）
    if (!initialQueryApplied.current) return;
    syncUrl({
      type: selectedGridType,
      gridId: selectedGrid?.id || null,
      tab: selectedGrid ? gridDetailTab : null
    });
  }, [selectedGridType, selectedGrid, gridDetailTab, syncUrl]);

  // Handle browser navigation (back/forward)
  useEffect(() => {
    const onPop = () => {
      const params = new URLSearchParams(window.location.search);
      const type = params.get('type') || 'all';
      const tab = params.get('tab') || 'info';
      const gridParam = params.get('grid');
      if (['all','manpower','mud_disposal','supply_storage','accommodation','food_area'].includes(type)) {
        setSelectedGridType(type);
      } else {
        setSelectedGridType('all');
      }
      if (['info','volunteer','supply','discussion'].includes(tab)) {
        setGridDetailTab(tab);
      } else {
        setGridDetailTab('info');
      }
      if (gridParam) {
        const found = grids.find(g => g.id === gridParam || g.code === gridParam);
        if (found) {
          setSelectedGrid(found);
          // 不改變地圖狀態，保持原本的展開/關閉狀態
          return;
        }
      }
      // If no grid param or not found -> close
      setSelectedGrid(null);
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [grids]);

  const getUrgencyScore = (grid) => {
    if (grid.grid_type !== 'manpower' || grid.status !== 'open') return -1;
    return new Date(grid.created_date).getTime() || 0;
  };

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

  const getGridTypeStats = () => {
    const typeStats = {};
    const allGridTypes = ['mud_disposal', 'manpower', 'supply_storage', 'accommodation', 'food_area'];
    allGridTypes.forEach(type => {
      typeStats[type] = grids.filter(g => g.grid_type === type).length;
    });
    return typeStats;
  };

  const filteredGrids = selectedGridType === 'all'
    ? grids
    : grids.filter(g => g.grid_type === selectedGridType);

  const sortedAndFilteredGrids = [...filteredGrids].sort((a, b) => getUrgencyScore(b) - getUrgencyScore(a));

  const handleGridClick = (grid) => {
    setSelectedGrid(grid);
    setGridDetailTab('info');
    // 不改變地圖狀態，保持原本的展開/關閉狀態
  };

  const handleModalClose = () => {
    setSelectedGrid(null);
    setGridDetailTab('info');
    // 不改變地圖狀態，保持原本的展開/關閉狀態
  };

  const handleFlyToArea = (area) => {
    setMapFlyToTarget({ center: [area.center_lat, area.center_lng], zoom: 14 });
  };

  const handleFlyToGrid = (grid) => {
    setMapFlyToTarget({ center: [grid.center_lat, grid.center_lng], zoom: 16 });
  };

  const handleGridMove = async (gridId, newCenter) => {
    try {
      const grid = grids.find(g => g.id === gridId);
      if (!grid) return;

      const size = 0.001; // Assuming a fixed size for simplification, adjust if necessary
      await Grid.update(gridId, {
        center_lat: newCenter.lat,
        center_lng: newCenter.lng,
        bounds: {
          north: newCenter.lat + size,
          south: newCenter.lat - size,
          east: newCenter.lng + size,
          west: newCenter.lng - size
        }
      });

      // 使用 SWR 的 optimistic update 功能
      reloadData(
        data => {
          const updatedGrids = data.grids.map(g =>
            g.id === gridId
              ? {
                  ...g,
                  center_lat: newCenter.lat,
                  center_lng: newCenter.lng,
                  bounds: {
                    north: newCenter.lat + size,
                    south: newCenter.lat - size,
                    east: newCenter.lng + size,
                    west: newCenter.lng - size
                  }
                }
              : g
          );
          return {
            ...data,
            grids: updatedGrids
          };
        },
        { revalidate: false } // 樂觀更新
      );
    } catch (error) {
      console.error('Failed to update grid position:', error);
    }
  };

  const handleManualMapToggle = () => {
    const isCurrentlyCollapsed = mapCollapsed;
    setMapCollapsed(!isCurrentlyCollapsed);
    
    // 展開地圖時，使用輕微的延遲來確保地圖正確渲染，但不重設位置
    if (isCurrentlyCollapsed) {
      setTimeout(() => {
        // 觸發地圖重新計算尺寸，但保持當前位置
        window.dispatchEvent(new Event('resize'));
      }, 100);
    }
  };

  const getShortageRate = (grid) => {
    if (grid.volunteer_needed === 0) return 0;
    return ((grid.volunteer_needed - (grid.volunteer_registered || 0)) / grid.volunteer_needed) * 100;
  };

  const getSupplyShortage = (supplies) => {
    return Array.isArray(supplies) ? supplies.filter(s => s.received < s.quantity) : [];
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  };

  const typeStats = getGridTypeStats();

  return (
    <div className="flex flex-col min-w-xxs">
      <div className="bg-white border-b border-gray-200 px-4 py-4 min-w-xxs">
        <div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <Popover>
              <PopoverTrigger asChild>
                <Card className="border-l-4 border-l-blue-500 cursor-pointer hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-100 rounded-lg flex-shrink-0">
                        <MapPin className="w-5 h-5 text-blue-600" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-2xl font-bold text-gray-900">{disasterAreas.length}</p>
                        <p className="text-sm text-gray-600 whitespace-nowrap">救援區域</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </PopoverTrigger>
              <PopoverContent className="w-80">
                <div className="space-y-2">
                  <h4 className="font-medium text-sm leading-none">所有災區</h4>
                  <div className="divide-y divide-gray-100">
                    {disasterAreas.map(area => (
                      <div
                        key={area.id}
                        onClick={() => handleFlyToArea(area)}
                        className="flex items-center justify-between p-2 rounded-md hover:bg-gray-50 cursor-pointer"
                      >
                        <span className="text-sm font-medium">{area.name}</span>
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                      </div>
                    ))}
                  </div>
                </div>
              </PopoverContent>
            </Popover>

            <Card className="border-l-4 border-l-green-500">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded-lg flex-shrink-0">
                    <Users className="w-5 h-5 text-green-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-2xl font-bold text-gray-900">{stats.totalVolunteers}</p>
                    <p className="text-sm text-gray-600 whitespace-nowrap">志工總數</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-amber-500">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-100 rounded-lg flex-shrink-0">
                    <Clock className="w-5 h-5 text-amber-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-2xl font-bold text-gray-900">{stats.completedGrids}</p>
                    <p className="text-sm text-gray-600 whitespace-nowrap">已完成</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Popover>
              <PopoverTrigger asChild>
                <Card className="border-l-4 border-l-red-500 cursor-pointer hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-red-100 rounded-lg flex-shrink-0">
                        <AlertTriangle className="w-5 h-5 text-red-600" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-2xl font-bold text-gray-900">{stats.urgentGrids}</p>
                        <p className="text-sm text-gray-600 whitespace-nowrap">急需支援</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </PopoverTrigger>
              <PopoverContent className="w-80">
                <div className="space-y-2">
                  <h4 className="font-medium text-sm leading-none">急需支援區域</h4>
                  {urgentGridsList.length > 0 ? (
                    <div className="divide-y divide-gray-100">
                      {urgentGridsList.map(grid => (
                        <div
                          key={grid.id}
                          onClick={() => handleFlyToGrid(grid)}
                          className="flex items-center justify-between p-2 rounded-md hover:bg-gray-50 cursor-pointer"
                        >
                          <span className="text-sm font-medium">{grid.code}</span>
                          <span className="text-xs text-red-600">
                            缺 {grid.volunteer_needed - (grid.volunteer_registered || 0)} 人
                          </span>
                          <ChevronRight className="w-4 h-4 text-gray-400" />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 pt-2">目前沒有急需支援的區域。</p>
                  )}
                </div>
              </PopoverContent>
            </Popover>
          </div>

          <div className="flex flex-wrap gap-2 justify-center">
            <Button
              size="sm"
              variant={selectedGridType === 'all' ? 'default' : 'outline'}
              onClick={() => setSelectedGridType('all')}
            >
              全部 ({grids.length})
            </Button>
            <Button
              size="sm"
              variant={selectedGridType === 'manpower' ? 'default' : 'outline'}
              onClick={() => setSelectedGridType('manpower')}
              className={selectedGridType === 'manpower' ? 'bg-red-600 hover:bg-red-700 text-white' : ''}
            >
              人力任務 ({typeStats.manpower || 0})
            </Button>
            <Button
              size="sm"
              variant={selectedGridType === 'mud_disposal' ? 'default' : 'outline'}
              onClick={() => setSelectedGridType('mud_disposal')}
              className={selectedGridType === 'mud_disposal' ? 'bg-amber-700 hover:bg-amber-800 text-white' : ''}
            >
              污泥暫置場 ({typeStats.mud_disposal || 0})
            </Button>
            <Button
              size="sm"
              variant={selectedGridType === 'supply_storage' ? 'default' : 'outline'}
              onClick={() => setSelectedGridType('supply_storage')}
              className={selectedGridType === 'supply_storage' ? 'bg-green-600 hover:bg-green-700 text-white' : ''}
            >
              物資停放處 ({typeStats.supply_storage || 0})
            </Button>
            <Button
              size="sm"
              variant={selectedGridType === 'accommodation' ? 'default' : 'outline'}
              onClick={() => setSelectedGridType('accommodation')}
              className={selectedGridType === 'accommodation' ? 'bg-purple-600 hover:bg-purple-700 text-white' : ''}
            >
              住宿地點 ({typeStats.accommodation || 0})
            </Button>
            <Button
              size="sm"
              variant={selectedGridType === 'food_area' ? 'default' : 'outline'}
              onClick={() => setSelectedGridType('food_area')}
              className={selectedGridType === 'food_area' ? 'bg-orange-600 hover:bg-orange-700 text-white' : ''}
            >
              領吃食區域 ({typeStats.food_area || 0})
            </Button>
          </div>
        </div>
      </div>

      <div className="bg-gray-50 border-b border-gray-200 px-4 py-4 min-w-xxs">
        <AnnouncementPanel />
      </div>

      <div className="flex flex-col lg:flex-row" style={{ minHeight: 'calc(100vh - 180px)' }}>
        <div className={`relative transition-all duration-300 ${
          mapCollapsed ? 'hidden lg:w-0 lg:overflow-hidden' : 'h-64 lg:h-auto lg:flex-[2]'
        }`}>
          {!mapCollapsed && (
            <MapContainer
              key={mapKey}
              center={mapPosition.center}
              zoom={mapPosition.zoom}
              className="h-full w-full"
              zoomControl={true}
            >
              <TileLayer
                attribution='&copy; <a href="https://maps.nlsc.gov.tw/">國土測繪中心</a>'
                url="https://wmts.nlsc.gov.tw/wmts/EMAP/default/GoogleMapsCompatible/{z}/{y}/{x}"
                updateWhenZooming={false}
                keepBuffer={2}
              />
              <MapFlyToController target={mapFlyToTarget} />
              <MapResizer mapCollapsed={mapCollapsed} />
              <MapBoundsFitter grids={filteredGrids} initialLoad={isInitialLoad} onDone={() => setIsInitialLoad(false)} />
              <MapPositionTracker setMapPosition={setMapPosition} />

              <MarkerClusterGroup>
                {filteredGrids.map((grid) => (
                  <DraggableRectangle
                    key={grid.id}
                    grid={grid}
                    onGridClick={handleGridClick}
                    onGridMove={handleGridMove}
                  />
                ))}
              </MarkerClusterGroup>
            </MapContainer>
          )}

          <button
            onClick={handleManualMapToggle}
            style={{ zIndex: 10 }}
            className="absolute top-4 right-4 bg-white rounded-full p-2 shadow-lg hover:shadow-xl transition-all duration-200 border border-gray-200 hidden lg:block"
            title={mapCollapsed ? "顯示地圖" : "隱藏地圖"}
          >
            {mapCollapsed ? (
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12H3m0 0l4-4m-4 4l4 4m6-4h8m0 0l-4-4m4 4l-4 4" />
              </svg>
            ) : (
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
          </button>

          {!mapCollapsed && (
            <div
              style={{ zIndex: 10 }}
              className={`absolute bottom-4 left-4 bg-white rounded-lg shadow-lg transition-all duration-300 hidden lg:block ${
                legendCollapsed ? 'p-2' : 'p-4'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                {!legendCollapsed && (
                  <h4 className="font-semibold text-sm">網格分類</h4>
                )}
                <button
                  onClick={() => setLegendCollapsed(!legendCollapsed)}
                  className="p-1 hover:bg-gray-100 rounded transition-colors"
                  title={legendCollapsed ? "展開圖例" : "收起圖例"}
                >
                  {legendCollapsed ? (
                    <div className="w-4 h-4 bg-gradient-to-r from-red-500 via-green-500 via-purple-500 to-orange-500 rounded"></div>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  )}
                </button>
              </div>

              {!legendCollapsed && (
                <div className="space-y-2 text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-red-600 rounded"></div>
                    <span>人力任務</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4" style={{backgroundColor: '#8B5A2B'}}></div>
                    <span>污泥暫置場</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-green-600 rounded"></div>
                    <span>物資停放處</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-purple-600 rounded"></div>
                    <span>住宿地點</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-orange-600 rounded"></div>
                    <span>領吃食區域</span>
                  </div>
                  <Separator className="my-2" />
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-green-500 rounded"></div>
                    <span>已滿額/已完成</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-gray-500 rounded"></div>
                    <span>已關閉</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {mapCollapsed && (
            <div className="absolute inset-0 bg-gray-100 items-center justify-center hidden lg:flex">
              <div className="text-center p-4">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                  <MapPin className="w-6 h-6 text-blue-600" />
                </div>
                <p className="text-sm text-gray-600 mb-3">地圖已隱藏</p>
                <button
                  onClick={handleManualMapToggle}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors"
                >
                  顯示地圖
                </button>
              </div>
            </div>
          )}
        </div>

        <div className={`bg-white border-l-0 lg:border-l border-gray-200 transition-all duration-300 flex-1 lg:flex-[1]`}>
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-lg font-bold text-gray-900">救援任務列表</h2>
            <p className="text-sm text-gray-600">點擊任務可查看詳情並報名</p>
            <p className="text-xs text-gray-500 mt-1">
              目前顯示: {selectedGridType === 'all' ? '全部網格' : getGridTypeText(selectedGridType)}
              ({sortedAndFilteredGrids.length} 個)
            </p>

            <div className={`mt-3 ${!mapCollapsed ? 'lg:hidden' : ''}`}>
              <Button
                onClick={handleManualMapToggle}
                variant="outline"
                size="sm"
                className="w-full"
              >
                <MapPin className="w-4 h-4 mr-2" />
                {mapCollapsed ? "顯示地圖" : "隱藏地圖"}
              </Button>
            </div>
          </div>

          <div className="h-[calc(100vh-280px)] overflow-y-auto">
            <div className="p-4 space-y-4">
              <AnimatePresence>
                {sortedAndFilteredGrids.map((grid) => {
                  const shortageRate = grid.grid_type === 'manpower' ? getShortageRate(grid) : 0;
                  const supplyShortage = getSupplyShortage(grid.supplies_needed);

                  return (
                    <Card
                      key={grid.id}
                      className={`cursor-pointer hover:shadow-md transition-all duration-200 border-l-4 ${
                        grid.status === 'completed' ? 'border-l-green-500' :
                        grid.status === 'closed' ? 'border-l-gray-500' :
                        grid.grid_type === 'mud_disposal' ? 'border-l-[#8B5A2B]' :
                        grid.grid_type === 'manpower' ? (
                          shortageRate >= 60 ? 'border-l-red-500' :
                          shortageRate >= 40 ? 'border-l-orange-500' :
                          shortageRate > 0 ? 'border-l-amber-500' :
                          'border-l-green-500'
                        ) :
                        grid.grid_type === 'supply_storage' ? 'border-l-green-600' :
                        grid.grid_type === 'accommodation' ? 'border-l-purple-600' :
                        grid.grid_type === 'food_area' ? 'border-l-orange-600' :
                        'border-l-gray-500'
                      }`}
                      onClick={() => handleGridClick(grid)}
                    >
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="font-bold text-lg">{grid.code}</h3>
                          <div className="flex gap-1">
                            <Badge className="bg-blue-100 text-blue-800 text-xs">
                              {getGridTypeText(grid.grid_type)}
                            </Badge>
                            <Badge className={
                              grid.status === 'completed' ? 'bg-green-100 text-green-800' :
                              grid.status === 'open' ? 'bg-blue-100 text-blue-800' :
                              grid.status === 'closed' ? 'bg-gray-100 text-gray-800' :
                              'bg-yellow-100 text-yellow-800'
                            }>
                              {grid.status === 'completed' ? '已完成' :
                               grid.status === 'open' ? '開放中' :
                               grid.status === 'closed' ? '已關閉' :
                               grid.status === 'in_progress' ? '進行中' : '準備中'}
                            </Badge>
                          </div>
                        </div>

                        <div className="flex flex-row gap-2 items-center my-2">
                          <CalendarClock className="w-4 h-4 text-teal-700" />
                          <span className="text-sm font-medium">  
                            {formatCreatedDate(
                                grid.created_date
                            )}
                          </span>
                        </div>

                        {grid.grid_type === 'manpower' && (
                          <div className="space-y-2 mb-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Users className="w-4 h-4 text-blue-600" />
                                <span className="text-sm font-medium">志工需求</span>
                              </div>
                              <span className={`text-sm font-bold ${
                                shortageRate >= 60 ? 'text-red-600' :
                                shortageRate >= 40 ? 'text-orange-600' :
                                shortageRate > 0 ? 'text-amber-600' :
                                'text-green-600'
                              }`}>
                                {grid.volunteer_registered}/{grid.volunteer_needed}
                              </span>
                            </div>

                            {shortageRate > 0 && (
                              <div className="bg-red-50 p-2 rounded text-xs text-red-700">
                                還缺 {grid.volunteer_needed - (grid.volunteer_registered || 0)} 位志工
                              </div>
                            )}
                          </div>
                        )}

                        {supplyShortage.length > 0 && (
                          <div className="space-y-2 mb-3">
                            <div className="flex items-center gap-2">
                              <Package className="w-4 h-4 text-green-600" />
                              <span className="text-sm font-medium">物資需求</span>
                            </div>
                            <div className="space-y-1">
                              {supplyShortage.slice(0, 2).map((supply, idx) => (
                                <div key={idx} className="flex justify-between text-xs">
                                  <span>{supply.name}</span>
                                  <span className="text-orange-600">
                                    {supply.received}/{supply.quantity} {supply.unit}
                                  </span>
                                </div>
                              ))}
                              {supplyShortage.length > 2 && (
                                <div className="text-xs text-gray-500">
                                  還有 {supplyShortage.length - 2} 項物資需求...
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {grid.meeting_point && (
                          <div className="flex items-start gap-2 text-xs text-gray-600">
                            <MapPin className="w-3 h-3 mt-0.5 flex-shrink-0" />
                            <span>集合: {grid.meeting_point}</span>
                          </div>
                        )}

                        <div className="flex gap-2 mt-3">
                          {grid.grid_type === 'manpower' && !['completed', 'closed'].includes(grid.status) && (grid.volunteer_registered || 0) < grid.volunteer_needed && (
                            <Button
                              size="sm"
                              className="flex-1 bg-blue-600 hover:bg-blue-700"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedGrid(grid);
                                // 不改變地圖狀態，保持原本的展開/關閉狀態
                              }}
                            >
                              <UserPlus className="w-3 h-3 mr-1" />
                              報名
                            </Button>
                          )}
                          {grid.grid_type === 'supply_storage' && grid.status === 'open' && supplyShortage.length > 0 && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="flex-1"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedGrid(grid);
                                // 不改變地圖狀態，保持原本的展開/關閉狀態
                              }}
                            >
                              <PackagePlus className="w-3 h-3 mr-1" />
                              捐贈
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </AnimatePresence>

              {sortedAndFilteredGrids.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                  <AlertTriangle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>目前沒有 {getGridTypeText(selectedGridType)} 類型的網格。</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {selectedGrid && (
        <GridDetailModal
          grid={selectedGrid}
          onClose={handleModalClose}
          onUpdate={reloadData}
          defaultTab={gridDetailTab}
          onTabChange={setGridDetailTab}
        />
      )}
    </div>
  );
}
