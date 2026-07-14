import { supabase } from '../utils/supabase'
import { apiQuery } from '../utils/apiClient'

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

  /// 时间段内新增用户（用于上周对比）
  async getNewUsersInRange(from: string, to: string) {
    return apiQuery(
      () => supabase.from('users').select('id', { count: 'exact', head: true }).eq('is_deleted', false).gte('created_at', from).lt('created_at', to),
      'Dashboard-时间段新增用户'
    )
  }

  /// 活跃用户操作日志
  async getOperationLogs(since: string, limit = 1000) {
    return apiQuery<{ user_id: string | null; module: string | null; created_at: string }[]>(
      () => supabase.from('operation_logs').select('user_id, module, created_at').gte('created_at', since).limit(limit),
      'Dashboard-活跃用户日志'
    )
  }

  /// 历史操作日志（仅 user_id）
  async getOperationLogUserIds(since: string, to: string, limit = 1000) {
    return apiQuery<{ user_id: string | null }[]>(
      () => supabase.from('operation_logs').select('user_id').gte('created_at', since).lt('created_at', to).limit(limit),
      'Dashboard-历史活跃用户'
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
