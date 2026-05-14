export type Role = 'super_admin' | 'admin' | 'viewer'

export interface AdminUser {
  id: string
  email: string
  role: Role
  created_at: string
}

export const ROLE_DISPLAY_NAMES: Record<Role, string> = {
  super_admin: '超级管理员',
  admin: '管理员',
  viewer: '查看者',
}

export const ROLE_PERMISSIONS: Record<Role, string[]> = {
  super_admin: ['manage_users', 'manage_versions', 'view_data', 'manage_data'],
  admin: ['manage_versions', 'view_data', 'manage_data'],
  viewer: ['view_data'],
}
