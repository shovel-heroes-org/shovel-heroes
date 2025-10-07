import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { User } from '@/api/entities';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [actingRole, setActingRole] = useState('user');
  const [loading, setLoading] = useState(true);
  const [guestMode, setGuestMode] = useState(false); // 訪客模式
  const [roleSwitching, setRoleSwitching] = useState(false); // 角色切換中

  // Load on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // 檢查是否正在切換角色
        const isSwitching = sessionStorage.getItem('sh-role-switching') === 'true';
        if (isSwitching) {
          setRoleSwitching(true);
        }

        const u = await User.me();
        if (cancelled) return;
        setUser(u);
        const stored = localStorage.getItem('sh-acting-role');
        const storedGuest = localStorage.getItem('sh-guest-mode') === 'true';

        // 檢查訪客模式
        if (storedGuest && u) {
          setGuestMode(true);
          setActingRole('guest');
        }
        // super_admin 可以切換到所有視角
        else if (u && u.role === 'super_admin') {
          const validRoles = ['user', 'grid_manager', 'admin', 'super_admin', 'guest'];
          if (stored && validRoles.includes(stored)) {
            setActingRole(stored);
            setGuestMode(stored === 'guest');
          } else {
            setActingRole('super_admin');
          }
        }
        // admin 只能切換 user 和 admin
        else if (u && u.role === 'admin') {
          if (stored && ['admin', 'user', 'guest'].includes(stored)) {
            setActingRole(stored);
            setGuestMode(stored === 'guest');
          } else {
            setActingRole('admin');
          }
        }
        // grid_manager 可以切換 user 和 grid_manager
        else if (u && u.role === 'grid_manager') {
          if (stored && ['grid_manager', 'user', 'guest'].includes(stored)) {
            setActingRole(stored);
            setGuestMode(stored === 'guest');
          } else {
            setActingRole('grid_manager');
          }
        } else {
          setActingRole('user');
        }

        // 清除角色切換標記
        if (isSwitching) {
          sessionStorage.removeItem('sh-role-switching');
          setRoleSwitching(false);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    const handler = () => {
      User.me().then(nu => setUser(nu)).catch(()=>setUser(null));
    };
    window.addEventListener('sh-auth-changed', handler);
    return () => { cancelled = true; window.removeEventListener('sh-auth-changed', handler); };
  }, []);

  // 切換視角函數 - 支援直接設定特定角色
  const setActingRoleWithStorage = useCallback((role) => {
    if (!user) return;

    // 設定標記：正在切換角色（避免在 reload 時顯示權限錯誤）
    sessionStorage.setItem('sh-role-switching', 'true');

    // 處理訪客模式
    if (role === 'guest') {
      setGuestMode(true);
      setActingRole('guest');
      localStorage.setItem('sh-acting-role', 'guest');
      localStorage.setItem('sh-guest-mode', 'true');
      // 重新載入頁面以確保所有資料更新
      window.location.reload();
      return;
    } else {
      setGuestMode(false);
      localStorage.setItem('sh-guest-mode', 'false');
    }

    // super_admin 可以切換到所有視角
    if (user.role === 'super_admin') {
      const validRoles = ['user', 'grid_manager', 'admin', 'super_admin', 'guest'];
      if (validRoles.includes(role)) {
        setActingRole(role);
        localStorage.setItem('sh-acting-role', role);
        // 重新載入頁面以確保所有資料更新
        window.location.reload();
      }
    }
    // admin 只能切換 user 和 admin
    else if (user.role === 'admin') {
      if (['user', 'admin', 'guest'].includes(role)) {
        setActingRole(role);
        localStorage.setItem('sh-acting-role', role);
        // 重新載入頁面以確保所有資料更新
        window.location.reload();
      }
    }
    // grid_manager 只能切換 user 和 grid_manager
    else if (user.role === 'grid_manager') {
      if (['user', 'grid_manager', 'guest'].includes(role)) {
        setActingRole(role);
        localStorage.setItem('sh-acting-role', role);
        // 重新載入頁面以確保所有資料更新
        window.location.reload();
      }
    }
  }, [user]);

  // 舊的 toggleActingRole - 保持向後兼容
  const toggleActingRole = useCallback(() => {
    if (!user) return;

    if (user.role === 'admin') {
      setActingRole(prev => {
        const next = prev === 'admin' ? 'user' : 'admin';
        localStorage.setItem('sh-acting-role', next);
        return next;
      });
    }
  }, [user]);

  // 檢查使用者是否被加入黑名單
  const isBlacklisted = user?.is_blacklisted === true;

  return (
    <AuthContext.Provider value={{
      user,
      setUser,
      actingRole,
      setActingRole: setActingRoleWithStorage,
      toggleActingRole,
      loading,
      guestMode,
      roleSwitching,
      isBlacklisted
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext) || {
    user: null,
    actingRole: 'user',
    loading: true,
    guestMode: false,
    roleSwitching: false,
    isBlacklisted: false
  };
}
