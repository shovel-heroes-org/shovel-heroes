
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

export default function GridDetailModal({ grid, onClose, onUpdate, defaultTab = "info" }) {
  // Normalize supplies_needed to an array to avoid runtime errors if backend returns null
  if (!Array.isArray(grid.supplies_needed)) {
    grid = { ...grid, supplies_needed: [] };
  }

  // 生成每 5 分鐘的時間選項，分上午下午
  const generateTimeOptions = () => {
    const morning = []; // 上午 00:00-12:00
    const afternoon = []; // 下午 12:00-23:55 + 24:00

    for (let h = 0; h < 24; h++) {
      for (let m = 0; m < 60; m += 5) {
        const hour = h.toString().padStart(2, '0');
        const minute = m.toString().padStart(2, '0');
        const timeStr = `${hour}:${minute}`;

        if (h < 12) {
          morning.push(timeStr);
        } else {
          afternoon.push(timeStr);
        }
      }
    }
    // 上午時段加上 12:00
    morning.push('12:00');
    // 下午時段加上 24:00
    afternoon.push('24:00');

    return { morning, afternoon };
  };

  const { morning: morningTimes, afternoon: afternoonTimes } = generateTimeOptions();

  // 取得當前時間後最近的 5 分鐘間隔時間
  const getNextFiveMinuteInterval = () => {
    const now = new Date();
    const minutes = now.getMinutes();
    const hours = now.getHours();

    // 計算下一個 5 分鐘間隔
    const nextMinutes = Math.ceil(minutes / 5) * 5;

    if (nextMinutes >= 60) {
      // 如果進位到下一小時
      const nextHour = (hours + 1) % 24;
      return {
        time: `${nextHour.toString().padStart(2, '0')}:00`,
        period: nextHour < 12 ? 'morning' : 'afternoon'
      };
    } else {
      return {
        time: `${hours.toString().padStart(2, '0')}:${nextMinutes.toString().padStart(2, '0')}`,
        period: hours < 12 ? 'morning' : 'afternoon'
      };
    }
  };

  // 渲染分組的時間選項
  const renderTimeOptions = (filterFn = null) => {
    const morningFiltered = filterFn ? morningTimes.filter(filterFn) : morningTimes;
    const afternoonFiltered = filterFn ? afternoonTimes.filter(filterFn) : afternoonTimes;

    return (
      <>
        {morningFiltered.length > 0 && (
          <>
            <div className="px-2 py-1.5 text-xs font-semibold text-gray-500 bg-gray-100">上午</div>
            {morningFiltered.map((time) => (
              <SelectItem key={time} value={time}>{time}</SelectItem>
            ))}
          </>
        )}
        {afternoonFiltered.length > 0 && (
          <>
            <div className="px-2 py-1.5 text-xs font-semibold text-gray-500 bg-gray-100">下午</div>
            {afternoonFiltered.map((time) => (
              <SelectItem key={time} value={time}>{time}</SelectItem>
            ))}
          </>
        )}
      </>
    );
  };

  const [activeTab, setActiveTab] = useState(defaultTab);

  // 可服務時段列表（支援多天）
  const defaultTimeSlot = getNextFiveMinuteInterval();
  const [availableTimeSlots, setAvailableTimeSlots] = useState([
    {
      id: Date.now(),
      date: new Date().toISOString().split('T')[0],
      startPeriod: defaultTimeSlot.period,
      timeStart: defaultTimeSlot.time,
      endPeriod: defaultTimeSlot.period,
      timeEnd: ''
    }
  ]);

  const [volunteerForm, setVolunteerForm] = useState({
    volunteer_name: "",
    volunteer_phone: "",
    volunteer_email: "",
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

  React.useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = await User.me();
        // currentUser 可能為 null (未登入)
        if (currentUser) {
          setUser(currentUser);
          setVolunteerForm(prev => ({
            ...prev,
            volunteer_name: currentUser.full_name || "",
            volunteer_email: currentUser.email || ""
          }));
          setSupplyForm(prev => ({
            ...prev,
            donor_name: currentUser.full_name || "",
            donor_email: currentUser.email || ""
          }));
          setDiscussionForm(prev => ({
            ...prev,
            author_name: currentUser.full_name || ""
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
        setDiscussions(data);
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

  // 新增時段
  const addTimeSlot = () => {
    const newTimeSlot = getNextFiveMinuteInterval();
    setAvailableTimeSlots([
      ...availableTimeSlots,
      {
        id: Date.now(),
        date: new Date().toISOString().split('T')[0],
        startPeriod: newTimeSlot.period,
        timeStart: newTimeSlot.time,
        endPeriod: newTimeSlot.period,
        timeEnd: ''
      }
    ]);
  };

  // 刪除時段
  const removeTimeSlot = (id) => {
    if (availableTimeSlots.length > 1) {
      setAvailableTimeSlots(availableTimeSlots.filter(slot => slot.id !== id));
    }
  };

  // 更新時段
  const updateTimeSlot = (id, field, value) => {
    setAvailableTimeSlots(availableTimeSlots.map(slot =>
      slot.id === id ? { ...slot, [field]: value } : slot
    ));
  };

  const handleVolunteerSubmit = async (e) => {
    e.preventDefault();

    if (!volunteerForm.volunteer_name) {
        alert("請填寫姓名");
        return;
    }

    // 驗證至少有一個時段填寫完整
    const validSlots = availableTimeSlots.filter(slot => slot.date && slot.timeStart);
    if (validSlots.length === 0) {
      alert("請至少填寫一個服務時段");
      return;
    }

    setSubmitting(true);
    try {
      // 組合多個時段成為字串
      const availableTimeStr = validSlots.map(slot => {
        let timeStr = `${slot.date} ${slot.timeStart}`;
        if (slot.timeEnd) {
          timeStr += `-${slot.timeEnd}`;
        }
        return timeStr;
      }).join(', ');

      await VolunteerRegistration.create({
        ...volunteerForm,
        available_time: availableTimeStr,
        grid_id: grid.id,
        skills: volunteerForm.skills.split(',').map(s => s.trim()).filter(Boolean),
        equipment: volunteerForm.equipment.split(',').map(s => s.trim()).filter(Boolean),
      });

      // 重置表單
      setVolunteerForm({
        ...volunteerForm,
        volunteer_phone: "",
        skills: "",
        equipment: "",
        notes: ""
      });

      // 重置時段
      const resetTimeSlot = getNextFiveMinuteInterval();
      setAvailableTimeSlots([
        {
          id: Date.now(),
          date: new Date().toISOString().split('T')[0],
          startPeriod: resetTimeSlot.period,
          timeStart: resetTimeSlot.time,
          endPeriod: resetTimeSlot.period,
          timeEnd: ''
        }
      ]);

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

      // Reload discussions
      const data = await GridDiscussion.filter({ grid_id: grid.id }, '-created_date');
      setDiscussions(data);
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

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-4 w-full">
            <TabsTrigger value="info" className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              基本資訊
            </TabsTrigger>
            <TabsTrigger value="volunteer" className="flex items-center gap-2">
              <UserPlus className="w-4 h-4" />
              志工報名
            </TabsTrigger>
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
                    <Label>可服務時間</Label>
                    <div className="space-y-3">
                      {availableTimeSlots.map((slot, index) => (
                        <div key={slot.id} className="p-3 border border-gray-200 rounded-lg bg-gray-50">
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-sm font-medium text-gray-700">時段 {index + 1}</span>
                            {availableTimeSlots.length > 1 && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removeTimeSlot(slot.id)}
                                className="h-6 px-2 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                刪除
                              </Button>
                            )}
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                            {/* 日期選擇 */}
                            <div>
                              <Label className="text-xs text-gray-600 mb-1">日期</Label>
                              <Input
                                type="date"
                                value={slot.date}
                                onChange={(e) => updateTimeSlot(slot.id, 'date', e.target.value)}
                                min={index === 0 ? new Date().toISOString().split('T')[0] : availableTimeSlots[0].date}
                                className="h-8 text-xs"
                              />
                            </div>

                            {/* 開始時間 */}
                            <div>
                              <Label className="text-xs text-gray-600 mb-1">開始時間</Label>
                              <div className="flex gap-1">
                                <div className="flex rounded-md border border-gray-300 overflow-hidden">
                                  <button
                                    type="button"
                                    onClick={() => updateTimeSlot(slot.id, 'startPeriod', 'morning')}
                                    className={`px-2 py-1.5 text-xs font-medium transition-colors ${
                                      slot.startPeriod === 'morning'
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-white text-gray-700 hover:bg-gray-50'
                                    }`}
                                  >
                                    上午
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => updateTimeSlot(slot.id, 'startPeriod', 'afternoon')}
                                    className={`px-2 py-1.5 text-xs font-medium transition-colors ${
                                      slot.startPeriod === 'afternoon'
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-white text-gray-700 hover:bg-gray-50'
                                    }`}
                                  >
                                    下午
                                  </button>
                                </div>
                                <Select
                                  value={slot.timeStart}
                                  onValueChange={(value) => updateTimeSlot(slot.id, 'timeStart', value)}
                                >
                                  <SelectTrigger className="flex-1 h-8 text-xs">
                                    <SelectValue placeholder="時間" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {(slot.startPeriod === 'morning' ? morningTimes : afternoonTimes).map((time) => (
                                      <SelectItem key={time} value={time}>{time}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>

                            {/* 結束時間 */}
                            <div>
                              <Label className="text-xs text-gray-600 mb-1">結束時間（選填）</Label>
                              <div className="flex gap-1">
                                <div className="flex rounded-md border border-gray-300 overflow-hidden">
                                  <button
                                    type="button"
                                    onClick={() => updateTimeSlot(slot.id, 'endPeriod', 'morning')}
                                    className={`px-2 py-1.5 text-xs font-medium transition-colors ${
                                      slot.endPeriod === 'morning'
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-white text-gray-700 hover:bg-gray-50'
                                    }`}
                                  >
                                    上午
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => updateTimeSlot(slot.id, 'endPeriod', 'afternoon')}
                                    className={`px-2 py-1.5 text-xs font-medium transition-colors ${
                                      slot.endPeriod === 'afternoon'
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-white text-gray-700 hover:bg-gray-50'
                                    }`}
                                  >
                                    下午
                                  </button>
                                </div>
                                <Select
                                  value={slot.timeEnd}
                                  onValueChange={(value) => updateTimeSlot(slot.id, 'timeEnd', value)}
                                >
                                  <SelectTrigger className="flex-1 h-8 text-xs">
                                    <SelectValue placeholder="時間" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {(slot.endPeriod === 'morning' ? morningTimes : afternoonTimes)
                                      .filter(time => !slot.timeStart || time > slot.timeStart)
                                      .map((time) => (
                                        <SelectItem key={time} value={time}>{time}</SelectItem>
                                      ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}

                      <Button
                        type="button"
                        variant="outline"
                        onClick={addTimeSlot}
                        className="w-full h-10 border-dashed border-2 border-blue-300 text-blue-600 hover:bg-blue-50"
                      >
                        + 新增時段
                      </Button>
                    </div>
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

                  <Button
                    type="submit"
                    className="w-full bg-blue-600 hover:bg-blue-700"
                    disabled={submitting}
                  >
                    {submitting ? "提交中..." : "確認報名"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

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
                      className="w-full bg-green-600 hover:bg-green-700"
                      disabled={submitting}
                    >
                      {submitting ? "提交中..." : "確認捐贈"}
                    </Button>
                  </form>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="discussion">
            <div className="space-y-4">
              {/* Post Form */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">發表訊息</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleDiscussionSubmit} className="space-y-4">
                    <div>
                      <Label htmlFor="author_name">您的名稱 *</Label>
                      <Input
                        id="author_name"
                        value={discussionForm.author_name}
                        onChange={(e) => setDiscussionForm({...discussionForm, author_name: e.target.value})}
                        required
                      />
                      <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                        <Info className="w-3 h-3"/>
                        此名稱將公開顯示於討論區。
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
                </CardContent>
              </Card>

              {/* Discussion List */}
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
