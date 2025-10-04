import { useState, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';

/**
 * 自定義 Hook：檢查使用者登入狀態
 * 如果是訪客模式，顯示登入請求對話框
 *
 * @param {string} action - 操作描述，例如："建立網格"、"報名志工"
 * @returns {Object} - { requireLogin, showLoginDialog, setShowLoginDialog }
 */
export function useRequireLogin(action = "執行此操作") {
  const { user, guestMode } = useAuth();
  const [showLoginDialog, setShowLoginDialog] = useState(false);

  /**
   * 檢查是否需要登入
   * @param {Function} callback - 登入後要執行的回調函數
   * @returns {boolean} - 如果已登入返回 true，否則顯示登入對話框並返回 false
   */
  const requireLogin = useCallback((callback) => {
    // 檢查是否為訪客模式或未登入
    if (!user || guestMode) {
      setShowLoginDialog(true);
      return false;
    }

    // 已登入，執行回調
    if (callback && typeof callback === 'function') {
      callback();
    }
    return true;
  }, [user, guestMode]);

  return {
    requireLogin,
    showLoginDialog,
    setShowLoginDialog,
    action
  };
}
