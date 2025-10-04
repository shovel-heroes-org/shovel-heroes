import React from 'react';
import { usePermission } from '@/hooks/usePermission';

/**
 * 權限閘道組件
 * 根據權限設定決定是否顯示子組件
 *
 * @param {Object} props
 * @param {string} props.permission - 權限鍵值 (如: 'grids', 'volunteers')
 * @param {string} props.action - 動作類型 ('view'|'create'|'edit'|'delete'|'manage')
 * @param {React.ReactNode} props.children - 有權限時顯示的內容
 * @param {React.ReactNode} [props.fallback] - 無權限時顯示的內容
 * @param {boolean} [props.hideIfNoPermission=true] - 無權限時是否隱藏（true）或顯示 fallback（false）
 */
export function PermissionGate({
  permission,
  action,
  children,
  fallback = null,
  hideIfNoPermission = true
}) {
  const { hasPermission } = usePermission();

  const hasAccess = hasPermission(permission, action);

  if (hasAccess) {
    return <>{children}</>;
  }

  if (hideIfNoPermission) {
    return null;
  }

  return <>{fallback}</>;
}

/**
 * 權限按鈕組件
 * 自動根據權限禁用按鈕
 *
 * @param {Object} props
 * @param {string} props.permission - 權限鍵值
 * @param {string} props.action - 動作類型
 * @param {React.ReactNode} props.children - 按鈕內容
 * @param {Function} [props.onClick] - 點擊事件
 * @param {string} [props.className] - CSS class
 * @param {boolean} [props.disabled] - 額外的禁用條件
 * @param {string} [props.noPermissionTitle] - 無權限時的提示訊息
 */
export function PermissionButton({
  permission,
  action,
  children,
  onClick,
  className = '',
  disabled = false,
  noPermissionTitle = '您沒有此操作的權限',
  ...props
}) {
  const { hasPermission } = usePermission();

  const hasAccess = hasPermission(permission, action);
  const isDisabled = disabled || !hasAccess;

  return (
    <button
      onClick={hasAccess ? onClick : undefined}
      disabled={isDisabled}
      className={className}
      title={!hasAccess ? noPermissionTitle : props.title}
      {...props}
    >
      {children}
    </button>
  );
}

/**
 * 多權限檢查組件
 * 需要滿足所有權限才顯示內容
 *
 * @param {Object} props
 * @param {Array<{permission: string, action: string}>} props.requires - 需要的權限列表
 * @param {React.ReactNode} props.children - 有權限時顯示的內容
 * @param {React.ReactNode} [props.fallback] - 無權限時顯示的內容
 */
export function PermissionGuard({ requires = [], children, fallback = null }) {
  const { hasPermission } = usePermission();

  const hasAllPermissions = requires.every(
    ({ permission, action }) => hasPermission(permission, action)
  );

  if (hasAllPermissions) {
    return <>{children}</>;
  }

  return <>{fallback}</>;
}

/**
 * 角色檢查組件
 * 只有特定角色才能看到內容
 *
 * @param {Object} props
 * @param {string|string[]} props.roles - 允許的角色（單一或陣列）
 * @param {React.ReactNode} props.children - 有權限時顯示的內容
 * @param {React.ReactNode} [props.fallback] - 無權限時顯示的內容
 */
export function RoleGate({ roles, children, fallback = null }) {
  const { currentRole } = usePermission();

  const allowedRoles = Array.isArray(roles) ? roles : [roles];
  const hasRole = allowedRoles.includes(currentRole);

  if (hasRole) {
    return <>{children}</>;
  }

  return <>{fallback}</>;
}

/**
 * 權限檢查的 HOC (Higher Order Component)
 *
 * @param {React.Component} Component - 要包裝的組件
 * @param {string} permission - 權限鍵值
 * @param {string} action - 動作類型
 * @returns {React.Component} 包裝後的組件
 */
export function withPermission(Component, permission, action) {
  return function PermissionWrappedComponent(props) {
    const { hasPermission } = usePermission();

    if (!hasPermission(permission, action)) {
      return null;
    }

    return <Component {...props} />;
  };
}

// 預設導出
export default PermissionGate;
