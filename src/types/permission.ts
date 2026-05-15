/**
 * 权限类型定义
 */

// 角色接口
export interface Role {
  id: number
  name: string // user/admin/super_admin
  display_name: string
  description: string | null
  level: number
  created_at: string
}

// 权限接口
export interface Permission {
  id: number
  name: string // users:read, users:write, users:delete
  display_name: string
  module: string // users/expenses/moods/weights/notes/novels/versions/system
  action: string // read/write/delete
  description: string | null
  created_at: string
}

// 角色权限关联接口
export interface RolePermission {
  role_id: number
  permission_id: number
}

// 带权限的角色接口
export interface RoleWithPermissions extends Role {
  permissions: Permission[]
}

// 模块显示名称
export const MODULE_DISPLAY_NAMES: Record<string, string> = {
  users: '用户管理',
  expenses: '消费记录',
  moods: '心情日记',
  weights: '体重记录',
  notes: '笔记本',
  novels: '小说书架',
  versions: '版本管理',
  system: '系统设置',
}

// 操作显示名称
export const ACTION_DISPLAY_NAMES: Record<string, string> = {
  read: '查看',
  write: '编辑',
  delete: '删除',
}

// 模块图标颜色
export const MODULE_COLORS: Record<string, string> = {
  users: '#6C63FF',
  expenses: '#FF6B6B',
  moods: '#4ECDC4',
  weights: '#45B7D1',
  notes: '#96CEB4',
  novels: '#FFEAA7',
  versions: '#DDA0DD',
  system: '#87CEEB',
}
