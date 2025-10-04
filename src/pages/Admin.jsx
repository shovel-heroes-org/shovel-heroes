
import React, { useState, useEffect, useCallback } from "react";
import { User, DisasterArea, Grid, VolunteerRegistration, SupplyDonation } from "@/api/entities";
import { useAuth } from '@/context/AuthContext';
import { usePermission } from '@/hooks/usePermission';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Shield, MapPin, Users, Package, AlertTriangle,
  Plus, Settings, BarChart3, Clock, CheckCircle2, Trash2, UserCog,
  RotateCcw, XCircle, Download, Upload, Eye, EyeOff, RefreshCw, Search
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import AddGridModal from "@/components/admin/AddGridModal";
import AddAreaModal from "@/components/admin/AddAreaModal";
import EditGridModal from "@/components/admin/EditGridModal";
import EditAreaModal from "@/components/admin/EditAreaModal";
import AreaImportExportButtons from "@/components/admin/AreaImportExportButtons";
import GridImportExportButtons from "@/components/admin/GridImportExportButtons";
import VolunteerImportExportButtons from "@/components/admin/VolunteerImportExportButtons";
import SupplyImportExportButtons from "@/components/admin/SupplyImportExportButtons";
import UserImportExportButtons from "@/components/admin/UserImportExportButtons";
import BlacklistImportExportButtons from "@/components/admin/BlacklistImportExportButtons";
import PermissionManagement from "@/components/admin/PermissionManagement";
import HttpAuditLogs from "@/components/admin/HttpAuditLogs";
import AnnouncementManagement from "@/components/admin/AnnouncementManagement";
import UnauthorizedAccess from "@/components/common/UnauthorizedAccess";
import { Link, useSearchParams } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { getUsers } from "@/api/functions";
import {
  getAdminUsers,
  updateUserRole,
  moveGridToTrash,
  restoreGridFromTrash,
  permanentlyDeleteGrid,
  getTrashGrids,
  batchMoveGridsToTrash,
  batchDeleteGrids,
  moveAreaToTrash,
  restoreAreaFromTrash,
  permanentlyDeleteArea,
  getTrashAreas,
  batchMoveAreasToTrash,
  batchDeleteAreas,
  getBlacklistedUsers,
  addUserToBlacklist,
  removeUserFromBlacklist,
  batchDeleteBlacklistedUsers,
  getAuditLogs,
  exportAuditLogsToCSV,
  moveAnnouncementToTrash,
  restoreAnnouncementFromTrash,
  permanentlyDeleteAnnouncement,
  getTrashAnnouncements,
  batchMoveAnnouncementsToTrash,
  batchDeleteAnnouncements
} from "@/api/admin";

export default function AdminPage() {
  // Use global auth context so we can respect actingRole (admin vs user perspective)
  const { user, actingRole } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  // 使用 usePermission hook 取代所有硬編碼的權限檢查
  const {
    canView,
    canCreate,
    canEdit,
    canDelete,
    canManage,
    isAdmin,
    isSuperAdmin,
    isGridManager,
    isUser,
    isGuest,
    currentRole
  } = usePermission();

  // 為了向後兼容，定義 isRegularUser 別名
  const isRegularUser = isUser;

  // 網格權限檢查函數 - 考慮到資源所有權
  const canEditGrid = useCallback((grid) => {
    if (!grid) return false;
    // 管理員和網格管理員可編輯所有網格
    if (canEdit('grids')) return true;
    // 一般用戶只能編輯自己建立的
    if (isUser && grid.created_by_id == user?.id) return true;
    return false;
  }, [canEdit, isUser, user]);

  const canDeleteGrid = useCallback((grid) => {
    if (!grid) return false;
    // 管理員和網格管理員可刪除所有網格
    if (canDelete('grids')) return true;
    // 一般用戶只能刪除自己建立的（如果有權限）
    if (isUser && canDelete('my_resources') && grid.created_by_id == user?.id) return true;
    return false;
  }, [canDelete, isUser, user]);

  const [disasterAreas, setDisasterAreas] = useState([]);
  const [grids, setGrids] = useState([]);
  const [registrations, setRegistrations] = useState([]);
  const [donations, setDonations] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalAreas: 0,
    totalGrids: 0,
    totalVolunteers: 0,
    totalSupplies: 0,
    completedGrids: 0,
    urgentGrids: 0
  });
  const [showNewAreaModal, setShowNewAreaModal] = useState(false);
  const [showNewGridModal, setShowNewGridModal] = useState(false);
  const [editingArea, setEditingArea] = useState(null);
  const [showEditAreaModal, setShowEditAreaModal] = useState(false);
  const [showEditGridModal, setShowEditGridModal] = useState(false);
  const [editingGrid, setEditingGrid] = useState(null);
  const [selectedGridType, setSelectedGridType] = useState('all');

  // 新增垃圾桶相關狀態
  const [trashGrids, setTrashGrids] = useState([]);
  const [selectedGrids, setSelectedGrids] = useState([]);
  const [isTrashView, setIsTrashView] = useState(false);
  const [adminUsers, setAdminUsers] = useState([]);

  // 災區垃圾桶相關狀態
  const [trashAreas, setTrashAreas] = useState([]);
  const [selectedAreas, setSelectedAreas] = useState([]);
  const [isAreaTrashView, setIsAreaTrashView] = useState(false);
  const [areaSearchTerm, setAreaSearchTerm] = useState('');

  // 公告垃圾桶相關狀態
  const [trashAnnouncements, setTrashAnnouncements] = useState([]);
  const [selectedAnnouncements, setSelectedAnnouncements] = useState([]);
  const [isAnnouncementTrashView, setIsAnnouncementTrashView] = useState(false);

  // 黑名單用戶相關狀態
  const [blacklistedUsers, setBlacklistedUsers] = useState([]);
  const [selectedBlacklistUsers, setSelectedBlacklistUsers] = useState([]);

  // 審計日誌相關狀態
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditLogsTotal, setAuditLogsTotal] = useState(0);
  const [auditLogsPage, setAuditLogsPage] = useState(0);
  const [auditLogsLoading, setAuditLogsLoading] = useState(false);
  const [auditLogsFilters, setAuditLogsFilters] = useState({
    user_role: '',
    action_type: '',
    start_date: '',
    end_date: '',
    limit: '50' // 新增：可調整顯示筆數
  });
  const [showIpAddresses, setShowIpAddresses] = useState(false); // IP 位置顯示開關
  const [showLineIds, setShowLineIds] = useState(false); // LINE ID 顯示開關
  const [logType, setLogType] = useState('admin'); // 日誌類型: 'admin' | 'http'

  // Tab 狀態管理 - 根據權限動態決定預設頁籤（優先顯示需求管理）
  const getDefaultTab = useCallback(() => {
    if (canView('grids')) return 'grids'; // 優先開啟需求管理
    if (canView('disaster_areas')) return 'areas';
    if (canView('volunteers')) return 'volunteers';
    if (canView('supplies')) return 'supplies';
    if (canView('announcements')) return 'announcements';
    if (canView('users')) return 'users';
    if (canView('blacklist')) return 'blacklist';
    if (canView('audit_logs')) return 'audit-logs';
    if (canView('role_permissions')) return 'permissions';
    return null; // 沒有任何權限
  }, [canView]);

  // 從 URL 參數讀取 tab，如果沒有則使用預設值
  const urlTab = searchParams.get('tab');
  const [currentTab, setCurrentTab] = useState(urlTab || getDefaultTab());

  // 當 URL 參數變更時，同步更新 currentTab
  useEffect(() => {
    const newTab = searchParams.get('tab');
    if (newTab) {
      console.log('URL tab 參數變更:', newTab);
      setCurrentTab(newTab);
    }
  }, [searchParams]);

  // 確保 URL 與 currentTab 同步 - 如果 URL 沒有 tab 參數，則加入預設值
  useEffect(() => {
    const urlTab = searchParams.get('tab');
    const defaultTab = getDefaultTab();

    // 如果 URL 沒有 tab 參數且有預設 tab，則更新 URL
    if (!urlTab && defaultTab && currentTab) {
      console.log('設定預設 tab 到 URL:', currentTab);
      setSearchParams({ tab: currentTab }, { replace: true });
    }
  }, [currentTab, searchParams, setSearchParams, getDefaultTab]);

  // 移除自動跳轉邏輯，讓使用者停留在當前頁籤
  // 即使沒有權限，也會顯示「無權限訪問」訊息

  const loadData = useCallback(async () => {
    try {
      setLoading(true);

      // Use safe backend API to get user list
      const [areasData, gridsData, registrationsData, donationsData, usersResponse] = await Promise.all([
        DisasterArea.list(),
        Grid.list(),
        VolunteerRegistration.list(),
        SupplyDonation.list(),
        getUsers() // Changed to use the getUsers function
      ]);

      // Ensure data is always an array to prevent iteration errors
      setDisasterAreas(areasData || []);
      setGrids(gridsData || []);
      setRegistrations(registrationsData || []);
      setDonations(donationsData || []);

      // Normalize /users response: backend currently returns a plain array (no wrapper)
      const normalizedUsers = Array.isArray(usersResponse)
        ? usersResponse
        : Array.isArray(usersResponse?.data)
          ? usersResponse.data
          : Array.isArray(usersResponse?.data?.data)
            ? usersResponse.data.data
            : [];
      // Ensure consistent shape (full_name fallback)
      const safeUsers = normalizedUsers.map(u => ({
        ...u,
        full_name: u.full_name || u.name || u.email || '未命名用戶'
      }));
      setAllUsers(safeUsers);

      // 如果有用戶管理權限，載入管理員專用使用者列表
      if (canView('users')) {
        try {
          const adminUsersResponse = await getAdminUsers();
          const adminUsersList = Array.isArray(adminUsersResponse?.data)
            ? adminUsersResponse.data
            : Array.isArray(adminUsersResponse)
            ? adminUsersResponse
            : [];
          setAdminUsers(adminUsersList.map(u => ({
            ...u,
            full_name: u.full_name || u.name || u.email || '未命名用戶'
          })));
        } catch (error) {
          console.error('Failed to load admin users:', error);
        }

      }

      // 載入垃圾桶網格 - 所有登入用戶都可以查看（但會根據權限過濾）
      if (user) {
        try {
          const trashResponse = await getTrashGrids();
          const trashData = Array.isArray(trashResponse?.data)
            ? trashResponse.data
            : Array.isArray(trashResponse)
            ? trashResponse
            : [];
          setTrashGrids(trashData);
        } catch (error) {
          console.error('Failed to load trash grids:', error);
        }
      }

      // 如果有黑名單管理權限，載入黑名單用戶
      if (canView('blacklist')) {
        try {
          const blacklistResponse = await getBlacklistedUsers();
          const blacklistData = Array.isArray(blacklistResponse?.data)
            ? blacklistResponse.data
            : Array.isArray(blacklistResponse)
            ? blacklistResponse
            : [];
          setBlacklistedUsers(blacklistData);
        } catch (error) {
          console.error('Failed to load blacklisted users:', error);
        }
      }

      // Calculate stats
      const completedGrids = (gridsData || []).filter(g => g.status === 'completed').length;
      const urgentGrids = (gridsData || []).filter(g => {
        if (!g.volunteer_needed || g.volunteer_needed === 0) return false;
        const shortage = (g.volunteer_needed - g.volunteer_registered) / g.volunteer_needed;
        return shortage >= 0.6;
      }).length;

      setStats({
        totalAreas: (areasData || []).length,
        totalGrids: (gridsData || []).length,
        totalVolunteers: (registrationsData || []).length,
        totalSupplies: (donationsData || []).length,
        completedGrids,
        urgentGrids
      });
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  }, [user, canView]);

  // user 來自 AuthContext，已集中管理，這裡不再自行抓取

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleAreaSettings = (area) => {
    setEditingArea(area);
    setShowEditAreaModal(true);
  };

  const handleAreaDelete = async (area) => {
    if (!canDelete('disaster_areas')) {
      alert('您沒有刪除災區的權限');
      return;
    }
    if (window.confirm(`確定要將災區 "${area.name}" 移至垃圾桶嗎？`)) {
      try {
        await moveAreaToTrash(area.id);
        loadData();
        loadTrashAreas(); // 重新載入垃圾桶數量
        alert('災區已移至垃圾桶');
      } catch (error) {
        console.error('Failed to move area to trash:', error);
        alert('移動災區至垃圾桶失敗，請稍後再試。');
      }
    }
  };

  // 災區選擇處理
  const handleAreaSelect = (areaId) => {
    setSelectedAreas(prev =>
      prev.includes(areaId)
        ? prev.filter(id => id !== areaId)
        : [...prev, areaId]
    );
  };

  // 批量刪除災區（移至垃圾桶）
  const handleBatchDeleteAreas = async () => {
    if (selectedAreas.length === 0) {
      alert('請先選擇要刪除的災區');
      return;
    }

    if (!window.confirm(`確定要將 ${selectedAreas.length} 個災區移至垃圾桶嗎？`)) {
      return;
    }

    try {
      await batchMoveAreasToTrash(selectedAreas);
      setSelectedAreas([]);
      loadData();
      await loadTrashAreas();
      alert(`已將 ${selectedAreas.length} 個災區移至垃圾桶`);
    } catch (error) {
      console.error('Failed to batch delete areas:', error);
      alert('批量刪除災區失敗，請稍後再試。');
    }
  };

  // 從垃圾桶恢復災區
  const handleRestoreArea = async (areaId) => {
    try {
      await restoreAreaFromTrash(areaId);
      await loadData();
      await loadTrashAreas();
      alert('災區已恢復');
    } catch (error) {
      console.error('Failed to restore area:', error);
      alert('恢復災區失敗，請稍後再試。');
    }
  };

  // 永久刪除災區
  const handlePermanentDeleteArea = async (areaId, areaName) => {
    if (!window.confirm(`確定要永久刪除災區 "${areaName}" 嗎？此操作無法復原！`)) {
      return;
    }

    try {
      await permanentlyDeleteArea(areaId);
      await loadTrashAreas();
      alert('災區已永久刪除');
    } catch (error) {
      console.error('Failed to permanently delete area:', error);
      const message = error.response?.data?.message || '永久刪除災區失敗';
      alert(message);
    }
  };

  // 批量還原災區
  const handleBatchRestoreAreas = async () => {
    if (selectedAreas.length === 0) {
      alert('請先選擇要還原的災區');
      return;
    }

    if (!window.confirm(`確定要還原 ${selectedAreas.length} 個災區嗎？`)) {
      return;
    }

    try {
      for (const areaId of selectedAreas) {
        await restoreAreaFromTrash(areaId);
      }
      setSelectedAreas([]);
      await loadData();
      await loadTrashAreas();
      alert(`已還原 ${selectedAreas.length} 個災區`);
    } catch (error) {
      console.error('Failed to batch restore areas:', error);
      alert('批量還原災區失敗，請稍後再試。');
    }
  };

  // 批量永久刪除災區
  const handleBatchPermanentDeleteAreas = async () => {
    if (selectedAreas.length === 0) {
      alert('請先選擇要永久刪除的災區');
      return;
    }

    if (!window.confirm(`確定要永久刪除 ${selectedAreas.length} 個災區嗎？此操作無法復原！`)) {
      return;
    }

    try {
      await batchDeleteAreas(selectedAreas);
      setSelectedAreas([]);
      await loadTrashAreas();
      alert(`已永久刪除 ${selectedAreas.length} 個災區`);
    } catch (error) {
      console.error('Failed to batch delete areas:', error);
      const message = error.response?.data?.message || '批量永久刪除災區失敗';
      alert(message);
    }
  };

  // 載入垃圾桶中的災區
  const loadTrashAreas = async () => {
    try {
      const areas = await getTrashAreas();
      setTrashAreas(areas || []);
    } catch (error) {
      console.error('Failed to load trash areas:', error);
    }
  };

  // 載入垃圾桶中的公告
  const loadTrashAnnouncements = async () => {
    try {
      const announcements = await getTrashAnnouncements();
      setTrashAnnouncements(announcements || []);
    } catch (error) {
      console.error('Failed to load trash announcements:', error);
    }
  };

  // 公告垃圾桶操作函數
  const handleAnnouncementSelect = (announcementId) => {
    setSelectedAnnouncements(prev =>
      prev.includes(announcementId)
        ? prev.filter(id => id !== announcementId)
        : [...prev, announcementId]
    );
  };

  const handleRestoreAnnouncement = async (announcementId) => {
    try {
      await restoreAnnouncementFromTrash(announcementId);
      await loadTrashAnnouncements();
      alert('公告已恢復');
    } catch (error) {
      console.error('Failed to restore announcement:', error);
      alert('恢復公告失敗，請稍後再試。');
    }
  };

  const handlePermanentDeleteAnnouncement = async (announcementId) => {
    if (!window.confirm('確定要永久刪除此公告嗎？此操作無法復原！')) {
      return;
    }

    try {
      await permanentlyDeleteAnnouncement(announcementId);
      await loadTrashAnnouncements();
      alert('公告已永久刪除');
    } catch (error) {
      console.error('Failed to permanently delete announcement:', error);
      alert('永久刪除公告失敗，請稍後再試。');
    }
  };

  const handleBatchRestoreAnnouncements = async () => {
    if (selectedAnnouncements.length === 0) {
      alert('請先選擇要還原的公告');
      return;
    }

    try {
      for (const id of selectedAnnouncements) {
        await restoreAnnouncementFromTrash(id);
      }
      setSelectedAnnouncements([]);
      await loadTrashAnnouncements();
      alert(`已還原 ${selectedAnnouncements.length} 則公告`);
    } catch (error) {
      console.error('Failed to batch restore announcements:', error);
      alert('批量還原公告失敗，請稍後再試。');
    }
  };

  const handleBatchPermanentDeleteAnnouncements = async () => {
    if (selectedAnnouncements.length === 0) {
      alert('請先選擇要永久刪除的公告');
      return;
    }

    if (!window.confirm(`確定要永久刪除 ${selectedAnnouncements.length} 則公告嗎？此操作無法復原！`)) {
      return;
    }

    try {
      await batchDeleteAnnouncements(selectedAnnouncements);
      setSelectedAnnouncements([]);
      await loadTrashAnnouncements();
      alert(`已永久刪除 ${selectedAnnouncements.length} 則公告`);
    } catch (error) {
      console.error('Failed to batch delete announcements:', error);
      const message = error.response?.data?.message || '批量永久刪除公告失敗';
      alert(message);
    }
  };

  // 黑名單用戶管理函數
  const loadBlacklistedUsers = async () => {
    try {
      const users = await getBlacklistedUsers();
      setBlacklistedUsers(users || []);
    } catch (error) {
      console.error('Failed to load blacklisted users:', error);
      alert('載入黑名單用戶失敗');
    }
  };

  const handleBlacklistUserSelect = (userId) => {
    setSelectedBlacklistUsers(prev =>
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  const handleRemoveFromBlacklist = async (userId, userName) => {
    if (!window.confirm(`確定要將用戶 "${userName}" 移出黑名單嗎？`)) return;
    try {
      await removeUserFromBlacklist(userId);
      alert('用戶已移出黑名單');
      // 重新載入所有用戶數據以更新黑名單狀態
      loadData();
    } catch (error) {
      console.error('Failed to remove user from blacklist:', error);
      alert('移出黑名單失敗');
    }
  };

  // 審計日誌管理函數
  const loadAuditLogs = useCallback(async (page = 0) => {
    setAuditLogsLoading(true);
    try {
      const limit = parseInt(auditLogsFilters.limit || '50');
      const maxLimit = Math.min(limit, 500); // 最多 500 筆

      const params = {
        limit: String(maxLimit),
        offset: String(page * maxLimit),
        ...Object.fromEntries(
          Object.entries(auditLogsFilters).filter(([k, v]) => k !== 'limit' && v !== '')
        )
      };

      const response = await getAuditLogs(params);
      setAuditLogs(response.logs || []);
      setAuditLogsTotal(Math.min(response.total || 0, 500)); // 最多顯示 500 筆
      setAuditLogsPage(page);
    } catch (error) {
      console.error('Failed to load audit logs:', error);
      // 靜默處理錯誤，不顯示警告
    } finally {
      setAuditLogsLoading(false);
    }
  }, [auditLogsFilters]);

  // 當切換到日誌管理分頁時載入審計日誌
  useEffect(() => {
    if (currentTab === 'audit-logs' && canView('audit_logs')) {
      loadAuditLogs(0);
    }
  }, [currentTab, canView, loadAuditLogs]);

  const handleExportAuditLogs = async () => {
    try {
      const params = Object.fromEntries(
        Object.entries(auditLogsFilters).filter(([k, v]) => k !== 'limit' && v !== '')
      );
      await exportAuditLogsToCSV(params);
      alert('審計日誌匯出成功！');
    } catch (error) {
      console.error('Export failed:', error);
      alert('匯出失敗，請稍後再試。');
    }
  };

  const handleClearAuditLogs = async () => {
    if (!window.confirm('確定要清除所有審計日誌嗎？\n\n此操作無法復原！')) return;
    try {
      const response = await fetch('/api/admin/audit-logs/clear', {
        method: 'DELETE',
        credentials: 'include'
      });

      if (!response.ok) throw new Error('Failed to clear audit logs');

      alert('審計日誌已清除！');
      loadAuditLogs(0); // 重新載入
    } catch (error) {
      console.error('Clear failed:', error);
      alert('清除失敗，請稍後再試。');
    }
  };

  const handleBatchDeleteBlacklistUsers = async () => {
    if (!window.confirm(`確定要永久刪除 ${selectedBlacklistUsers.length} 個黑名單用戶嗎？\n\n此操作無法復原！`)) return;
    try {
      await batchDeleteBlacklistedUsers(selectedBlacklistUsers);
      alert(`已永久刪除 ${selectedBlacklistUsers.length} 個黑名單用戶`);
      setSelectedBlacklistUsers([]);
      loadBlacklistedUsers();
    } catch (error) {
      console.error('Failed to batch delete blacklisted users:', error);
      alert('批量刪除失敗：' + (error.message || '請稍後再試'));
    }
  };

  const handleAddToBlacklist = async (userId, userName) => {
    if (!window.confirm(`確定要將用戶 "${userName}" 加入黑名單嗎？\n\n被加入黑名單的用戶將無法使用系統功能。`)) return;
    try {
      await addUserToBlacklist(userId);
      alert('用戶已加入黑名單');
      loadData(); // 重新載入用戶列表
    } catch (error) {
      console.error('Failed to add user to blacklist:', error);
      alert('加入黑名單失敗：' + (error.message || '請稍後再試'));
    }
  };

  const handleGridEdit = (grid) => {
    // 移除登入和管理員權限檢查 - 任何人都可以編輯網格
    setEditingGrid(grid);
    setShowEditGridModal(true);
  };

  const handleGridView = (grid) => {
    // For now, show grid details in an alert. Later we can implement a detailed view
    const shortageValue = grid.volunteer_needed > 0 ?
      ((grid.volunteer_needed - grid.volunteer_registered) / grid.volunteer_needed) : 0;
    const shortagePercentage = (shortageValue * 100).toFixed(0);

    alert(`網格詳情: ${grid.code}\n志工需求: ${grid.volunteer_registered}/${grid.volunteer_needed}\n缺口率: ${shortagePercentage}%\n集合地點: ${grid.meeting_point || '未設定'}\n聯絡方式: ${grid.contact_info || '未設定'}`);
  };

  const handleGridDelete = async (grid) => {
    if (!user) {
      alert('需登入才能刪除網格');
      return;
    }

    // 使用 canDeleteGrid 函數進行權限檢查
    if (!canDeleteGrid(grid)) {
      alert('您沒有刪除此網格的權限');
      return;
    }

    if (window.confirm(`確定要刪除網格 "${grid.code}" 嗎？\n\n此操作將會：\n• 刪除該網格的所有志工報名記錄\n• 刪除該網格的所有物資捐贈記錄\n• 刪除該網格的討論記錄 (如果存在)\n\n此操作無法復原，請謹慎考慮！`)) {
      try {
        // First, get all related records
        const [volunteerRegs, supplyDonations] = await Promise.all([
          VolunteerRegistration.filter({ grid_id: grid.id }),
          SupplyDonation.filter({ grid_id: grid.id })
        ]);

        // Delete all related records first
        const deletePromises = [
          // Delete volunteer registrations
          ...volunteerRegs.map(reg => VolunteerRegistration.delete(reg.id)),
          // Delete supply donations
          ...supplyDonations.map(donation => SupplyDonation.delete(donation.id)),
          // Delete grid discussions if they exist
          // ...gridDiscussions.map(discussion => GridDiscussion.delete(discussion.id))
        ];

        await Promise.all(deletePromises);
        try {
          await Grid.delete(grid.id);
        } catch (err) {
          // If backend returns 409, surface clearer message
          const msg = String(err.message || err);
          if (msg.includes('409')) {
            throw new Error('仍有相關紀錄未刪除，請稍後再試或重新整理後確認。');
          }
          throw err;
        }

        alert(`網格 "${grid.code}" 及其相關記錄已成功刪除`);
        loadData(); // Reload data
      } catch (error) {
        console.error('Failed to delete grid:', error);
        alert('刪除網格失敗，請稍後再試。如果問題持續，請聯絡系統管理員。');
      }
    }
  };

  const getGridTypeText = (type) => {
    const types = {
      mud_disposal: '污泥暫置場',
      manpower: '人力任務',
      supply_storage: '物資停放處',
      accommodation: '住宿地點',
      food_area: '領吃食區域'
    };
    return types[type] || '其他';
  };

  // 先根據 grid_type 過濾
  let filteredGrids = selectedGridType === 'all'
    ? grids
    : grids.filter(g => g.grid_type === selectedGridType);

  // 一般用戶只能看到自己建立的網格
  if (isRegularUser) {
    filteredGrids = filteredGrids.filter(g => g.created_by_id == user?.id);
  }

  // 過濾垃圾桶中的網格（一般用戶只能看到自己的）
  let filteredTrashGrids = trashGrids;
  if (isRegularUser) {
    filteredTrashGrids = trashGrids.filter(g => g.created_by_id == user?.id);
  }

  const handleRoleChange = async (targetUserId, newRole) => {
    if (!isAdmin) {
      alert('只有管理員或超級管理員（在管理視角下）可以變更權限');
      return;
    }

    if (user.id === targetUserId) {
      alert('您無法變更自己的權限');
      return;
    }

    // 只有超管可以設定 super_admin 角色
    if (newRole === 'super_admin' && !isSuperAdmin) {
      alert('只有超級管理員才能指派超級管理員權限');
      return;
    }

    const targetUser = adminUsers.find(u => u.id === targetUserId) || allUsers.find(u => u.id === targetUserId);

    if (window.confirm(`確定要將用戶 ${targetUser?.full_name || ''} 的權限變更為 ${newRole} 嗎？`)) {
      try {
        await updateUserRole(targetUserId, newRole);
        alert('用戶權限已更新');
        loadData();
      } catch (error) {
        console.error('Failed to update user role:', error);
        alert('更新權限失敗，請稍後再試。');
      }
    }
  };

  // 批量操作處理函式
  const handleSelectGrid = (gridId) => {
    setSelectedGrids(prev => {
      if (prev.includes(gridId)) {
        return prev.filter(id => id !== gridId);
      } else {
        return [...prev, gridId];
      }
    });
  };

  const handleSelectAllGrids = () => {
    const currentGrids = isTrashView ? filteredTrashGrids : filteredGrids;
    if (selectedGrids.length === currentGrids.length) {
      setSelectedGrids([]);
    } else {
      setSelectedGrids(currentGrids.map(g => g.id));
    }
  };

  const handleBatchMoveToTrash = async () => {
    if (!canView('trash_grids')) {
      alert('您沒有批量刪除的權限');
      return;
    }

    if (selectedGrids.length === 0) {
      alert('請先選擇要刪除的網格');
      return;
    }

    if (window.confirm(`確定要將 ${selectedGrids.length} 個網格移至垃圾桶嗎？`)) {
      try {
        await batchMoveGridsToTrash(selectedGrids);
        alert(`已將 ${selectedGrids.length} 個網格移至垃圾桶`);
        setSelectedGrids([]);
        loadData();
      } catch (error) {
        console.error('Failed to move grids to trash:', error);
        alert('批量刪除失敗，請稍後再試。');
      }
    }
  };

  const handleBatchRestore = async () => {
    if (!canView('trash_grids')) {
      alert('您沒有還原的權限');
      return;
    }

    if (selectedGrids.length === 0) {
      alert('請先選擇要還原的網格');
      return;
    }

    if (window.confirm(`確定要還原 ${selectedGrids.length} 個網格嗎？`)) {
      try {
        await Promise.all(selectedGrids.map(id => restoreGridFromTrash(id)));
        alert(`已還原 ${selectedGrids.length} 個網格`);
        setSelectedGrids([]);
        loadData();
      } catch (error) {
        console.error('Failed to restore grids:', error);
        alert('批量還原失敗，請稍後再試。');
      }
    }
  };

  const handleBatchPermanentDelete = async () => {
    if (!canDelete('trash_grids')) {
      alert('您沒有永久刪除的權限');
      return;
    }

    if (selectedGrids.length === 0) {
      alert('請先選擇要永久刪除的網格');
      return;
    }

    if (window.confirm(`⚠️ 警告：確定要永久刪除 ${selectedGrids.length} 個網格嗎？\n此操作無法復原！`)) {
      try {
        await batchDeleteGrids(selectedGrids);
        alert(`已永久刪除 ${selectedGrids.length} 個網格`);
        setSelectedGrids([]);
        loadData();
      } catch (error) {
        console.error('Failed to permanently delete grids:', error);
        alert('永久刪除失敗，請稍後再試。');
      }
    }
  };

  const handleMoveToTrash = async (grid) => {
    if (!canDeleteGrid(grid)) {
      alert('您沒有刪除此網格的權限');
      return;
    }

    if (window.confirm(`確定要將網格 "${grid.code}" 移至垃圾桶嗎？`)) {
      try {
        await moveGridToTrash(grid.id);
        alert(`網格 "${grid.code}" 已移至垃圾桶`);
        loadData();
      } catch (error) {
        console.error('Failed to move grid to trash:', error);
        alert('刪除失敗，請稍後再試。');
      }
    }
  };

  const handleRestoreFromTrash = async (grid) => {
    if (!canView('trash_grids')) {
      alert('您沒有還原的權限');
      return;
    }

    if (window.confirm(`確定要還原網格 "${grid.code}" 嗎？`)) {
      try {
        await restoreGridFromTrash(grid.id);
        alert(`網格 "${grid.code}" 已還原`);
        loadData();
      } catch (error) {
        console.error('Failed to restore grid:', error);
        alert('還原失敗，請稍後再試。');
      }
    }
  };

  const handlePermanentDelete = async (grid) => {
    if (!canDelete('trash_grids')) {
      alert('您沒有永久刪除的權限');
      return;
    }

    if (window.confirm(`⚠️ 警告：確定要永久刪除網格 "${grid.code}" 嗎？\n此操作無法復原！`)) {
      try {
        await permanentlyDeleteGrid(grid.id);
        alert(`網格 "${grid.code}" 已永久刪除`);
        loadData();
      } catch (error) {
        console.error('Failed to permanently delete grid:', error);
        alert('永久刪除失敗，請稍後再試。');
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // 權限檢查：訪客模式顯示無權限頁面
  // 一般用戶可以訪問管理後台來管理自己的資源
  if (!user || isGuest) {
    return (
      <UnauthorizedAccess
        title="無權限訪問管理後台"
        message="您目前的角色無法訪問管理後台。管理後台需要登入後才能使用。如需管理員功能，請聯繫管理員或切換至對應的角色視角。"
      />
    );
  }

  // 檢查是否有任何頁籤的檢視權限
  const hasAnyTabPermission =
    canView('disaster_areas') ||
    canView('grids') ||
    canView('volunteers') ||
    canView('supplies') ||
    canView('announcements') ||
    canView('users') ||
    canView('blacklist') ||
    canView('audit_logs') ||
    canView('role_permissions');

  if (!hasAnyTabPermission) {
    return (
      <UnauthorizedAccess
        title="權限不足"
        message="您目前的角色沒有訪問管理後台任何功能的權限。如需使用管理功能，請聯繫管理員調整您的權限設定。"
      />
    );
  }

  // 一般用戶有限訪問（只能管理自己的內容）
  // 網格管理員可以管理所有網格
  // 管理員和超級管理員有完整權限

  return (
    <div className="px-4 py-6 min-w-[436px]">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4 justify-between">
          <div className="flex items-center gap-3">
            <Shield className="w-8 h-8 text-blue-600" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900">管理後台</h1>
              <p className="text-gray-600">系統管理與營運監控</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* 移除了「修復網格邊界」按鈕，因為後端功能未實作 */}
          </div>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6 mb-8">
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-4">
            <div className="text-center">
              <MapPin className="w-8 h-8 text-blue-600 mx-auto mb-2 flex-shrink-0" />
              <p className="text-2xl font-bold text-gray-900">{stats.totalAreas}</p>
              <p className="text-sm text-gray-600 whitespace-nowrap">災區數量</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardContent className="p-4">
            <div className="text-center">
              <BarChart3 className="w-8 h-8 text-purple-600 mx-auto mb-2 flex-shrink-0" />
              <p className="text-2xl font-bold text-gray-900">{stats.totalGrids}</p>
              <p className="text-sm text-gray-600 whitespace-nowrap">網格總數</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardContent className="p-4">
            <div className="text-center">
              <Users className="w-8 h-8 text-green-600 mx-auto mb-2 flex-shrink-0" />
              <p className="text-2xl font-bold text-gray-900">{stats.totalVolunteers}</p>
              <p className="text-sm text-gray-600 whitespace-nowrap">志工報名</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-500">
          <CardContent className="p-4">
            <div className="text-center">
              <Package className="w-8 h-8 text-orange-600 mx-auto mb-2 flex-shrink-0" />
              <p className="text-2xl font-bold text-gray-900">{stats.totalSupplies}</p>
              <p className="text-sm text-gray-600 whitespace-nowrap">物資捐贈</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardContent className="p-4">
            <div className="text-center">
              <CheckCircle2 className="w-8 h-8 text-green-600 mx-auto mb-2 flex-shrink-0" />
              <p className="text-2xl font-bold text-gray-900">{stats.completedGrids}</p>
              <p className="text-sm text-gray-600 whitespace-nowrap">已完成</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-red-500">
          <CardContent className="p-4">
            <div className="text-center">
              <AlertTriangle className="w-8 h-8 text-red-600 mx-auto mb-2 flex-shrink-0" />
              <p className="text-2xl font-bold text-gray-900">{stats.urgentGrids}</p>
              <p className="text-sm text-gray-600 whitespace-nowrap">急需支援</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={currentTab} onValueChange={setCurrentTab} className="space-y-6">
        <TabsList>
          {canView('disaster_areas') && (
            <TabsTrigger value="areas">災區管理</TabsTrigger>
          )}
          {canView('grids') && (
            <TabsTrigger value="grids">需求管理</TabsTrigger>
          )}
          {canView('volunteers') && (
            <TabsTrigger value="volunteers">志工管理</TabsTrigger>
          )}
          {canView('supplies') && (
            <TabsTrigger value="supplies">物資管理</TabsTrigger>
          )}
          {canView('announcements') && (
            <TabsTrigger value="announcements">公告管理</TabsTrigger>
          )}
          {canView('users') && (
            <TabsTrigger value="users">用戶管理</TabsTrigger>
          )}
          {canView('blacklist') && (
            <TabsTrigger value="blacklist">黑名單用戶</TabsTrigger>
          )}
          {canView('audit_logs') && (
            <TabsTrigger value="audit-logs">日誌管理</TabsTrigger>
          )}
          {canView('role_permissions') && (
            <TabsTrigger value="permissions">權限管理</TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="areas">
          {!canView('disaster_areas') ? (
            <Card>
              <CardContent className="py-12">
                <UnauthorizedAccess
                  title="無權限訪問災區管理"
                  message="您目前的角色沒有訪問災區管理的權限。請聯繫管理員調整權限設定。"
                />
              </CardContent>
            </Card>
          ) : (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>災區管理</CardTitle>
              <div className="flex items-center gap-3">
                {canManage('grids') && !isAreaTrashView && (
                  <AreaImportExportButtons onImportSuccess={loadData} />
                )}
                {!isAreaTrashView && canCreate('disaster_areas') && (
                  <Button
                    className="bg-blue-600 hover:bg-blue-700"
                    onClick={() => setShowNewAreaModal(true)}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    新增災區
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {/* 切換正常/垃圾桶視圖 */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant={!isAreaTrashView ? 'default' : 'outline'}
                    onClick={() => {
                      setIsAreaTrashView(false);
                      setSelectedAreas([]);
                    }}
                  >
                    災區列表 ({disasterAreas.length})
                  </Button>
                  {canView('trash_areas') && (
                    <Button
                      size="sm"
                      variant={isAreaTrashView ? 'default' : 'outline'}
                      onClick={() => {
                        setIsAreaTrashView(true);
                        setSelectedAreas([]);
                        loadTrashAreas();
                      }}
                      className={isAreaTrashView ? 'bg-red-600 hover:bg-red-700' : ''}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      垃圾桶 ({trashAreas.length})
                    </Button>
                  )}
                </div>

                {/* 批量操作按鈕 */}
                {canView('trash_areas') && (
                  <div className="flex gap-2">
                    {!isAreaTrashView && selectedAreas.length > 0 && canDelete('disaster_areas') && (
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={handleBatchDeleteAreas}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        批量刪除 ({selectedAreas.length})
                      </Button>
                    )}
                    {isAreaTrashView && selectedAreas.length > 0 && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleBatchRestoreAreas}
                          className="text-green-600 hover:text-green-700 border-green-200"
                        >
                          <RotateCcw className="w-4 h-4 mr-2" />
                          批量還原 ({selectedAreas.length})
                        </Button>
                        {canDelete('trash_grids') && (
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={handleBatchPermanentDeleteAreas}
                          >
                            <XCircle className="w-4 h-4 mr-2" />
                            永久刪除 ({selectedAreas.length})
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* 全選按鈕 */}
              {canView('trash_areas') && (
                <div className="mb-4 flex items-center gap-2">
                  <Checkbox
                    checked={selectedAreas.length === (isAreaTrashView ? trashAreas : disasterAreas).length && (isAreaTrashView ? trashAreas : disasterAreas).length > 0}
                    onCheckedChange={() => {
                      const currentList = isAreaTrashView ? trashAreas : disasterAreas;
                      if (selectedAreas.length === currentList.length && currentList.length > 0) {
                        setSelectedAreas([]);
                      } else {
                        setSelectedAreas(currentList.map(a => a.id));
                      }
                    }}
                  />
                  <label
                    onClick={() => {
                      const currentList = isAreaTrashView ? trashAreas : disasterAreas;
                      if (selectedAreas.length === currentList.length && currentList.length > 0) {
                        setSelectedAreas([]);
                      } else {
                        setSelectedAreas(currentList.map(a => a.id));
                      }
                    }}
                    className="text-sm font-medium cursor-pointer select-none"
                  >
                    {selectedAreas.length === (isAreaTrashView ? trashAreas : disasterAreas).length && (isAreaTrashView ? trashAreas : disasterAreas).length > 0 ? '取消全選' : '全選'}
                  </label>
                </div>
              )}

              {/* 災區搜尋欄 - 只有網格管理員以上可以使用 */}
              {canView('trash_areas') && (
                <div className="mb-4">
                  <Input
                    placeholder="搜尋災區名稱、縣市、鄉鎮或描述..."
                    value={areaSearchTerm}
                    onChange={(e) => setAreaSearchTerm(e.target.value)}
                    className="max-w-md"
                  />
                </div>
              )}

              <div className="space-y-4">
                {(isAreaTrashView ? trashAreas : disasterAreas)
                  .filter(area => {
                    // 搜尋過濾 - 只有有權限的用戶才能搜尋
                    if (!canView('trash_areas')) return true;
                    if (!areaSearchTerm) return true;
                    const searchLower = areaSearchTerm.toLowerCase();
                    return (
                      area.name?.toLowerCase().includes(searchLower) ||
                      area.county?.toLowerCase().includes(searchLower) ||
                      area.township?.toLowerCase().includes(searchLower) ||
                      area.description?.toLowerCase().includes(searchLower)
                    );
                  })
                  .map((area) => (
                  <Card
                    key={area.id}
                    className={`border ${
                      selectedAreas.includes(area.id)
                        ? 'border-blue-500 border-2'
                        : 'border-gray-200'
                    } ${isAreaTrashView ? 'bg-red-50' : ''}`}
                  >
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start">
                        <div className="flex items-start gap-3 flex-1">
                          {canView('trash_areas') && (
                            <Checkbox
                              checked={selectedAreas.includes(area.id)}
                              onCheckedChange={() => handleAreaSelect(area.id)}
                              className="mt-1"
                            />
                          )}
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900">{area.name}</h3>
                            <p className="text-sm text-gray-600">{area.county} {area.township}</p>
                            <p className="text-xs text-gray-500 mt-1">{area.description}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge
                            className={
                              isAreaTrashView
                                ? 'bg-red-100 text-red-800'
                                : area.status === 'active'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-gray-100 text-gray-800'
                            }
                          >
                            {isAreaTrashView ? '已刪除' : area.status === 'active' ? '進行中' : area.status}
                          </Badge>
                          {isAreaTrashView ? (
                            canView('trash_areas') && (
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleRestoreArea(area.id)}
                                  className="text-green-600 hover:text-green-700"
                                >
                                  <RotateCcw className="w-4 h-4 mr-1" />
                                  恢復
                                </Button>
                                {canDelete('trash_areas') && (
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => handlePermanentDeleteArea(area.id, area.name)}
                                  >
                                    <XCircle className="w-4 h-4 mr-1" />
                                    永久刪除
                                  </Button>
                                )}
                              </div>
                            )
                          ) : (
                            (canEdit('disaster_areas') || canDelete('disaster_areas')) && (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                  >
                                    <Settings className="w-4 h-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  {canEdit('disaster_areas') && (
                                    <DropdownMenuItem onClick={() => handleAreaSettings(area)}>
                                      <Settings className="w-4 h-4 mr-2" />
                                      編輯
                                    </DropdownMenuItem>
                                  )}
                                  {canDelete('disaster_areas') && (
                                    <DropdownMenuItem
                                      className="text-red-600 focus:text-red-600 focus:bg-red-50"
                                      onClick={() => handleAreaDelete(area)}>
                                      <Trash2 className="w-4 h-4 mr-2" />
                                      刪除
                                    </DropdownMenuItem>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            )
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {(isAreaTrashView ? trashAreas : disasterAreas).length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    {isAreaTrashView ? '垃圾桶是空的' : '尚未建立任何災區'}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
          )}
        </TabsContent>

        <TabsContent value="grids">
          {!canView('grids') ? (
            <Card>
              <CardContent className="py-12">
                <UnauthorizedAccess
                  title="無權限訪問需求管理"
                  message="您目前的角色沒有訪問需求管理的權限。請聯繫管理員調整權限設定。"
                />
              </CardContent>
            </Card>
          ) : (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>地區需求調整</CardTitle>
              <div className="flex items-center gap-3">
                {canManage('grids') && (
                  <GridImportExportButtons onImportSuccess={loadData} />
                )}
                {/* 保留原有的新增網格按鈕，但改為較小的樣式 */}
                <Button
                  className="bg-purple-600 hover:bg-purple-700"
                  onClick={() => setShowNewGridModal(true)}
                  size="sm"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  新增網格
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {/* 切換正常/垃圾桶視圖 */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant={!isTrashView ? 'default' : 'outline'}
                    onClick={() => {
                      setIsTrashView(false);
                      setSelectedGrids([]);
                    }}
                  >
                    網格列表 ({isRegularUser ? grids.filter(g => g.created_by_id == user?.id).length : grids.length})
                  </Button>
                  {canView('trash_grids') && (
                    <Button
                      size="sm"
                      variant={isTrashView ? 'default' : 'outline'}
                      onClick={() => {
                        setIsTrashView(true);
                        setSelectedGrids([]);
                      }}
                      className={isTrashView ? 'bg-red-600 hover:bg-red-700' : ''}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      垃圾桶 ({filteredTrashGrids.length})
                    </Button>
                  )}
                </div>

                {/* 批量操作按鈕 */}
                {canView('trash_grids') && (
                  <div className="flex gap-2">
                    {!isTrashView && selectedGrids.length > 0 && (
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={handleBatchMoveToTrash}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        批量刪除 ({selectedGrids.length})
                      </Button>
                    )}
                    {isTrashView && selectedGrids.length > 0 && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleBatchRestore}
                          className="text-green-600 hover:text-green-700 border-green-200"
                        >
                          <RotateCcw className="w-4 h-4 mr-2" />
                          批量還原 ({selectedGrids.length})
                        </Button>
                        {canDelete('trash_grids') && (
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={handleBatchPermanentDelete}
                          >
                            <XCircle className="w-4 h-4 mr-2" />
                            永久刪除 ({selectedGrids.length})
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* 網格類型篩選（僅在非垃圾桶視圖顯示） */}
              {!isTrashView && (
                <div className="flex flex-wrap gap-2 mb-6">
                  <Button size="sm" variant={selectedGridType === 'all' ? 'default' : 'outline'} onClick={() => setSelectedGridType('all')}>全部 ({(isRegularUser ? grids.filter(g => g.created_by_id == user?.id) : grids).length})</Button>
                  <Button size="sm" variant={selectedGridType === 'manpower' ? 'default' : 'outline'} onClick={() => setSelectedGridType('manpower')}>人力任務 ({(isRegularUser ? grids.filter(g => g.created_by_id == user?.id && g.grid_type === 'manpower') : grids.filter(g=>g.grid_type === 'manpower')).length})</Button>
                  <Button size="sm" variant={selectedGridType === 'mud_disposal' ? 'default' : 'outline'} onClick={() => setSelectedGridType('mud_disposal')}>污泥暫置場 ({(isRegularUser ? grids.filter(g => g.created_by_id == user?.id && g.grid_type === 'mud_disposal') : grids.filter(g=>g.grid_type === 'mud_disposal')).length})</Button>
                  <Button size="sm" variant={selectedGridType === 'supply_storage' ? 'default' : 'outline'} onClick={() => setSelectedGridType('supply_storage')}>物資停放處 ({(isRegularUser ? grids.filter(g => g.created_by_id == user?.id && g.grid_type === 'supply_storage') : grids.filter(g=>g.grid_type === 'supply_storage')).length})</Button>
                  <Button size="sm" variant={selectedGridType === 'accommodation' ? 'default' : 'outline'} onClick={() => setSelectedGridType('accommodation')}>住宿地點 ({(isRegularUser ? grids.filter(g => g.created_by_id == user?.id && g.grid_type === 'accommodation') : grids.filter(g=>g.grid_type === 'accommodation')).length})</Button>
                  <Button size="sm" variant={selectedGridType === 'food_area' ? 'default' : 'outline'} onClick={() => setSelectedGridType('food_area')}>領吃食區域 ({(isRegularUser ? grids.filter(g => g.created_by_id == user?.id && g.grid_type === 'food_area') : grids.filter(g=>g.grid_type === 'food_area')).length})</Button>
                </div>
              )}

              {/* 全選按鈕 */}
              {canView('trash_grids') && (
                <div className="mb-4 flex items-center gap-2">
                  <Checkbox
                    checked={selectedGrids.length === (isTrashView ? filteredTrashGrids : filteredGrids).length && (isTrashView ? filteredTrashGrids : filteredGrids).length > 0}
                    onCheckedChange={handleSelectAllGrids}
                  />
                  <label
                    onClick={handleSelectAllGrids}
                    className="text-sm font-medium cursor-pointer select-none"
                  >
                    {selectedGrids.length === (isTrashView ? filteredTrashGrids : filteredGrids).length && (isTrashView ? filteredTrashGrids : filteredGrids).length > 0 ? '取消全選' : '全選'}
                  </label>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {(isTrashView ? filteredTrashGrids : filteredGrids).map((grid) => {
                  const shortage = grid.volunteer_needed ? (grid.volunteer_needed - grid.volunteer_registered) / grid.volunteer_needed : 0;
                  const urgency = shortage >= 0.6 ? 'urgent' : shortage >= 0.4 ? 'moderate' : 'low';
                  const isSelected = selectedGrids.includes(grid.id);

                  return (
                    <Card key={grid.id} className={`border-l-4 ${
                      isTrashView ? 'border-l-gray-400 bg-gray-50' :
                      urgency === 'urgent' ? 'border-l-red-500' :
                      urgency === 'moderate' ? 'border-l-orange-500' :
                      'border-l-green-500'
                    } ${isSelected ? 'ring-2 ring-blue-500' : ''}`}>
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex items-start gap-2">
                            {/* 批量操作checkbox - 根據權限顯示 */}
                            {canDeleteGrid(grid) && (
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={() => handleSelectGrid(grid.id)}
                                className="mt-1"
                              />
                            )}
                            <h3 className="font-bold text-lg">{grid.code}</h3>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            {isTrashView && (
                              <Badge className="bg-red-100 text-red-800">
                                已刪除
                              </Badge>
                            )}
                            <Badge className={
                              grid.status === 'completed' ? 'bg-green-100 text-green-800' :
                              grid.status === 'open' ? 'bg-blue-100 text-blue-800' :
                              'bg-gray-100 text-gray-800'
                            }>
                              {grid.status === 'completed' ? '已完成' :
                               grid.status === 'open' ? '開放中' : '準備中'}
                            </Badge>
                             <Badge variant="secondary" className="text-xs">
                              {getGridTypeText(grid.grid_type)}
                            </Badge>
                          </div>
                        </div>

                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600">志工:</span>
                            <span className="font-medium">
                              {grid.volunteer_registered}/{grid.volunteer_needed}
                            </span>
                          </div>

                          {grid.supplies_needed?.length > 0 && (
                            <div className="flex justify-between">
                              <span className="text-gray-600">物資:</span>
                              <span className="font-medium">
                                {grid.supplies_needed.length} 項目
                              </span>
                            </div>
                          )}

                          {grid.meeting_point && (
                            <div className="text-xs text-gray-500 mt-2">
                              集合: {grid.meeting_point}
                            </div>
                          )}
                        </div>

                        <div className="mt-4 flex gap-2">
                          {!isTrashView ? (
                            <>
                              {canEditGrid(grid) && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="flex-1"
                                  onClick={() => handleGridEdit(grid)}
                                >
                                  編輯
                                </Button>
                              )}
                              <Button
                                size="sm"
                                variant="outline"
                                className="flex-1"
                                onClick={() => handleGridView(grid)}
                              >
                                查看
                              </Button>
                              {/* Delete: 根據權限顯示 */}
                              {canDeleteGrid(grid) && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-red-600 hover:text-red-700 hover:border-red-300 border-red-200"
                                  onClick={() => handleMoveToTrash(grid)}
                                  title="移至垃圾桶"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              )}
                            </>
                          ) : (
                            <>
                              {/* 垃圾桶視圖的操作按鈕 */}
                              {canView('trash_grids') && (
                                <>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="flex-1 text-green-600 hover:text-green-700 border-green-200"
                                    onClick={() => handleRestoreFromTrash(grid)}
                                    title="還原網格"
                                  >
                                    <RotateCcw className="w-4 h-4 mr-1" />
                                    還原
                                  </Button>
                                  {canDelete('trash_grids') && (
                                    <Button
                                      size="sm"
                                      variant="destructive"
                                      className="flex-1"
                                      onClick={() => handlePermanentDelete(grid)}
                                      title="永久刪除"
                                    >
                                      <XCircle className="w-4 h-4 mr-1" />
                                      永久刪除
                                    </Button>
                                  )}
                                </>
                              )}
                            </>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {/* 空狀態提示 */}
              {isTrashView && filteredTrashGrids.length === 0 && (
                <div className="text-center py-12">
                  <Trash2 className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                  <p className="text-gray-500">垃圾桶是空的</p>
                </div>
              )}
              {!isTrashView && filteredGrids.length === 0 && (
                <div className="text-center py-12">
                  <BarChart3 className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                  <p className="text-gray-500">目前沒有符合條件的網格</p>
                </div>
              )}
            </CardContent>
          </Card>
          )}
        </TabsContent>

        <TabsContent value="volunteers">
          {!canView('volunteers') ? (
            <Card>
              <CardContent className="py-12">
                <UnauthorizedAccess
                  title="無權限訪問志工管理"
                  message="您目前的角色沒有訪問志工管理的權限。請聯繫管理員調整權限設定。"
                />
              </CardContent>
            </Card>
          ) : (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>志工管理</CardTitle>
              {canManage('volunteers') && (
                <VolunteerImportExportButtons onImportSuccess={loadData} />
              )}
            </CardHeader>
            <CardContent>
              {/* Stats Overview */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-6 mb-6">
              <Card className="border-l-4 border-l-yellow-500">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-yellow-100 rounded-lg">
                      <Clock className="w-6 h-6 text-yellow-600" />
                    </div>
                    <div>
                      <p className="text-3xl font-bold text-gray-900">
                        {registrations.filter(r => r.status === 'pending').length}
                      </p>
                      <p className="text-sm text-gray-600">待確認</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-blue-500">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-blue-100 rounded-lg">
                      <CheckCircle2 className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-3xl font-bold text-gray-900">
                        {registrations.filter(r => r.status === 'confirmed').length}
                      </p>
                      <p className="text-sm text-gray-600">已確認</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-green-500">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-green-100 rounded-lg">
                      <Users className="w-6 h-6 text-green-600" />
                    </div>
                    <div>
                      <p className="text-3xl font-bold text-gray-900">
                        {registrations.filter(r => r.status === 'completed').length}
                      </p>
                      <p className="text-sm text-gray-600">已完成</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

              {/* 詳細志工管理按鈕 */}
              <div className="text-center mt-6">
                <Link to={createPageUrl("Volunteers")}>
                  <Button className="bg-green-600 hover:bg-green-700">
                    查看詳細志工管理
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
          )}
        </TabsContent>

        <TabsContent value="supplies">
          {!canView('supplies') ? (
            <Card>
              <CardContent className="py-12">
                <UnauthorizedAccess
                  title="無權限訪問物資管理"
                  message="您目前的角色沒有訪問物資管理的權限。請聯繫管理員調整權限設定。"
                />
              </CardContent>
            </Card>
          ) : (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>物資管理概覽</CardTitle>
              {canManage('supplies') && (
                <SupplyImportExportButtons onImportSuccess={loadData} />
              )}
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <Card className="border border-gray-200">
                  <CardContent className="p-4 text-center">
                    <Clock className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-gray-900">
                      {donations.filter(d => d.status === 'pledged').length}
                    </p>
                    <p className="text-sm text-gray-600">已承諾</p>
                  </CardContent>
                </Card>

                <Card className="border border-gray-200">
                  <CardContent className="p-4 text-center">
                    <Package className="w-8 h-8 text-yellow-600 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-gray-900">
                      {donations.filter(d => d.status === 'in_transit').length}
                    </p>
                    <p className="text-sm text-gray-600">運送中</p>
                  </CardContent>
                </Card>

                <Card className="border border-gray-200">
                  <CardContent className="p-4 text-center">
                    <CheckCircle2 className="w-8 h-8 text-green-600 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-gray-900">
                      {donations.filter(d => d.status === 'delivered').length}
                    </p>
                    <p className="text-sm text-gray-600">已送達</p>
                  </CardContent>
                </Card>
              </div>

              <div className="text-center">
                <Link to={createPageUrl("Supplies")}>
                  <Button className="bg-orange-600 hover:bg-orange-700">
                    查看詳細物資管理
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
          )}
        </TabsContent>

        <TabsContent value="users">
          {!canView('users') ? (
            <Card>
              <CardContent className="py-12">
                <UnauthorizedAccess
                  title="無權限訪問用戶管理"
                  message="您目前的角色沒有訪問用戶管理的權限。請聯繫管理員調整權限設定。"
                />
              </CardContent>
            </Card>
          ) : (
          <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <UserCog className="w-5 h-5 text-indigo-600" />
                    用戶權限管理
                  </CardTitle>
                  <p className="text-sm text-gray-600 mt-2">
                    管理系統用戶的角色和權限。只有管理員（管理模式）可以變更用戶權限。
                  </p>
                </div>
                <UserImportExportButtons onImportSuccess={loadData} />
              </CardHeader>
              <CardContent>
                {(adminUsers.length > 0 || allUsers.length > 0) ? (
                  <div className="space-y-3">
                    {/* 優先顯示 adminUsers，如果沒有則顯示 allUsers */}
                    {(adminUsers.length > 0 ? adminUsers : allUsers).map((u) => {
                      const isBlacklisted = u.is_blacklisted || false;
                      return (
                      <Card key={u.id} className={`border ${isBlacklisted ? 'border-red-300 bg-red-50/30' : 'border-gray-200 hover:border-blue-300'} transition-colors`}>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-full ${isBlacklisted ? 'bg-gradient-to-br from-red-400 to-red-600' : 'bg-gradient-to-br from-blue-400 to-indigo-500'} flex items-center justify-center text-white font-bold`}>
                                  {u.full_name?.charAt(0) || u.email?.charAt(0) || '?'}
                                </div>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <p className={`font-semibold text-lg ${isBlacklisted ? 'text-gray-500 line-through' : 'text-gray-900'}`}>{u.full_name}</p>
                                    {isBlacklisted && (
                                      <Badge className="bg-red-600 text-white text-xs">
                                        <XCircle className="w-3 h-3 mr-1" />
                                        黑名單
                                      </Badge>
                                    )}
                                  </div>
                                  <p className={`text-sm ${isBlacklisted ? 'text-gray-400' : 'text-gray-500'}`}>{u.email}</p>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-4">
                              <div className="text-right">
                                <Badge
                                  variant="secondary"
                                  className={
                                    u.role === 'super_admin' ? 'bg-purple-100 text-purple-800' :
                                    u.role === 'admin' ? 'bg-red-100 text-red-800' :
                                    u.role === 'grid_manager' ? 'bg-blue-100 text-blue-800' :
                                    'bg-gray-100 text-gray-800'
                                  }
                                >
                                  {u.role === 'super_admin' ? '超級管理員' :
                                   u.role === 'admin' ? '管理員' :
                                   u.role === 'grid_manager' ? '網格管理者' :
                                   '一般用戶'}
                                </Badge>
                              </div>
                              <Select
                                value={u.role}
                                onValueChange={(newRole) => handleRoleChange(u.id, newRole)}
                                disabled={user.id === u.id || isBlacklisted}
                              >
                                <SelectTrigger className="w-36">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="user">
                                    <div className="flex items-center gap-2">
                                      <Users className="w-4 h-4" />
                                      一般用戶
                                    </div>
                                  </SelectItem>
                                  <SelectItem value="grid_manager">
                                    <div className="flex items-center gap-2">
                                      <Settings className="w-4 h-4" />
                                      網格管理者
                                    </div>
                                  </SelectItem>
                                  <SelectItem value="admin">
                                    <div className="flex items-center gap-2">
                                      <Shield className="w-4 h-4" />
                                      管理員
                                    </div>
                                  </SelectItem>
                                  {user?.role === 'super_admin' && (
                                    <SelectItem value="super_admin">
                                      <div className="flex items-center gap-2">
                                        <Shield className="w-4 h-4 text-purple-600" />
                                        超級管理員
                                      </div>
                                    </SelectItem>
                                  )}
                                </SelectContent>
                              </Select>
                              {isSuperAdmin && user.id !== u.id && (
                                isBlacklisted ? (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="border-green-500 text-green-600 hover:bg-green-50"
                                    onClick={() => handleRemoveFromBlacklist(u.id, u.full_name)}
                                  >
                                    移出黑名單
                                  </Button>
                                ) : (
                                  <Button
                                    variant="destructive"
                                    size="sm"
                                    onClick={() => handleAddToBlacklist(u.id, u.full_name)}
                                  >
                                    加入黑名單
                                  </Button>
                                )
                              )}
                            </div>
                          </div>
                          {user.id === u.id && (
                            <p className="text-xs text-gray-500 mt-2">（您無法變更自己的權限）</p>
                          )}
                          {isBlacklisted && (
                            <p className="text-xs text-red-500 mt-2">（此用戶已被加入黑名單，無法變更權限）</p>
                          )}
                        </CardContent>
                      </Card>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <UserCog className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                    <p className="text-gray-500">無法載入用戶列表或您沒有權限查看</p>
                    <p className="text-sm text-gray-400 mt-2">請確認您有管理員權限並處於管理模式</p>
                  </div>
                )}

                {/* 用戶角色說明 */}
                <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <h4 className="font-semibold text-blue-900 mb-2">角色權限說明</h4>
                  <div className="space-y-2 text-sm text-blue-800">
                    {isSuperAdmin && (
                      <div className="flex items-start gap-2">
                        <Shield className="w-4 h-4 mt-0.5 flex-shrink-0 text-purple-600" />
                        <div>
                          <strong>超級管理員：</strong>最高權限，可以管理所有功能、設定其他超級管理員、管理黑名單用戶
                        </div>
                      </div>
                    )}
                    <div className="flex items-start gap-2">
                      <Shield className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <div>
                        <strong>管理員：</strong>擁有大部分權限，可以管理災區、網格、用戶權限、CSV 匯入/匯出等
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <Settings className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <div>
                        <strong>網格管理者：</strong>可以管理被指派的網格，編輯網格資訊
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <Users className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <div>
                        <strong>一般用戶：</strong>可以瀏覽網格、報名志工、捐贈物資
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* 黑名單用戶分頁 */}
        <TabsContent value="blacklist">
          {!canView('blacklist') ? (
            <Card>
              <CardContent className="py-12">
                <UnauthorizedAccess
                  title="無權限訪問黑名單管理"
                  message="您目前的角色沒有訪問黑名單管理的權限。請聯繫管理員調整權限設定。"
                />
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-red-600">
                      <XCircle className="w-5 h-5" />
                      黑名單用戶管理
                    </CardTitle>
                    <p className="text-sm text-gray-600 mt-2">
                      管理被加入黑名單的用戶。只有超級管理員可以查看和管理黑名單。
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <BlacklistImportExportButtons onImportSuccess={loadBlacklistedUsers} />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={loadBlacklistedUsers}
                    >
                      <RotateCcw className="w-4 h-4 mr-2" />
                      重新載入
                    </Button>
                    {selectedBlacklistUsers.length > 0 && (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={handleBatchDeleteBlacklistUsers}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        批量永久刪除 ({selectedBlacklistUsers.length})
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {blacklistedUsers.length > 0 ? (
                  <div className="space-y-3">
                    {blacklistedUsers.map((u) => (
                      <Card
                        key={u.id}
                        className={`border-2 transition-colors ${
                          selectedBlacklistUsers.includes(u.id)
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-red-200 bg-red-50'
                        }`}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3 flex-1">
                              <Checkbox
                                checked={selectedBlacklistUsers.includes(u.id)}
                                onCheckedChange={() => handleBlacklistUserSelect(u.id)}
                              />
                              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-400 to-red-600 flex items-center justify-center text-white font-bold">
                                {u.name?.charAt(0) || u.email?.charAt(0) || '?'}
                              </div>
                              <div className="flex-1">
                                <p className="font-semibold text-lg text-gray-900">{u.name}</p>
                                <p className="text-sm text-gray-600">{u.email}</p>
                                <div className="flex items-center gap-2 mt-1">
                                  <Badge variant="secondary" className="bg-red-100 text-red-800">
                                    黑名單
                                  </Badge>
                                  <Badge
                                    variant="secondary"
                                    className={
                                      u.role === 'admin' || u.role === 'super_admin'
                                        ? 'bg-orange-100 text-orange-800'
                                        : 'bg-gray-100 text-gray-800'
                                    }
                                  >
                                    {u.role === 'super_admin' ? '超級管理員' :
                                     u.role === 'admin' ? '管理員' :
                                     u.role === 'grid_manager' ? '網格管理者' :
                                     '一般用戶'}
                                  </Badge>
                                  <span className="text-xs text-gray-500">
                                    加入時間：{new Date(u.created_at).toLocaleDateString('zh-TW')}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleRemoveFromBlacklist(u.id, u.name)}
                              className="border-green-500 text-green-600 hover:bg-green-50"
                            >
                              <CheckCircle2 className="w-4 h-4 mr-2" />
                              移出黑名單
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <CheckCircle2 className="w-16 h-16 mx-auto text-green-300 mb-4" />
                    <p className="text-gray-500">目前沒有黑名單用戶</p>
                    <p className="text-sm text-gray-400 mt-2">系統運作正常，沒有用戶被加入黑名單</p>
                  </div>
                )}

                {/* 黑名單說明 */}
                <div className="mt-6 p-4 bg-red-50 rounded-lg border border-red-200">
                  <h4 className="font-semibold text-red-900 mb-2">⚠️ 黑名單管理注意事項</h4>
                  <div className="space-y-2 text-sm text-red-800">
                    <div className="flex items-start gap-2">
                      <XCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <div>
                        <strong>加入黑名單：</strong>被加入黑名單的用戶將無法使用系統功能
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <div>
                        <strong>移出黑名單：</strong>可以恢復用戶的正常使用權限
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <Trash2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <div>
                        <strong>永久刪除：</strong>只能刪除黑名單中的用戶，此操作無法復原
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <Shield className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <div>
                        <strong>權限保護：</strong>超級管理員無法將自己加入黑名單或刪除自己
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* 審計日誌分頁 */}
        <TabsContent value="audit-logs">
          {!canView('audit_logs') ? (
            <Card>
              <CardContent className="py-12">
                <UnauthorizedAccess
                  title="無權限訪問日誌管理"
                  message="您目前的角色沒有訪問日誌管理的權限。請聯繫管理員調整權限設定。"
                />
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-indigo-600" />
                  日誌管理
                </CardTitle>
                <p className="text-sm text-gray-600 mt-2">
                  記錄系統中所有重要操作，用於安全審計和防範有心人士。只有超級管理員可以查看審計日誌。
                </p>
              </CardHeader>
              <CardContent>
                {/* 日誌類型切換 */}
                <div className="flex gap-2 mb-6 pb-4 border-b">
                  <Button
                    size="sm"
                    variant={logType === 'admin' ? 'default' : 'outline'}
                    onClick={() => setLogType('admin')}
                  >
                    管理操作日誌
                  </Button>
                  <Button
                    size="sm"
                    variant={logType === 'http' ? 'default' : 'outline'}
                    onClick={() => setLogType('http')}
                  >
                    HTTP 請求日誌
                  </Button>
                </div>

                {logType === 'admin' ? (
                  <>
                {/* 統計資訊 */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-lg border border-blue-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-blue-600 font-medium">總日誌數</p>
                        <p className="text-2xl font-bold text-blue-900 mt-1">
                          {auditLogsTotal}
                        </p>
                      </div>
                      <BarChart3 className="w-8 h-8 text-blue-500 opacity-50" />
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-lg border border-purple-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-purple-600 font-medium">超級管理員操作</p>
                        <p className="text-2xl font-bold text-purple-900 mt-1">
                          {auditLogs.filter(log => log.user_role === 'super_admin').length}
                        </p>
                      </div>
                      <Shield className="w-8 h-8 text-purple-500 opacity-50" />
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-4 rounded-lg border border-orange-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-orange-600 font-medium">管理員操作</p>
                        <p className="text-2xl font-bold text-orange-900 mt-1">
                          {auditLogs.filter(log => log.user_role === 'admin').length}
                        </p>
                      </div>
                      <Users className="w-8 h-8 text-orange-500 opacity-50" />
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-lg border border-green-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-green-600 font-medium">最近24小時</p>
                        <p className="text-2xl font-bold text-green-900 mt-1">
                          {auditLogs.filter(log => {
                            const logDate = new Date(log.created_at);
                            const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
                            return logDate >= oneDayAgo;
                          }).length}
                        </p>
                      </div>
                      <Clock className="w-8 h-8 text-green-500 opacity-50" />
                    </div>
                  </div>
                </div>

                {/* 篩選和操作 */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>管理操作審計日誌</span>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => loadAuditLogs(0)}
                          disabled={auditLogsLoading}
                        >
                          <RefreshCw className={`w-4 h-4 mr-2 ${auditLogsLoading ? 'animate-spin' : ''}`} />
                          重新整理
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleExportAuditLogs}
                        >
                          <Download className="w-4 h-4 mr-2" />
                          匯出 CSV
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={handleClearAuditLogs}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          清除日誌
                        </Button>
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {/* 篩選區域 */}
                    <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-4">
                      <Select
                        value={auditLogsFilters.user_role || "all"}
                        onValueChange={(value) => {
                          setAuditLogsFilters({ ...auditLogsFilters, user_role: value === "all" ? "" : value });
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="權限等級" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">全部權限</SelectItem>
                          <SelectItem value="super_admin">超級管理員</SelectItem>
                          <SelectItem value="admin">管理員</SelectItem>
                          <SelectItem value="grid_manager">網格管理員</SelectItem>
                          <SelectItem value="user">一般用戶</SelectItem>
                        </SelectContent>
                      </Select>

                      <Select
                        value={auditLogsFilters.action_type || "all"}
                        onValueChange={(value) => {
                          setAuditLogsFilters({ ...auditLogsFilters, action_type: value === "all" ? "" : value });
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="操作類型" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">全部操作</SelectItem>
                          <SelectItem value="create">新增</SelectItem>
                          <SelectItem value="update">更新</SelectItem>
                          <SelectItem value="delete">刪除</SelectItem>
                          <SelectItem value="login">登入</SelectItem>
                          <SelectItem value="export">匯出</SelectItem>
                          <SelectItem value="import">匯入</SelectItem>
                        </SelectContent>
                      </Select>

                      <Input
                        type="date"
                        value={auditLogsFilters.start_date}
                        onChange={(e) => {
                          setAuditLogsFilters({ ...auditLogsFilters, start_date: e.target.value });
                        }}
                        placeholder="開始日期"
                      />

                      <Input
                        type="date"
                        value={auditLogsFilters.end_date}
                        onChange={(e) => {
                          setAuditLogsFilters({ ...auditLogsFilters, end_date: e.target.value });
                        }}
                        placeholder="結束日期"
                      />

                      <Select
                        value={auditLogsFilters.limit}
                        onValueChange={(value) => {
                          setAuditLogsFilters({ ...auditLogsFilters, limit: value });
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="10">10 筆</SelectItem>
                          <SelectItem value="25">25 筆</SelectItem>
                          <SelectItem value="50">50 筆</SelectItem>
                          <SelectItem value="100">100 筆</SelectItem>
                          <SelectItem value="200">200 筆</SelectItem>
                          <SelectItem value="500">500 筆</SelectItem>
                        </SelectContent>
                      </Select>

                      <Button onClick={() => loadAuditLogs(0)} className="w-full">
                        <Search className="w-4 h-4 mr-2" />
                        搜尋
                      </Button>
                    </div>

                    {/* 日誌列表 */}
                    {auditLogsLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
                  </div>
                ) : auditLogs.length > 0 ? (
                  <div className="space-y-2">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-100">
                          <tr>
                            <th className="px-4 py-2 text-left">權限等級</th>
                            <th className="px-4 py-2 text-left">
                              <div className="flex items-center gap-2">
                                LINE ID
                                <button
                                  onClick={() => setShowLineIds(!showLineIds)}
                                  className="text-gray-500 hover:text-gray-700"
                                  title={showLineIds ? "隱藏 LINE ID" : "顯示 LINE ID"}
                                >
                                  {showLineIds ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                              </div>
                            </th>
                            <th className="px-4 py-2 text-left">LINE 名稱</th>
                            <th className="px-4 py-2 text-left">操作</th>
                            <th className="px-4 py-2 text-left">資源類型</th>
                            <th className="px-4 py-2 text-left">
                              <div className="flex items-center gap-2">
                                IP位址
                                <button
                                  onClick={() => setShowIpAddresses(!showIpAddresses)}
                                  className="text-gray-500 hover:text-gray-700"
                                  title={showIpAddresses ? "隱藏 IP" : "顯示 IP"}
                                >
                                  {showIpAddresses ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                              </div>
                            </th>
                            <th className="px-4 py-2 text-left">日期時間</th>
                          </tr>
                        </thead>
                        <tbody>
                          {auditLogs.map((log) => (
                            <tr key={log.id} className="border-b hover:bg-gray-50">
                              <td className="px-4 py-2">
                                <Badge variant="secondary" className={
                                  log.user_role === 'super_admin' ? 'bg-purple-100 text-purple-800' :
                                  log.user_role === 'admin' ? 'bg-orange-100 text-orange-800' :
                                  log.user_role === 'grid_manager' ? 'bg-blue-100 text-blue-800' :
                                  'bg-gray-100 text-gray-800'
                                }>
                                  {log.user_role === 'super_admin' ? '超級管理員' :
                                   log.user_role === 'admin' ? '管理員' :
                                   log.user_role === 'grid_manager' ? '網格管理員' :
                                   '一般用戶'}
                                </Badge>
                              </td>
                              <td className="px-4 py-2 font-mono text-xs">
                                {showLineIds ? (log.line_id || '-') : '••••••••••••••••••'}
                              </td>
                              <td className="px-4 py-2">{log.line_name || '-'}</td>
                              <td className="px-4 py-2">{log.action}</td>
                              <td className="px-4 py-2">{log.resource_type || '-'}</td>
                              <td className="px-4 py-2 font-mono text-xs">
                                {showIpAddresses ? (log.ip_address || '-') : '•••.•••.•••.•••'}
                              </td>
                              <td className="px-4 py-2 whitespace-nowrap">
                                {new Date(log.created_at).toLocaleString('zh-TW')}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* 分頁 */}
                    <div className="flex items-center justify-between mt-4 p-4 bg-gray-50 rounded-lg">
                      <div className="text-sm text-gray-600">
                        {(() => {
                          const limit = parseInt(auditLogsFilters.limit || '50');
                          const start = auditLogsPage * limit + 1;
                          const end = Math.min((auditLogsPage + 1) * limit, auditLogsTotal);
                          return `顯示 ${start} - ${end} / 共 ${auditLogsTotal} 筆（最多顯示 500 筆）`;
                        })()}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => loadAuditLogs(auditLogsPage - 1)}
                          disabled={auditLogsPage === 0}
                        >
                          上一頁
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => loadAuditLogs(auditLogsPage + 1)}
                          disabled={(auditLogsPage + 1) * parseInt(auditLogsFilters.limit || '50') >= auditLogsTotal}
                        >
                          下一頁
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <BarChart3 className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                    <p className="text-gray-500">目前沒有審計日誌</p>
                    <p className="text-sm text-gray-400 mt-2">系統操作記錄將會顯示在這裡</p>
                  </div>
                )}

                    {/* 說明 */}
                    <div className="mt-6 p-4 bg-indigo-50 rounded-lg border border-indigo-200">
                      <h4 className="font-semibold text-indigo-900 mb-2">📊 審計日誌說明</h4>
                      <div className="space-y-2 text-sm text-indigo-800">
                        <p><strong>權限等級：</strong>記錄操作者的系統權限等級</p>
                        <p><strong>LINE ID / 名稱：</strong>記錄操作者的 LINE 帳號識別資訊</p>
                        <p><strong>操作：</strong>記錄具體的操作行為（如：變更權限、刪除資料等）</p>
                        <p><strong>資源類型：</strong>被操作的資源類型（如：用戶、網格、災區等）</p>
                        <p><strong>IP位址：</strong>記錄操作來源 IP，用於追蹤異常行為</p>
                        <p><strong>日期時間：</strong>精確記錄操作發生的時間</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                  </>
                ) : (
                  <HttpAuditLogs />
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* 公告管理頁籤 */}
        <TabsContent value="announcements">
          {!canView('announcements') ? (
            <Card>
              <CardContent className="py-12">
                <UnauthorizedAccess
                  title="無權限訪問公告管理"
                  message="您目前的角色沒有訪問公告管理的權限。請聯繫管理員調整權限設定。"
                />
              </CardContent>
            </Card>
          ) : (
            <AnnouncementManagement />
          )}
        </TabsContent>

        {/* 權限設定頁籤 */}
        <TabsContent value="permissions">
          {!canView('role_permissions') ? (
            <Card>
              <CardContent className="py-12">
                <UnauthorizedAccess
                  title="無權限訪問權限設定"
                  message="您目前的角色沒有訪問權限設定的權限。請聯繫管理員調整權限設定。"
                />
              </CardContent>
            </Card>
          ) : (
            <PermissionManagement />
          )}
        </TabsContent>
      </Tabs>

      {/* New Area Modal with Map */}
      {showNewAreaModal && (
        <AddAreaModal
          isOpen={showNewAreaModal}
          onClose={() => setShowNewAreaModal(false)}
          onSuccess={() => {
            setShowNewAreaModal(false);
            loadData();
          }}
        />
      )}

      {/* New Grid Modal */}
      {showNewGridModal && (
        <AddGridModal
          isOpen={showNewGridModal}
          onClose={() => setShowNewGridModal(false)}
          onSuccess={() => {
            setShowNewGridModal(false);
            loadData();
          }}
          disasterAreas={disasterAreas}
        />
      )}

      {/* Edit Area Modal */}
      {showEditAreaModal && (
        <EditAreaModal
          isOpen={showEditAreaModal}
          onClose={() => setShowEditAreaModal(false)}
          onSuccess={() => {
            setShowEditAreaModal(false);
            loadData();
          }}
          area={editingArea}
        />
      )}

      {/* Edit Grid Modal */}
      {showEditGridModal && (
        <EditGridModal
          isOpen={showEditGridModal}
          onClose={() => setShowEditGridModal(false)}
          onSuccess={() => {
            setShowEditGridModal(false);
            loadData();
          }}
          grid={editingGrid}
        />
      )}
    </div>
  );
}
