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

// 角色状态标签
export const ROLE_STATUS_LABELS: Record<string, string> = {
  active: '启用',
  disabled: '禁用',
}

export const ROLE_STATUS_COLORS: Record<string, string> = {
  active: 'green',
  disabled: 'red',
}

// 权限类型标签
export const PERMISSION_TYPE_LABELS: Record<string, string> = {
  menu: '菜单',
  action: '操作',
}

// 模块显示名称映射（兼容 PermissionConfigModal）
export const MODULE_DISPLAY_NAMES: Record<string, string> = {
  users: '用户中心',
  content: '内容管理',
  life: '生活服务',
  operations: '运营管理',
  system: '系统设置',
  dashboard: '数据概览',
  expenses: '消费记录',
  moods: '心情日记',
  weights: '体重记录',
  notes: '笔记本',
  novels: '小说管理',
  versions: '版本管理',
  feedback: '问题反馈',
  announcements: '公告管理',
}

// 模块颜色映射（兼容 PermissionConfigModal）
export const MODULE_COLORS: Record<string, string> = {
  users: '#1890ff',
  content: '#52c41a',
  life: '#faad14',
  operations: '#722ed1',
  system: '#f5222d',
  dashboard: '#13c2c2',
  expenses: '#eb2f96',
  moods: '#fa8c16',
  weights: '#a0d911',
  notes: '#2f54eb',
  novels: '#fa541c',
  versions: '#13c2c2',
  feedback: '#1890ff',
  announcements: '#52c41a',
}
