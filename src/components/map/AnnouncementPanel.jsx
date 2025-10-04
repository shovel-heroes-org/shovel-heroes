import React, { useState, useEffect } from "react";
import { Announcement, User } from "@/api/entities";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  AlertTriangle, Info, MapPin, Phone, ExternalLink,
  Search, ChevronDown, ChevronUp, Settings, Plus
} from "lucide-react";
import AnnouncementModal from "./AnnouncementModal";
import { usePermission } from "@/hooks/usePermission";

export default function AnnouncementPanel() {
  const [announcements, setAnnouncements] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentUser, setCurrentUser] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState(null);
  const [isExpanded, setIsExpanded] = useState(false);

  // 使用權限 hook
  const { canCreate, canEdit, canDelete } = usePermission();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [announcementsData, userData] = await Promise.all([
        Announcement.list('order'),
        User.me().catch(() => null)
      ]);
      setAnnouncements(announcementsData);
      setCurrentUser(userData);
    } catch (error) {
      console.error('Failed to load announcements:', error);
    }
  };

  const getCategoryName = (category) => {
    const categories = {
      safety: '安全提醒',
      equipment: '裝備建議',
      center: '志工中心',
      external: '外部資訊',
      contact: '聯絡窗口'
    };
    return categories[category] || category;
  };

  const getCategoryIcon = (category) => {
    const icons = {
      safety: AlertTriangle,
      equipment: Info,
      center: MapPin,
      external: ExternalLink,
      contact: Phone
    };
    const IconComponent = icons[category] || Info;
    return <IconComponent className="w-4 h-4" />;
  };

  const getCategoryColor = (category) => {
    const colors = {
      safety: 'bg-red-100 text-red-800',
      equipment: 'bg-blue-100 text-blue-800',
      center: 'bg-green-100 text-green-800',
      external: 'bg-purple-100 text-purple-800',
      contact: 'bg-orange-100 text-orange-800'
    };
    return colors[category] || 'bg-gray-100 text-gray-800';
  };

  const filteredAnnouncements = announcements.filter(announcement =>
    announcement.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    announcement.content.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const groupedAnnouncements = filteredAnnouncements.reduce((acc, announcement) => {
    if (!acc[announcement.category]) acc[announcement.category] = [];
    acc[announcement.category].push(announcement);
    return acc;
  }, {});

  // Sort each category: pinned first, then by order
  Object.keys(groupedAnnouncements).forEach(category => {
    groupedAnnouncements[category].sort((a, b) => {
      if (a.is_pinned !== b.is_pinned) return b.is_pinned - a.is_pinned;
      return (a.order || 0) - (b.order || 0);
    });
  });

  const handleEdit = (announcement) => {
    setEditingAnnouncement(announcement);
    setShowModal(true);
  };

  const handleAdd = () => {
    setEditingAnnouncement(null);
    setShowModal(true);
  };

  const handleModalClose = () => {
    setShowModal(false);
    setEditingAnnouncement(null);
    loadData();
  };

  const renderLinks = (links) => {
    if (!links || links.length === 0) return null;
    return (
      <div className="mt-3 space-y-2">
        {links.map((link, index) => (
          <a
            key={index}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-blue-600 hover:text-blue-800 text-sm"
          >
            <ExternalLink className="w-3 h-3" />
            {link.name}
          </a>
        ))}
      </div>
    );
  };

  return (
    <div className="bg-white rounded-lg shadow-lg border border-gray-200">
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleTrigger asChild>
          <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Info className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-gray-900">志工須知 & 最新公告</h3>
                <p className="text-sm text-gray-600">重要資訊與安全提醒</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {canCreate('announcements') && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAdd();
                  }}
                >
                  <Plus className="w-4 h-4" />
                </Button>
              )}
              {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </div>
          </div>
        </CollapsibleTrigger>
        
        <CollapsibleContent className="px-4 pb-4">
          {/* Search Bar */}
          <div className="mb-4">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
              <Input
                placeholder="搜尋關鍵字（如：住宿、鐵工、水電）"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Categories */}
          <Tabs defaultValue="safety" className="space-y-4">
            <TabsList className="grid grid-cols-5 w-full text-xs">
              <TabsTrigger value="safety">安全</TabsTrigger>
              <TabsTrigger value="equipment">裝備</TabsTrigger>
              <TabsTrigger value="center">志工中心</TabsTrigger>
              <TabsTrigger value="external">外部資訊</TabsTrigger>
              <TabsTrigger value="contact">聯絡窗口</TabsTrigger>
            </TabsList>

            {['safety', 'equipment', 'center', 'external', 'contact'].map(category => (
              <TabsContent key={category} value={category} className="space-y-3">
                {groupedAnnouncements[category]?.map((announcement) => (
                  <Card key={announcement.id} className="border-l-4 border-l-blue-500">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2">
                          {announcement.is_pinned && (
                            <Badge className="bg-red-100 text-red-800 text-xs">置頂</Badge>
                          )}
                          <Badge className={`text-xs ${getCategoryColor(category)}`}>
                            {getCategoryIcon(category)}
                            <span className="ml-1">{getCategoryName(category)}</span>
                          </Badge>
                        </div>
                        {canEdit('announcements') && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleEdit(announcement)}
                          >
                            <Settings className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                      
                      <h4 className="font-semibold text-gray-900 mb-2">{announcement.title}</h4>
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">{announcement.content}</p>
                      
                      {announcement.contact_phone && (
                        <div className="mt-3 flex items-center gap-2 text-sm">
                          <Phone className="w-4 h-4 text-green-600" />
                          <a href={`tel:${announcement.contact_phone}`} className="text-green-600 hover:text-green-800">
                            {announcement.contact_phone}
                          </a>
                        </div>
                      )}
                      
                      {renderLinks(announcement.external_links)}
                    </CardContent>
                  </Card>
                ))}
                
                {!groupedAnnouncements[category] || groupedAnnouncements[category].length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Info className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>目前沒有{getCategoryName(category)}資訊</p>
                  </div>
                ) : null}
              </TabsContent>
            ))}
          </Tabs>
        </CollapsibleContent>
      </Collapsible>
      
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