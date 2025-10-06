/**
 * 整合範例：如何在後台管理頁面使用查看模態框
 *
 * 此檔案展示如何在現有的 Admin.jsx 中整合：
 * 1. SupplyRequestViewModal（物資需求查看）
 * 2. SupplyDonationViewModal（物資捐贈查看）
 *
 * 注意：這是範例程式碼，請根據實際需求調整
 */

import React, { useState, useEffect } from 'react';
import { Grid, SupplyDonation } from '@/api/entities';
import SupplyRequestViewModal from '@/components/admin/SupplyRequestViewModal';
import SupplyDonationViewModal from '@/components/admin/SupplyDonationViewModal';
import { Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * 範例 1: 在網格管理區塊中加入「查看需求」按鈕
 */
function GridManagementSection() {
  const [grids, setGrids] = useState([]);
  const [viewGrid, setViewGrid] = useState(null);

  useEffect(() => {
    loadGrids();
  }, []);

  const loadGrids = async () => {
    const data = await Grid.list();
    setGrids(data);
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">網格管理</h2>

      {/* 網格列表 */}
      <table className="w-full">
        <thead>
          <tr>
            <th>網格代碼</th>
            <th>狀態</th>
            <th>類型</th>
            <th>物資需求</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          {grids.map(grid => (
            <tr key={grid.id}>
              <td>{grid.code}</td>
              <td>{grid.status}</td>
              <td>{grid.grid_type}</td>
              <td>
                {grid.supplies_needed?.length || 0} 項
              </td>
              <td className="space-x-2">
                {/* 原有的編輯按鈕 */}
                <Button variant="outline" size="sm">
                  編輯
                </Button>

                {/* 新增：查看需求按鈕 */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setViewGrid(grid)}
                >
                  <Eye className="w-4 h-4 mr-1" />
                  查看需求
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* 查看模態框 */}
      {viewGrid && (
        <SupplyRequestViewModal
          grid={viewGrid}
          onClose={() => setViewGrid(null)}
        />
      )}
    </div>
  );
}

/**
 * 範例 2: 在物資捐贈管理區塊中加入「查看詳情」按鈕
 */
function DonationManagementSection() {
  const [donations, setDonations] = useState([]);
  const [viewDonation, setViewDonation] = useState(null);
  const [donationGrid, setDonationGrid] = useState(null);

  useEffect(() => {
    loadDonations();
  }, []);

  const loadDonations = async () => {
    const data = await SupplyDonation.list();
    setDonations(data);
  };

  /**
   * 處理查看捐贈詳情
   * 需要同時載入關聯的網格資料
   */
  const handleViewDonation = async (donation) => {
    try {
      // 載入關聯的網格資料
      const grid = await Grid.get(donation.grid_id);
      setDonationGrid(grid);
      setViewDonation(donation);
    } catch (error) {
      console.error('Failed to load grid for donation:', error);
      alert('載入網格資料失敗');
    }
  };

  /**
   * 關閉模態框
   */
  const handleCloseDonationModal = () => {
    setViewDonation(null);
    setDonationGrid(null);
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">物資捐贈管理</h2>

      {/* 捐贈列表 */}
      <table className="w-full">
        <thead>
          <tr>
            <th>物資名稱</th>
            <th>數量</th>
            <th>捐贈者</th>
            <th>目標網格</th>
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
              <td>{donation.grid_code || donation.grid_id}</td>
              <td>{donation.status}</td>
              <td className="space-x-2">
                {/* 原有的編輯按鈕 */}
                <Button variant="outline" size="sm">
                  編輯
                </Button>

                {/* 新增：查看詳情按鈕 */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleViewDonation(donation)}
                >
                  <Eye className="w-4 h-4 mr-1" />
                  查看詳情
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* 查看模態框 */}
      {viewDonation && donationGrid && (
        <SupplyDonationViewModal
          donation={viewDonation}
          grid={donationGrid}
          onClose={handleCloseDonationModal}
        />
      )}
    </div>
  );
}

/**
 * 範例 3: 完整的後台管理頁面整合
 */
function AdminPage() {
  const [activeTab, setActiveTab] = useState('grids');

  // 網格查看狀態
  const [viewGrid, setViewGrid] = useState(null);

  // 捐贈查看狀態
  const [viewDonation, setViewDonation] = useState(null);
  const [donationGrid, setDonationGrid] = useState(null);

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">後台管理</h1>

      {/* 分頁標籤 */}
      <div className="flex gap-4 mb-6">
        <Button
          variant={activeTab === 'grids' ? 'default' : 'outline'}
          onClick={() => setActiveTab('grids')}
        >
          網格管理
        </Button>
        <Button
          variant={activeTab === 'donations' ? 'default' : 'outline'}
          onClick={() => setActiveTab('donations')}
        >
          捐贈管理
        </Button>
      </div>

      {/* 內容區域 */}
      {activeTab === 'grids' && (
        <GridManagementSection />
      )}

      {activeTab === 'donations' && (
        <DonationManagementSection />
      )}

      {/* 全域查看模態框 */}
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

/**
 * 範例 4: 在卡片視圖中使用
 */
function GridCardView({ grid }) {
  const [isViewOpen, setIsViewOpen] = useState(false);

  return (
    <>
      <div className="border rounded-lg p-4 hover:shadow-lg transition-shadow">
        <h3 className="text-lg font-bold mb-2">{grid.code}</h3>
        <p className="text-sm text-gray-600 mb-3">
          物資需求: {grid.supplies_needed?.length || 0} 項
        </p>

        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            編輯
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsViewOpen(true)}
          >
            <Eye className="w-4 h-4 mr-1" />
            查看
          </Button>
        </div>
      </div>

      {isViewOpen && (
        <SupplyRequestViewModal
          grid={grid}
          onClose={() => setIsViewOpen(false)}
        />
      )}
    </>
  );
}

/**
 * 範例 5: 在數據統計頁面快速查看
 */
function StatisticsPageExample() {
  const [selectedGrid, setSelectedGrid] = useState(null);
  const [selectedDonation, setSelectedDonation] = useState(null);
  const [donationGrid, setDonationGrid] = useState(null);

  const handleQuickViewGrid = (gridId) => {
    Grid.get(gridId).then(grid => setSelectedGrid(grid));
  };

  const handleQuickViewDonation = async (donationId) => {
    const donation = await SupplyDonation.get(donationId);
    const grid = await Grid.get(donation.grid_id);
    setDonationGrid(grid);
    setSelectedDonation(donation);
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">統計數據</h2>

      {/* 統計卡片 */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="border rounded-lg p-4">
          <h3 className="text-lg font-semibold mb-2">急需物資網格</h3>
          <p className="text-3xl font-bold text-red-600">15</p>
          <Button
            variant="link"
            size="sm"
            onClick={() => handleQuickViewGrid(1)}
          >
            查看詳情 →
          </Button>
        </div>

        <div className="border rounded-lg p-4">
          <h3 className="text-lg font-semibold mb-2">待確認捐贈</h3>
          <p className="text-3xl font-bold text-yellow-600">23</p>
          <Button
            variant="link"
            size="sm"
            onClick={() => handleQuickViewDonation(1)}
          >
            查看詳情 →
          </Button>
        </div>

        <div className="border rounded-lg p-4">
          <h3 className="text-lg font-semibold mb-2">已完成網格</h3>
          <p className="text-3xl font-bold text-green-600">48</p>
        </div>
      </div>

      {/* 查看模態框 */}
      {selectedGrid && (
        <SupplyRequestViewModal
          grid={selectedGrid}
          onClose={() => setSelectedGrid(null)}
        />
      )}

      {selectedDonation && donationGrid && (
        <SupplyDonationViewModal
          donation={selectedDonation}
          grid={donationGrid}
          onClose={() => {
            setSelectedDonation(null);
            setDonationGrid(null);
          }}
        />
      )}
    </div>
  );
}

/**
 * 範例 6: 使用 React Table 整合
 */
function TableWithViewModal() {
  const [viewGrid, setViewGrid] = useState(null);

  const columns = [
    { header: '網格代碼', accessorKey: 'code' },
    { header: '狀態', accessorKey: 'status' },
    {
      header: '操作',
      cell: ({ row }) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setViewGrid(row.original)}
        >
          <Eye className="w-4 h-4" />
        </Button>
      )
    }
  ];

  return (
    <>
      {/* React Table 組件 */}
      {/* <DataTable columns={columns} data={grids} /> */}

      {/* 查看模態框 */}
      {viewGrid && (
        <SupplyRequestViewModal
          grid={viewGrid}
          onClose={() => setViewGrid(null)}
        />
      )}
    </>
  );
}

// 匯出範例組件
export {
  GridManagementSection,
  DonationManagementSection,
  AdminPage,
  GridCardView,
  StatisticsPageExample,
  TableWithViewModal
};

/**
 * 使用提示：
 *
 * 1. 在現有的 Admin.jsx 中：
 *    - 加入 import 語句
 *    - 在表格的操作欄加入「查看」按鈕
 *    - 設定 viewGrid 或 viewDonation 狀態
 *    - 在組件末尾加入模態框
 *
 * 2. 注意事項：
 *    - SupplyDonationViewModal 需要完整的 grid 物件
 *    - 記得在關閉時清空狀態
 *    - 可使用 loading 狀態優化體驗
 *
 * 3. 快捷鍵（可選）：
 *    - Escape: 關閉模態框
 *    - Ctrl+P: 列印（未來可擴展）
 *
 * 4. 權限控制：
 *    - 組件內部已處理權限檢查
 *    - 外部只需控制「查看」按鈕的顯示
 */
