

import React from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { MapPin, Package, Shield, Menu, X, Info, UserPlus, Users, User as UserIcon, LogOut } from "lucide-react";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { User, DisasterArea } from "@/api/entities";
import { useAuth } from '@/context/AuthContext.jsx';
import AddGridModal from "@/components/admin/AddGridModal";

export default function Layout({ children, currentPageName }) {
  const location = useLocation();
  const { user, actingRole, toggleActingRole } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const [showNewGridModal, setShowNewGridModal] = React.useState(false);
  const [disasterAreas, setDisasterAreas] = React.useState([]);
  const [showConsent, setShowConsent] = React.useState(false);
  const [analyticsAllowed, setAnalyticsAllowed] = React.useState(false);

  // Load disaster areas & consent
  React.useEffect(() => {
    DisasterArea.list().then(setDisasterAreas).catch(()=>setDisasterAreas([]));
    const consent = localStorage.getItem('sh-privacy-consent-v1');
    if (!consent) setShowConsent(true); else {
      try { const parsed = JSON.parse(consent); if (parsed.analytics) setAnalyticsAllowed(true); } catch {/* ignore */}
    }
  }, []);

  // Load GA only when analyticsAllowed becomes true
  React.useEffect(() => {
    if (!analyticsAllowed) return;
    const gaScriptId = 'google-analytics-script';
    if (document.getElementById(gaScriptId)) return;
    const script1 = document.createElement('script');
    script1.id = gaScriptId;
    script1.async = true;
    script1.src = "https://www.googletagmanager.com/gtag/js?id=G-DJE7FZLCHG";
    document.head.appendChild(script1);

    const script2 = document.createElement('script');
    script2.innerHTML = `
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());
      gtag('config', 'G-DJE7FZLCHG');
    `;
    document.head.appendChild(script2);
  }, [analyticsAllowed]);

  const handleConsentAccept = (opts = { analytics: true }) => {
    const payload = { ts: Date.now(), analytics: !!opts.analytics };
    localStorage.setItem('sh-privacy-consent-v1', JSON.stringify(payload));
    setShowConsent(false);
    if (payload.analytics) setAnalyticsAllowed(true);
  };

  const handleConsentReject = () => {
    handleConsentAccept({ analytics: false });
  };

  const navigationItems = React.useMemo(() => {
    const base = [
      { name: "救援地圖", url: createPageUrl("Map"), icon: MapPin },
      { name: "物資管理", url: createPageUrl("Supplies"), icon: Package },
    ];
    if (user) {
      base.push(
        { name: "志工中心", url: createPageUrl("Volunteers"), icon: Users },
        { name: "管理後台", url: createPageUrl("Admin"), icon: Shield },
      );
    }
    base.push({ name: "關於我們", url: createPageUrl("About"), icon: Info });
    return base;
  }, [user]);

  const isActive = (url) => location.pathname === url;

  const handleLogout = async () => {
    await User.logout();
    window.location.reload();
  };

  const handleNewGridClick = () => {
    // 如果當前在地圖頁面，先關閉地圖
    if (location.pathname === createPageUrl("Map")) {
      // 使用 localStorage 來通知 Map 組件關閉地圖
      localStorage.setItem('collapseMapForModal', 'true');
      // 立即觸發自定義事件，確保地圖即時收起
      window.dispatchEvent(new Event('collapseMap'));
    }
    setShowNewGridModal(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100 flex flex-col min-w-[436px]">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-[100] shadow-sm flex-shrink-0 min-w-[436px]">
        <div className="px-4 min-w-[436px]">
          <div className="flex justify-between items-center h-16 gap-4">
            {/* Logo */}
            <Link to={createPageUrl("Map")} className="flex items-center space-x-3 flex-shrink-0">
              <div className="w-10 h-10 bg-gradient-to-r from-red-500 to-orange-500 rounded-xl flex items-center justify-center flex-shrink-0">
                <MapPin className="w-6 h-6 text-white" />
              </div>
              <div className="flex flex-col justify-center">
                <h1 className="text-xl font-bold text-gray-900 whitespace-nowrap leading-tight">鏟子英雄</h1>
                <p className="text-xs text-gray-500 whitespace-nowrap">花蓮颱風救援對接</p>
              </div>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden sm:flex items-center justify-center gap-1 flex-1 min-w-0">
              {navigationItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.url);
                return (
                  <Link
                    key={item.name}
                    to={item.url}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2 whitespace-nowrap ${
                      active
                        ? "bg-blue-50 text-blue-700"
                        : "text-gray-700 hover:text-blue-700 hover:bg-gray-50"
                    }`}
                    title={item.name}
                  >
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    <span className={active ? "inline" : "hidden lg:inline"}>{item.name}</span>
                  </Link>
                );
              })}
            </nav>

            {/* User Menu and Main Action */}
            <div className="flex items-center space-x-4 flex-shrink-0">
              <Button
                onClick={handleNewGridClick}
                className="bg-orange-600 hover:bg-orange-700 text-white flex items-center whitespace-nowrap"
              >
                <UserPlus className="w-4 h-4 mr-2" />
                我要人力
              </Button>

              {user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      className="relative w-10 h-10 flex items-center justify-center overflow-visible group focus:outline-none flex-shrink-0"
                      title={(user.role === 'admin' && actingRole === 'admin') ? '管理模式中' : (user.name || user.full_name || '使用者')}
                    >
                      {user.role === 'admin' && actingRole === 'admin' && (
                        <>
                          {/* Soft outer ambient glow */}
                          <span aria-hidden="true" className="absolute inset-0 rounded-full bg-pink-300/30 blur-[3px] animate-pulse" />
                          {/* Thin soft ring */}
                          <span aria-hidden="true" className="absolute -inset-1 rounded-full ring-2 ring-pink-400/60 animate-[pulse_2.8s_ease-in-out_infinite]" />
                        </>
                      )}
                      {/* Actual avatar circle */}
                      <span className="relative inline-flex w-full h-full rounded-full ring-2 ring-white shadow bg-gradient-to-br from-blue-500 to-indigo-600 text-white items-center justify-center group-hover:opacity-90 transition">
                        {user.avatar_url ? (
                          <img src={user.avatar_url} alt="avatar" className="w-full h-full object-cover rounded-full" />
                        ) : (
                          <span className="font-semibold text-sm">{(user.name || user.full_name || 'U').slice(0,1).toUpperCase()}</span>
                        )}
                      </span>
                      {user.role === 'admin' && actingRole === 'admin' && (
                        <span className="sr-only">管理模式啟用</span>
                      )}
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-64">
                    <div className="px-3 py-2 text-xs text-gray-500">
                      <div className="font-medium text-gray-900 text-sm mb-0.5 flex items-center gap-2"><UserIcon className="w-4 h-4 text-blue-600" /><span>{user.name || user.full_name || '使用者'}</span></div>
                      <div>{user.email}</div>
                      <div className="mt-1 inline-flex items-center gap-1 flex-wrap">
                        <span className="rounded bg-gray-100 px-2 py-0.5 text-[10px] tracking-wide text-gray-700">{user.role || 'user'}</span>
                        {user.role === 'admin' && (
                          <button onClick={toggleActingRole} className="rounded bg-blue-100 hover:bg-blue-200 text-blue-700 px-2 py-0.5 text-[10px] tracking-wide transition">視角: {actingRole === 'admin' ? '管理' : '一般'}</button>
                        )}
                      </div>
                    </div>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout} className="text-red-600 focus:text-red-600 focus:bg-red-50 cursor-pointer"><LogOut className="w-4 h-4 mr-2" /> 登出</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Button onClick={() => User.login()} className="bg-blue-600 hover:bg-blue-700 text-white">登入</Button>
              )}

              {/* Mobile Menu Button */}
              <Button
                variant="ghost"
                size="icon"
                className="sm:hidden"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </Button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="sm:hidden bg-white border-t border-gray-200">
            <div className="px-2 pt-2 pb-3 space-y-1">
              {navigationItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.name}
                    to={item.url}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`block px-4 py-3 rounded-lg text-sm font-medium flex items-center space-x-3 ${isActive(item.url)
                      ? "bg-blue-50 text-blue-700"
                      : "text-gray-700 hover:text-blue-700 hover:bg-gray-50"
                      }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 relative z-[100] flex-shrink-0 mt-auto">
        <div className="px-4 py-6 min-w-[436px]">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center space-x-2 mb-4 md:mb-0">
              <div className="w-6 h-6 bg-gradient-to-r from-red-500 to-orange-500 rounded flex items-center justify-center">
                <MapPin className="w-4 h-4 text-white" />
              </div>
              <span className="text-sm text-gray-600">花蓮颱風救援對接系統 © 2025</span>
            </div>
            <div className="text-xs text-gray-500 text-center md:text-right space-y-1">
              <div>緊急連絡：119 消防局 | 1999 市民熱線</div>
              <div className="text-gray-400">免責聲明：本系統僅為資訊整合平台，不負責任何救援行動的直接執行或法律責任。</div>
              <div className="flex flex-wrap gap-3 justify-center md:justify-end pt-1">
                <Link to={createPageUrl('Privacy')} className="hover:text-blue-600 underline underline-offset-2">隱私與 Cookie 政策</Link>
                <button onClick={() => {localStorage.removeItem('sh-privacy-consent-v1'); setShowConsent(true);}} className="hover:text-blue-600 underline underline-offset-2">重新設定 Cookie 偏好</button>
              </div>
            </div>
          </div>
        </div>
      </footer>

      {/* Add Grid Modal */}
      {showNewGridModal && (
        <AddGridModal
          isOpen={showNewGridModal}
          onClose={() => setShowNewGridModal(false)}
          onSuccess={() => {
            
            setShowNewGridModal(false);
            
          
            window.location.reload(); // Reload to see the new grid
          
          
          }}
          disasterAreas={disasterAreas}
        />
      )}
      {/* Privacy & Cookie Consent Modal */}
      {showConsent && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
          <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">
            <div className="p-6 overflow-y-auto flex-1 space-y-5 text-sm text-gray-700">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-red-100 rounded-lg">
                  <span className="text-red-600 font-bold text-lg">!</span>
                </div>
                <h2 className="text-xl font-bold text-gray-900">重要聲明與使用須知</h2>
              </div>
              <div className="space-y-4">
                <div className="bg-orange-50 border-l-4 border-orange-500 p-4 rounded">
                  <h3 className="font-bold text-orange-900 mb-2">📢 資訊公開聲明</h3>
                  <ul className="list-disc list-inside space-y-1 text-xs sm:text-sm">
                    <li>志工報名的姓名、電話（若提供）、可服務時間可能公開顯示</li>
                    <li>物資捐贈的聯絡資訊（若提供）可能公開顯示</li>
                    <li>需求/網格建立者的聯絡資訊可能公開顯示</li>
                    <li>提供資料旨在促進救災協調，請自行評估風險</li>
                  </ul>
                </div>
                <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded">
                  <h3 className="font-bold text-red-900 mb-2">⚠️ 免責聲明</h3>
                  <ul className="list-disc list-inside space-y-1 text-xs sm:text-sm">
                    <li>本平台僅提供媒合與資訊曝光，不涉及金錢往來</li>
                    <li>志工行動請自行評估安全風險並自負責任</li>
                    <li>現場狀況與需求以官方或現場管理者資訊為準</li>
                    <li>不對第三方互動產生之任何損害或糾紛負責</li>
                  </ul>
                </div>
                <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
                  <h3 className="font-bold text-blue-900 mb-2">🔒 個人資料與 Cookie 使用</h3>
                  <p className="text-xs sm:text-sm mb-2">我們僅使用必要 Cookie 維持登入與功能。若您同意，我們也會載入分析 Cookie（Google Analytics）以改善系統。</p>
                  <ul className="list-disc list-inside space-y-1 text-xs sm:text-sm">
                    <li>必要性：登入狀態、基本功能（不可停用）</li>
                    <li>分析：匿名使用統計（需您同意）</li>
                    <li>偏好：記錄您已同意不再顯示此視窗</li>
                  </ul>
                  <Link to={createPageUrl('Privacy')} className="block mt-2 text-blue-600 hover:underline text-xs">閱讀完整隱私與 Cookie 政策</Link>
                </div>
                <label className="flex items-start gap-2 text-xs sm:text-sm bg-gray-100 p-3 rounded cursor-pointer">
                  <input type="checkbox" id="analytics-opt" className="mt-0.5" defaultChecked onChange={(e)=>setAnalyticsAllowed(e.target.checked)} />
                  <span>我同意使用匿名分析 Cookie（可協助改善平台效能）。</span>
                </label>
                <div className="text-[10px] sm:text-xs text-gray-500">點擊同意即表示您理解並接受上述條款。</div>
              </div>
            </div>
            <div className="border-t bg-white p-4 flex flex-col sm:flex-row gap-3 sm:gap-4">
              <button onClick={()=>handleConsentAccept({ analytics: analyticsAllowed })} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-lg text-sm">我已理解並同意</button>
              <button onClick={handleConsentReject} className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-2.5 rounded-lg text-sm">僅允許必要 Cookie</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

