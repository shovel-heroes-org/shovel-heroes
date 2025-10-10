import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getAllPermissionsForRole } from '@/api/permissions';

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
  const [permissionsLoaded, setPermissionsLoaded] = useState(false); // 追蹤權限是否已載入完成
  const isLoadingAllRef = useRef(false); // 使用 ref 防止重複載入（立即生效）
  const loadedRoleRef = useRef(null); // 記錄已載入的角色

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

    // 所有角色(包含超級管理員)都從資料庫檢查權限
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
   * 批量載入角色的所有權限（帶防重複載入機制）
   * @returns {Promise<void>}
   */
  const loadAllPermissions = useCallback(async () => {
    if (!user || !actingRole) return;

    // 訪客模式不需要從API載入
    if (actingRole === 'guest') {
      return;
    }

    // 防止重複載入：如果正在載入中或已載入過相同角色，直接返回
    if (isLoadingAllRef.current || loadedRoleRef.current === actingRole) {
      return;
    }

    try {
      isLoadingAllRef.current = true; // 立即標記為載入中
      // console.log(`🔄 批量載入權限 - 角色: ${actingRole}`);

      const result = await getAllPermissionsForRole(actingRole);
      const permissions = result?.permissions || {};

      // 將批量權限轉換為快取格式
      const newCache = {};
      Object.keys(permissions).forEach(permissionKey => {
        const perm = permissions[permissionKey];
        newCache[`${actingRole}:${permissionKey}:view`] = perm.view || false;
        newCache[`${actingRole}:${permissionKey}:create`] = perm.create || false;
        newCache[`${actingRole}:${permissionKey}:edit`] = perm.edit || false;
        newCache[`${actingRole}:${permissionKey}:delete`] = perm.delete || false;
        newCache[`${actingRole}:${permissionKey}:manage`] = perm.manage || false;
      });

      // 更新快取
      setPermissionCache(newCache);
      loadedRoleRef.current = actingRole; // 記錄已載入的角色
      setPermissionsLoaded(true); // 標記權限已載入完成
      // console.log(`✅ 批量載入權限完成 - 角色: ${actingRole}, 權限數: ${Object.keys(permissions).length}`);
    } catch (error) {
      // console.error('批量載入權限失敗:', error);
      // 載入失敗時保持空快取，hasPermission 會返回 false
      setPermissionsLoaded(true); // 即使失敗也標記為已載入（避免無限等待）
    } finally {
      isLoadingAllRef.current = false; // 完成載入
    }
  }, [user, actingRole]);

  /**
   * 從 API 檢查權限（非同步）- 絕對權限版本
   * 注意：此函數現在主要用於向後兼容，實際權限已透過 loadAllPermissions 批量載入
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

    const cacheKey = `${actingRole}:${permissionKey}:${action}`;

    // 檢查快取
    if (permissionCache[cacheKey] !== undefined) {
      return permissionCache[cacheKey];
    }

    // 如果快取中沒有，觸發完整權限載入
    await loadAllPermissions();

    // 再次檢查快取
    return permissionCache[cacheKey] || false;
  }, [user, actingRole, permissionCache, loadAllPermissions]);

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
   * 視角切換時批量重新載入權限（保留舊快取避免閃爍）
   */
  useEffect(() => {
    // 重置載入狀態標記（但保留舊快取）
    isLoadingAllRef.current = false; // 重置載入狀態
    loadedRoleRef.current = null; // 清除已載入角色記錄

    // 如果沒有角色,保持載入狀態(不清除快取,避免閃爍)
    if (!actingRole) {
      setPermissionsLoaded(false);
      return;
    }

    // 如果沒有用戶,保持載入狀態(等待用戶資料載入)
    // 注意:不清除快取和 permissionsLoaded,避免在用戶載入期間出現權限不足閃爍
    if (!user) {
      return;
    }

    if (actingRole === 'guest') {
      // 訪客模式：清除快取並標記已載入
      setPermissionCache({});
      setPermissionsLoaded(true);
      return;
    }

    // 先標記為未載入（但不清除快取，保留舊權限避免閃爍）
    setPermissionsLoaded(false);

    // 批量載入所有權限（一次 API 請求取代多次請求）
    // 載入完成後會自動更新快取並設置 permissionsLoaded = true
    loadAllPermissions();
  }, [user, actingRole]);

  /**
   * 監聽權限更新事件，自動清除快取並批量重新載入
   */
  useEffect(() => {
    const handlePermissionUpdate = async () => {
      // console.log('🔄 檢測到權限更新，清除快取並批量重新載入權限');

      // 先重置載入狀態標記，但不清除快取（保留舊的權限避免閃爍）
      isLoadingAllRef.current = false; // 重置載入狀態
      loadedRoleRef.current = null; // 清除已載入角色記錄

      // 批量重新載入所有權限
      if (user && actingRole && actingRole !== 'guest') {
        // 先載入新的權限
        await loadAllPermissions();
        // 載入完成後才清除舊快取（避免載入期間出現權限不足）
        // 新的快取已經在 loadAllPermissions 中設定了
      } else {
        // 如果是訪客或沒有用戶，直接清除快取
        setPermissionCache({});
        setPermissionsLoaded(true);
      }
    };

    window.addEventListener('permission-updated', handlePermissionUpdate);
    return () => window.removeEventListener('permission-updated', handlePermissionUpdate);
  }, [user, actingRole, loadAllPermissions]);

  return {
    hasPermission,
    checkPermissionAsync,
    canView,
    canCreate,
    canEdit,
    canDelete,
    canManage,
    clearPermissionCache, // 新增：清除快取函數
    permissionsLoaded, // 新增：權限是否已載入完成
    authUser: user, // 新增：返回當前使用者
    currentRole: actingRole,
    isGuest: actingRole === 'guest',
    isUser: actingRole === 'user',
    isGridManager: actingRole === 'grid_manager',
    isAdmin: actingRole === 'admin',
    isSuperAdmin: actingRole === 'super_admin'
  };
}
