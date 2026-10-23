import { supabase } from '../utils/supabase'
import { apiQuery, type ApiResponse } from '../utils/apiClient'
import { buildUserLookupOr } from '../utils/userId'

/// Dashboard 统计查询服务
/// 注意：Dashboard 涉及大量跨表聚合和 count 查询，不适合 BaseService，
/// 因此使用 apiQuery + 专用方法封装。

class DashboardService {
  /// 总用户数
  async getTotalUsers() {
    return apiQuery(
      () => supabase.from('users').select('*', { count: 'exact', head: true }).eq('is_deleted', false),
      'Dashboard-总用户数'
    )
  }

  /// 今日新增用户
  async getTodayNewUsers(todayStart: string) {
    return apiQuery(
      () => supabase.from('users').select('id', { count: 'exact', head: true }).eq('is_deleted', false).gte('created_at', todayStart),
      'Dashboard-今日新增用户'
    )
  }

  /// 指定时间后新增用户
  async getNewUsersSince(since: string) {
    return apiQuery(
      () => supabase.from('users').select('id', { count: 'exact', head: true }).eq('is_deleted', false).gte('created_at', since),
      'Dashboard-新增用户统计'
    )
  }

  /// 用户增长趋势数据
  async getUserTrendData(since: string, limit = 1000) {
    return apiQuery<{ created_at: string }[]>(
      () => supabase.from('users').select('created_at').eq('is_deleted', false).gte('created_at', since).limit(limit),
      'Dashboard-用户增长趋势'
    )
  }

  /// 最近操作日志
  async getRecentLogs(limit = 20) {
    return apiQuery<{ id: string; user_id: string | null; action: string; module: string | null; created_at: string }[]>(
      () => supabase.from('operation_logs').select('id, user_id, action, module, created_at').order('created_at', { ascending: false }).limit(limit),
      'Dashboard-最近操作日志'
    )
  }

  /// 查询用户显示名（预览/最近活动用）。
  ///
  /// 双键解析：历史数据里 user_id 可能存 auth UUID，仅凭 id 查不到，故同时按
  /// id 与 auth_id 建映射（users.id ≠ auth_id 时两键都要）。
  /// 注意：仅返回**文本列**，按 password/postgres 类型，uuid 形态值不得传给 auth_id
  /// 之外的 uuid 列（否则 22P02）。
  async getUserNicknames(userIds: string[]) {
    const orFilter = buildUserLookupOr(userIds)
    return apiQuery<{ id: string; auth_id: string | null; username: string | null; nickname: string | null }[]>(
      () =>
        supabase
          .from('users')
          .select('id, auth_id, username, nickname')
          .or(orFilter),
      'Dashboard-用户昵称查询'
    )
  }

  // ==================== 游戏模块（Dashboard 概览） ====================

  /// 游戏列表（概览表行基础数据，按 sort_order 升序与 App 大厅一致）
  async getGamesList() {
    return apiQuery<{ id: string; name: string; code: string; engine: string; enabled: boolean }[]>(
      () =>
        supabase
          .from('games')
          .select('id,name,code,engine,enabled,sort_order')
          .order('sort_order', { ascending: true }),
      'Dashboard-游戏列表'
    )
  }

  /// 游戏成绩数（gameId 缺省 = 全部游戏；since 缺省 = 不限时间；head count 不受 1000 行钳制影响）
  async getGameScoresCount(gameId?: string, since?: string) {
    return apiQuery(
      () => {
        let q = supabase.from('game_scores').select('id', { count: 'exact', head: true })
        if (gameId) q = q.eq('game_id', gameId)
        if (since) q = q.gte('created_at', since)
        return q
      },
      'Dashboard-游戏成绩数'
    )
  }

  /// 游戏活跃玩家（time 窗口内去重 user_id 集合）。
  /// PostgREST 服务端 db-max-rows=1000 钳制：单请求最多返回 1000 行，
  /// 必须 range 分页循环；maxRows 为上限，超出即视为近似值。
  async getGameActivePlayers(since: string, gameId?: string, maxRows = 5000): Promise<ApiResponse<string[]>> {
    const userIds = new Set<string>()
    const pageSize = 1000
    for (let offset = 0; offset < maxRows; offset += pageSize) {
      const res = await apiQuery<{ user_id: string | null }[]>(
        () => {
          let q = supabase
            .from('game_scores')
            .select('user_id')
            .gte('created_at', since)
            .range(offset, offset + pageSize - 1)
          if (gameId) q = q.eq('game_id', gameId)
          return q
        },
        'Dashboard-游戏活跃玩家'
      )
      if (!res.success) return { ...res, data: [] }
      const rows = res.data || []
      for (const r of rows) if (r.user_id) userIds.add(r.user_id)
      if (rows.length < pageSize) break
    }
    return { success: true, data: [...userIds], errorMessage: null, statusCode: 200 }
  }

  /// 游戏积分发放合计（game_reward_claims.points 求和，分页循环规避 1000 行钳制）
  async getGamePointsSum(since: string, gameId?: string): Promise<ApiResponse<number>> {
    let total = 0
    const pageSize = 1000
    for (let offset = 0; offset < 10000; offset += pageSize) {
      const res = await apiQuery<{ points: number | null }[]>(
        () => {
          let q = supabase
            .from('game_reward_claims')
            .select('points')
            .gte('created_at', since)
            .range(offset, offset + pageSize - 1)
          if (gameId) q = q.eq('game_id', gameId)
          return q
        },
        'Dashboard-游戏积分发放'
      )
      if (!res.success) return { ...res, data: 0 }
      const rows = res.data || []
      for (const r of rows) total += r.points || 0
      if (rows.length < pageSize) break
    }
    return { success: true, data: total, errorMessage: null, statusCode: 200 }
  }
}

export const dashboardService = new DashboardService()
