// ==================== 权限系统类型定义 ====================

export interface Role {
  id: number
  name: string
  code: string
  description?: string
  is_system: boolean
  status: 'active' | 'disabled'
  created_at: string
  updated_at: string
}

export interface Permission {
  id: number
  name: string
  display_name: string
  type: 'menu' | 'action'
  parent_id: number | null
  sort_order: number
  module: string
  description?: string
  created_at: string
  children?: Permission[]
}

export interface RolePermission {
  role_id: number
  permission_id: number
}

export interface RoleWithPermissions extends Role {
  permissions: Permission[]
}

// 权限判断辅助函数
export const hasPermission = (permissions: string[], permissionName: string): boolean => {
  if (!permissions || permissions.length === 0) return false
  return permissions.includes(permissionName)
}

export const hasAnyPermission = (permissions: string[], permissionNames: string[]): boolean => {
  if (!permissions || permissions.length === 0) return false
  return permissionNames.some(name => permissions.includes(name))
}

export const hasAllPermissions = (permissions: string[], permissionNames: string[]): boolean => {
  if (!permissions || permissions.length === 0) return false
  return permissionNames.every(name => permissions.includes(name))
}

export {
  ROLE_STATUS_LABELS,
  ROLE_STATUS_COLORS,
  PERMISSION_TYPE_LABELS,
  MODULE_DISPLAY_NAMES,
  MODULE_COLORS,
} from '../constants'
