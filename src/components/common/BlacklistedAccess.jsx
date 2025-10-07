import React from 'react';
import { ShieldX, AlertTriangle, Mail } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { User } from '@/api/entities';

/**
 * 黑名單使用者專用頁面
 * 當使用者被加入黑名單時顯示此頁面
 * 不會載入任何系統資料，只提供基本的申訴資訊
 */
export default function BlacklistedAccess() {
  const handleLogout = async () => {
    try {
      await User.logout();
      window.location.href = '/';
    } catch (error) {
      console.error('登出失敗:', error);
      // 即使登出失敗也強制重新整理頁面
      window.location.href = '/';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center p-4">
      <Card className="max-w-2xl w-full shadow-2xl border-red-200">
        <CardHeader className="text-center pb-4">
          <div className="flex justify-center mb-4">
            <div className="relative">
              <ShieldX className="w-24 h-24 text-red-600" />
              <div className="absolute -top-2 -right-2">
                <AlertTriangle className="w-8 h-8 text-orange-500 animate-pulse" />
              </div>
            </div>
          </div>
          <CardTitle className="text-3xl font-bold text-red-700">
            帳號已被停用
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 主要訊息 */}
          <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg">
            <h3 className="font-semibold text-red-900 mb-2 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              您的帳號已被管理員加入黑名單
            </h3>
            <p className="text-red-800 text-sm leading-relaxed">
              您的帳號因違反使用條款或社群規範，已被系統管理員停用。
              在此期間，您將無法存取系統的任何功能與資料。
            </p>
          </div>

          {/* 可能的原因 */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-semibold text-gray-900 mb-3">可能的停用原因：</h3>
            <ul className="space-y-2 text-sm text-gray-700">
              <li className="flex items-start gap-2">
                <span className="text-red-500 mt-0.5">•</span>
                <span>發布不實或惡意資訊</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-500 mt-0.5">•</span>
                <span>濫用系統功能或資源</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-500 mt-0.5">•</span>
                <span>騷擾或攻擊其他使用者</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-500 mt-0.5">•</span>
                <span>違反使用條款或社群規範</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-500 mt-0.5">•</span>
                <span>其他經管理員判定之不當行為</span>
              </li>
            </ul>
          </div>

          {/* 申訴資訊 */}
          <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
            <h3 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
              <Mail className="w-5 h-5" />
              如何申訴？
            </h3>
            <div className="text-sm text-blue-800 space-y-3">
              <p>
                若您認為這是誤判，或希望了解更多停用原因，請透過以下方式聯繫管理員：
              </p>
              <a
                href="https://docs.google.com/forms/d/e/1FAIpQLSf-_smDHmzi9kxRSq5ZzQg0yvm_jvFzmeb6rkkySv1ii4XG5g/viewform"
                target="_blank"
                rel="noopener noreferrer"
                className="block"
              >
                <Button className="w-full bg-blue-600 hover:bg-blue-700">
                  <Mail className="w-4 h-4 mr-2" />
                  透過表單聯絡我們
                </Button>
              </a>
              <p className="text-xs text-gray-600">
                申訴時請提供您的帳號資訊與詳細說明，管理員將會審核您的申訴並回覆處理結果。
              </p>
            </div>
          </div>

          {/* 注意事項 */}
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-r-lg">
            <h3 className="font-semibold text-yellow-900 mb-2">⚠️ 重要提醒</h3>
            <ul className="text-sm text-yellow-800 space-y-1">
              <li>• 黑名單狀態由管理員設定，系統會自動攔截所有存取</li>
              <li>• 重新註冊新帳號不會解除黑名單限制</li>
              <li>• 只有管理員可以解除黑名單狀態</li>
              <li>• 若有疑問請直接聯繫系統管理員</li>
            </ul>
          </div>

          {/* 登出按鈕 */}
          <div className="pt-4 border-t border-gray-200">
            <Button
              onClick={handleLogout}
              className="w-full bg-gray-700 hover:bg-gray-800 text-white"
              size="lg"
            >
              登出系統
            </Button>
            <p className="text-xs text-gray-500 text-center mt-3">
              登出後您可以使用其他帳號登入
            </p>
          </div>

          {/* Footer */}
          <div className="text-center text-xs text-gray-500 pt-4 border-t border-gray-200">
            <p>鏟子英雄 - 花蓮颱風救援對接平台</p>
            <p className="mt-1">感謝您的理解與配合</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
