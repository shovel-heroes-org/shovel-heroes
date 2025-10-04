import React, { useState, useEffect } from "react";
import { Announcement } from "@/api/entities";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Trash2 } from "lucide-react";

export default function AnnouncementModal({ isOpen, onClose, announcement }) {
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    category: "safety",
    is_pinned: false,
    external_links: [],
    contact_phone: "",
    order: 0
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (announcement) {
      setFormData({
        title: announcement.title || "",
        content: announcement.content || "",
        category: announcement.category || "safety",
        is_pinned: announcement.is_pinned || false,
        external_links: announcement.external_links || [],
        contact_phone: announcement.contact_phone || "",
        order: announcement.order || 0
      });
    } else {
      setFormData({
        title: "",
        content: "",
        category: "safety",
        is_pinned: false,
        external_links: [],
        contact_phone: "",
        order: 0
      });
    }
  }, [announcement]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleAddLink = () => {
    setFormData(prev => ({
      ...prev,
      external_links: [...prev.external_links, { name: "", url: "" }]
    }));
  };

  const handleRemoveLink = (index) => {
    setFormData(prev => ({
      ...prev,
      external_links: prev.external_links.filter((_, i) => i !== index)
    }));
  };

  const handleLinkChange = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      external_links: prev.external_links.map((link, i) => 
        i === index ? { ...link, [field]: value } : link
      )
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      // Normalize payload to satisfy backend schema
      const normalized = {
        ...formData,
        body: formData.content || "", // backend requires body
        // order must be an integer number; omit if empty
        order:
          formData.order === "" || formData.order === null || typeof formData.order === "undefined"
            ? undefined
            : Number(formData.order),
        external_links: (formData.external_links || [])
          .filter((l) => l && (l.name?.trim() || l.url?.trim()))
          .map((l) => ({ name: l.name || "", url: l.url || "" })),
      };

      if (announcement) {
        try {
          await Announcement.update(announcement.id, normalized);
        } catch (err) {
          // Backend may not support PUT /announcements/:id yet; fallback to create
          const msg = String(err?.message || '');
          if (msg.includes(' 404') || msg.toLowerCase().includes('not found')) {
            await Announcement.create(normalized);
          } else {
            throw err;
          }
        }
      } else {
        await Announcement.create(normalized);
      }
      onClose();
    } catch (error) {
      console.error("Failed to save announcement:", error);
      alert("儲存公告失敗，請稍後再試。");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (announcement && window.confirm("確定要刪除這則公告嗎？")) {
      try {
        await Announcement.delete(announcement.id);
        onClose();
      } catch (error) {
        console.error("Failed to delete announcement:", error);
        alert("刪除公告失敗，請稍後再試。");
      }
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {announcement ? "編輯公告" : "新增公告"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="title">標題 *</Label>
            <Input
              id="title"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              required
            />
          </div>

          <div>
            <Label htmlFor="category">分類 *</Label>
            <Select 
              value={formData.category} 
              onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="safety">安全提醒</SelectItem>
                <SelectItem value="equipment">裝備建議</SelectItem>
                <SelectItem value="center">志工中心</SelectItem>
                <SelectItem value="external">外部資訊</SelectItem>
                <SelectItem value="contact">聯絡窗口</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="content">內容 *</Label>
            <Textarea
              id="content"
              name="content"
              rows={6}
              value={formData.content}
              onChange={handleInputChange}
              required
            />
          </div>

          <div>
            <Label htmlFor="contact_phone">聯絡電話</Label>
            <Input
              id="contact_phone"
              name="contact_phone"
              value={formData.contact_phone}
              onChange={handleInputChange}
              placeholder="例如：0912-345-678"
            />
          </div>

          <div>
            <Label>外部連結</Label>
            {formData.external_links.map((link, index) => (
              <div key={index} className="flex gap-2 mt-2">
                <Input
                  placeholder="連結名稱"
                  value={link.name}
                  onChange={(e) => handleLinkChange(index, 'name', e.target.value)}
                />
                <Input
                  placeholder="連結網址"
                  value={link.url}
                  onChange={(e) => handleLinkChange(index, 'url', e.target.value)}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => handleRemoveLink(index)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddLink}
              className="mt-2"
            >
              <Plus className="w-4 h-4 mr-2" />
              新增連結
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="order">排序順序</Label>
              <Input
                id="order"
                name="order"
                type="number"
                value={formData.order}
                onChange={handleInputChange}
              />
            </div>
            <div className="flex items-center space-x-2 pt-6">
              <Checkbox
                id="is_pinned"
                checked={formData.is_pinned}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_pinned: checked }))}
              />
              <Label htmlFor="is_pinned">置頂顯示</Label>
            </div>
          </div>
        </form>

        <DialogFooter className="flex justify-between">
          <div>
            {announcement && (
              <Button
                type="button"
                variant="destructive"
                onClick={handleDelete}
              >
                刪除公告
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              取消
            </Button>
            <Button
              type="submit"
              onClick={handleSubmit}
              disabled={submitting}
            >
              {submitting ? "儲存中..." : "儲存"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}