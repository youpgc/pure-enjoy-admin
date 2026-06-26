/**
 * 用户类型定义
 * 对应数据库 users 表结构
 */

import {
  UserRole,
  MemberLevel,
  UserStatus,
  USER_ROLE_LABELS,
  USER_ROLE_COLORS,
  MEMBER_LEVEL_LABELS,
  MEMBER_LEVEL_COLORS,
  USER_STATUS_LABELS,
  USER_STATUS_COLORS,
  USER_ROLE_OPTIONS,
  MEMBER_LEVEL_OPTIONS,
  USER_STATUS_OPTIONS,
} from '../constants'

// 统一从 constants 重新导出，保持向后兼容
export type { UserRole, MemberLevel, UserStatus }
export {
  USER_ROLE_LABELS,
  USER_ROLE_COLORS,
  MEMBER_LEVEL_LABELS,
  MEMBER_LEVEL_COLORS,
  USER_STATUS_LABELS,
  USER_STATUS_COLORS,
  USER_ROLE_OPTIONS,
  MEMBER_LEVEL_OPTIONS,
  USER_STATUS_OPTIONS,
}

// 用户接口
export interface User {
  id: string // U + 时间戳(10位) + 随机码(6位) + 校验码(2位)
  email: string
  phone: string | null
  password_hash: string | null
  nickname: string | null
  avatar_url: string | null
  // 扩展资料字段 (V1.9.2)
  username: string | null
  bio: string | null
  gender: string | null // 男/女/保密
  birthday: string | null
  location: string | null
  occupation: string | null
  company: string | null
  website: string | null
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

import type { Dayjs } from 'dayjs'

// 用户表单数据 (表单使用 dayjs 作为日期类型)
export interface UserFormData {
  email: string
  phone?: string
  password?: string
  nickname?: string
  avatar_url?: string
  // 扩展资料字段
  username?: string
  bio?: string
  gender?: string
  birthday?: Dayjs | string | null // 表单使用 Dayjs，提交时转换为 string
  location?: string
  occupation?: string
  company?: string
  website?: string
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
