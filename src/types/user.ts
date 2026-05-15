/**
 * 用户类型定义
 * 对应数据库 users 表结构
 */

// 用户角色类型
export type UserRole = 'user' | 'admin' | 'super_admin'

// 会员等级类型
export type MemberLevel = 'normal' | 'member' | 'super_member'

// 用户状态类型
export type UserStatus = 'active' | 'abnormal' | 'disabled' | 'banned'

// 用户接口
export interface User {
  id: string // U + 时间戳(10位) + 随机码(6位) + 校验码(2位)
  email: string
  phone: string | null
  nickname: string | null
  avatar_url: string | null
  role: UserRole
  member_level: MemberLevel
  points: number
  status: UserStatus
  register_ip: string | null
  last_login_ip: string | null
  last_login_at: string | null
  login_count: number
  created_at: string
  updated_at: string
}

// 用户表单数据
export interface UserFormData {
  email: string
  phone?: string
  password?: string
  nickname?: string
  role: UserRole
  member_level: MemberLevel
  status: UserStatus
  points: number
}

// 用户统计数据
export interface UserStats {
  expense_count: number
  mood_count: number
  weight_count: number
  note_count: number
  novel_count: number
}

// 操作日志
export interface OperationLog {
  id: string
  user_id: string | null
  action: string
  module: string | null
  target_id: string | null
  details: Record<string, unknown> | null
  ip: string | null
  user_agent: string | null
  created_at: string
}

// 角色显示名称
export const USER_ROLE_LABELS: Record<UserRole, string> = {
  user: '普通用户',
  admin: '管理员',
  super_admin: '超级管理员',
}

// 角色标签颜色
export const USER_ROLE_COLORS: Record<UserRole, string> = {
  user: 'default',
  admin: 'blue',
  super_admin: 'purple',
}

// 会员等级显示名称
export const MEMBER_LEVEL_LABELS: Record<MemberLevel, string> = {
  normal: '普通会员',
  member: '会员',
  super_member: '超级会员',
}

// 会员等级标签颜色
export const MEMBER_LEVEL_COLORS: Record<MemberLevel, string> = {
  normal: 'default',
  member: 'gold',
  super_member: 'cyan',
}

// 用户状态显示名称
export const USER_STATUS_LABELS: Record<UserStatus, string> = {
  active: '正常',
  abnormal: '异常',
  disabled: '禁用',
  banned: '封禁',
}

// 用户状态标签颜色
export const USER_STATUS_COLORS: Record<UserStatus, string> = {
  active: 'green',
  abnormal: 'orange',
  disabled: 'default',
  banned: 'red',
}

// 角色选项
export const USER_ROLE_OPTIONS = [
  { label: '普通用户', value: 'user' as UserRole },
  { label: '管理员', value: 'admin' as UserRole },
  { label: '超级管理员', value: 'super_admin' as UserRole },
]

// 会员等级选项
export const MEMBER_LEVEL_OPTIONS = [
  { label: '普通会员', value: 'normal' as MemberLevel },
  { label: '会员', value: 'member' as MemberLevel },
  { label: '超级会员', value: 'super_member' as MemberLevel },
]

// 用户状态选项
export const USER_STATUS_OPTIONS = [
  { label: '正常', value: 'active' as UserStatus },
  { label: '异常', value: 'abnormal' as UserStatus },
  { label: '禁用', value: 'disabled' as UserStatus },
  { label: '封禁', value: 'banned' as UserStatus },
]
