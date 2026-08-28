// ==================== Auth & Roles ====================

export const ROLE_USER = 'user' as const
export const ROLE_ADMIN = 'admin' as const
export const ROLE_SUPER_ADMIN = 'super_admin' as const

export const ADMIN_ROLE_CODES = [ROLE_ADMIN, ROLE_SUPER_ADMIN] as const

// 登录来源（record_login RPC 的 p_source / 登录日志 user_type）：admin 管理后台 / app 客户端
export type LoginSource = 'app' | 'admin'
export const LOGIN_SOURCE_APP = 'app' as const
export const LOGIN_SOURCE_ADMIN = 'admin' as const

export type UserRole = 'user' | 'admin' | 'super_admin'
export type MemberLevel = 'normal' | 'member' | 'super_member'
export type UserStatus = 'active' | 'abnormal' | 'disabled' | 'banned'

export const USER_ROLE_LABELS: Record<UserRole, string> = {
  user: '普通用户',
  admin: '管理员',
  super_admin: '超级管理员',
}

export const USER_ROLE_COLORS: Record<UserRole, string> = {
  user: 'default',
  admin: 'blue',
  super_admin: 'purple',
}

export const USER_ROLE_OPTIONS = [
  { label: '普通用户', value: 'user' as UserRole },
  { label: '管理员', value: 'admin' as UserRole },
  { label: '超级管理员', value: 'super_admin' as UserRole },
]

export const MEMBER_LEVEL_LABELS: Record<MemberLevel, string> = {
  normal: '普通会员',
  member: '会员',
  super_member: '超级会员',
}

export const MEMBER_LEVEL_COLORS: Record<MemberLevel, string> = {
  normal: 'default',
  member: 'gold',
  super_member: 'cyan',
}

export const MEMBER_LEVEL_OPTIONS = [
  { label: '普通会员', value: 'normal' as MemberLevel },
  { label: '会员', value: 'member' as MemberLevel },
  { label: '超级会员', value: 'super_member' as MemberLevel },
]

export const USER_STATUS_LABELS: Record<UserStatus, string> = {
  active: '正常',
  abnormal: '异常',
  disabled: '禁用',
  banned: '封禁',
}

export const USER_STATUS_COLORS: Record<UserStatus, string> = {
  active: 'green',
  abnormal: 'orange',
  disabled: 'default',
  banned: 'red',
}

export const USER_STATUS_OPTIONS = [
  { label: '正常', value: 'active' as UserStatus },
  { label: '异常', value: 'abnormal' as UserStatus },
  { label: '禁用', value: 'disabled' as UserStatus },
  { label: '封禁', value: 'banned' as UserStatus },
]

export const USER_STATUS_ACTIVE = 'active' as const
export const USER_STATUS_DISABLED = 'disabled' as const

export const DEFAULT_USER_FORM_VALUES = {
  gender: '保密',
  role: ROLE_USER as UserRole,
  member_level: 'normal' as MemberLevel,
  status: USER_STATUS_ACTIVE as UserStatus,
  available_points: 0,
}

// point_records 流水状态枚举单一源（避免服务/页面硬编码 'active'，审查报告 P2-1）
export const POINT_RECORD_STATUS_ACTIVE = 'active' as const
