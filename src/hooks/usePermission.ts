import { useMemo } from 'react'
import { useAuth } from '../context/auth'
import { ROLE_PERMISSIONS, type Permission, type UserRole } from '../types/auth'

// 权限检查Hook
export const usePermission = () => {
  const { user, hasRole } = useAuth()

  const permissions = useMemo(() => {
    if (!user) {
      return {
        canViewDashboard: false,
        canViewUsers: false,
        canViewExpenses: false,
        canViewMoodDiaries: false,
        canViewWeightRecords: false,
        canViewNotes: false,
        canViewNovels: false,
        canViewVersions: false,
        canDelete: false,
        canManageVersions: false,
        canManageUsers: false,
        canAccessSettings: false,
      }
    }
    return ROLE_PERMISSIONS[user.role]
  }, [user])

  // 检查特定权限
  const checkPermission = (permission: Permission): boolean => {
    return permissions[permission] ?? false
  }

  // 检查多个权限（满足任意一个）
  const checkAnyPermission = (permissionList: Permission[]): boolean => {
    return permissionList.some(p => permissions[p])
  }

  // 检查多个权限（满足所有）
  const checkAllPermissions = (permissionList: Permission[]): boolean => {
    return permissionList.every(p => permissions[p])
  }

  return {
    // 权限对象
    ...permissions,
    // 角色检查
    hasRole,
    role: user?.role,
    // 权限检查方法
    checkPermission,
    checkAnyPermission,
    checkAllPermissions,
    // 当前用户
    user,
    isAuthenticated: !!user,
  }
}

// 页面级别权限Hook
export const usePagePermission = (requiredPermission: Permission) => {
  const { checkPermission, isAuthenticated } = usePermission()

  return {
    canAccess: isAuthenticated && checkPermission(requiredPermission),
    isAuthenticated,
  }
}

// 角色检查Hook
export const useRoleCheck = () => {
  const { user } = useAuth()

  const isSuperAdmin = user?.role === 'super_admin'
  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin'
  const isViewer = user?.role === 'viewer'

  return {
    isSuperAdmin,
    isAdmin,
    isViewer,
    role: user?.role,
  }
}
