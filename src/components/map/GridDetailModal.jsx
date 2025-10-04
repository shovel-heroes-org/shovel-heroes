
import React, { useState } from "react";
import { VolunteerRegistration, SupplyDonation, GridDiscussion, User, Grid } from "@/api/entities";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Users, Package, MessageSquare, AlertTriangle,
  Phone, MapPin, Clock, CheckCircle2, UserPlus,
  PackagePlus, Send, Info
} from "lucide-react";

export default function GridDetailModal({ grid, onClose, onUpdate, defaultTab = "info", onTabChange }) {
  // Normalize supplies_needed to an array to avoid runtime errors if backend returns null
  if (!Array.isArray(grid.supplies_needed)) {
    grid = { ...grid, supplies_needed: [] };
  }
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [volunteerForm, setVolunteerForm] = useState({
    volunteer_name: "",
    volunteer_phone: "",
    volunteer_email: "",
    available_time: "",
    skills: "",
    equipment: "",
    notes: ""
  });
  const [supplyForm, setSupplyForm] = useState({
    donor_name: "",
    donor_phone: "",
    donor_email: "",
    supply_name: "",
    quantity: "",
    delivery_method: "direct",
    delivery_address: "",
    delivery_time: "",
    notes: ""
  });
  const [discussionForm, setDiscussionForm] = useState({
    author_name: "",
    message: ""
  });
  const [user, setUser] = useState(null);
  const [discussions, setDiscussions] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [volunteerAgreedToTerms, setVolunteerAgreedToTerms] = useState(false);

  // If user logs out while on volunteer tab, fallback to info
  React.useEffect(() => {
    if (!user && activeTab === 'volunteer') {
      setActiveTab('info');
    }
  }, [user, activeTab]);

  React.useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = await User.me();
        // currentUser 可能為 null (未登入)
        if (currentUser) {
          setUser(currentUser);
          const displayName = currentUser.name || currentUser.full_name || currentUser.email || '使用者';
          setVolunteerForm(prev => ({
            ...prev,
            volunteer_name: displayName,
            volunteer_email: currentUser.email || ""
          }));
          setSupplyForm(prev => ({
            ...prev,
            donor_name: displayName,
            donor_email: currentUser.email || ""
          }));
          setDiscussionForm(prev => ({
            ...prev,
            author_name: displayName
          }));
        } else {
          setUser(null);
        }
      } catch (error) {
        // 用戶未登入或請求失敗都視為匿名
        setUser(null);
      }
    };

    const loadDiscussions = async () => {
      try {
        const data = await GridDiscussion.filter({ grid_id: grid.id }, '-created_date');
        // Backend returns content & created_at; map to message & created_date for existing UI expectations.
        const mapped = Array.isArray(data) ? data.map(d => ({
          ...d,
          message: d.message || d.content || '',
            // Prefer created_date if backend adds later; fallback to created_at.
          created_date: d.created_date || d.created_at || d.createdAt || d.created_at_date || null
        })) : [];
        setDiscussions(mapped);
      } catch (error) {
        console.error('Failed to load discussions:', error);
        setDiscussions([]); // Set discussions to empty array on failure
      }
    };

    loadUser();
    loadDiscussions();
  }, [grid.id]);

  // When defaultTab changes, update activeTab
  React.useEffect(() => {
    setActiveTab(defaultTab);
  }, [defaultTab]);

  // Notify parent when tab changes
  const handleTabChange = (val) => {
    setActiveTab(val);
    if (onTabChange) onTabChange(val);
  };

  const getShortageRate = () => {
    if (grid.volunteer_needed === 0) return 0;
    return ((grid.volunteer_needed - grid.volunteer_registered) / grid.volunteer_needed) * 100;
  };

  const getShortageColor = () => {
    const rate = getShortageRate();
    if (rate >= 60) return "text-red-600";
    if (rate >= 40) return "text-orange-600";
    if (rate > 0) return "text-amber-600";
    return "text-green-600";
  };

  const handleVolunteerSubmit = async (e) => {
    e.preventDefault();
    
    if (!volunteerForm.volunteer_name) {
        alert("請填寫姓名");
        return;
    }

    if (!volunteerAgreedToTerms) {
        alert("請先同意並理解相關條款。");
        return;
    }

    setSubmitting(true);
    try {
      await VolunteerRegistration.create({
        ...volunteerForm,
        grid_id: grid.id,
        skills: volunteerForm.skills.split(',').map(s => s.trim()).filter(Boolean),
        equipment: volunteerForm.equipment.split(',').map(s => s.trim()).filter(Boolean),
      });

      setVolunteerForm({
        ...volunteerForm,
        // Preserve name/email if pre-filled by user, clear others
        volunteer_phone: "",
        available_time: "",
        skills: "",
        equipment: "",
        notes: ""
      });

      onUpdate();
      setActiveTab("info");
    } catch (error) {
      console.error('Failed to register volunteer:', error);
      alert('報名失敗，請稍後再試。');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSupplySubmit = async (e) => {
    e.preventDefault();
    
    if (!supplyForm.donor_name || !supplyForm.donor_phone) {
        alert("請填寫姓名與電話");
        return;
    }

    if (!supplyForm.supply_name || !supplyForm.quantity) {
        alert("請選擇物資並填寫數量");
        return;
    }

    setSubmitting(true);
    try {
      // Find the selected supply to get its unit
      const selectedSupply = grid.supplies_needed.find(s => s.name === supplyForm.supply_name);
      const unit = selectedSupply ? selectedSupply.unit : "";

      // 1. Create the donation record
      await SupplyDonation.create({
        ...supplyForm,
        grid_id: grid.id,
        quantity: parseFloat(supplyForm.quantity),
        unit: unit, 
      });

      // 2. Update the received count in the Grid entity
      const currentGrid = await Grid.get(grid.id);
      const updatedSupplies = currentGrid.supplies_needed.map(supply => {
        if (supply.name === supplyForm.supply_name) {
          return {
            ...supply,
            received: (supply.received || 0) + parseFloat(supplyForm.quantity)
          };
        }
        return supply;
      });

      await Grid.update(grid.id, { supplies_needed: updatedSupplies });

      setSupplyForm({
        ...supplyForm,
        donor_phone: "",
        supply_name: "",
        quantity: "",
        delivery_method: "direct",
        delivery_time: "",
        notes: ""
      });

      onUpdate(); 
      setActiveTab("info"); 
    } catch (error) {
      console.error('Failed to register supply:', error);
      alert('捐贈失敗，請稍後再試。');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDiscussionSubmit = async (e) => {
    e.preventDefault();
    
    if (!discussionForm.author_name || !discussionForm.message) {
      alert("請填寫您的名稱與訊息內容");
      return;
    }

    setSubmitting(true);
    try {
      await GridDiscussion.create({
        ...discussionForm,
        grid_id: grid.id,
        author_role: user?.role || 'volunteer'
      });

      setDiscussionForm({
        ...discussionForm,
        message: ""
      });

      // Reload discussions with mapping
      const data = await GridDiscussion.filter({ grid_id: grid.id }, '-created_date');
      const mapped = Array.isArray(data) ? data.map(d => ({
        ...d,
        message: d.message || d.content || '',
        created_date: d.created_date || d.created_at || d.createdAt || d.created_at_date || null
      })) : [];
      setDiscussions(mapped);
    } catch (error) {
      console.error('Failed to post discussion:', error);
      alert('發送訊息失敗，請稍後再試。');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-blue-600" />
              <span>救援區域 {grid.code}</span>
            </div>
            <Badge
              variant={grid.status === 'completed' ? 'success' : 'secondary'}
              className="ml-auto"
            >
              {grid.status === 'completed' ? '已完成' :
               grid.status === 'open' ? '開放中' :
               grid.status === 'closed' ? '已關閉' : '準備中'}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsList className={`w-full ${user ? 'grid grid-cols-4' : 'grid grid-cols-3'}`}>
            <TabsTrigger value="info" className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              基本資訊
            </TabsTrigger>
            {user && (
              <TabsTrigger value="volunteer" className="flex items-center gap-2">
                <UserPlus className="w-4 h-4" />
                志工報名
              </TabsTrigger>
            )}
            <TabsTrigger value="supply" className="flex items-center gap-2">
              <PackagePlus className="w-4 h-4" />
              物資捐贈
            </TabsTrigger>
            <TabsTrigger value="discussion" className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              討論區
            </TabsTrigger>
          </TabsList>

          <TabsContent value="info" className="space-y-4">
            {/* Volunteer Status */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-blue-600" />
                  志工需求狀況
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <div className="text-3xl font-bold text-gray-900">
                      {grid.volunteer_registered}/{grid.volunteer_needed}
                    </div>
                    <div className="text-sm text-gray-600">已報名/需求人數</div>
                  </div>
                  <div>
                    <div className={`text-2xl font-bold ${getShortageColor()}`}>
                      {getShortageRate().toFixed(0)}%
                    </div>
                    <div className="text-sm text-gray-600">人力缺口率</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Supply Status */}
            {grid.supplies_needed?.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="w-5 h-5 text-green-600" />
                    物資需求清單
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {grid.supplies_needed.map((supply, index) => (
                      <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                        <span className="font-medium">{supply.name}</span>
                        <div className="text-sm text-gray-600">
                          {supply.received || 0}/{supply.quantity} {supply.unit}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Contact Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Phone className="w-5 h-5 text-purple-600" />
                  聯絡資訊
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {grid.meeting_point && (
                  <div className="flex items-center gap-3">
                    <MapPin className="w-4 h-4 text-gray-400" />
                    <span className="text-sm">集合地點：{grid.meeting_point}</span>
                  </div>
                )}
                {grid.contact_info && (
                  <div className="flex items-center gap-3">
                    <Phone className="w-4 h-4 text-gray-400" />
                    <span className="text-sm">聯絡方式：{grid.contact_info}</span>
                  </div>
                )}
                {grid.risks_notes && (
                  <div className="flex items-start gap-3 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                    <AlertTriangle className="w-4 h-4 text-orange-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="font-medium text-orange-800 text-sm">安全注意事項</div>
                      <div className="text-sm text-orange-700">{grid.risks_notes}</div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {user && (
          <TabsContent value="volunteer">
            <Card>
              <CardHeader>
                <CardTitle>志工報名</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleVolunteerSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="volunteer_name">姓名 *</Label>
                      <Input
                        id="volunteer_name"
                        value={volunteerForm.volunteer_name}
                        onChange={(e) => setVolunteerForm({...volunteerForm, volunteer_name: e.target.value})}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="volunteer_phone">電話</Label>
                      <Input
                        id="volunteer_phone"
                        value={volunteerForm.volunteer_phone}
                        onChange={(e) => setVolunteerForm({...volunteerForm, volunteer_phone: e.target.value})}
                      />
                      <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                        <Info className="w-3 h-3"/>
                        您所提供的聯絡資訊將公開顯示於相關頁面，以便彼此聯繫。請自行評估是否提供。
                      </p>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="available_time">可服務時間</Label>
                    <Input
                      id="available_time"
                      placeholder="例：2024/1/15 上午 9:00-12:00"
                      value={volunteerForm.available_time}
                      onChange={(e) => setVolunteerForm({...volunteerForm, available_time: e.target.value})}
                    />
                  </div>

                  <div>
                    <Label htmlFor="skills">專業技能 (用逗號分隔)</Label>
                    <Input
                      id="skills"
                      placeholder="例：重機械操作, 電工, 水電"
                      value={volunteerForm.skills}
                      onChange={(e) => setVolunteerForm({...volunteerForm, skills: e.target.value})}
                    />
                  </div>

                  <div>
                    <Label htmlFor="equipment">攜帶工具 (用逗號分隔)</Label>
                    <Input
                      id="equipment"
                      placeholder="例：鏟子, 水桶, 雨鞋"
                      value={volunteerForm.equipment}
                      onChange={(e) => setVolunteerForm({...volunteerForm, equipment: e.target.value})}
                    />
                  </div>

                  <div>
                    <Label htmlFor="volunteer_notes">備註</Label>
                    <Textarea
                      id="volunteer_notes"
                      value={volunteerForm.notes}
                      onChange={(e) => setVolunteerForm({...volunteerForm, notes: e.target.value})}
                    />
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="font-medium text-blue-800 mb-2">必備裝備提醒</h4>
                    <ul className="text-sm text-blue-700 space-y-1">
                      <li>• 雨鞋或防滑鞋</li>
                      <li>• 工作手套</li>
                      <li>• 口罩</li>
                      <li>• 防滑裝備</li>
                    </ul>
                  </div>

                  <div className="flex items-start space-x-2 p-4 bg-gray-50 rounded-lg">
                    <input
                      type="checkbox"
                      id="volunteer-terms-checkbox"
                      checked={volunteerAgreedToTerms}
                      onChange={(e) => setVolunteerAgreedToTerms(e.target.checked)}
                      className="mt-1 h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                    />
                    <label htmlFor="volunteer-terms-checkbox" className="text-sm text-gray-700 leading-relaxed">
                      我已經同意並理解：本站為緊急救災平台，我所提供的聯絡資訊將提供需求方參考，以利志工與需求方互相聯繫。
                    </label>
                  </div>

                  <Button
                    type="submit"
                    className={`w-full ${(!user || !volunteerAgreedToTerms ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700')}`}
                    disabled={submitting || !user || !volunteerAgreedToTerms}
                  >
                    {submitting ? "提交中..." : "確認報名"}
                  </Button>
                  {!user && (
                    <div className="text-xs text-gray-500 mt-2 text-center space-y-1">
                      <p>請先登入以完成報名。您可以先查看需要填寫的欄位。</p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => User.login()}
                      >立即登入</Button>
                    </div>
                  )}
                </form>
              </CardContent>
            </Card>
          </TabsContent>
          )}

          <TabsContent value="supply">
            <Card>
              <CardHeader>
                <CardTitle>物資捐贈</CardTitle>
              </CardHeader>
              <CardContent>
                {/* Supplies Progress Section */}
                <div className="mb-6 space-y-4">
                  <h4 className="font-medium text-gray-800">目前物資需求進度</h4>
                  {grid.supplies_needed && grid.supplies_needed.length > 0 ? (
                    grid.supplies_needed.map((supply, index) => {
                      const progress = supply.quantity > 0 ? ((supply.received || 0) / supply.quantity) * 100 : 0;
                      const remaining = supply.quantity - (supply.received || 0);

                      return (
                        <div key={index} className="p-3 bg-gray-50 rounded-lg border">
                          <div className="flex justify-between items-center mb-2">
                            <span className="font-semibold text-gray-800">{supply.name}</span>
                            <span className={`text-sm font-medium ${remaining > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                              {remaining > 0 ? `尚缺 ${remaining} ${supply.unit}` : '已滿足'}
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2.5">
                            <div
                              className="bg-green-600 h-2.5 rounded-full transition-all duration-500"
                              style={{ width: `${progress}%` }}
                            ></div>
                          </div>
                          <div className="flex justify-between text-xs text-gray-500 mt-1">
                            <span>{progress.toFixed(0)}%</span>
                            <span>{supply.received || 0}/{supply.quantity} {supply.unit}</span>
                          </div>
                        </div>
                      )
                    })
                  ) : (
                    <p className="text-center text-gray-500 py-4">此地點目前沒有物資需求。</p>
                  )}
                </div>

                <div className="border-t pt-6">
                  <form onSubmit={handleSupplySubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="donor_name">姓名 *</Label>
                        <Input
                          id="donor_name"
                          value={supplyForm.donor_name}
                          onChange={(e) => setSupplyForm({...supplyForm, donor_name: e.target.value})}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="donor_phone">電話 *</Label>
                        <Input
                          id="donor_phone"
                          value={supplyForm.donor_phone}
                          onChange={(e) => setSupplyForm({...supplyForm, donor_phone: e.target.value})}
                          required
                        />
                        <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                          <Info className="w-3 h-3"/>
                          您所提供的聯絡資訊將公開顯示於相關頁面，以便彼此聯繫。請自行評估是否提供。
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                       <div>
                          <Label htmlFor="supply_name">物資名稱 *</Label>
                          <Select
                              value={supplyForm.supply_name}
                              onValueChange={(value) => setSupplyForm({...supplyForm, supply_name: value})}
                              required
                          >
                              <SelectTrigger>
                                  <SelectValue placeholder="選擇所需物資" />
                              </SelectTrigger>
                              <SelectContent>
                                  {grid.supplies_needed?.map((supply) => (
                                      <SelectItem key={supply.name} value={supply.name}>
                                          {supply.name} (尚需 {supply.quantity - (supply.received || 0)} {supply.unit})
                                      </SelectItem>
                                  ))}
                              </SelectContent>
                          </Select>
                      </div>
                      <div>
                        <Label htmlFor="quantity">捐贈數量 *</Label>
                        <Input
                          id="quantity"
                          type="number"
                          value={supplyForm.quantity}
                          onChange={(e) => setSupplyForm({...supplyForm, quantity: e.target.value})}
                          required
                          min="1"
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="delivery_time">預計送達時間</Label>
                      <Input
                        id="delivery_time"
                        placeholder="例：今日下午 3:00"
                        value={supplyForm.delivery_time}
                        onChange={(e) => setSupplyForm({...supplyForm, delivery_time: e.target.value})}
                      />
                    </div>

                    <div>
                      <Label htmlFor="supply_notes">備註</Label>
                      <Textarea
                        id="supply_notes"
                        value={supplyForm.notes}
                        onChange={(e) => setSupplyForm({...supplyForm, notes: e.target.value})}
                      />
                    </div>

                    <Button
                      type="submit"
                      className={`w-full ${(!user ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700')}`}
                      disabled={submitting || !user}
                    >
                      {submitting ? "提交中..." : "確認捐贈"}
                    </Button>
                    {!user && (
                      <div className="text-xs text-gray-500 mt-2 text-center space-y-1">
                        <p>請先登入以完成捐贈。您可以先查看需要填寫的欄位。</p>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => User.login()}
                        >立即登入</Button>
                      </div>
                    )}
                  </form>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="discussion">
            <div className="space-y-4">
              {/* Post Form (top) */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">發表訊息</CardTitle>
                </CardHeader>
                <CardContent>
                  {!user && (
                    <div className="space-y-4 text-sm text-gray-600">
                      <div className="p-4 border border-dashed rounded-md bg-gray-50 text-center">
                        <p className="mb-2 font-medium">請登入後再發送討論訊息。</p>
                        <Button type="button" variant="outline" onClick={() => User.login()}>
                          立即登入
                        </Button>
                      </div>
                      <p className="text-xs text-gray-500 text-center">登入後可即時交流現場狀況與協作需求。</p>
                    </div>
                  )}
                  {user && (
                    <form onSubmit={handleDiscussionSubmit} className="space-y-4">
                      <div>
                        <Label htmlFor="author_name">您的名稱 *</Label>
                        <Input
                          id="author_name"
                          value={discussionForm.author_name}
                          disabled
                          className="disabled:opacity-70 cursor-not-allowed"
                        />
                        <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                          <Info className="w-3 h-3"/>
                          此為您的登入名稱，將隨訊息公開顯示。
                        </p>
                      </div>
                      <div>
                        <Label htmlFor="message">訊息內容 *</Label>
                        <Textarea
                          id="message"
                          placeholder="分享現場狀況、提問或協調事項..."
                          value={discussionForm.message}
                          onChange={(e) => setDiscussionForm({...discussionForm, message: e.target.value})}
                          required
                        />
                      </div>
                      <Button
                        type="submit"
                        className="bg-blue-600 hover:bg-blue-700"
                        disabled={submitting}
                      >
                        <Send className="w-4 h-4 mr-2" />
                        {submitting ? "發送中..." : "發送訊息"}
                      </Button>
                    </form>
                  )}
                </CardContent>
              </Card>

              {/* Discussion List (below form) */}
              <div className="space-y-3">
                {discussions.map((discussion) => (
                  <Card key={discussion.id} className="border-l-4 border-l-blue-500">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{discussion.author_name}</span>
                          <Badge variant="secondary" className="text-xs">
                            {discussion.author_role === 'admin' ? '管理員' :
                             discussion.author_role === 'grid_manager' ? '格主' :
                             discussion.author_role === 'volunteer' ? '志工' : '捐贈者'}
                          </Badge>
                        </div>
                        <span className="text-xs text-gray-500">
                          {new Date(discussion.created_date).toLocaleString('zh-TW')}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">{discussion.message}</p>
                    </CardContent>
                  </Card>
                ))}

                {discussions.length === 0 && (
                  <div className="text-center text-gray-500 py-8">
                    目前還沒有討論訊息，成為第一個留言的人吧！
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
