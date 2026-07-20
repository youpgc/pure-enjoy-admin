import { BaseService } from '../utils/apiClient'
import { supabase } from '../utils/supabase'
import type { User, OperationLog } from '../types/user'

/// 用户管理服务（封装 users 表的 CRUD，替代页面层直接调用 supabase）
class UserService extends BaseService<User> {
  constructor() {
    super('users', {
      defaultOrder: { column: 'created_at', ascending: false },
      select: 'id,username,email,phone,nickname,avatar_url,bio,gender,birthday,height,location,occupation,company,website,role,member_level,points,effective_points,available_points,expiring_points,consecutive_checkin_days,last_checkin_date,tts_speech_rate,tts_timer_minutes,tts_playback_mode,tts_enabled,status,register_ip,last_login_ip,last_login_at,login_count,created_at,updated_at,is_deleted',
    })
  }

  /// 分页查询用户列表（带搜索和过滤）
  async paginateUsers(
    page: number,
    pageSize: number,
    options?: {
      searchText?: string
      role?: string
      status?: string
      memberLevel?: string
      dateRange?: [string, string] | null
    }
  ) {
    return this.paginate(page, pageSize, (q) => {
      let builder = q.eq('is_deleted', false)
      if (options?.searchText) {
        const text = `%${options.searchText}%`
        builder = builder.or(
          `email.ilike.${text},username.ilike.${text},nickname.ilike.${text},phone.ilike.${text}`
        )
      }
      if (options?.role) builder = builder.eq('role', options.role)
      if (options?.status) builder = builder.eq('status', options.status)
      if (options?.memberLevel) builder = builder.eq('member_level', options.memberLevel)
      if (options?.dateRange?.[0]) {
        builder = builder.gte('created_at', options.dateRange[0])
      }
      if (options?.dateRange?.[1]) {
        builder = builder.lte('created_at', options.dateRange[1])
      }
      return builder
    })
  }

  /// 软删除用户（禁用）
  async softDelete(id: string): Promise<ReturnType<BaseService<User>['update']>> {
    return this.update(id, { status: 'disabled' })
  }

  /// 批量软删除
  async batchSoftDelete(ids: string[]): Promise<ReturnType<BaseService<User>['batchUpdate']>> {
    return this.batchUpdate(ids, { status: 'disabled' })
  }

  /// 切换用户状态
  async toggleStatus(id: string, newStatus: import('../types/user').UserStatus) {
    return this.update(id, { status: newStatus })
  }
}

export const userService = new UserService()

// ==================== 以下为 #66 抽出的写操作/统计查询（替代页面层裸 supabase.from） ====================

/// 创建用户记录（public.users），返回含 id 的记录
export const createUser = (data: Record<string, unknown>) =>
  (supabase.from('users') as any).insert(data).select().single()

/// 新增积分流水（触发器自动同步 users.points），返回含 data 的结果
export const addPointRecord = (record: {
  user_id: string
  type: string
  amount: number
  remark: string
  operator_name?: string | null
  operator_id?: string | null
  status?: string
}) =>
  (supabase.from('point_records') as any)
    .insert({ status: 'active', ...record })
    .select()

/// 记录操作日志（写 operation_logs）
export const logUserOperation = (entry: {
  user_id?: string | null
  action: string
  module: string
  target_id: string
  detail: Record<string, unknown>
}) => (supabase.from('operation_logs') as any).insert(entry)

/// 统计用户各模块数据量与最近操作日志（返回与页面 Promise.all 解构顺序一致的元组）
export const fetchUserActivity = (userId: string) =>
  Promise.all([
    supabase.from('expenses').select('id', { count: 'exact' }).eq('user_id', userId),
    supabase.from('mood_diaries').select('id', { count: 'exact' }).eq('user_id', userId),
    supabase.from('weight_records').select('id', { count: 'exact' }).eq('user_id', userId),
    supabase.from('notes').select('id', { count: 'exact' }).eq('user_id', userId),
    supabase.from('user_novels').select('id', { count: 'exact' }).eq('user_id', userId),
    supabase
      .from('operation_logs')
      .select('id, user_id, action, module, target_id, detail, ip, user_agent, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10),
  ]) as unknown as Promise<
    [
      { count: number | null },
      { count: number | null },
      { count: number | null },
      { count: number | null },
      { count: number | null },
      { data: OperationLog[] | null },
    ]
  >
