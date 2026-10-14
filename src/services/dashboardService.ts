// Dashboard 聚合数据访问层 —— 本地后端 /admin/dashboard（批 2-6）
// 原实现为 Supabase 多请求 + 分页循环（用户统计 5 连查、活跃事件 6 表并行、
// 游戏统计分页循环），现收敛为 4 个服务端聚合端点：
//   · user-stats    用户统计（总数/新增/活跃/留存，活跃事件服务端聚合，小说域表逐源容错）
//   · trend         用户增长趋势（按北京日预聚合）
//   · recent-logs   最近操作日志（LEFT JOIN users 直出操作人显示名，免二次昵称查询）
//   · game-overview 游戏概览（按游戏行 + 全局汇总，关联子查询避免笛卡尔积）
import { apiRequest } from '../utils/adminHttp'
import type { ApiResponse } from '../utils/apiClient'

/// 将 apiRequest 异常包装为旧 ApiResponse 形态（调用方 success/data 判定习惯不变）
async function wrap<T>(fn: () => Promise<T>): Promise<ApiResponse<T>> {
  try {
    return { success: true, data: await fn(), errorMessage: null, statusCode: 200 }
  } catch (e) {
    const msg = e instanceof Error ? e.message : '请求失败'
    return { success: false, data: null, errorMessage: msg, statusCode: null }
  }
}

/// /admin/dashboard/user-stats 出参
export interface DashboardUserStats {
  total: number
  new_today: number
  new_week: number
  new_month: number
  new_last_week: number
  active_today: number
  active_week: number
  active_month: number
  retention: number
}

/// 最近操作日志行（含操作人显示名来源）
export interface RecentLogRow {
  id: string
  user_id: string | null
  action: string
  module: string | null
  created_at: string
  username: string | null
  nickname: string | null
}

/// 游戏概览行（按游戏聚合）
export interface GameOverviewRowVO {
  id: string
  name: string
  code: string
  engine: string
  enabled: boolean
  sort_order: number
  scores_total: number
  scores_today: number
  players_today: number
  points_today: number
}

/// 游戏概览全局汇总
export interface GameSummary {
  scores_total: number
  scores_today: number
  players_today: number
  players_week: number
  points_today: number
}

/// 用户统计时间窗参数（均为 ISO-8601 UTC 字符串，前端 toISOString 产出）
export interface UserStatsWindow {
  todayStart: string
  weekStart: string
  monthStart: string
  lastWeekStart: string
  lastMonthStart: string
  lastMonthEnd: string
}

class DashboardService {
  /// 用户统计（含活跃与留存，服务端聚合）
  async getUserStats(w: UserStatsWindow): Promise<ApiResponse<DashboardUserStats>> {
    return wrap(() =>
      apiRequest<DashboardUserStats>(
        'GET',
        `/admin/dashboard/user-stats?today_start=${encodeURIComponent(w.todayStart)}` +
          `&week_start=${encodeURIComponent(w.weekStart)}` +
          `&month_start=${encodeURIComponent(w.monthStart)}` +
          `&last_week_start=${encodeURIComponent(w.lastWeekStart)}` +
          `&last_month_start=${encodeURIComponent(w.lastMonthStart)}` +
          `&last_month_end=${encodeURIComponent(w.lastMonthEnd)}`,
      ),
    )
  }

  /// 用户增长趋势（{rows:[{date,count}]}，按北京日预聚合）
  async getTrend(since: string): Promise<ApiResponse<{ rows: { date: string; count: number }[] }>> {
    return wrap(() =>
      apiRequest<{ rows: { date: string; count: number }[] }>(
        'GET',
        `/admin/dashboard/trend?since=${encodeURIComponent(since)}`,
      ),
    )
  }

  /// 最近操作日志（含操作人显示名来源列）
  async getRecentLogs(limit = 10): Promise<ApiResponse<{ rows: RecentLogRow[] }>> {
    return wrap(() =>
      apiRequest<{ rows: RecentLogRow[] }>('GET', `/admin/dashboard/recent-logs?limit=${limit}`),
    )
  }

  /// 游戏概览（按游戏行 + 全局汇总）
  async getGameOverview(
    todayStart: string,
    weekStart: string,
  ): Promise<ApiResponse<{ rows: GameOverviewRowVO[]; summary: GameSummary }>> {
    return wrap(() =>
      apiRequest<{ rows: GameOverviewRowVO[]; summary: GameSummary }>(
        'GET',
        `/admin/dashboard/game-overview?today_start=${encodeURIComponent(todayStart)}` +
          `&week_start=${encodeURIComponent(weekStart)}`,
      ),
    )
  }
}

export const dashboardService = new DashboardService()
