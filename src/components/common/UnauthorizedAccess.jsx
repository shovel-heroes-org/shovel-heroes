import React from 'react';
import { ShieldAlert, ArrowLeft, Home } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { createPageUrl } from '@/utils';

/**
 * 無權限訪問頁面組件
 * 當使用者訪問無權限的頁面時顯示此組件
 */
export default function UnauthorizedAccess({
  title = "無權限訪問此頁面",
  message = "您目前的角色無法訪問此頁面的內容。如需訪問，請聯繫管理員或切換至對應的角色視角。",
  showBackButton = true,
  showHomeButton = true
}) {
  const navigate = useNavigate();

  return (
    <div className="min-h-[calc(100vh-200px)] flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        {/* Icon */}
        <div className="mx-auto w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mb-6">
          <ShieldAlert className="w-10 h-10 text-red-600" />
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold text-gray-900 mb-3">
          {title}
        </h1>

        {/* Message */}
        <p className="text-gray-600 mb-8">
          {message}
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          {showBackButton && (
            <Button
              onClick={() => navigate(-1)}
              variant="outline"
              className="flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              返回上一頁
            </Button>
          )}

          {showHomeButton && (
            <Link to={createPageUrl("Map")}>
              <Button className="flex items-center gap-2 w-full sm:w-auto">
                <Home className="w-4 h-4" />
                回到首頁
              </Button>
            </Link>
          )}
        </div>

        {/* Additional Info */}
        <div className="mt-8 p-4 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-800">
            💡 提示：如果您擁有相應權限，請檢查右上角的角色視角切換功能，確保您處於正確的視角下。
          </p>
        </div>
      </div>
    </div>
  );
}
