import { supabase } from '../utils/supabase'
import { apiQuery, type ApiResponse } from '../utils/apiClient'

/// Dashboard 统计查询服务
/// 注意：Dashboard 涉及大量跨表聚合和 count 查询，不适合 BaseService，
/// 因此使用 apiQuery + 专用方法封装。

/// 活跃用户事件（单条行为记录，未去重）
type ActiveEvent = { user_id: string; created_at: string }

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

  /// 时间段内新增用户（用于上周对比）
  async getNewUsersInRange(from: string, to: string) {
    return apiQuery(
      () => supabase.from('users').select('id', { count: 'exact', head: true }).eq('is_deleted', false).gte('created_at', from).lt('created_at', to),
      'Dashboard-时间段新增用户'
    )
  }

  /// 时间段内新增用户 ID 列表（用于留存率交集计算）
  async getNewUserIdsInRange(from: string, to: string) {
    return apiQuery<{ id: string }[]>(
      () => supabase.from('users').select('id').eq('is_deleted', false).gte('created_at', from).lt('created_at', to),
      'Dashboard-时间段新增用户ID'
    )
  }

  /// 活跃用户事件（未去重），用于计算日/周/月活跃用户与留存率。
  /// 数据来源为真实用户行为：阅读(user_novels.last_read_at) + 评论 + 书签 +
  /// 批注(未删除) + 听书(TTS) + 推荐反馈。不再依赖 operation_logs
  /// （该表仅记录后台管理操作，不含用户阅读等行为）。
  /// 注意：各表上限 limit 行，数据量大时为近似值。
  async getActiveUserEvents(from: string, limit = 5000): Promise<ApiResponse<ActiveEvent[]>> {
    const [rRead, rComment, rBookmark, rAnnotation, rTts, rFeedback] = await Promise.all([
      // 阅读：用 last_read_at 作为活跃时间，别名映射为 created_at 以统一结构
      apiQuery<ActiveEvent[]>(
        () => supabase.from('user_novels').select('user_id, created_at:last_read_at').gte('last_read_at', from).limit(limit),
        'Dashboard-活跃事件-阅读'
      ),
      apiQuery<ActiveEvent[]>(
        () => supabase.from('novel_comments').select('user_id, created_at').gte('created_at', from).limit(limit),
        'Dashboard-活跃事件-评论'
      ),
      apiQuery<ActiveEvent[]>(
        () => supabase.from('novel_bookmarks').select('user_id, created_at').gte('created_at', from).limit(limit),
        'Dashboard-活跃事件-书签'
      ),
      apiQuery<ActiveEvent[]>(
        () => supabase.from('novel_annotations').select('user_id, created_at').gte('created_at', from).neq('is_deleted', true).limit(limit),
        'Dashboard-活跃事件-批注'
      ),
      apiQuery<ActiveEvent[]>(
        () => supabase.from('tts_playback_logs').select('user_id, created_at').gte('created_at', from).limit(limit),
        'Dashboard-活跃事件-TTS'
      ),
      apiQuery<ActiveEvent[]>(
        () => supabase.from('user_recommendation_feedback').select('user_id, created_at').gte('created_at', from).limit(limit),
        'Dashboard-活跃事件-推荐反馈'
      ),
    ])

    const events: ActiveEvent[] = []
    for (const res of [rRead, rComment, rBookmark, rAnnotation, rTts, rFeedback]) {
      for (const row of (res.data || [])) {
        if (row.user_id && row.created_at) {
          events.push({ user_id: row.user_id, created_at: row.created_at })
        }
      }
    }
    return { success: true, data: events, errorMessage: null, statusCode: 200 }
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

  /// 小说总数
  async getNovelsCount() {
    return apiQuery(
      () => supabase.from('novels').select('id', { count: 'exact', head: true }),
      'Dashboard-小说总数'
    )
  }

  /// 小说阅读量列表
  async getNovelReadCounts(limit = 1000) {
    return apiQuery<{ read_count: number | null }[]>(
      () => supabase.from('novels').select('read_count').limit(limit),
      'Dashboard-小说阅读量'
    )
  }

  /// 活跃读者
  async getActiveReaders(since: string, limit = 1000) {
    return apiQuery<{ user_id: string | null; last_read_at: string | null }[]>(
      () => supabase.from('user_novels').select('user_id, last_read_at').gte('last_read_at', since).limit(limit),
      'Dashboard-活跃读者'
    )
  }

  /// 查询用户昵称
  async getUserNicknames(userIds: string[]) {
    return apiQuery<{ id: string; nickname: string | null }[]>(
      () => supabase.from('users').select('id, nickname').eq('is_deleted', false).in('id', userIds),
      'Dashboard-用户昵称查询'
    )
  }
}

export const dashboardService = new DashboardService()
