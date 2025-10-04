import React, { useState, useEffect } from "react";
// UUID 產生工具
function getOrCreateUUID() {
  const key = 'shovel_heroes_uuid';
  let uuid = localStorage.getItem(key);
  if (!uuid) {
    uuid = (window.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`);
    localStorage.setItem(key, uuid);
  }
  return uuid;
}

function canSubmitRequest() {
  const uuid = getOrCreateUUID();
  const lastKey = `shovel_heroes_last_submit_${uuid}`;
  const last = localStorage.getItem(lastKey);
  if (!last) return true;
  // 10分鐘內不可重複送出
  return (Date.now() - Number(last)) > 10 * 60 * 1000;
}

function markRequestSubmitted() {
  const uuid = getOrCreateUUID();
  const lastKey = `shovel_heroes_last_submit_${uuid}`;
  localStorage.setItem(lastKey, Date.now().toString());
}
import { DisasterArea, User } from "@/api/entities";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import AddGridModal from "@/components/admin/AddGridModal";
import { MapPin, UserPlus, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRequireLogin } from "@/hooks/useRequireLogin";
import LoginRequiredDialog from "@/components/common/LoginRequiredDialog";

export default function RequestHelpPage() {
  const [disasterAreas, setDisasterAreas] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitBlocked, setSubmitBlocked] = useState(false);

  // 登入檢查
  const createGridLogin = useRequireLogin("建立救援需求");

  useEffect(() => {
    const loadData = async () => {
      try {
        const [areasData, userData] = await Promise.all([
          DisasterArea.list(),
          User.me().catch(() => null)
        ]);
        setDisasterAreas(areasData);
        setUser(userData);
      } catch (error) {
        console.error("Failed to load data:", error);
        setDisasterAreas([]);
        setUser(null);
      } finally {
        setLoading(false);
        // 檢查是否可送出
        setSubmitBlocked(!canSubmitRequest());
      }
    };
    loadData();
  }, []);

  // 申請成功後，記錄送出時間
  const handleSuccess = () => {
    setShowModal(false);
    markRequestSubmitted();
    // 成功後跳轉到救援地圖
    window.location.href = '/pages/Map';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100">
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="flex items-center justify-center gap-3 mb-6">
              <div className="w-16 h-16 bg-gradient-to-r from-red-500 to-orange-500 rounded-2xl flex items-center justify-center">
                <MapPin className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-4xl font-bold text-gray-900">鏟子英雄</h1>
                <p className="text-lg text-gray-600">花蓮颱風救援對接平台</p>
              </div>
            </div>
            
            <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-200">
              <div className="flex items-center justify-center mb-6">
                <UserPlus className="w-12 h-12 text-orange-600" />
              </div>
              <h2 className="text-3xl font-bold text-gray-900 mb-4">需要人力支援？</h2>
              <p className="text-lg text-gray-700 mb-8 leading-relaxed">
                如果您的區域需要志工協助進行災後清理、物資整理或其他救援工作，
                <br />
                請填寫以下表單，我們將協助您媒合適合的志工人力。
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-3">
                    <span className="text-white font-bold text-sm">1</span>
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">填寫需求</h3>
                  <p className="text-sm text-gray-600">描述您需要的人力支援類型與數量</p>
                </div>
                
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-3">
                    <span className="text-white font-bold text-sm">2</span>
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">標註位置</h3>
                  <p className="text-sm text-gray-600">在地圖上標註需要協助的確切位置</p>
                </div>
                
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center mx-auto mb-3">
                    <span className="text-white font-bold text-sm">3</span>
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">等待媒合</h3>
                  <p className="text-sm text-gray-600">志工將看到您的需求並主動報名協助</p>
                </div>
              </div>

              {!user ? (
                // 未登入狀態：顯示登入提示卡片
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-2xl p-8 mb-6">
                  <div className="flex flex-col items-center text-center space-y-6">
                    <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center">
                      <AlertTriangle className="w-8 h-8 text-white" />
                    </div>

                    <div className="space-y-2">
                      <h3 className="text-xl font-bold text-gray-900">
                        請先登入以建立救援需求
                      </h3>
                      <p className="text-gray-700 max-w-md mx-auto">
                        為了確保救援資訊的真實性與可追蹤性，請先使用 Google 帳號登入。
                        登入後您可以建立、管理及追蹤您的救援需求。
                      </p>
                    </div>

                    <div className="flex items-center gap-3 text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                        <span>快速登入</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                        <span>管理需求</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                        <span>即時追蹤</span>
                      </div>
                    </div>

                    <Button
                      onClick={() => User.login()}
                      size="lg"
                      className="bg-blue-600 hover:bg-blue-700 text-white text-lg px-12 py-6 h-auto rounded-xl shadow-lg hover:shadow-xl transition-all"
                    >
                      <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                      </svg>
                      使用 Google 帳號登入
                    </Button>

                    <p className="text-xs text-gray-500 max-w-sm mx-auto">
                      我們使用 Google 帳號登入以確保資料安全。登入後您的個人資訊將受到保護。
                    </p>
                  </div>
                </div>
              ) : (
                // 已登入狀態：顯示申請按鈕
                <div className="flex justify-center">
                  <Button
                    onClick={() => {
                      // 檢查登入狀態
                      if (createGridLogin.requireLogin(() => setShowModal(true))) {
                        // 已登入，開啟彈窗
                        return;
                      }
                    }}
                    size="lg"
                    className="bg-orange-600 hover:bg-orange-700 text-white text-lg px-12 py-6 h-auto rounded-xl shadow-lg hover:shadow-xl transition-all"
                    disabled={submitBlocked}
                    title={submitBlocked ? '請稍後再送出申請（10分鐘內僅限一次）' : ''}
                  >
                    <UserPlus className="w-6 h-6 mr-3" />
                    立即申請人力支援
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Additional Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">常見支援類型</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-gray-700">
                  <li>• 清理淤泥、垃圾與雜物</li>
                  <li>• 物資搬運與整理</li>
                  <li>• 基礎水電修復</li>
                  <li>• 環境消毒與清潔</li>
                  <li>• 其他災後復原工作</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">注意事項</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-gray-700">
                  <li>• 請確實填寫聯絡資訊</li>
                  <li>• 標註準確的集合地點</li>
                  <li>• 評估現場安全風險</li>
                  <li>• 準備必要的工具設備</li>
                  <li>• 與志工保持良好溝通</li>
                </ul>
              </CardContent>
            </Card>
          </div>

          {/* Footer */}
          <div className="text-center mt-12 py-8 border-t border-gray-200">
            <p className="text-gray-500 text-sm">
              鏟子英雄 - 花蓮颱風救援對接平台 © 2024
              <br />
              緊急連絡：119 消防局 | 1999 市民熱線
            </p>
          </div>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <AddGridModal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          onSuccess={handleSuccess}
          disasterAreas={disasterAreas}
          userUUID={!user ? getOrCreateUUID() : undefined}
        />
      )}

      {/* 登入請求對話框 */}
      <LoginRequiredDialog
        open={createGridLogin.showLoginDialog}
        onOpenChange={createGridLogin.setShowLoginDialog}
        action={createGridLogin.action}
      />
    </div>
  );
}