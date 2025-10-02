

import React from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { MapPin, Package, Shield, Menu, X, Info, UserPlus, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { User, DisasterArea } from "@/api/entities";
import AddGridModal from "@/components/admin/AddGridModal";

export default function Layout({ children, currentPageName }) {
  const location = useLocation();
  const [user, setUser] = React.useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const [showNewGridModal, setShowNewGridModal] = React.useState(false);
  const [disasterAreas, setDisasterAreas] = React.useState([]);

  React.useEffect(() => {
    const loadData = async () => {
      try {
        const [currentUser, areasData] = await Promise.all([
          User.me().catch(() => null),
          DisasterArea.list()
        ]);
        setUser(currentUser);
        setDisasterAreas(areasData);
      } catch (error) {
        setUser(null);
        setDisasterAreas([]);
        console.error("Failed to load initial data for layout:", error);
      }
    };
    loadData();

    // Google Analytics - Add tracking script to head
    const gaScriptId = 'google-analytics-script';
    if (!document.getElementById(gaScriptId)) {
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
    }
  }, []);

  const navigationItems = [
    { name: "救援地圖", url: createPageUrl("Map"), icon: MapPin },
    { name: "志工中心", url: createPageUrl("Volunteers"), icon: Users },
    { name: "物資管理", url: createPageUrl("Supplies"), icon: Package },
    { name: "管理後台", url: createPageUrl("Admin"), icon: Shield },
    { name: "關於我們", url: createPageUrl("About"), icon: Info },
  ];

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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-[100] shadow-sm flex-shrink-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <Link to={createPageUrl("Map")} className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-red-500 to-orange-500 rounded-xl flex items-center justify-center">
                <MapPin className="w-6 h-6 text-white" />
              </div>
              <div className="hidden sm:block">
                <h1 className="text-xl font-bold text-gray-900">鏟子英雄</h1>
                <p className="text-xs text-gray-500">花蓮颱風救援對接</p>
              </div>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center space-x-1">
              {navigationItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.name}
                    to={item.url}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center space-x-2 ${isActive(item.url)
                      ? "bg-blue-50 text-blue-700"
                      : "text-gray-700 hover:text-blue-700 hover:bg-gray-50"
                      }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </nav>

            {/* User Menu and Main Action */}
            <div className="flex items-center space-x-4">
              <Button
                onClick={handleNewGridClick}
                className="bg-orange-600 hover:bg-orange-700 text-white flex items-center"
              >
                <UserPlus className="w-4 h-4 mr-2" />
                我要人力
              </Button>

              {user ? (
                <div className="flex items-center space-x-3">
                  <div className="hidden sm:block text-right">
                    <p className="text-sm font-medium text-gray-900">{user.full_name}</p>
                    <p className="text-xs text-gray-500">{user.role === 'admin' ? '管理員' : user.role === 'grid_manager' ? '格主' : '志工'}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleLogout}
                    className="text-gray-700 hover:text-red-600"
                  >
                    登出
                  </Button>
                </div>
              ) : (
                <Button
                  onClick={() => User.login()}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  登入
                </Button>
              )}

              {/* Mobile Menu Button */}
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </Button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-t border-gray-200">
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center space-x-2 mb-4 md:mb-0">
              <div className="w-6 h-6 bg-gradient-to-r from-red-500 to-orange-500 rounded flex items-center justify-center">
                <MapPin className="w-4 h-4 text-white" />
              </div>
              <span className="text-sm text-gray-600">花蓮颱風救援對接系統 © 2025</span>
            </div>

            <div className="text-xs text-gray-500 text-center md:text-right">
              <div data-filename="layout" data-linenumber="221" data-visual-selector-id="layout221" data-source-location="layout:221:14" data-dynamic-content="false">
                緊急連絡：
                <a data-filename="layout" data-linenumber="222" data-visual-selector-id="layout222" data-source-location="layout:222:21" data-dynamic-content="false" href="tel:119" class="text-red-600 font-medium hover:underline">119 消防局</a>
                <text> | </text>
                <a data-filename="layout" data-linenumber="222" data-visual-selector-id="layout222" data-source-location="layout:222:106" data-dynamic-content="false" href="tel:1999" class="text-blue-600 font-medium hover:underline">1999 市民熱線</a>
              </div>
              <span className="text-gray-400">免責聲明：本系統僅為資訊整合平台，不負責任何救援行動的直接執行或法律責任。</span>
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
    </div>
  );
}

