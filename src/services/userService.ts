import { BaseService } from '../utils/apiClient'
import { supabase, reportError } from '../utils/supabase'
import type { User, OperationLog } from '../types/user'
import { USER_STATUS_DISABLED, POINT_RECORD_STATUS_ACTIVE } from '../constants/roles'

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
    return this.update(id, { status: USER_STATUS_DISABLED })
  }

  /// 批量软删除
  async batchSoftDelete(ids: string[]): Promise<ReturnType<BaseService<User>['batchUpdate']>> {
    return this.batchUpdate(ids, { status: USER_STATUS_DISABLED })
  }

  /// 切换用户状态
  async toggleStatus(id: string, newStatus: import('../types/user').UserStatus) {
    return this.update(id, { status: newStatus })
  }
}

export const userService = new UserService()

// ==================== 以下为 #66 抽出的写操作/统计查询（替代页面层裸 supabase.from） ====================

/// 创建用户记录（public.users），返回含 id 的记录。
/// 审计闭环：由调用方（useUsers.handleCreate）在创建成功后调 logUserOperation('create_user', ...)
/// 负责，本函数不重复审计（避免双重审计；且 users 在 BaseService.AUDIT_EXCLUDED）。审查报告 P2-3。
export const createUser = (data: Record<string, unknown>) =>
  (supabase.from('users') as any).insert(data).select().single()

/// 新增积分流水（仅插入 point_records；云端无 point_records→users 同步触发器，
/// 写入后须由调用方主动调用 recalcUserPoints 重算回写 users 展示列，详见 points skill §5.3）
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
    .insert({ status: POINT_RECORD_STATUS_ACTIVE, ...record })
    .select()

/// 原子化：新增积分流水并主动重算回写 users 展示列（替代不存在的触发器，审查 P1-3）。
/// 内部串联 addPointRecord + recalcUserPoints，杜绝调用方遗漏导致 users.points 与真实流水漂移；
/// recalc 失败写入 error_logs 告警（不回滚主流水，避免二次复杂度）。
export const addPointRecordWithRecalc = async (
  record: Parameters<typeof addPointRecord>[0]
): Promise<{ success: boolean; errorMessage?: string }> => {
  const { data, error } = await addPointRecord(record)
  if (error) {
    return { success: false, errorMessage: error.message }
  }
  if (!data || data.length === 0) {
    return { success: false, errorMessage: '积分流水未写入（可能 RLS 策略阻止）' }
  }
  const ok = await recalcUserPoints(record.user_id)
  if (!ok) {
    await reportError('warning', 'points', `积分重算失败 user=${record.user_id}（流水已写入，需后台核对）`)
  }
  return { success: true }
}

/// 后台主动重算回写 users 积分展示列（替代不存在的触发器）。
/// 调用 recalc_user_points RPC（SECURITY DEFINER + JWT 管理员校验，与 create_auth_user 同策略）。
/// 失败仅告警不抛错，保证主流程（用户创建/积分调整）不受影响。
export const recalcUserPoints = async (userId: string): Promise<boolean> => {
  const { error } = await (supabase.rpc as any)('recalc_user_points', { p_user_id: userId })
  if (error) {
    console.warn('recalc_user_points 失败（请确认已在 Supabase SQL Editor 部署该 RPC）:', error.message)
    return false
  }
  return true
}

/// 记录操作日志（写 operation_logs）
/// 审查 P3-3：target_id 存储为数组，单值包成 [v]
export const logUserOperation = (entry: {
  user_id?: string | null
  action: string
  module: string
  target_id: string | string[]
  details: Record<string, unknown>
}) =>
  (supabase.from('operation_logs') as any).insert({
    ...entry,
    target_id: Array.isArray(entry.target_id) ? entry.target_id : [entry.target_id],
  })

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
      .select('id, user_id, action, module, target_id, details, ip, user_agent, created_at')
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
