/**
 * 物資管理組件
 *
 * 功能：
 * 1. 物資列表（物資需求）- 管理網格中的物資需求
 * 2. 物資捐贈列表 - 管理所有物資捐贈記錄
 *
 * 每個分頁都支持：
 * - 列表/垃圾桶視圖切換
 * - 搜尋功能
 * - CSV 匯入/匯出（列表和垃圾桶分開）
 * - 批次操作
 * - 權限控制
 */

import React, { useState, useEffect, useCallback } from "react";
import { Grid, SupplyDonation } from "@/api/entities";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Package,
  PackagePlus,
  Trash2,
  Search,
  RotateCcw,
  XCircle,
  CheckCircle2,
  MapPin,
  Phone,
  Clock,
  AlertTriangle,
  Eye,
  Edit,
  Users,
  Download,
  Upload,
  Plus,
  CalendarClock,
} from "lucide-react";
import { usePermission } from "@/hooks/usePermission";
import { useRequireLogin } from "@/hooks/useRequireLogin";
import { formatCreatedDate } from "@/lib/utils";
import SupplyRequestViewModal from "@/components/admin/SupplyRequestViewModal";
import SupplyDonationViewModal from "@/components/admin/SupplyDonationViewModal";
import EditSupplyRequestModal from "@/components/admin/EditSupplyRequestModal";
import EditSupplyDonationModal from "@/components/supplies/EditSupplyDonationModal";
import AddSupplyRequestModal from "@/components/supplies/AddSupplyRequestModal";
import {
  moveSupplyToTrash,
  restoreSupplyFromTrash,
  permanentlyDeleteSupply,
  batchMoveSuppliesToTrash,
  batchDeleteSupplies,
  getTrashSupplies,
  exportSuppliesToCSV,
  importSuppliesFromCSV,
  exportTrashSuppliesToCSV,
  importTrashSuppliesFromCSV,
  exportTrashGridsToCSV,
  importTrashGridsFromCSV,
  exportGridsToCSV,
  importGridsFromCSV,
} from "@/api/admin";

export default function SupplyManagement() {
  // ==================== 狀態管理 ====================
  const [activeMainTab, setActiveMainTab] = useState("needs"); // needs | donations

  // 物資需求狀態
  const [grids, setGrids] = useState([]);
  const [filteredGrids, setFilteredGrids] = useState([]);
  const [trashGrids, setTrashGrids] = useState([]);
  const [isNeedsTrashView, setIsNeedsTrashView] = useState(false);
  const [needsSearchTerm, setNeedsSearchTerm] = useState("");
  const [selectedNeedsItems, setSelectedNeedsItems] = useState([]);
  const [showOnlyMyNeeds, setShowOnlyMyNeeds] = useState(false);
  const [showOnlyUrgent, setShowOnlyUrgent] = useState(false);

  // 物資捐贈狀態
  const [donations, setDonations] = useState([]);
  const [filteredDonations, setFilteredDonations] = useState([]);
  const [trashDonations, setTrashDonations] = useState([]);
  const [isDonationsTrashView, setIsDonationsTrashView] = useState(false);
  const [donationsSearchTerm, setDonationsSearchTerm] = useState("");
  const [selectedDonationsItems, setSelectedDonationsItems] = useState([]);
  const [showOnlyMyDonations, setShowOnlyMyDonations] = useState(false);

  // 通用狀態
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);

  // 查看模態框狀態
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [viewingItem, setViewingItem] = useState(null);
  const [viewingType, setViewingType] = useState(null); // 'need' | 'donation'

  // 編輯模態框狀態 - 物資需求
  const [editingGrid, setEditingGrid] = useState(null);
  const [showEditGridModal, setShowEditGridModal] = useState(false);

  // 編輯模態框狀態 - 物資捐贈
  const [editingDonation, setEditingDonation] = useState(null);
  const [showEditDonationModal, setShowEditDonationModal] = useState(false);

  // CSV 匯入匯出狀態
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);

  // 新增物資需求狀態
  const [showAddRequestModal, setShowAddRequestModal] = useState(false);

  const { canCreate, canEdit, canDelete, canView, canManage, hasPermission } = usePermission();

  // 登入檢查
  const addSupplyLogin = useRequireLogin("新增物資需求");

  // ==================== 訊息提示函數 ====================
  const showMessage = useCallback((text, type = 'info') => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 3000);
  }, []);

  // ==================== 資料載入函數 ====================

  // 載入物資需求（從 Grid）
  const loadGrids = async () => {
    try {
      setLoading(true);
      const data = await Grid.list('created_at');
      // 保留所有網格（包括暫時沒有物資需求的，例如剛從垃圾桶還原的）
      // 確保 supplies_needed 至少是空陣列
      const normalizedGrids = data.map(g => ({
        ...g,
        supplies_needed: Array.isArray(g.supplies_needed) ? g.supplies_needed : []
      }));
      setGrids(normalizedGrids);
    } catch (error) {
      console.error("載入物資需求失敗:", error);
      showMessage("載入物資需求失敗", "error");
    } finally {
      setLoading(false);
    }
  };

  // 載入物資捐贈
  const loadDonations = async () => {
    try {
      setLoading(true);
      const response = await SupplyDonation.list('created_at');
      // 處理可能的 response.data 結構
      const data = response.data || response;
      // console.log('物資捐贈資料:', data);
      setDonations(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("載入物資捐贈失敗:", error);
      showMessage("載入物資捐贈失敗", "error");
    } finally {
      setLoading(false);
    }
  };

  // 載入垃圾桶物資
  const loadTrashItems = async () => {
    try {
      // 載入垃圾桶網格（物資需求）
      const { http } = await import("@/api/rest/client");
      const trashGridsData = await http.get('/grids/trash');
      setTrashGrids(Array.isArray(trashGridsData) ? trashGridsData : []);

      // 載入垃圾桶物資捐贈
      const trashSuppliesData = await getTrashSupplies();
      setTrashDonations(Array.isArray(trashSuppliesData) ? trashSuppliesData : []);
    } catch (error) {
      console.error("載入垃圾桶資料失敗:", error);
    }
  };

  // 載入當前用戶
  const loadCurrentUser = async () => {
    try {
      const { User } = await import("@/api/entities");
      const user = await User.me();
      setCurrentUser(user);
    } catch (error) {
      console.error("載入用戶失敗:", error);
    }
  };

  // ==================== 初始化 ====================
  useEffect(() => {
    loadGrids();
    loadDonations();
    loadTrashItems();
    loadCurrentUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ==================== 篩選邏輯 ====================

  // 篩選物資需求
  useEffect(() => {
    let filtered = [...grids];

    // 搜尋過濾
    if (needsSearchTerm) {
      filtered = filtered.filter(grid => {
        const searchLower = needsSearchTerm.toLowerCase();
        return (
          grid.code?.toLowerCase().includes(searchLower) ||
          grid.area_name?.toLowerCase().includes(searchLower) ||
          grid.supplies_needed?.some(s =>
            s.name?.toLowerCase().includes(searchLower)
          )
        );
      });
    }

    // 只顯示我的物資
    if (showOnlyMyNeeds && currentUser) {
      filtered = filtered.filter(grid =>
        grid.created_by === currentUser.id ||
        grid.created_by_id === currentUser.id
      );
    }

    // 只顯示急需物資（進度 < 50%）
    if (showOnlyUrgent) {
      filtered = filtered.filter(grid => {
        const totalNeeded = grid.supplies_needed.reduce((sum, s) => sum + (s.quantity || 0), 0);
        const totalReceived = grid.supplies_needed.reduce((sum, s) => sum + (s.received || 0), 0);
        const rawProgress = totalNeeded > 0 ? (totalReceived / totalNeeded) * 100 : 0;
        const progress = Math.min(rawProgress, 100); // 確保進度不超過 100%
        return progress < 50;
      });
    }

    // 排序：我的物資優先顯示在前面
    if (currentUser) {
      filtered.sort((a, b) => {
        const aIsMine = a.created_by === currentUser.id || a.created_by_id === currentUser.id;
        const bIsMine = b.created_by === currentUser.id || b.created_by_id === currentUser.id;

        if (aIsMine && !bIsMine) return -1; // a 是我的，排在前面
        if (!aIsMine && bIsMine) return 1;  // b 是我的，排在前面
        return 0; // 都是我的或都不是我的，保持原順序
      });
    }

    setFilteredGrids(filtered);
  }, [grids, needsSearchTerm, showOnlyMyNeeds, showOnlyUrgent, currentUser]);

  // 篩選物資捐贈
  useEffect(() => {
    let filtered = [...donations];

    // 搜尋過濾
    if (donationsSearchTerm) {
      filtered = filtered.filter(donation => {
        const searchLower = donationsSearchTerm.toLowerCase();
        return (
          donation.supply_name?.toLowerCase().includes(searchLower) ||
          donation.donor_name?.toLowerCase().includes(searchLower) ||
          donation.grid_code?.toLowerCase().includes(searchLower)
        );
      });
    }

    // 只顯示我的捐贈
    if (showOnlyMyDonations && currentUser) {
      filtered = filtered.filter(donation =>
        donation.created_by === currentUser.id ||
        donation.created_by_id === currentUser.id
      );
    }

    // 排序：我的物資優先顯示在前面
    if (currentUser) {
      filtered.sort((a, b) => {
        const aIsMine = a.created_by === currentUser.id || a.created_by_id === currentUser.id;
        const bIsMine = b.created_by === currentUser.id || b.created_by_id === currentUser.id;

        if (aIsMine && !bIsMine) return -1; // a 是我的，排在前面
        if (!aIsMine && bIsMine) return 1;  // b 是我的，排在前面
        return 0; // 都是我的或都不是我的，保持原順序
      });
    }

    setFilteredDonations(filtered);
  }, [donations, donationsSearchTerm, showOnlyMyDonations, currentUser]);

  // ==================== 物資需求操作 ====================

  const handleDeleteNeed = async (gridId) => {
    if (!window.confirm("確定要將此物資需求移至垃圾桶嗎？")) return;

    try {
      // 注意：這裡應該要有專門的 API，目前先使用一般的 Grid 刪除
      await Grid.delete(gridId);
      showMessage("已移至垃圾桶", "success");
      // 清除該項目的選取狀態
      setSelectedNeedsItems(prev => prev.filter(id => id !== gridId));
      loadGrids();
      loadTrashItems();
    } catch (error) {
      console.error("移至垃圾桶失敗:", error);

      // 處理有關聯記錄的情況
      if (error.message && error.message.includes('Grid has related records')) {
        // 從錯誤訊息中解析 JSON
        try {
          const jsonMatch = error.message.match(/\{.*\}/);
          if (jsonMatch) {
            const errorData = JSON.parse(jsonMatch[0]);
            const details = errorData.details || {};
            const relatedInfo = [];

            if (details.vr_count && parseInt(details.vr_count) > 0) {
              relatedInfo.push(`${details.vr_count} 筆志工登記`);
            }
            if (details.sd_count && parseInt(details.sd_count) > 0) {
              relatedInfo.push(`${details.sd_count} 筆物資捐贈`);
            }
            if (details.gd_count && parseInt(details.gd_count) > 0) {
              relatedInfo.push(`${details.gd_count} 筆網格討論`);
            }

            const relatedMessage = relatedInfo.length > 0
              ? `此網格有關聯記錄（${relatedInfo.join('、')}），無法刪除`
              : '此網格有關聯記錄，無法刪除';

            showMessage(relatedMessage, "error");
          } else {
            showMessage('此網格有關聯記錄，無法刪除', "error");
          }
        } catch (parseError) {
          showMessage('此網格有關聯記錄，無法刪除', "error");
        }
      } else {
        showMessage(error.message || "操作失敗", "error");
      }
    }
  };

  const handleRestoreNeed = async (gridId) => {
    try {
      const { http } = await import("@/api/rest/client");
      await http.post(`/grids/${gridId}/restore`, {});
      showMessage("已還原", "success");
      // 清除該項目的選取狀態
      setSelectedNeedsItems(prev => prev.filter(id => id !== gridId));
      loadGrids();
      loadTrashItems();
    } catch (error) {
      console.error("還原失敗:", error);
      showMessage(error.message || "還原失敗", "error");
    }
  };

  const handleBatchDeleteNeeds = async () => {
    if (selectedNeedsItems.length === 0) {
      showMessage("請先選擇要移至垃圾桶的項目", "warning");
      return;
    }

    if (!window.confirm(`確定要將 ${selectedNeedsItems.length} 筆物資需求移至垃圾桶嗎？`)) return;

    try {
      let successCount = 0;
      let failCount = 0;
      const errors = [];

      for (const id of selectedNeedsItems) {
        try {
          await Grid.delete(id);
          successCount++;
        } catch (error) {
          failCount++;
          // 收集錯誤訊息
          if (error.message && error.message.includes('Grid has related records')) {
            // 從錯誤訊息中解析 JSON
            try {
              const jsonMatch = error.message.match(/\{.*\}/);
              if (jsonMatch) {
                const errorData = JSON.parse(jsonMatch[0]);
                const details = errorData.details || {};
                const relatedInfo = [];

                if (details.vr_count && parseInt(details.vr_count) > 0) {
                  relatedInfo.push(`${details.vr_count} 筆志工登記`);
                }
                if (details.sd_count && parseInt(details.sd_count) > 0) {
                  relatedInfo.push(`${details.sd_count} 筆物資捐贈`);
                }
                if (details.gd_count && parseInt(details.gd_count) > 0) {
                  relatedInfo.push(`${details.gd_count} 筆網格討論`);
                }

                errors.push({
                  id,
                  reason: relatedInfo.length > 0 ? `有關聯記錄（${relatedInfo.join('、')}）` : '有關聯記錄'
                });
              } else {
                errors.push({ id, reason: '有關聯記錄' });
              }
            } catch (parseError) {
              errors.push({ id, reason: '有關聯記錄' });
            }
          } else {
            errors.push({ id, reason: error.message || '未知錯誤' });
          }
        }
      }

      setSelectedNeedsItems([]);

      // 顯示結果訊息
      if (failCount === 0) {
        showMessage(`批次移至垃圾桶成功（${successCount} 筆）`, "success");
      } else if (successCount === 0) {
        showMessage(`批次操作失敗：所有項目都無法刪除`, "error");
      } else {
        showMessage(`部分成功：成功 ${successCount} 筆，失敗 ${failCount} 筆`, "warning");
      }

      loadGrids();
      loadTrashItems();
    } catch (error) {
      console.error("批次移至垃圾桶失敗:", error);
      showMessage("批次操作失敗", "error");
    }
  };

  const handleBatchRestoreNeeds = async () => {
    if (selectedNeedsItems.length === 0) {
      showMessage("請先選擇要還原的項目", "warning");
      return;
    }

    const count = selectedNeedsItems.length;

    try {
      const { http } = await import("@/api/rest/client");
      for (const id of selectedNeedsItems) {
        await http.post(`/grids/${id}/restore`, {});
      }
      setSelectedNeedsItems([]);
      showMessage(`已還原 ${count} 筆記錄`, "success");
      loadGrids();
      loadTrashItems();
    } catch (error) {
      console.error("批次還原失敗:", error);
      showMessage("批次還原失敗", "error");
    }
  };

  const handlePermanentDeleteNeed = async (gridId) => {
    if (!window.confirm("確定要永久刪除此物資需求嗎？此操作無法復原！")) return;

    try {
      const { http } = await import("@/api/rest/client");
      await http.delete(`/grids/${gridId}/permanent`);
      showMessage("已永久刪除", "success");
      // 清除該項目的選取狀態
      setSelectedNeedsItems(prev => prev.filter(id => id !== gridId));
      loadTrashItems();
    } catch (error) {
      console.error("永久刪除失敗:", error);

      // 處理有關聯記錄的情況
      if (error.message && error.message.includes('Grid has related records')) {
        try {
          const jsonMatch = error.message.match(/\{.*\}/);
          if (jsonMatch) {
            const errorData = JSON.parse(jsonMatch[0]);
            const details = errorData.details || {};
            const relatedInfo = [];

            if (details.vr_count && parseInt(details.vr_count) > 0) {
              relatedInfo.push(`${details.vr_count} 筆志工登記`);
            }
            if (details.sd_count && parseInt(details.sd_count) > 0) {
              relatedInfo.push(`${details.sd_count} 筆物資捐贈`);
            }
            if (details.gd_count && parseInt(details.gd_count) > 0) {
              relatedInfo.push(`${details.gd_count} 筆網格討論`);
            }

            const relatedMessage = relatedInfo.length > 0
              ? `此網格有關聯記錄（${relatedInfo.join('、')}），需要級聯刪除權限`
              : '此網格有關聯記錄，需要級聯刪除權限';

            showMessage(relatedMessage, "error");
          } else {
            showMessage('此網格有關聯記錄，需要級聯刪除權限', "error");
          }
        } catch (parseError) {
          showMessage('此網格有關聯記錄，需要級聯刪除權限', "error");
        }
      } else {
        showMessage(error.message || "永久刪除失敗", "error");
      }
    }
  };

  const handleBatchPermanentDeleteNeeds = async () => {
    if (selectedNeedsItems.length === 0) {
      showMessage("請先選擇要永久刪除的項目", "warning");
      return;
    }

    if (!window.confirm(`確定要永久刪除 ${selectedNeedsItems.length} 筆物資需求嗎？此操作無法復原！`)) return;

    try {
      const { http } = await import("@/api/rest/client");
      let successCount = 0;
      let failCount = 0;

      for (const id of selectedNeedsItems) {
        try {
          await http.delete(`/grids/${id}/permanent`);
          successCount++;
        } catch (error) {
          failCount++;
          console.error(`永久刪除 ${id} 失敗:`, error);
        }
      }

      setSelectedNeedsItems([]);

      if (failCount === 0) {
        showMessage(`批次永久刪除成功（${successCount} 筆）`, "success");
      } else if (successCount === 0) {
        showMessage(`批次操作失敗：所有項目都無法刪除`, "error");
      } else {
        showMessage(`部分成功：成功 ${successCount} 筆，失敗 ${failCount} 筆`, "warning");
      }

      loadTrashItems();
    } catch (error) {
      console.error("批次永久刪除失敗:", error);
      showMessage("批次操作失敗", "error");
    }
  };

  // ==================== 物資捐贈操作 ====================

  const handleDeleteDonation = async (donationId) => {
    if (!window.confirm("確定要將此捐贈記錄移至垃圾桶嗎？")) return;

    try {
      await moveSupplyToTrash(donationId);
      showMessage("已移至垃圾桶", "success");
      // 清除該項目的選取狀態
      setSelectedDonationsItems(prev => prev.filter(id => id !== donationId));
      loadDonations();
      loadTrashItems();
    } catch (error) {
      console.error("移至垃圾桶失敗:", error);
      showMessage("操作失敗", "error");
    }
  };

  const handleRestoreDonation = async (donationId) => {
    try {
      await restoreSupplyFromTrash(donationId);
      showMessage("已還原", "success");
      // 清除該項目的選取狀態
      setSelectedDonationsItems(prev => prev.filter(id => id !== donationId));
      loadDonations();
      loadTrashItems();
    } catch (error) {
      console.error("還原失敗:", error);
      showMessage("還原失敗", "error");
    }
  };

  const handlePermanentDeleteDonation = async (donationId) => {
    if (!window.confirm("確定要永久刪除此捐贈記錄嗎？此操作無法復原！")) return;

    try {
      await permanentlyDeleteSupply(donationId);
      showMessage("已永久刪除", "success");
      // 清除該項目的選取狀態
      setSelectedDonationsItems(prev => prev.filter(id => id !== donationId));
      loadTrashItems();
    } catch (error) {
      console.error("永久刪除失敗:", error);
      showMessage("永久刪除失敗", "error");
    }
  };

  // ==================== 批次操作 ====================

  const handleBatchDeleteDonations = async () => {
    if (selectedDonationsItems.length === 0) {
      showMessage("請先選擇要移至垃圾桶的項目", "warning");
      return;
    }

    if (!window.confirm(`確定要將 ${selectedDonationsItems.length} 筆捐贈記錄移至垃圾桶嗎？`)) return;

    try {
      await batchMoveSuppliesToTrash(selectedDonationsItems);
      setSelectedDonationsItems([]);
      showMessage("批次移至垃圾桶成功", "success");
      loadDonations();
      loadTrashItems();
    } catch (error) {
      console.error("批次移至垃圾桶失敗:", error);
      showMessage("批次操作失敗", "error");
    }
  };

  const handleBatchRestoreDonations = async () => {
    if (selectedDonationsItems.length === 0) {
      showMessage("請先選擇要還原的項目", "warning");
      return;
    }

    try {
      for (const id of selectedDonationsItems) {
        await restoreSupplyFromTrash(id);
      }
      setSelectedDonationsItems([]);
      showMessage(`已還原 ${selectedDonationsItems.length} 筆記錄`, "success");
      loadDonations();
      loadTrashItems();
    } catch (error) {
      console.error("批次還原失敗:", error);
      showMessage("批次還原失敗", "error");
    }
  };

  const handleBatchPermanentDelete = async () => {
    if (selectedDonationsItems.length === 0) {
      showMessage("請先選擇要永久刪除的項目", "warning");
      return;
    }

    if (!window.confirm(`確定要永久刪除 ${selectedDonationsItems.length} 筆記錄嗎？此操作無法復原！`)) return;

    try {
      await batchDeleteSupplies(selectedDonationsItems);
      setSelectedDonationsItems([]);
      showMessage(`已永久刪除 ${selectedDonationsItems.length} 筆記錄`, "success");
      loadTrashItems();
    } catch (error) {
      console.error("批次永久刪除失敗:", error);
      showMessage("批次永久刪除失敗", "error");
    }
  };

  // ==================== 選擇操作 ====================

  // 物資需求選擇
  const toggleSelectNeed = (id) => {
    setSelectedNeedsItems(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const toggleSelectAllNeeds = () => {
    const currentList = isNeedsTrashView ? trashGrids : filteredGrids;
    if (selectedNeedsItems.length === currentList.length) {
      setSelectedNeedsItems([]);
    } else {
      setSelectedNeedsItems(currentList.map(g => g.id));
    }
  };

  // 物資捐贈選擇
  const toggleSelectDonation = (id) => {
    setSelectedDonationsItems(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const toggleSelectAllDonations = () => {
    const currentList = isDonationsTrashView ? trashDonations : filteredDonations;
    if (selectedDonationsItems.length === currentList.length) {
      setSelectedDonationsItems([]);
    } else {
      setSelectedDonationsItems(currentList.map(d => d.id));
    }
  };

  // ==================== CSV 匯入匯出 ====================

  // 匯出 CSV
  const handleExportCSV = async () => {
    setExporting(true);
    try {
      if (activeMainTab === "donations") {
        if (isDonationsTrashView) {
          await exportTrashSuppliesToCSV();
          showMessage("垃圾桶物資捐贈匯出成功", "success");
        } else {
          await exportSuppliesToCSV();
          showMessage("物資捐贈匯出成功", "success");
        }
      } else if (activeMainTab === "needs") {
        if (isNeedsTrashView) {
          await exportTrashGridsToCSV();
          showMessage("垃圾桶物資需求匯出成功", "success");
        } else {
          // 正常物資需求匯出（使用 Grid 的 CSV）
          await exportGridsToCSV();
          showMessage("物資需求匯出成功", "success");
        }
      }
    } catch (error) {
      console.error("匯出失敗:", error);
      showMessage("匯出失敗", "error");
    } finally {
      setExporting(false);
    }
  };

  // 匯入 CSV
  const handleImportCSV = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setImporting(true);

    const reader = new FileReader();
    reader.onload = async (e) => {
      const csvContent = e.target.result;
      try {
        let result;
        if (activeMainTab === "donations") {
          if (isDonationsTrashView) {
            result = await importTrashSuppliesFromCSV(csvContent, true);
          } else {
            result = await importSuppliesFromCSV(csvContent, true);
          }
        } else if (activeMainTab === "needs") {
          if (isNeedsTrashView) {
            result = await importTrashGridsFromCSV(csvContent, true);
          } else {
            // 正常物資需求匯入（使用 Grid 的 CSV）
            result = await importGridsFromCSV(csvContent, true);
          }
        }

        if (result && (result.imported > 0 || result.skipped > 0)) {
          const resourceName = activeMainTab === "donations"
            ? (isDonationsTrashView ? "垃圾桶物資捐贈" : "物資捐贈")
            : (isNeedsTrashView ? "垃圾桶物資需求" : "物資需求");

          const message = `${resourceName}匯入完成！成功：${result.imported} 筆，跳過：${result.skipped} 筆，錯誤：${result.errors?.length || 0} 筆`;

          if (result.errors && result.errors.length > 0) {
            showMessage(message, 'warning');
          } else {
            showMessage(message, 'success');
          }

          // 重新載入資料
          if (activeMainTab === "donations") {
            loadDonations();
            loadTrashItems();
          } else {
            loadGrids();
            loadTrashItems();
          }
        } else {
          showMessage('匯入失敗：沒有成功匯入任何資料', 'error');
        }
      } catch (error) {
        console.error('匯入失敗:', error);
        showMessage(`匯入失敗：${error.message || '請檢查檔案格式'}`, 'error');
      } finally {
        setImporting(false);
        event.target.value = '';
      }
    };
    reader.readAsText(file, 'UTF-8');
  };

  // ==================== 查看模態框 ====================

  const handleViewNeed = (grid) => {
    setViewingItem(grid);
    setViewingType('need');
    setViewModalOpen(true);
  };

  const handleViewDonation = (donation) => {
    setViewingItem(donation);
    setViewingType('donation');
    setViewModalOpen(true);
  };

  // ==================== 編輯功能 ====================

  // 編輯物資需求
  const handleEditNeed = (grid) => {
    setEditingGrid(grid);
    setShowEditGridModal(true);
  };

  const handleSaveNeed = async (updatedData) => {
    try {
      await Grid.update(editingGrid.id, updatedData);
      setShowEditGridModal(false);
      setEditingGrid(null);
      await loadGrids(); // 重新載入資料
      showMessage('物資需求更新成功！', 'success');
    } catch (error) {
      console.error('更新物資需求失敗:', error);
      showMessage('更新失敗，請稍後再試', 'error');
    }
  };

  // 編輯物資捐贈
  const handleEditDonation = (donation) => {
    setEditingDonation(donation);
    setShowEditDonationModal(true);
  };

  const handleSaveDonation = async (updatedData) => {
    try {
      await SupplyDonation.update(editingDonation.id, updatedData);
      setShowEditDonationModal(false);
      setEditingDonation(null);
      await loadDonations(); // 重新載入資料
      showMessage('物資捐贈資訊更新成功！', 'success');
    } catch (error) {
      console.error('更新物資捐贈失敗:', error);
      showMessage('更新失敗，請稍後再試', 'error');
    }
  };

  // 新增物資需求
  const handleAddSupplyRequest = () => {
    // 檢查登入狀態（包含訪客模式）
    if (addSupplyLogin.requireLogin(() => {
      setShowAddRequestModal(true);
    })) {
      // 已登入，執行回調
    }
  };

  const handleAddRequestSuccess = async () => {
    setShowAddRequestModal(false);
    await loadGrids(); // 重新載入物資需求列表
    showMessage('物資需求新增成功！', 'success');
  };

  // ==================== 輔助函數 ====================

  const formatDate = (dateString) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    return date.toLocaleString("zh-TW", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      pledged: { text: "已承諾", className: "bg-blue-100 text-blue-800" },
      confirmed: { text: "已確認", className: "bg-green-100 text-green-800" },
      in_transit: { text: "運送中", className: "bg-yellow-100 text-yellow-800" },
      delivered: { text: "已送達", className: "bg-green-100 text-green-800" },
      received: { text: "已收到", className: "bg-green-200 text-green-900" },
      cancelled: { text: "已取消", className: "bg-red-100 text-red-800" },
    };
    const info = statusMap[status] || { text: status, className: "bg-gray-100 text-gray-800" };
    return <Badge className={info.className}>{info.text}</Badge>;
  };

  const getGridStatusBadge = (status) => {
    const statusMap = {
      open: { text: "開放中", className: "bg-blue-100 text-blue-800" },
      closed: { text: "已關閉", className: "bg-gray-100 text-gray-800" },
      completed: { text: "已完成", className: "bg-green-100 text-green-800" },
      in_progress: { text: "進行中", className: "bg-yellow-100 text-yellow-800" },
      preparing: { text: "準備中", className: "bg-purple-100 text-purple-800" },
    };
    const info = statusMap[status] || { text: status, className: "bg-gray-100 text-gray-800" };
    return <Badge className={info.className} variant="outline">{info.text}</Badge>;
  };

  const getGridTypeText = (gridType) => {
    const types = {
      mud_disposal: '污泥暫置場',
      manpower: '人力任務',
      supply_storage: '物資停放處',
      accommodation: '住宿地點',
      food_area: '領吃食區域'
    };
    return types[gridType] || gridType;
  };

  const getGridTypeColor = (gridType) => {
    const colors = {
      mud_disposal: 'bg-amber-100 text-amber-800',
      manpower: 'bg-red-100 text-red-800',
      supply_storage: 'bg-green-100 text-green-800',
      accommodation: 'bg-purple-100 text-purple-800',
      food_area: 'bg-orange-100 text-orange-800'
    };
    return colors[gridType] || 'bg-gray-100 text-gray-800';
  };

  const getDeliveryMethod = (method) => {
    const methodMap = {
      direct: "直接送達",
      pickup_point: "轉運點",
      volunteer_pickup: "志工取貨",
      delivery: "物流配送",
    };
    return methodMap[method] || method;
  };

  const calculateProgress = (grid) => {
    if (!grid.supplies_needed || grid.supplies_needed.length === 0) return 0;
    const totalNeeded = grid.supplies_needed.reduce((sum, s) => sum + (s.quantity || 0), 0);
    const totalReceived = grid.supplies_needed.reduce((sum, s) => sum + (s.received || 0), 0);
    const progress = totalNeeded > 0 ? (totalReceived / totalNeeded) * 100 : 0;
    return Math.min(progress, 100); // 確保進度不超過 100%
  };

  // ==================== 渲染 ====================

  if (loading && grids.length === 0 && donations.length === 0) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-gray-500">載入中...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 訊息提示 */}
      {message && (
        <div className={`p-4 rounded-lg flex items-center gap-2 ${
          message.type === 'success' ? 'bg-green-50 text-green-800' :
          message.type === 'error' ? 'bg-red-50 text-red-800' :
          message.type === 'warning' ? 'bg-yellow-50 text-yellow-800' :
          'bg-blue-50 text-blue-800'
        }`}>
          {message.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
          {message.text}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5 text-orange-600" />
            物資管理
          </CardTitle>
          <p className="text-sm text-gray-600">
            管理物資需求與捐贈記錄
          </p>
        </CardHeader>
        <CardContent>
          <Tabs value={activeMainTab} onValueChange={setActiveMainTab}>
            {/* 主分頁選擇 */}
            <TabsList className="w-full grid grid-cols-2 mb-6">
              <TabsTrigger value="needs" className="flex items-center gap-2">
                <Package className="w-4 h-4" />
                物資列表 ({filteredGrids.length})
              </TabsTrigger>
              <TabsTrigger value="donations" className="flex items-center gap-2">
                <PackagePlus className="w-4 h-4" />
                物資捐贈列表 ({filteredDonations.length})
              </TabsTrigger>
            </TabsList>

            {/* ==================== 物資需求分頁 ==================== */}
            <TabsContent value="needs" className="space-y-4">
              {/* 頂部控制區 */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant={!isNeedsTrashView ? 'default' : 'outline'}
                    onClick={() => {
                      setIsNeedsTrashView(false);
                      setSelectedNeedsItems([]);
                    }}
                  >
                    物資列表 ({filteredGrids.length})
                  </Button>
                  {canView('trash_supplies') && (
                    <Button
                      size="sm"
                      variant={isNeedsTrashView ? 'default' : 'outline'}
                      onClick={() => {
                        setIsNeedsTrashView(true);
                        setSelectedNeedsItems([]);
                      }}
                      className={isNeedsTrashView ? 'bg-red-600 hover:bg-red-700' : ''}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      垃圾桶 ({trashGrids.length})
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant={showOnlyUrgent ? 'default' : 'outline'}
                    onClick={() => setShowOnlyUrgent(!showOnlyUrgent)}
                    className={showOnlyUrgent ? 'bg-red-600 hover:bg-red-700' : ''}
                  >
                    <AlertTriangle className="w-4 h-4 mr-2" />
                    急需物資
                  </Button>
                  <Button
                    size="sm"
                    variant={showOnlyMyNeeds ? 'default' : 'outline'}
                    onClick={() => setShowOnlyMyNeeds(!showOnlyMyNeeds)}
                  >
                    <Users className="w-4 h-4 mr-2" />
                    我的物資
                  </Button>
                </div>

                <div className="flex gap-2">
                  {/* CSV 匯入匯出按鈕 - 需要 supplies 管理權限 */}
                  {canManage('supplies') && (
                    <>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleExportCSV}
                      disabled={exporting}
                      className="bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      {exporting ? '匯出中...' : '匯出CSV'}
                    </Button>

                    <label className="relative inline-block cursor-pointer">
                      <input
                        type="file"
                        accept=".csv"
                        onChange={handleImportCSV}
                        disabled={importing}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={importing}
                        className="bg-orange-50 hover:bg-orange-100 text-orange-700 border-orange-200 cursor-pointer pointer-events-none"
                      >
                        <Upload className="w-4 h-4 mr-2" />
                        {importing ? '匯入中...' : '匯入CSV'}
                      </Button>
                    </label>
                    </>
                  )}

                  {/* 新增物資需求按鈕 - 參考物資管理中心權限 */}
                  {!isNeedsTrashView && (
                    <Button
                      size="sm"
                      className="bg-green-600 hover:bg-green-700"
                      onClick={handleAddSupplyRequest}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      新增物資需求
                    </Button>
                  )}
                </div>
              </div>

              {/* 批次操作按鈕 */}
              {selectedNeedsItems.length > 0 && (() => {
                // 計算選中項目中屬於自己的數量
                const currentUserId = currentUser?.id;
                const ownedCount = selectedNeedsItems.filter(id => {
                  const grid = (isNeedsTrashView ? trashGrids : filteredGrids).find(g => g.id === id);
                  return grid && grid.created_by_id === currentUserId;
                }).length;

                const hasManagePermission = canManage('supplies');

                // 批量刪除：需要 trash_supplies.can_edit (自己的) 或 supplies.can_manage (別人的)
                const canBatchDelete = hasManagePermission || (canEdit('trash_supplies') && ownedCount === selectedNeedsItems.length);

                // 批量還原：需要 trash_supplies.can_edit (自己的) 或 supplies.can_manage (別人的)
                const canBatchRestore = hasManagePermission || (canEdit('trash_supplies') && ownedCount === selectedNeedsItems.length);

                // 永久刪除：需要 trash_supplies.can_delete (自己的) 或 supplies.can_manage (別人的)
                const canBatchPermanentDelete = hasManagePermission || (canDelete('trash_supplies') && ownedCount === selectedNeedsItems.length);

                return (
                  <div className="flex gap-2 mb-4 justify-end">
                    {!isNeedsTrashView && canBatchDelete && (
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={handleBatchDeleteNeeds}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        批量移至垃圾桶 ({selectedNeedsItems.length})
                      </Button>
                    )}
                    {isNeedsTrashView && (
                      <>
                        {canBatchRestore && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={handleBatchRestoreNeeds}
                          >
                            <RotateCcw className="w-4 h-4 mr-2" />
                            批量還原 ({selectedNeedsItems.length})
                          </Button>
                        )}
                        {canBatchPermanentDelete && (
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={handleBatchPermanentDeleteNeeds}
                          >
                            <XCircle className="w-4 h-4 mr-2" />
                            永久刪除 ({selectedNeedsItems.length})
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                );
              })()}

              {/* 搜尋與篩選 */}
              {!isNeedsTrashView && (
                <div className="flex gap-4 mb-4">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                    <Input
                      placeholder="搜尋物資名稱、救災地點..."
                      value={needsSearchTerm}
                      onChange={(e) => setNeedsSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
              )}

              {/* 全選 Checkbox */}
              {((!isNeedsTrashView && canEdit('trash_supplies')) ||
                (isNeedsTrashView && (canEdit('trash_supplies') || canDelete('trash_supplies')))) && (
                <div className="flex items-center gap-2 mb-2">
                  <Checkbox
                    checked={
                      selectedNeedsItems.length ===
                        (isNeedsTrashView ? trashGrids : filteredGrids).length &&
                      (isNeedsTrashView ? trashGrids : filteredGrids).length > 0
                    }
                    onCheckedChange={toggleSelectAllNeeds}
                  />
                  <span className="text-sm text-gray-600">全選</span>
                </div>
              )}

              {/* 物資需求卡片列表 */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {(isNeedsTrashView ? trashGrids : filteredGrids).length === 0 ? (
                  <div className="col-span-full text-center py-12 text-gray-500">
                    <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>{isNeedsTrashView ? '垃圾桶是空的' : '沒有符合條件的物資需求'}</p>
                  </div>
                ) : (
                  (isNeedsTrashView ? trashGrids : filteredGrids).map((grid) => {
                    const progress = calculateProgress(grid);
                    const isMyGrid = currentUser && (grid.created_by === currentUser.id || grid.created_by_id === currentUser.id);

                    return (
                      <Card key={grid.id} className="border border-gray-200 hover:shadow-md transition-shadow">
                        <CardContent className="p-4">
                          {/* 選擇框 */}
                          {((!isNeedsTrashView && canEdit('trash_supplies')) ||
                            (isNeedsTrashView && (canEdit('trash_supplies') || canDelete('trash_supplies')))) && (
                            <div className="mb-2">
                              <Checkbox
                                checked={selectedNeedsItems.includes(grid.id)}
                                onCheckedChange={() => toggleSelectNeed(grid.id)}
                              />
                            </div>
                          )}

                          {/* 標題區 */}
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="font-semibold text-lg">網格 {grid.code}</h4>
                                {isMyGrid && (
                                  <Badge className="bg-purple-100 text-purple-800 text-xs">
                                    我的物資
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <Badge className={
                                  grid.status === 'open' ? 'bg-green-100 text-green-800' :
                                  grid.status === 'closed' ? 'bg-gray-100 text-gray-800' :
                                  grid.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                                  'bg-yellow-100 text-yellow-800'
                                }>
                                  {grid.status === 'open' ? '開放中' :
                                   grid.status === 'closed' ? '已關閉' :
                                   grid.status === 'completed' ? '已完成' : '準備中'}
                                </Badge>
                                <Badge variant="outline" className="text-xs">
                                  {grid.info_type || '一般'}
                                </Badge>
                              </div>
                            </div>
                          </div>

                          {/* 救災地點 */}
                          {grid.area_name && (
                            <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                              <MapPin className="w-4 h-4" />
                              <span>{grid.area_name}</span>
                            </div>
                          )}

                          {/* 物資需求列表 */}
                          <div className="space-y-2 mb-3">
                            <div className="text-sm font-medium text-gray-700">物資需求：</div>
                            {grid.supplies_needed?.slice(0, 3).map((supply, idx) => (
                              <div key={idx} className="flex justify-between items-center text-sm bg-gray-50 p-2 rounded">
                                <span className="font-medium">{supply.name}</span>
                                <span className="text-gray-600">
                                  {supply.received || 0}/{supply.quantity} {supply.unit}
                                </span>
                              </div>
                            ))}
                            {grid.supplies_needed?.length > 3 && (
                              <div className="text-xs text-gray-500 text-center">
                                還有 {grid.supplies_needed.length - 3} 項物資...
                              </div>
                            )}
                          </div>

                          {/* 總進度條 */}
                          <div className="mb-3">
                            <div className="flex justify-between text-xs text-gray-600 mb-1">
                              <span>總進度</span>
                              <span>{progress.toFixed(0)}%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className={`h-2 rounded-full transition-all ${
                                  progress >= 80 ? 'bg-green-600' :
                                  progress >= 50 ? 'bg-yellow-600' : 'bg-red-600'
                                }`}
                                style={{ width: `${progress}%` }}
                              ></div>
                            </div>
                          </div>

                          {/* 建立時間 */}
                          <div className="flex items-center gap-2 text-sm mb-3">
                            <CalendarClock className="w-4 h-4 text-teal-700" />
                            <span className="font-medium">{formatCreatedDate(grid.created_at)}</span>
                          </div>

                          {/* 操作按鈕 */}
                          <div className="flex gap-2">
                            {!isNeedsTrashView && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleViewNeed(grid)}
                                className="flex-1"
                              >
                                <Eye className="w-4 h-4 mr-1" />
                                檢視
                              </Button>
                            )}

                            {!isNeedsTrashView ? (
                              <>
                                {/* 編輯按鈕：自己的物資需求可編輯，別人的需要管理權限 */}
                                {(isMyGrid ? canEdit('supplies') : canManage('supplies')) && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleEditNeed(grid)}
                                  >
                                    <Edit className="w-4 h-4" />
                                  </Button>
                                )}
                                {/* 刪除按鈕：自己的物資可刪除（trash_supplies.can_edit），別人的需要管理權限（supplies.can_manage） */}
                                {(isMyGrid ? canEdit('trash_supplies') : canManage('supplies')) && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleDeleteNeed(grid.id)}
                                    className="text-red-600"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                )}
                              </>
                            ) : (
                              <>
                                {/* 還原按鈕：自己的可還原（trash_supplies.can_edit），別人的需要管理權限（supplies.can_manage） */}
                                {(isMyGrid ? canEdit('trash_supplies') : canManage('supplies')) && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleRestoreNeed(grid.id)}
                                    className="flex-1 text-green-600 hover:text-green-700 border-green-200"
                                    title="還原網格"
                                  >
                                    <RotateCcw className="w-4 h-4 mr-1" />
                                    還原
                                  </Button>
                                )}
                                {/* 永久刪除：自己的可永久刪除（trash_supplies.can_delete），別人的需要管理權限（supplies.can_manage） */}
                                {(isMyGrid ? canDelete('trash_supplies') : canManage('supplies')) && (
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => handlePermanentDeleteNeed(grid.id)}
                                    className="flex-1"
                                    title="永久刪除"
                                  >
                                    <XCircle className="w-4 h-4 mr-1" />
                                    永久刪除
                                  </Button>
                                )}
                              </>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })
                )}
              </div>
            </TabsContent>

            {/* ==================== 物資捐贈分頁 ==================== */}
            <TabsContent value="donations" className="space-y-4">
              {/* 頂部控制區 */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant={!isDonationsTrashView ? 'default' : 'outline'}
                    onClick={() => {
                      setIsDonationsTrashView(false);
                      setSelectedDonationsItems([]);
                    }}
                  >
                    物資捐贈清單 ({filteredDonations.length})
                  </Button>
                  {canView('trash_supplies') && (
                    <Button
                      size="sm"
                      variant={isDonationsTrashView ? 'default' : 'outline'}
                      onClick={() => {
                        setIsDonationsTrashView(true);
                        setSelectedDonationsItems([]);
                      }}
                      className={isDonationsTrashView ? 'bg-red-600 hover:bg-red-700' : ''}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      垃圾桶 ({trashDonations.length})
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant={showOnlyMyDonations ? 'default' : 'outline'}
                    onClick={() => setShowOnlyMyDonations(!showOnlyMyDonations)}
                  >
                    <Users className="w-4 h-4 mr-2" />
                    我的捐贈
                  </Button>
                </div>

                {/* 批次操作按鈕 */}
                {selectedDonationsItems.length > 0 && (() => {
                  // 計算選中項目中屬於自己的數量
                  const currentUserId = currentUser?.id;
                  const ownedCount = selectedDonationsItems.filter(id => {
                    const donation = (isDonationsTrashView ? trashDonations : filteredDonations).find(d => d.id === id);
                    return donation && donation.created_by_id === currentUserId;
                  }).length;

                  const hasManagePermission = canManage('supplies');

                  // 批量刪除：需要 trash_supplies.can_edit (自己的) 或 supplies.can_manage (別人的)
                  const canBatchDelete = hasManagePermission || (canEdit('trash_supplies') && ownedCount === selectedDonationsItems.length);

                  // 批量還原：需要 trash_supplies.can_edit (自己的) 或 supplies.can_manage (別人的)
                  const canBatchRestore = hasManagePermission || (canEdit('trash_supplies') && ownedCount === selectedDonationsItems.length);

                  // 永久刪除：需要 trash_supplies.can_delete (自己的) 或 supplies.can_manage (別人的)
                  const canBatchPermanentDelete = hasManagePermission || (canDelete('trash_supplies') && ownedCount === selectedDonationsItems.length);

                  return (
                    <div className="flex gap-2">
                      {!isDonationsTrashView && canBatchDelete && (
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={handleBatchDeleteDonations}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          批量移至垃圾桶 ({selectedDonationsItems.length})
                        </Button>
                      )}
                      {isDonationsTrashView && (
                        <>
                          {canBatchRestore && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={handleBatchRestoreDonations}
                            >
                              <RotateCcw className="w-4 h-4 mr-2" />
                              批量還原 ({selectedDonationsItems.length})
                            </Button>
                          )}
                          {canBatchPermanentDelete && (
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={handleBatchPermanentDelete}
                            >
                              <XCircle className="w-4 h-4 mr-2" />
                              永久刪除 ({selectedDonationsItems.length})
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                  );
                })()}
              </div>

              {/* CSV 匯入匯出按鈕 - 需要 supplies 管理權限 */}
              {canManage('supplies') && (
                <div className="flex gap-2 mb-4 justify-end">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleExportCSV}
                    disabled={exporting}
                    className="bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    {exporting ? '匯出中...' : '匯出CSV'}
                  </Button>

                  <label className="relative inline-block cursor-pointer">
                    <input
                      type="file"
                      accept=".csv"
                      onChange={handleImportCSV}
                      disabled={importing}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={importing}
                      className="bg-orange-50 hover:bg-orange-100 text-orange-700 border-orange-200 cursor-pointer pointer-events-none"
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      {importing ? '匯入中...' : '匯入CSV'}
                    </Button>
                  </label>
                </div>
              )}

              {/* 搜尋與篩選 */}
              {!isDonationsTrashView && (
                <div className="flex gap-4 mb-4">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                    <Input
                      placeholder="搜尋物資名稱、捐贈者、網格代碼..."
                      value={donationsSearchTerm}
                      onChange={(e) => setDonationsSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
              )}

              {/* 全選 Checkbox */}
              {((!isDonationsTrashView && canEdit('trash_supplies')) ||
                (isDonationsTrashView && (canEdit('trash_supplies') || canDelete('trash_supplies')))) && (
                <div className="flex items-center gap-2 mb-2">
                  <Checkbox
                    checked={
                      selectedDonationsItems.length ===
                        (isDonationsTrashView ? trashDonations : filteredDonations).length &&
                      (isDonationsTrashView ? trashDonations : filteredDonations).length > 0
                    }
                    onCheckedChange={toggleSelectAllDonations}
                  />
                  <span className="text-sm text-gray-600">全選</span>
                </div>
              )}

              {/* 物資捐贈卡片列表 */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {(isDonationsTrashView ? trashDonations : filteredDonations).length === 0 ? (
                  <div className="col-span-full text-center py-12 text-gray-500">
                    <PackagePlus className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>{isDonationsTrashView ? '垃圾桶是空的' : '沒有符合條件的物資捐贈'}</p>
                  </div>
                ) : (
                  (isDonationsTrashView ? trashDonations : filteredDonations).map((donation) => {
                    const isMyDonation = currentUser && (donation.created_by === currentUser.id || donation.created_by_id === currentUser.id);
                    // 取得對應的網格資訊
                    const relatedGrid = grids.find(g => g.id === donation.grid_id) || {};

                    return (
                      <Card key={donation.id} className="border border-gray-200 hover:shadow-md transition-shadow">
                        <CardContent className="p-4">
                          {/* 選擇框 */}
                          {((!isDonationsTrashView && canEdit('trash_supplies')) ||
                            (isDonationsTrashView && (canEdit('trash_supplies') || canDelete('trash_supplies')))) && (
                            <div className="mb-2">
                              <Checkbox
                                checked={selectedDonationsItems.includes(donation.id)}
                                onCheckedChange={() => toggleSelectDonation(donation.id)}
                              />
                            </div>
                          )}

                          {/* 標題區 */}
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="font-semibold text-lg">{donation.supply_name || donation.name}</h4>
                                {isMyDonation && (
                                  <Badge className="bg-purple-100 text-purple-800 text-xs">
                                    我的捐贈物資
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-2 flex-wrap">
                                {/* 網格狀態 */}
                                {relatedGrid.status && getGridStatusBadge(relatedGrid.status)}
                                {/* 資訊類型 */}
                                {relatedGrid.grid_type && (
                                  <Badge className={getGridTypeColor(relatedGrid.grid_type)}>
                                    {getGridTypeText(relatedGrid.grid_type)}
                                  </Badge>
                                )}
                                {/* 捐贈狀態 */}
                                {getStatusBadge(donation.status)}
                              </div>
                            </div>
                          </div>

                          {/* 救災地點 */}
                          <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                            <MapPin className="w-4 h-4" />
                            <span>
                              {relatedGrid.meeting_point ? relatedGrid.meeting_point :
                               donation.grid_code ? `網格 ${donation.grid_code}` : '未知地點'}
                            </span>
                          </div>

                          {/* 捐贈資訊 */}
                          <div className="space-y-1 mb-3 text-sm">
                            <div className="flex justify-between">
                              <span className="text-gray-600">數量：</span>
                              <span className="font-medium">{donation.quantity} {donation.unit}</span>
                            </div>
                            {donation.delivery_method && (
                              <div className="flex justify-between">
                                <span className="text-gray-600">配送方式：</span>
                                <span className="font-medium">{getDeliveryMethod(donation.delivery_method)}</span>
                              </div>
                            )}
                            {donation.delivery_time && (
                              <div className="flex justify-between">
                                <span className="text-gray-600">預計送達：</span>
                                <span className="font-medium">{donation.delivery_time}</span>
                              </div>
                            )}
                          </div>

                          {/* 捐贈時間 */}
                          <div className="flex items-center gap-2 text-sm mb-3">
                            <CalendarClock className="w-4 h-4 text-teal-700" />
                            <span className="font-medium">{formatCreatedDate(donation.created_at)}</span>
                          </div>

                          {/* 操作按鈕 */}
                          <div className="flex gap-2">
                            {!isDonationsTrashView && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleViewDonation(donation)}
                                className="flex-1"
                              >
                                <Eye className="w-4 h-4 mr-1" />
                                檢視
                              </Button>
                            )}

                            {!isDonationsTrashView ? (
                              <>
                                {/* 編輯按鈕：自己的捐贈可編輯，別人的需要管理權限 */}
                                {(isMyDonation ? canEdit('supplies') : canManage('supplies')) && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleEditDonation(donation)}
                                  >
                                    <Edit className="w-4 h-4" />
                                  </Button>
                                )}
                                {/* 刪除按鈕：自己的捐贈可用 trash_supplies.can_edit，別人的需要 supplies.can_manage */}
                                {(isMyDonation ? canEdit('trash_supplies') : canManage('supplies')) && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleDeleteDonation(donation.id)}
                                    className="text-red-600"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                )}
                              </>
                            ) : (
                              <>
                                {/* 還原按鈕：自己的捐贈可用 trash_supplies.can_edit，別人的需要 supplies.can_manage */}
                                {(isMyDonation ? canEdit('trash_supplies') : canManage('supplies')) && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleRestoreDonation(donation.id)}
                                    className="flex-1 text-green-600 hover:text-green-700 border-green-200"
                                    title="還原物資捐贈"
                                  >
                                    <RotateCcw className="w-4 h-4 mr-1" />
                                    還原
                                  </Button>
                                )}
                                {/* 永久刪除按鈕：自己的捐贈可用 trash_supplies.can_delete，別人的需要 supplies.can_manage */}
                                {(isMyDonation ? canDelete('trash_supplies') : canManage('supplies')) && (
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => handlePermanentDeleteDonation(donation.id)}
                                    className="flex-1"
                                    title="永久刪除"
                                  >
                                    <XCircle className="w-4 h-4 mr-1" />
                                    永久刪除
                                  </Button>
                                )}
                              </>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* 查看詳情模態框 */}
      {viewModalOpen && viewingItem && viewingType === 'need' && (
        <SupplyRequestViewModal
          grid={viewingItem}
          onClose={() => {
            setViewModalOpen(false);
            setViewingItem(null);
            setViewingType(null);
          }}
        />
      )}

      {viewModalOpen && viewingItem && viewingType === 'donation' && (
        <SupplyDonationViewModal
          donation={viewingItem}
          grid={grids.find(g => g.id === viewingItem.grid_id) || {}}
          onClose={() => {
            setViewModalOpen(false);
            setViewingItem(null);
            setViewingType(null);
          }}
        />
      )}

      {/* 編輯物資需求模態框 */}
      {showEditGridModal && editingGrid && (
        <EditSupplyRequestModal
          isOpen={showEditGridModal}
          onClose={() => {
            setShowEditGridModal(false);
            setEditingGrid(null);
          }}
          grid={editingGrid}
          onSave={handleSaveNeed}
        />
      )}

      {/* 編輯物資捐贈模態框 */}
      {showEditDonationModal && editingDonation && (
        <EditSupplyDonationModal
          isOpen={showEditDonationModal}
          onClose={() => {
            setShowEditDonationModal(false);
            setEditingDonation(null);
          }}
          donation={editingDonation}
          onSave={handleSaveDonation}
        />
      )}

      {/* 新增物資需求模態框 */}
      {showAddRequestModal && (
        <AddSupplyRequestModal
          isOpen={showAddRequestModal}
          onClose={() => setShowAddRequestModal(false)}
          onSuccess={handleAddRequestSuccess}
          grids={grids}
        />
      )}
    </div>
  );
}
