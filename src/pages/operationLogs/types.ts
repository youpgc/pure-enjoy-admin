import type { Dayjs } from 'dayjs'
import type { UserInfo } from '../../hooks/useUsernames'

// 操作日志行
export interface OperationLog {
  id: string
  user_id: string
  action: string
  module: string
  target_id?: string[] | null
  details?: Record<string, unknown>
  ip?: string
  user_agent?: string
  created_at: string
}

// 筛选条件
export interface LogFilters {
  keyword: string
  action: string | undefined
  module: string | undefined
  dateRange: [Dayjs | null, Dayjs | null] | null
}

// useUsernames 返回的用户名映射
export type UserMap = Map<string, UserInfo>
