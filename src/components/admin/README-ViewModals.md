# 物資查看模態框組件使用說明

本文件說明如何使用 `SupplyRequestViewModal` 和 `SupplyDonationViewModal` 兩個查看模態框組件。

---

## 1. SupplyRequestViewModal（物資需求查看模態框）

### 功能描述
顯示單個網格的物資需求詳細資訊（唯讀模式），包含：
- 網格基本資訊（地點、聯絡方式、工作時間等）
- 志工需求列表（如果是人力任務網格）
- 物資需求清單（含進度條、急需/已完成標示）
- 物資捐贈紀錄

### 使用方式

```jsx
import SupplyRequestViewModal from '@/components/admin/SupplyRequestViewModal';

function MyComponent() {
  const [viewGrid, setViewGrid] = useState(null);

  return (
    <>
      {/* 觸發按鈕 */}
      <button onClick={() => setViewGrid(selectedGrid)}>
        查看物資需求
      </button>

      {/* 顯示模態框 */}
      {viewGrid && (
        <SupplyRequestViewModal
          grid={viewGrid}
          onClose={() => setViewGrid(null)}
        />
      )}
    </>
  );
}
```

### Props

| 參數 | 類型 | 必填 | 說明 |
|------|------|------|------|
| `grid` | `Object` | 是 | 網格物件（包含 supplies_needed） |
| `onClose` | `Function` | 是 | 關閉回調函數 |

### Grid 物件結構

```javascript
{
  id: 1,
  code: "A-001",
  status: "open",
  grid_type: "manpower",
  meeting_point: "台南市永康區中華路123號",
  contact_info: "0912-345-678",
  work_time: "09:00-17:00",
  notes: "需要鏟子和水桶",
  volunteer_needed: 10,
  volunteer_registered: 5,
  supplies_needed: [
    {
      name: "鏟子",
      quantity: 20,
      received: 10,
      unit: "把"
    },
    {
      name: "水桶",
      quantity: 30,
      received: 5,
      unit: "個"
    }
  ],
  created_at: "2025-10-01T10:00:00Z"
}
```

### 權限控制

組件會根據以下權限自動顯示/隱藏敏感資訊：

- `view_grid_contact` - 網格聯絡方式
- `view_volunteer_contact` - 志工聯絡資訊（電話、Email）
- `view_donor_contact` - 捐贈者聯絡資訊

無權限時顯示：`(需要相關權限查看)`

### 功能特色

1. **物資需求進度視覺化**
   - 進度條顯示已收到/需要的比例
   - 已收到 < 50%：標示「急需」（紅色）
   - 已收到 >= 100%：標示「已完成」（綠色）

2. **志工列表**（僅 manpower 類型網格）
   - 顯示志工姓名、狀態、可用時間
   - 根據權限顯示聯絡方式

3. **捐贈紀錄**
   - 列出所有針對此網格的捐贈
   - 顯示物資名稱、數量、捐贈者、狀態

---

## 2. SupplyDonationViewModal（物資捐贈查看模態框）

### 功能描述
顯示單筆物資捐贈的詳細資訊（唯讀模式），包含：
- 捐贈基本資訊（物資、數量、狀態、配送方式）
- 捐贈者資訊（姓名、聯絡方式）
- 目標網格資訊
- 物資需求進度分析

### 使用方式

```jsx
import SupplyDonationViewModal from '@/components/admin/SupplyDonationViewModal';
import { Grid } from '@/api/entities';

function MyComponent() {
  const [viewDonation, setViewDonation] = useState(null);
  const [donationGrid, setDonationGrid] = useState(null);

  const handleViewDonation = async (donation) => {
    // 載入關聯的網格資料
    const grid = await Grid.get(donation.grid_id);
    setDonationGrid(grid);
    setViewDonation(donation);
  };

  return (
    <>
      {/* 觸發按鈕 */}
      <button onClick={() => handleViewDonation(selectedDonation)}>
        查看捐贈詳情
      </button>

      {/* 顯示模態框 */}
      {viewDonation && donationGrid && (
        <SupplyDonationViewModal
          donation={viewDonation}
          grid={donationGrid}
          onClose={() => {
            setViewDonation(null);
            setDonationGrid(null);
          }}
        />
      )}
    </>
  );
}
```

### Props

| 參數 | 類型 | 必填 | 說明 |
|------|------|------|------|
| `donation` | `Object` | 是 | 捐贈物件 |
| `grid` | `Object` | 是 | 關聯的網格物件 |
| `onClose` | `Function` | 是 | 關閉回調函數 |

### Donation 物件結構

```javascript
{
  id: 1,
  supply_name: "鏟子",
  quantity: 5,
  unit: "把",
  status: "confirmed",
  delivery_method: "self_delivery",
  donor_name: "王小明",
  donor_phone: "0912-345-678",
  donor_email: "wang@example.com",
  delivery_address: "台南市永康區中華路123號",
  estimated_delivery_time: "2025-10-06T14:00:00Z",
  actual_delivery_time: null,
  notes: "下午兩點送達",
  grid_id: 1,
  created_at: "2025-10-05T10:00:00Z"
}
```

### 權限控制

組件會根據以下權限自動顯示/隱藏敏感資訊：

- `view_donor_contact` - 捐贈者聯絡資訊（電話、Email）
- `view_grid_contact` - 網格聯絡方式

### 功能特色

1. **物資需求進度分析**
   - 自動計算此捐贈在總需求中的佔比
   - 顯示總需求量、已收到數量、此筆捐贈數量
   - 視覺化進度條（總體進度 + 此筆佔比）
   - 自動標示「急需」或「需求已滿足」

2. **配送狀態追蹤**
   - 顯示預計送達時間
   - 顯示實際送達時間（如有）
   - 配送方式標示

3. **網格資訊**
   - 顯示目標網格代碼、狀態、類型
   - 救災地點
   - 網格聯絡方式（根據權限）

---

## 整合範例：在後台管理頁面使用

```jsx
import React, { useState, useEffect } from 'react';
import { Grid, SupplyDonation } from '@/api/entities';
import SupplyRequestViewModal from '@/components/admin/SupplyRequestViewModal';
import SupplyDonationViewModal from '@/components/admin/SupplyDonationViewModal';
import { Eye } from 'lucide-react';

function AdminSupplyManagement() {
  const [grids, setGrids] = useState([]);
  const [donations, setDonations] = useState([]);

  // 查看模態框狀態
  const [viewGrid, setViewGrid] = useState(null);
  const [viewDonation, setViewDonation] = useState(null);
  const [donationGrid, setDonationGrid] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [gridsData, donationsData] = await Promise.all([
      Grid.list(),
      SupplyDonation.list()
    ]);
    setGrids(gridsData);
    setDonations(donationsData);
  };

  const handleViewGrid = (grid) => {
    setViewGrid(grid);
  };

  const handleViewDonation = async (donation) => {
    const grid = await Grid.get(donation.grid_id);
    setDonationGrid(grid);
    setViewDonation(donation);
  };

  return (
    <div className="space-y-6">
      {/* 網格列表 */}
      <div>
        <h2 className="text-xl font-bold mb-4">網格管理</h2>
        <table className="w-full">
          <thead>
            <tr>
              <th>網格代碼</th>
              <th>狀態</th>
              <th>物資需求</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {grids.map(grid => (
              <tr key={grid.id}>
                <td>{grid.code}</td>
                <td>{grid.status}</td>
                <td>{grid.supplies_needed?.length || 0} 項</td>
                <td>
                  <button
                    onClick={() => handleViewGrid(grid)}
                    className="flex items-center gap-1"
                  >
                    <Eye className="w-4 h-4" />
                    查看需求
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 捐贈列表 */}
      <div>
        <h2 className="text-xl font-bold mb-4">捐贈管理</h2>
        <table className="w-full">
          <thead>
            <tr>
              <th>物資名稱</th>
              <th>數量</th>
              <th>捐贈者</th>
              <th>狀態</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {donations.map(donation => (
              <tr key={donation.id}>
                <td>{donation.supply_name}</td>
                <td>{donation.quantity} {donation.unit}</td>
                <td>{donation.donor_name || '匿名'}</td>
                <td>{donation.status}</td>
                <td>
                  <button
                    onClick={() => handleViewDonation(donation)}
                    className="flex items-center gap-1"
                  >
                    <Eye className="w-4 h-4" />
                    查看詳情
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 查看模態框 */}
      {viewGrid && (
        <SupplyRequestViewModal
          grid={viewGrid}
          onClose={() => setViewGrid(null)}
        />
      )}

      {viewDonation && donationGrid && (
        <SupplyDonationViewModal
          donation={viewDonation}
          grid={donationGrid}
          onClose={() => {
            setViewDonation(null);
            setDonationGrid(null);
          }}
        />
      )}
    </div>
  );
}

export default AdminSupplyManagement;
```

---

## 設計特色

### 1. 一致的 UI/UX
- 參考 `GridViewModal` 的設計風格
- 使用 shadcn/ui 組件庫
- 統一的配色方案和徽章樣式

### 2. 權限控制
- 自動檢查使用者權限
- 無權限時顯示友善提示
- 不會發生權限錯誤

### 3. 響應式設計
- 最大寬度 4xl
- 最大高度 90vh
- 自動滾動支援

### 4. 資料視覺化
- 進度條顯示完成度
- 顏色編碼（紅色=急需，綠色=已完成）
- 徽章標示狀態

### 5. 效能優化
- 批量載入資料（Promise.all）
- 載入狀態提示
- 錯誤處理機制

---

## 狀態徽章配色參考

### 網格狀態
- **已完成** (completed): 綠色 `bg-green-100 text-green-800`
- **開放中** (open): 藍色 `bg-blue-100 text-blue-800`
- **已關閉** (closed): 灰色 `bg-gray-100 text-gray-800`
- **進行中** (in_progress): 黃色 `bg-yellow-100 text-yellow-800`
- **準備中** (preparing): 紫色 `bg-purple-100 text-purple-800`

### 志工狀態
- **待確認** (pending): 黃色 `bg-yellow-100 text-yellow-800`
- **已確認** (confirmed): 藍色 `bg-blue-100 text-blue-800`
- **已到場** (arrived): 綠色 `bg-green-100 text-green-800`
- **已完成** (completed): 深綠色 `bg-green-200 text-green-900`
- **已婉拒** (declined): 紅色 `bg-red-100 text-red-800`
- **已取消** (cancelled): 灰色 `bg-gray-100 text-gray-800`

### 捐贈狀態
- **已承諾** (pledged): 藍色 `bg-blue-100 text-blue-800`
- **已確認** (confirmed): 綠色 `bg-green-100 text-green-800`
- **運送中** (in_transit): 黃色 `bg-yellow-100 text-yellow-800`
- **已送達** (delivered): 綠色 `bg-green-100 text-green-800`
- **已收到** (received): 深綠色 `bg-green-200 text-green-900`
- **已取消** (cancelled): 紅色 `bg-red-100 text-red-800`

---

## 注意事項

1. **資料完整性**
   - 確保傳入的 `grid` 物件包含 `supplies_needed` 陣列
   - `SupplyDonationViewModal` 需要完整的 `grid` 物件來計算進度

2. **權限檢查**
   - 組件內部已處理權限檢查，無需外部額外驗證
   - 使用 `usePermission` hook 進行即時權限檢查

3. **效能考量**
   - 首次開啟時會載入志工和捐贈資料
   - 建議在列表頁面預先載入部分資料以提升體驗

4. **唯讀模式**
   - 這兩個組件僅用於查看，不包含編輯功能
   - 如需編輯，請使用對應的編輯模態框組件

---

## 版本資訊

- **創建日期**: 2025-10-06
- **版本**: 1.0.0
- **相依套件**:
  - `@/components/ui/dialog`
  - `@/components/ui/badge`
  - `@/components/ui/card`
  - `@/components/ui/progress`
  - `@/components/ui/separator`
  - `@/components/ui/scroll-area`
  - `lucide-react`
  - `@/hooks/usePermission`
  - `@/api/entities`
