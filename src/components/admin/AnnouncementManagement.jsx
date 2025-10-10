import React, { useState, useEffect } from "react";
import { Announcement } from "@/api/entities";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertCircle,
  Plus,
  Edit,
  Trash2,
  Search,
  Pin,
  ArrowUp,
  ArrowDown,
  RotateCcw,
  XCircle,
  CheckCircle2,
} from "lucide-react";
import AnnouncementModal from "@/components/map/AnnouncementModal";
import AnnouncementImportExportButtons from "@/components/admin/AnnouncementImportExportButtons";
import { usePermission } from "@/hooks/usePermission";
import {
  moveAnnouncementToTrash,
  batchMoveAnnouncementsToTrash,
  getTrashAnnouncements,
  restoreAnnouncementFromTrash,
  permanentlyDeleteAnnouncement,
  batchDeleteAnnouncements
} from "@/api/admin";

export default function AnnouncementManagement() {
  const [announcements, setAnnouncements] = useState([]);
  const [filteredAnnouncements, setFilteredAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [showModal, setShowModal] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState(null);
  const [selectedAnnouncements, setSelectedAnnouncements] = useState([]);

  // 垃圾桶相關狀態
  const [trashAnnouncements, setTrashAnnouncements] = useState([]);
  const [isTrashView, setIsTrashView] = useState(false);

  // 訊息提示狀態
  const [message, setMessage] = useState(null);

  const { canCreate, canEdit, canDelete, canView, canManage } = usePermission();

  // 訊息提示函數
  const showMessage = (text, type = 'info') => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 3000);
  };

  useEffect(() => {
    loadAnnouncements();
    loadTrashAnnouncements();
  }, []);

  useEffect(() => {
    filterAnnouncements();
  }, [announcements, searchTerm, selectedCategory]);

  const loadAnnouncements = async () => {
    try {
      setLoading(true);
      const data = await Announcement.list('created_at');
      setAnnouncements(data);
    } catch (error) {
      console.error("載入公告失敗:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadTrashAnnouncements = async () => {
    try {
      const response = await getTrashAnnouncements();
      const data = Array.isArray(response?.data)
        ? response.data
        : Array.isArray(response)
        ? response
        : [];
      setTrashAnnouncements(data);
    } catch (error) {
      console.error("載入垃圾桶公告失敗:", error);
      setTrashAnnouncements([]);
    }
  };

  const filterAnnouncements = () => {
    let filtered = [...announcements];

    if (searchTerm) {
      filtered = filtered.filter(
        (a) =>
          a.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          a.content?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (selectedCategory !== "all") {
      filtered = filtered.filter((a) => a.category === selectedCategory);
    }

    setFilteredAnnouncements(filtered);
  };

  const handleAdd = () => {
    setEditingAnnouncement(null);
    setShowModal(true);
  };

  const handleEdit = (announcement) => {
    setEditingAnnouncement(announcement);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm("確定要將此公告移至垃圾桶嗎？")) {
      try {
        await moveAnnouncementToTrash(id);
        await loadAnnouncements();
        await loadTrashAnnouncements();
        showMessage("已移至垃圾桶", "success");
      } catch (error) {
        console.error("移至垃圾桶失敗:", error);
        showMessage("移至垃圾桶失敗，請稍後再試。", "error");
      }
    }
  };

  const handleBatchDelete = async () => {
    if (selectedAnnouncements.length === 0) {
      showMessage("請先選擇要移至垃圾桶的公告", "error");
      return;
    }

    if (window.confirm(`確定要將 ${selectedAnnouncements.length} 則公告移至垃圾桶嗎？`)) {
      try {
        await batchMoveAnnouncementsToTrash(selectedAnnouncements);
        setSelectedAnnouncements([]);
        await loadAnnouncements();
        await loadTrashAnnouncements();
        showMessage(`已將 ${selectedAnnouncements.length} 則公告移至垃圾桶`, "success");
      } catch (error) {
        console.error("批次移至垃圾桶失敗:", error);
        showMessage("批次移至垃圾桶失敗，請稍後再試。", "error");
      }
    }
  };

  const handleRestoreAnnouncement = async (id) => {
    try {
      await restoreAnnouncementFromTrash(id);
      await loadTrashAnnouncements();
      await loadAnnouncements();
      showMessage("公告已恢復", "success");
    } catch (error) {
      console.error("恢復公告失敗:", error);
      showMessage("恢復公告失敗，請稍後再試。", "error");
    }
  };

  const handlePermanentDelete = async (id) => {
    if (window.confirm("確定要永久刪除此公告嗎？此操作無法復原！")) {
      try {
        await permanentlyDeleteAnnouncement(id);
        await loadTrashAnnouncements();
        showMessage("公告已永久刪除", "success");
      } catch (error) {
        console.error("永久刪除失敗:", error);
        showMessage("永久刪除失敗，請稍後再試。", "error");
      }
    }
  };

  const handleBatchRestore = async () => {
    if (selectedAnnouncements.length === 0) {
      showMessage("請先選擇要還原的公告", "error");
      return;
    }

    try {
      for (const id of selectedAnnouncements) {
        await restoreAnnouncementFromTrash(id);
      }
      setSelectedAnnouncements([]);
      await loadTrashAnnouncements();
      await loadAnnouncements();
      showMessage(`已還原 ${selectedAnnouncements.length} 則公告`, "success");
    } catch (error) {
      console.error("批次還原失敗:", error);
      showMessage("批次還原失敗，請稍後再試。", "error");
    }
  };

  const handleBatchPermanentDelete = async () => {
    if (selectedAnnouncements.length === 0) {
      showMessage("請先選擇要永久刪除的公告", "error");
      return;
    }

    if (window.confirm(`確定要永久刪除 ${selectedAnnouncements.length} 則公告嗎？此操作無法復原！`)) {
      try {
        await batchDeleteAnnouncements(selectedAnnouncements);
        setSelectedAnnouncements([]);
        await loadTrashAnnouncements();
        showMessage(`已永久刪除 ${selectedAnnouncements.length} 則公告`, "success");
      } catch (error) {
        console.error("批次永久刪除失敗:", error);
        showMessage("批次永久刪除失敗，請稍後再試。", "error");
      }
    }
  };

  const handleModalClose = () => {
    setShowModal(false);
    setEditingAnnouncement(null);
    loadAnnouncements();
  };

  const toggleSelectAnnouncement = (id) => {
    setSelectedAnnouncements((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    const currentList = isTrashView ? trashAnnouncements : filteredAnnouncements;
    if (selectedAnnouncements.length === currentList.length) {
      setSelectedAnnouncements([]);
    } else {
      setSelectedAnnouncements(currentList.map((a) => a.id));
    }
  };

  const getCategoryName = (category) => {
    const categories = {
      safety: "安全提醒",
      equipment: "裝備建議",
      center: "志工中心",
      external: "外部資訊",
      contact: "聯絡窗口",
    };
    return categories[category] || category;
  };

  const getCategoryColor = (category) => {
    const colors = {
      safety: "bg-red-100 text-red-800",
      equipment: "bg-blue-100 text-blue-800",
      center: "bg-green-100 text-green-800",
      external: "bg-purple-100 text-purple-800",
      contact: "bg-orange-100 text-orange-800",
    };
    return colors[category] || "bg-gray-100 text-gray-800";
  };

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

  if (loading) {
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
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <CardTitle className="flex items-center gap-2 whitespace-nowrap">
                <AlertCircle className="w-5 h-5" />
                公告管理
              </CardTitle>
              <p className="text-sm text-gray-600 mt-1">
                管理系統公告與志工須知
              </p>
            </div>
            <div className="flex gap-2 flex-wrap">
              {canManage('announcements') && (
                <AnnouncementImportExportButtons
                  onImportSuccess={() => {
                  // 匯入成功後重新載入兩邊的資料
                  // 因為匯入到垃圾桶可能會將一般列表的資料移到垃圾桶
                  loadAnnouncements();
                  loadTrashAnnouncements();
                }}
                  showMessage={showMessage}
                  isTrashView={isTrashView}
                />
              )}
              {canCreate('announcements') && (
                <Button onClick={handleAdd}>
                  <Plus className="w-4 h-4 mr-2" />
                  新增公告
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* 切換正常/垃圾桶視圖 */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant={!isTrashView ? 'default' : 'outline'}
                  onClick={() => {
                    setIsTrashView(false);
                    setSelectedAnnouncements([]);
                  }}
                >
                  公告列表 ({announcements.length})
                </Button>
                {canView('trash_announcements') && (
                  <Button
                    size="sm"
                    variant={isTrashView ? 'default' : 'outline'}
                    onClick={() => {
                      setIsTrashView(true);
                      setSelectedAnnouncements([]);
                      loadTrashAnnouncements();
                    }}
                    className={isTrashView ? 'bg-red-600 hover:bg-red-700' : ''}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    垃圾桶 ({trashAnnouncements.length})
                  </Button>
                )}
              </div>

              {/* 批次操作按鈕 */}
              {canView('trash_announcements') && (
                <div className="flex gap-2">
                  {!isTrashView && selectedAnnouncements.length > 0 && canDelete('announcements') && (
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={handleBatchDelete}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      批量移至垃圾桶 ({selectedAnnouncements.length})
                    </Button>
                  )}
                  {isTrashView && selectedAnnouncements.length > 0 && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleBatchRestore}
                      >
                        <RotateCcw className="w-4 h-4 mr-2" />
                        批量還原 ({selectedAnnouncements.length})
                      </Button>
                      {canDelete('trash_announcements') && (
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={handleBatchPermanentDelete}
                        >
                          <XCircle className="w-4 h-4 mr-2" />
                          永久刪除 ({selectedAnnouncements.length})
                        </Button>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>

            {/* 搜尋與篩選 - 只在非垃圾桶視圖顯示 */}
            {!isTrashView && (
              <div className="flex gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="搜尋公告標題或內容..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="border rounded-md px-3 py-2"
                >
                  <option value="all">全部分類</option>
                  <option value="safety">安全提醒</option>
                  <option value="equipment">裝備建議</option>
                  <option value="center">志工中心</option>
                  <option value="external">外部資訊</option>
                  <option value="contact">聯絡窗口</option>
                </select>
              </div>
            )}

            {/* 公告列表 */}
            <div className="border rounded-lg overflow-x-auto">
              <Table className="min-w-max">
                <TableHeader>
                  <TableRow>
                    {((!isTrashView && canDelete('announcements')) || (isTrashView && canView('trash_announcements'))) && (
                      <TableHead className="w-12">
                        <Checkbox
                          checked={
                            selectedAnnouncements.length ===
                              (isTrashView ? trashAnnouncements : filteredAnnouncements).length &&
                            (isTrashView ? trashAnnouncements : filteredAnnouncements).length > 0
                          }
                          onCheckedChange={toggleSelectAll}
                        />
                      </TableHead>
                    )}
                    <TableHead className="whitespace-nowrap">標題</TableHead>
                    <TableHead className="whitespace-nowrap">分類</TableHead>
                    {!isTrashView && <TableHead className="whitespace-nowrap">排序</TableHead>}
                    {!isTrashView && <TableHead className="whitespace-nowrap">置頂</TableHead>}
                    <TableHead className="whitespace-nowrap">建立時間</TableHead>
                    <TableHead className="text-right whitespace-nowrap">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(isTrashView ? trashAnnouncements : filteredAnnouncements).length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={isTrashView ? 5 : 7}
                        className="text-center text-gray-500 py-8"
                      >
                        {isTrashView ? '垃圾桶是空的' : '沒有符合條件的公告'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    (isTrashView ? trashAnnouncements : filteredAnnouncements).map((announcement) => (
                      <TableRow key={announcement.id}>
                        {((!isTrashView && canDelete('announcements')) || (isTrashView && canView('trash_announcements'))) && (
                          <TableCell>
                            <Checkbox
                              checked={selectedAnnouncements.includes(
                                announcement.id
                              )}
                              onCheckedChange={() =>
                                toggleSelectAnnouncement(announcement.id)
                              }
                            />
                          </TableCell>
                        )}
                        <TableCell className="font-medium">
                          {announcement.title}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          <Badge
                            className={`${getCategoryColor(
                              announcement.category
                            )} whitespace-nowrap`}
                          >
                            {getCategoryName(announcement.category)}
                          </Badge>
                        </TableCell>
                        {!isTrashView && (
                          <TableCell className="whitespace-nowrap">
                            {announcement.order || 0}
                          </TableCell>
                        )}
                        {!isTrashView && (
                          <TableCell className="whitespace-nowrap">
                            {announcement.is_pinned && (
                              <Badge className="bg-red-100 text-red-800 whitespace-nowrap">
                                <Pin className="w-3 h-3 mr-1" />
                                置頂
                              </Badge>
                            )}
                          </TableCell>
                        )}
                        <TableCell className="text-sm text-gray-600 whitespace-nowrap">
                          {formatDate(announcement.created_at)}
                        </TableCell>
                        <TableCell className="text-right whitespace-nowrap">
                          <div className="flex justify-end gap-2">
                            {!isTrashView ? (
                              <>
                                {canEdit('announcements') && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleEdit(announcement)}
                                  >
                                    <Edit className="w-4 h-4" />
                                  </Button>
                                )}
                                {canDelete('announcements') && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDelete(announcement.id)}
                                  >
                                    <Trash2 className="w-4 h-4 text-red-600" />
                                  </Button>
                                )}
                              </>
                            ) : (
                              <>
                                {canView('trash_announcements') && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleRestoreAnnouncement(announcement.id)}
                                  >
                                    <RotateCcw className="w-4 h-4 mr-1" />
                                    還原
                                  </Button>
                                )}
                                {canDelete('trash_announcements') && (
                                  <Button
                                    variant="destructive"
                                    size="sm"
                                    onClick={() => handlePermanentDelete(announcement.id)}
                                  >
                                    <XCircle className="w-4 h-4 mr-1" />
                                    永久刪除
                                  </Button>
                                )}
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {/* 統計資訊 */}
            <div className="flex items-center justify-between text-sm text-gray-600 pt-2">
              <div>
                共 {announcements.length} 則公告
                {searchTerm || selectedCategory !== "all"
                  ? ` (顯示 ${filteredAnnouncements.length} 則)`
                  : ""}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 公告編輯模態框 */}
      {showModal && (
        <AnnouncementModal
          isOpen={showModal}
          onClose={handleModalClose}
          announcement={editingAnnouncement}
        />
      )}
    </div>
  );
}
