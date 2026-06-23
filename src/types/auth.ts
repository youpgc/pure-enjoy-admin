// ==================== 认证类型定义 ====================

export type RoleCode = 'super_admin' | 'admin' | string

export interface AdminUser {
  id: string
  email: string
  role: RoleCode
  nickname?: string
  avatar_url?: string
  created_at?: string
}

export const ROLE_DISPLAY_NAMES: Record<string, string> = {
  super_admin: '超级管理员',
  admin: '管理员',
}

// 从 Supabase Auth 的 user_metadata 或 app_metadata 中获取角色
export const getUserRole = (authUser: any): string => {
  if (!authUser) return ''
  const userMetadata = authUser.user_metadata || {}
  const appMetadata = authUser.app_metadata || {}
  return (userMetadata.role || appMetadata.role || '') as string
}

// 从 Supabase Auth 的 user_metadata 中获取昵称
export const getUserNickname = (authUser: any): string => {
  if (!authUser) return ''
  const metadata = authUser.user_metadata || {}
  return (metadata.nickname || metadata.name || '') as string
}
