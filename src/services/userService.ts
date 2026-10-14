// 用户管理数据访问层 —— 本地后端 /admin/users + /admin/points
// 创建/更新/列表/状态/模糊搜索/活动统计；积分调整走 /admin/points/adjust（服务端单事务
// 同步写 point_records 流水与 users 展示列，无需前端两段式重算）。
// 兼容层：旧调用方（Pet 系列页等）依赖 ApiResponse{success,data} 形态，wrap() 统一包装。
import { apiRequest } from '../utils/adminHttp'
import { apiRequestLoose } from '../utils/adminHttp'
import type { ApiResponse } from '../utils/apiClient'
import type { User, OperationLog } from '../types/user'

/// 后端 AdminUserVO 形态（snake_case 出参，不含 password_hash）
export type UserVO = User

/// 后端 PageResult 形态
interface PageResultVO {
  list: User[]
  total: number
}

/// 旧分页兼容形态（{ data: 行数组, total }）
interface LegacyPaged<T> {
  data: T[]
  total: number
}

/// 将 apiRequest 异常包装为旧 ApiResponse 形态
async function wrap<T>(fn: () => Promise<T>): Promise<ApiResponse<T>> {
  try {
    return { success: true, data: await fn(), errorMessage: null, statusCode: 200 }
  } catch (e) {
    const msg = e instanceof Error ? e.message : '请求失败'
    return { success: false, data: null, errorMessage: msg, statusCode: null }
  }
}

export interface UserListOptions {
  searchText?: string
  role?: string
  status?: string
  memberLevel?: string
  dateRange?: [string, string] | null
}

/// 用户管理服务（本地后端实现）
class UserService {
  /// 分页查询用户列表（keyword 命中 username/nickname/email/phone）
  async paginateUsers(
    page: number,
    pageSize: number,
    options?: UserListOptions,
  ): Promise<ApiResponse<LegacyPaged<User>>> {
    return wrap(async () => {
      const params = new URLSearchParams({ page: String(page), page_size: String(pageSize) })
      if (options?.searchText) params.set('keyword', options.searchText)
      if (options?.role) params.set('role', options.role)
      if (options?.status) params.set('status', options.status)
      if (options?.memberLevel) params.set('member_level', options.memberLevel)
      if (options?.dateRange?.[0]) params.set('date_from', options.dateRange[0])
      if (options?.dateRange?.[1]) params.set('date_to', options.dateRange[1])
      const result = await apiRequest<PageResultVO>('GET', `/admin/users?${params.toString()}`)
      return { data: result.list, total: result.total }
    })
  }

  /// 按关键字模糊匹配用户（username/nickname，后端 keyword 同样命中 email/phone，
  /// 语义为旧版的超集），返回命中的业务 ID 列表（上限 1000）
  async findUserIdsByKeyword(keyword: string): Promise<ApiResponse<string[]>> {
    const kw = keyword.trim()
    if (!kw) return { success: true, data: [], errorMessage: null, statusCode: 200 }
    return wrap(async () => {
      const params = new URLSearchParams({ page: '1', page_size: '1000', keyword: kw })
      const result = await apiRequest<PageResultVO>('GET', `/admin/users?${params.toString()}`)
      return result.list.map((u) => u.id)
    })
  }

  /// 更新用户资料（白名单字段；密码可选重置）
  async update(id: string, data: Record<string, unknown>): Promise<ApiResponse<User>> {
    return wrap(() => apiRequest<User>('PUT', `/admin/users/${id}`, data))
  }

  /// 禁用用户（与旧「软删除=置 disabled」语义一致）
  async softDelete(id: string): Promise<ApiResponse<User>> {
    return this.toggleStatus(id, 'disabled')
  }

  /// 批量禁用
  async batchSoftDelete(ids: string[]): Promise<ApiResponse<null>> {
    return wrap(async () => {
      for (const id of ids) {
        await apiRequest<unknown>('PUT', `/admin/users/${id}/status`, { status: 'disabled' })
      }
      return null
    })
  }

  /// 切换用户状态
  async toggleStatus(id: string, status: string): Promise<ApiResponse<User>> {
    return wrap(() => apiRequest<User>('PUT', `/admin/users/${id}/status`, { status }))
  }
}

export const userService = new UserService()

/// 创建用户（密码明文交由服务端 BCrypt 编码；初始积分请随后调用 addPointRecordWithRecalc）
export const createUser = (data: Record<string, unknown>) =>
  apiRequest<User>('POST', '/admin/users', data)

/// 调整用户积分（服务端单事务：point_records 流水 + users 展示列同步回写；
/// 操作人由后端从 JWT 解析。amount 正负均可，0 会被后端拒绝）
export const addPointRecordWithRecalc = async (record: {
  user_id: string
  amount: number
  remark: string
}): Promise<{ success: boolean; errorMessage?: string }> => {
  try {
    await apiRequest<unknown>('POST', '/admin/points/adjust', {
      user_id: record.user_id,
      amount: record.amount,
      remark: record.remark,
    })
    return { success: true }
  } catch (e) {
    return { success: false, errorMessage: e instanceof Error ? e.message : '积分调整失败' }
  }
}

/// 记录操作日志（写本地后端 operation_logs；target_id 存储为数组，单值包成 [v]）
export const logUserOperation = (entry: {
  user_id?: string | null
  action: string
  module: string
  target_id: string | string[]
  details: Record<string, unknown>
}) =>
  apiRequestLoose('POST', '/admin/audit/operation-logs', {
    action: entry.action,
    module: entry.module,
    target_id: Array.isArray(entry.target_id) ? entry.target_id : [entry.target_id],
    details: entry.details,
  })

/// 后端用户活动统计形态
export interface UserActivityVO {
  expense_count: number
  mood_count: number
  weight_count: number
  note_count: number
  novel_count: number
  logs: OperationLog[]
}

/// 用户活动统计（5 张生活/小说域表行数 + 最近 10 条操作日志）
export const fetchUserActivity = (userId: string) =>
  apiRequest<UserActivityVO>('GET', `/admin/users/${userId}/activity`)
