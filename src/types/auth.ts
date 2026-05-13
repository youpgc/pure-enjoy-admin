// 用户角色类型
export type UserRole = 'super_admin' | 'admin' | 'viewer'

// 用户信息接口
export interface UserInfo {
  id: string
  email: string
  role: UserRole
  name: string
  avatar?: string
  created_at: string
  last_sign_in_at?: string
}

// 登录凭证接口
export interface LoginCredentials {
  email: string
  password: string
}

// 认证状态接口
export interface AuthState {
  isAuthenticated: boolean
  user: UserInfo | null
  isLoading: boolean
  error: string | null
}

// 权限配置
export const ROLE_PERMISSIONS = {
  super_admin: {
    canViewDashboard: true,
    canViewUsers: true,
    canViewExpenses: true,
    canViewMoodDiaries: true,
    canViewWeightRecords: true,
    canViewNotes: true,
    canViewNovels: true,
    canViewVersions: true,
    canDelete: true,
    canManageVersions: true,
    canManageUsers: true,
    canAccessSettings: true,
  },
  admin: {
    canViewDashboard: true,
    canViewUsers: true,
    canViewExpenses: true,
    canViewMoodDiaries: true,
    canViewWeightRecords: true,
    canViewNotes: true,
    canViewNovels: true,
    canViewVersions: true,
    canDelete: true,
    canManageVersions: true,
    canManageUsers: false,
    canAccessSettings: false,
  },
  viewer: {
    canViewDashboard: true,
    canViewUsers: true,
    canViewExpenses: true,
    canViewMoodDiaries: true,
    canViewWeightRecords: true,
    canViewNotes: true,
    canViewNovels: true,
    canViewVersions: true,
    canDelete: false,
    canManageVersions: false,
    canManageUsers: false,
    canAccessSettings: false,
  },
} as const

// 权限类型
export type Permission = keyof typeof ROLE_PERMISSIONS.super_admin

// 角色显示名称
export const ROLE_DISPLAY_NAMES: Record<UserRole, string> = {
  super_admin: '超级管理员',
  admin: '管理员',
  viewer: '查看者',
}

// 角色标签颜色
export const ROLE_TAG_COLORS: Record<UserRole, string> = {
  super_admin: 'red',
  admin: 'blue',
  viewer: 'green',
}
