import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { checkPermission } from '@/api/permissions';

/**
 * 權限檢查 Hook - 絕對權限控制版本
 * 所有權限檢查必須從資料庫的 role_permissions 表讀取
 * 權限授權設定是絕對的權限控制
 *
 * @returns {Object} 權限檢查函數和狀態
 */
export function usePermission() {
  const { user, actingRole } = useAuth();
  const [permissionCache, setPermissionCache] = useState({});
  const [permissionLoading, setPermissionLoading] = useState({});

  /**
   * 清除權限快取（當權限設定更新時使用）
   */
  const clearPermissionCache = useCallback(() => {
    setPermissionCache({});
  }, []);

  /**
   * 檢查是否有特定權限（同步版本 - 僅用於快取檢查）
   * @param {string} permissionKey - 權限鍵值 (如: 'grids', 'volunteers', 'supplies')
   * @param {string} action - 動作類型 ('view'|'create'|'edit'|'delete'|'manage')
   * @returns {boolean} 是否有權限
   */
  const hasPermission = useCallback((permissionKey, action) => {
    if (!user || !actingRole) return false;

    // 訪客模式的權限檢查（訪客是唯一的例外，因為不在資料庫中）
    if (actingRole === 'guest') {
      if (action === 'view') {
        return ['disaster_areas', 'grids', 'volunteers', 'supplies'].includes(permissionKey);
      }
      return false;
    }

    // 超級管理員有所有權限（這是角色的特殊性，不需要查表）
    if (actingRole === 'super_admin') {
      return true;
    }

    // 檢查快取
    const cacheKey = `${actingRole}:${permissionKey}:${action}`;
    if (permissionCache[cacheKey] !== undefined) {
      return permissionCache[cacheKey];
    }

    // 如果快取中沒有，觸發非同步載入（但這次返回 false，強制使用非同步版本）
    if (!permissionLoading[cacheKey]) {
      checkPermissionAsync(permissionKey, action);
    }

    return false; // 沒有快取時返回 false，強制等待資料庫查詢
  }, [user, actingRole, permissionCache, permissionLoading]);

  /**
   * 從 API 檢查權限（非同步）- 絕對權限版本
   * @param {string} permissionKey - 權限鍵值
   * @param {string} action - 動作類型
   * @returns {Promise<boolean>} 是否有權限
   */
  const checkPermissionAsync = useCallback(async (permissionKey, action) => {
    if (!user || !actingRole) return false;

    // 訪客模式（例外處理）
    if (actingRole === 'guest') {
      if (action === 'view') {
        return ['disaster_areas', 'grids', 'volunteers', 'supplies'].includes(permissionKey);
      }
      return false;
    }

    // 超級管理員（角色特殊性）
    if (actingRole === 'super_admin') {
      return true;
    }

    const cacheKey = `${actingRole}:${permissionKey}:${action}`;

    // 標記為載入中
    setPermissionLoading(prev => ({ ...prev, [cacheKey]: true }));

    try {
      const result = await checkPermission(actingRole, permissionKey, action);
      const hasAccess = result?.hasPermission || false;

      // 更新快取
      setPermissionCache(prev => ({
        ...prev,
        [cacheKey]: hasAccess
      }));

      // 取消載入中標記
      setPermissionLoading(prev => {
        const newState = { ...prev };
        delete newState[cacheKey];
        return newState;
      });

      return hasAccess;
    } catch (error) {
      console.error('檢查權限失敗:', error);
      // 取消載入中標記
      setPermissionLoading(prev => {
        const newState = { ...prev };
        delete newState[cacheKey];
        return newState;
      });

      // ⚠️ 重要：失敗時返回 false，不使用預設值
      // 權限授權設定是絕對的，如果無法從資料庫讀取，就拒絕存取
      return false;
    }
  }, [user, actingRole]);

  /**
   * 檢查是否可以檢視
   */
  const canView = useCallback((permissionKey) => {
    return hasPermission(permissionKey, 'view');
  }, [hasPermission]);

  /**
   * 檢查是否可以建立
   */
  const canCreate = useCallback((permissionKey) => {
    return hasPermission(permissionKey, 'create');
  }, [hasPermission]);

  /**
   * 檢查是否可以編輯
   */
  const canEdit = useCallback((permissionKey) => {
    return hasPermission(permissionKey, 'edit');
  }, [hasPermission]);

  /**
   * 檢查是否可以刪除
   */
  const canDelete = useCallback((permissionKey) => {
    return hasPermission(permissionKey, 'delete');
  }, [hasPermission]);

  /**
   * 檢查是否可以管理
   */
  const canManage = useCallback((permissionKey) => {
    return hasPermission(permissionKey, 'manage');
  }, [hasPermission]);

  /**
   * 視角切換時清除快取並重新載入權限
   */
  useEffect(() => {
    // 清除舊的快取（因為角色改變了）
    setPermissionCache({});

    if (!user || !actingRole || actingRole === 'guest' || actingRole === 'super_admin') {
      return;
    }

    // 預載入常用權限
    const commonPermissions = [
      ['grids', 'view'],
      ['grids', 'create'],
      ['grids', 'edit'],
      ['grids', 'delete'],
      ['disaster_areas', 'view'],
      ['volunteers', 'view'],
      ['supplies', 'view'],
      ['admin_panel', 'view'],
      ['users', 'view'],
      ['role_permissions', 'view'],
      ['role_permissions', 'edit'],
      ['announcements', 'view'],
      ['blacklist', 'view'],
      ['audit_logs', 'view']
    ];

    // 使用 setTimeout 確保快取清除後再載入
    setTimeout(() => {
      commonPermissions.forEach(([key, action]) => {
        checkPermissionAsync(key, action);
      });
    }, 0);
  }, [user, actingRole, checkPermissionAsync]);

  /**
   * 監聽權限更新事件，自動清除快取
   */
  useEffect(() => {
    const handlePermissionUpdate = () => {
      console.log('🔄 檢測到權限更新，清除快取並重新載入權限');
      clearPermissionCache();

      // 重新預載入常用權限
      if (user && actingRole && actingRole !== 'guest' && actingRole !== 'super_admin') {
        const commonPermissions = [
          ['grids', 'view'],
          ['grids', 'create'],
          ['grids', 'edit'],
          ['grids', 'delete'],
          ['disaster_areas', 'view'],
          ['volunteers', 'view'],
          ['supplies', 'view'],
          ['admin_panel', 'view'],
          ['users', 'view'],
          ['role_permissions', 'view'],
          ['role_permissions', 'edit']
        ];

        setTimeout(() => {
          commonPermissions.forEach(([key, action]) => {
            checkPermissionAsync(key, action);
          });
        }, 100);
      }
    };

    window.addEventListener('permission-updated', handlePermissionUpdate);
    return () => window.removeEventListener('permission-updated', handlePermissionUpdate);
  }, [user, actingRole, clearPermissionCache, checkPermissionAsync]);

  return {
    hasPermission,
    checkPermissionAsync,
    canView,
    canCreate,
    canEdit,
    canDelete,
    canManage,
    clearPermissionCache, // 新增：清除快取函數
    currentRole: actingRole,
    isGuest: actingRole === 'guest',
    isUser: actingRole === 'user',
    isGridManager: actingRole === 'grid_manager',
    isAdmin: actingRole === 'admin',
    isSuperAdmin: actingRole === 'super_admin'
  };
}
