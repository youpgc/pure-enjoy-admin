import { useMemo } from 'react'
import { useAuth } from '../context/auth'

// 权限模块定义
export type PermissionModule = 
  | 'users' 
  | 'expenses' 
  | 'moods' 
  | 'weights' 
  | 'notes' 
  | 'novels' 
  | 'versions' 
  | 'system'

// 权限操作定义
export type PermissionAction = 'read' | 'write' | 'delete' | 'export' | 'release'

// 权限字符串类型
export type PermissionString = `${PermissionModule}:${PermissionAction}`

// 角色权限映射
const ROLE_PERMISSIONS_MAP: Record<string, PermissionString[]> = {
  super_admin: [
    // 用户管理
    'users:read', 'users:write', 'users:delete', 'users:export',
    // 消费记录
    'expenses:read', 'expenses:write', 'expenses:delete', 'expenses:export',
    // 心情日记
    'moods:read', 'moods:write', 'moods:delete', 'moods:export',
    // 体重记录
    'weights:read', 'weights:write', 'weights:delete', 'weights:export',
    // 笔记
    'notes:read', 'notes:write', 'notes:delete', 'notes:export',
    // 小说
    'novels:read', 'novels:write', 'novels:delete', 'novels:export',
    // 版本管理
    'versions:read', 'versions:write', 'versions:delete', 'versions:release',
    // 系统
    'system:read', 'system:write',
  ],
  admin: [
    // 用户管理
    'users:read', 'users:write', 'users:delete', 'users:export',
    // 消费记录
    'expenses:read', 'expenses:write', 'expenses:delete', 'expenses:export',
    // 心情日记
    'moods:read', 'moods:write', 'moods:delete', 'moods:export',
    // 体重记录
    'weights:read', 'weights:write', 'weights:delete', 'weights:export',
    // 笔记
    'notes:read', 'notes:write', 'notes:delete', 'notes:export',
    // 小说
    'novels:read', 'novels:write', 'novels:delete', 'novels:export',
    // 版本管理
    'versions:read', 'versions:write', 'versions:release',
    // 系统
    'system:read',
  ],
  viewer: [
    // 只读权限
    'expenses:read', 'moods:read', 'weights:read', 'notes:read', 'novels:read',
  ],
}

export const usePermission = () => {
  const { user } = useAuth()

  // 获取当前用户的权限列表
  const permissions = useMemo(() => {
    if (!user) return []
    return ROLE_PERMISSIONS_MAP[user.role] || []
  }, [user])

  // 检查是否拥有特定权限
  const hasPermission = (permission: PermissionString): boolean => {
    return permissions.includes(permission)
  }

  // 检查是否拥有模块的某个操作权限
  const hasModulePermission = (module: PermissionModule, action: PermissionAction): boolean => {
    return hasPermission(`${module}:${action}`)
  }

  // 检查是否拥有模块的任意操作权限
  const hasAnyModulePermission = (module: PermissionModule): boolean => {
    return permissions.some(p => p.startsWith(`${module}:`))
  }

  // 检查是否拥有多个权限中的任意一个
  const hasAnyPermission = (permissionList: PermissionString[]): boolean => {
    return permissionList.some(p => permissions.includes(p))
  }

  // 检查是否拥有所有权限
  const hasAllPermissions = (permissionList: PermissionString[]): boolean => {
    return permissionList.every(p => permissions.includes(p))
  }

  // ========== 模块权限快捷方法 ==========

  // 用户管理权限
  const canReadUsers = hasModulePermission('users', 'read')
  const canWriteUsers = hasModulePermission('users', 'write')
  const canDeleteUsers = hasModulePermission('users', 'delete')
  const canExportUsers = hasModulePermission('users', 'export')
  const canManageUsers = canReadUsers && canWriteUsers

  // 消费记录权限
  const canReadExpenses = hasModulePermission('expenses', 'read')
  const canWriteExpenses = hasModulePermission('expenses', 'write')
  const canDeleteExpenses = hasModulePermission('expenses', 'delete')
  const canExportExpenses = hasModulePermission('expenses', 'export')
  const canManageExpenses = canReadExpenses && canWriteExpenses

  // 心情日记权限
  const canReadMoods = hasModulePermission('moods', 'read')
  const canWriteMoods = hasModulePermission('moods', 'write')
  const canDeleteMoods = hasModulePermission('moods', 'delete')
  const canExportMoods = hasModulePermission('moods', 'export')
  const canManageMoods = canReadMoods && canWriteMoods

  // 体重记录权限
  const canReadWeights = hasModulePermission('weights', 'read')
  const canWriteWeights = hasModulePermission('weights', 'write')
  const canDeleteWeights = hasModulePermission('weights', 'delete')
  const canExportWeights = hasModulePermission('weights', 'export')
  const canManageWeights = canReadWeights && canWriteWeights

  // 笔记权限
  const canReadNotes = hasModulePermission('notes', 'read')
  const canWriteNotes = hasModulePermission('notes', 'write')
  const canDeleteNotes = hasModulePermission('notes', 'delete')
  const canExportNotes = hasModulePermission('notes', 'export')
  const canManageNotes = canReadNotes && canWriteNotes

  // 小说权限
  const canReadNovels = hasModulePermission('novels', 'read')
  const canWriteNovels = hasModulePermission('novels', 'write')
  const canDeleteNovels = hasModulePermission('novels', 'delete')
  const canExportNovels = hasModulePermission('novels', 'export')
  const canManageNovels = canReadNovels && canWriteNovels

  // 版本管理权限
  const canReadVersions = hasModulePermission('versions', 'read')
  const canWriteVersions = hasModulePermission('versions', 'write')
  const canDeleteVersions = hasModulePermission('versions', 'delete')
  const canReleaseVersions = hasModulePermission('versions', 'release')
  const canManageVersions = canReadVersions && canWriteVersions

  // 系统权限
  const canReadSystem = hasModulePermission('system', 'read')
  const canWriteSystem = hasModulePermission('system', 'write')
  const canManageSystem = canReadSystem && canWriteSystem

  // ========== 角色判断 ==========

  const isSuperAdmin = user?.role === 'super_admin'
  const isAdmin = user?.role === 'admin' || isSuperAdmin
  const isViewer = user?.role === 'viewer'

  // ========== 数据权限 ==========

  // 是否可以查看所有用户的数据（管理员权限）
  const canViewAllUsersData = isAdmin

  // 是否只能查看自己的数据（普通用户权限）
  const canOnlyViewOwnData = !isAdmin

  return {
    // 基础方法
    permissions,
    hasPermission,
    hasModulePermission,
    hasAnyModulePermission,
    hasAnyPermission,
    hasAllPermissions,

    // 用户管理权限
    canReadUsers,
    canWriteUsers,
    canDeleteUsers,
    canExportUsers,
    canManageUsers,

    // 消费记录权限
    canReadExpenses,
    canWriteExpenses,
    canDeleteExpenses,
    canExportExpenses,
    canManageExpenses,

    // 心情日记权限
    canReadMoods,
    canWriteMoods,
    canDeleteMoods,
    canExportMoods,
    canManageMoods,

    // 体重记录权限
    canReadWeights,
    canWriteWeights,
    canDeleteWeights,
    canExportWeights,
    canManageWeights,

    // 笔记权限
    canReadNotes,
    canWriteNotes,
    canDeleteNotes,
    canExportNotes,
    canManageNotes,

    // 小说权限
    canReadNovels,
    canWriteNovels,
    canDeleteNovels,
    canExportNovels,
    canManageNovels,

    // 版本管理权限
    canReadVersions,
    canWriteVersions,
    canDeleteVersions,
    canReleaseVersions,
    canManageVersions,

    // 系统权限
    canReadSystem,
    canWriteSystem,
    canManageSystem,

    // 角色判断
    isSuperAdmin,
    isAdmin,
    isViewer,

    // 数据权限
    canViewAllUsersData,
    canOnlyViewOwnData,
  }
}

export default usePermission
