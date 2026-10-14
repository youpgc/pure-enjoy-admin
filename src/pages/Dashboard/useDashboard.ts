// Dashboard 数据加载 Hook（从 Dashboard.tsx 抽取，行为保持）
// 批 2-6：数据面切换本地后端 /admin/dashboard 4 个聚合端点
// （user-stats / trend / recent-logs / game-overview），原 Supabase 多请求收敛。
import { useState, useCallback, useEffect, useRef } from 'react'
import dayjs from 'dayjs'
// import { supabase } from '../../utils/supabase' // 小说模块下线，注释保留可恢复
import { usePermission } from '../../hooks/usePermission'
import { useMounted } from '../../hooks/useMounted'
// import { usePagination } from '../../hooks/usePagination' // 小说模块下线，注释保留可恢复
import { dashboardService } from '../../services/dashboardService'
import { handleApiError } from '../../utils/apiClient'
import { userDisplayName } from '../../utils/userDisplay'
import type {
  // CommentItem,
  // NovelListItem,
  // NovelStats,
  RecentActivity,
  TrendPoint,
  UserStats,
  GameStats,
  GameOverviewRow,
} from './types'
import { formatBeijing, formatBeijingNow } from '../../utils/format'

function getWeekMonday(date = new Date()): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  return new Date(d.setDate(diff))
}

export function useDashboard() {
  const { hasPermission } = usePermission()
  const mountedRef = useMounted()

  // 用 ref 持有最新 hasPermission，避免其引用随权限重载/切回浏览器
  // （触发权限重载生成新 permissions 数组）而频繁变化，
  // 进而导致 loadStats 重新创建、useEffect 重跑而重复刷新数据
  const hasPermissionRef = useRef(hasPermission)
  hasPermissionRef.current = hasPermission

  // 最后更新时间（手动刷新与初次加载均更新）
  const [lastUpdated, setLastUpdated] = useState<string>('')

  const [loading, setLoading] = useState(false)
  const [userStats, setUserStats] = useState<UserStats>({
    total: 0,
    newToday: 0,
    newWeek: 0,
    newMonth: 0,
    activeToday: 0,
    activeWeek: 0,
    activeMonth: 0,
    retention: 0,
    retentionChange: 0,
  })
  // 小说统计（小说模块下线，注释保留可恢复）
  // const [novelStats, setNovelStats] = useState<NovelStats>({
  //   total: 0,
  //   totalRead: 0,
  //   readers: 0,
  //   newReaders: 0,
  // })

  // // 小说列表分页（小说模块下线，注释保留可恢复）
  // const [novels, setNovels] = useState<NovelListItem[]>([])
  // const [novelsLoading, setNovelsLoading] = useState(false)
  // const novelPagination = usePagination(20)

  // // 评论列表分页（小说模块下线，注释保留可恢复）
  // const [comments, setComments] = useState<CommentItem[]>([])
  // const [commentsLoading, setCommentsLoading] = useState(false)
  // const commentPagination = usePagination(20)

  // 游戏模块统计卡片 + 概览表
  const [gameStats, setGameStats] = useState<GameStats>({
    total: 0,
    enabled: 0,
    scoresTotal: 0,
    scoresToday: 0,
    playersToday: 0,
    playersWeek: 0,
    pointsToday: 0,
  })
  const [gameRows, setGameRows] = useState<GameOverviewRow[]>([])
  const [gameRowsLoading, setGameRowsLoading] = useState(false)

  // 最近活动
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([])

  // 用户增长趋势
  const [userTrendData, setUserTrendData] = useState<TrendPoint[]>([])

  // ==================== 加载数据 ====================
  const loadStats = useCallback(async () => {
    if (!hasPermissionRef.current('admin:dashboard:list')) return
    setLoading(true)

    try {
      const todayStart = dayjs().startOf('day').toISOString()
      const weekStart = dayjs(getWeekMonday()).startOf('day').toISOString()
      const monthStart = dayjs().startOf('month').toISOString()
      const lastWeekStart = dayjs().subtract(1, 'week').startOf('day').toISOString()
      const lastMonthStart = dayjs().subtract(1, 'month').startOf('month').toISOString()
      const lastMonthEnd = dayjs().subtract(1, 'month').endOf('month').toISOString()
      const trendStart = dayjs().subtract(30, 'day').startOf('day').toISOString()

      // 批 2-6：原 13+ 个 Supabase 请求收敛为 4 个服务端聚合端点，一次并发发出
      const [statsRes, trendRes, logsRes, gameOverviewRes] = await Promise.all([
        dashboardService.getUserStats({
          todayStart,
          weekStart,
          monthStart,
          lastWeekStart,
          lastMonthStart,
          lastMonthEnd,
        }),
        dashboardService.getTrend(trendStart),
        // 最近活动最多展示 10 条（超出由「查看更多」跳操作日志页查看）
        dashboardService.getRecentLogs(10),
        dashboardService.getGameOverview(todayStart, weekStart),
      ])

      if (!mountedRef.current) return

      // 用户统计（含活跃与留存，均由服务端聚合；retentionChange 客户端环比）
      if (statsRes.success && statsRes.data) {
        const s = statsRes.data
        const newWeek = s.new_week
        const newLastWeek = s.new_last_week
        const retentionChange = newLastWeek > 0
          ? Math.round(((newWeek - newLastWeek) / newLastWeek) * 100)
          : 0
        setUserStats({
          total: s.total,
          newToday: s.new_today,
          newWeek: s.new_week,
          newMonth: s.new_month,
          activeToday: s.active_today,
          activeWeek: s.active_week,
          activeMonth: s.active_month,
          retention: s.retention,
          retentionChange,
        })
      }

      // 用户增长趋势（最近30天；服务端按北京日预聚合，客户端补零填充空缺日）
      if (trendRes.success && trendRes.data) {
        const counts: Record<string, number> = {}
        for (let i = 29; i >= 0; i--) {
          counts[formatBeijing(dayjs().subtract(i, 'day'), 'YYYY-MM-DD')] = 0
        }
        for (const row of trendRes.data.rows) {
          if (row.date in counts) {
            counts[row.date] = row.count
          }
        }
        setUserTrendData(Object.entries(counts).map(([date, count]) => ({ date, count })))
      }

      // 最近活动（操作人显示名由服务端 LEFT JOIN users 直出，免二次昵称查询）
      if (logsRes.success && logsRes.data) {
        setRecentActivities(
          logsRes.data.rows.map((l) => ({
            id: l.id,
            action: l.action,
            module: l.module,
            user_id: l.user_id,
            created_at: l.created_at,
            user_nickname: l.user_id
              ? userDisplayName(l.user_id, { username: l.username, nickname: l.nickname })
              : '系统',
          })),
        )
      } else {
        setRecentActivities([])
      }

      if (!mountedRef.current) return

      // 游戏模块统计卡片（全局汇总由服务端单次返回，跨游戏玩家已去重）
      if (gameOverviewRes.success && gameOverviewRes.data) {
        const { rows, summary } = gameOverviewRes.data
        setGameStats({
          total: rows.length,
          enabled: rows.filter((g) => g.enabled).length,
          scoresTotal: summary.scores_total,
          scoresToday: summary.scores_today,
          playersToday: summary.players_today,
          playersWeek: summary.players_week,
          pointsToday: summary.points_today,
        })
      }
    } catch (error) {
      handleApiError(error, 'Dashboard-加载数据')
    } finally {
      setLoading(false)
    }
  }, []) // 依赖清空：hasPermission 改为经 hasPermissionRef 读取最新值，避免引用变化触发重复刷新

  // // 小说列表（小说模块下线，注释保留可恢复）
  // const loadNovels = useCallback(async (page = novelPagination.pagination.current, pageSize = novelPagination.pagination.pageSize) => {
  //   setNovelsLoading(true)
  //   try {
  //     const from = (page - 1) * pageSize
  //     const to = from + pageSize - 1
  //     const { data, error, count } = await supabase
  //       .from('novels')
  //       .select(`id, title, author, read_count, rating, created_at, category`, { count: 'exact' })
  //       .order('read_count', { ascending: false })
  //       .range(from, to)
  //
  //     if (error) throw error
  //     if (!mountedRef.current) return
  //     setNovels((data as NovelListItem[]) || [])
  //     novelPagination.setTotal(count || 0)
  //   } catch (error) {
  //     handleApiError(error, 'Dashboard-获取小说列表')
  //   } finally {
  //     setNovelsLoading(false)
  //   }
  // }, [novelPagination.pagination.current, novelPagination.pagination.pageSize])

  // // 评论列表（小说模块下线，注释保留可恢复）
  // const loadComments = useCallback(async (page = commentPagination.pagination.current, pageSize = commentPagination.pagination.pageSize) => {
  //   setCommentsLoading(true)
  //   try {
  //     const from = (page - 1) * pageSize
  //     const to = from + pageSize - 1
  //     const { data, error, count } = await supabase
  //       .from('novel_comments')
  //       .select(`
  //         id,
  //         novel_id,
  //         user_id,
  //         user_nickname,
  //         content,
  //         rating,
  //         created_at,
  //         novels: novel_id (title)
  //       `, { count: 'exact' })
  //       .order('created_at', { ascending: false })
  //       .range(from, to)
  //
  //     if (error) throw error
  //     if (!mountedRef.current) return
  //     const processedComments = ((data || []) as unknown as Array<{
  //       id: string
  //       novel_id: string
  //       user_id: string
  //       user_nickname: string | null
  //       content: string
  //       rating: number | null
  //       created_at: string
  //       novels: { title: string | null } | { title: string | null }[] | null
  //     }>).map(comment => {
  //       const novelData = comment.novels
  //       return {
  //         ...comment,
  //         novel_title: Array.isArray(novelData) ? novelData[0]?.title : novelData?.title,
  //         novels: undefined,
  //       }
  //     })
  //     setComments(processedComments as unknown as CommentItem[])
  //     commentPagination.setTotal(count || 0)
  //   } catch (error) {
  //     handleApiError(error, 'Dashboard-获取评论列表')
  //   } finally {
  //     setCommentsLoading(false)
  //   }
  // }, [commentPagination.pagination.current, commentPagination.pagination.pageSize])

  // 游戏数据概览表（批 2-6：按游戏聚合已服务端化，单请求直出行数组）
  const loadGameRows = useCallback(async () => {
    setGameRowsLoading(true)
    try {
      const todayStart = dayjs().startOf('day').toISOString()
      const weekStart = dayjs(getWeekMonday()).startOf('day').toISOString()
      const overviewRes = await dashboardService.getGameOverview(todayStart, weekStart)
      if (!overviewRes.success || !overviewRes.data) {
        handleApiError(overviewRes.errorMessage ?? '游戏概览加载失败', 'Dashboard-游戏概览')
        return
      }
      if (!mountedRef.current) return
      setGameRows(
        overviewRes.data.rows.map((row) => ({
          id: row.id,
          name: row.name,
          code: row.code,
          engine: row.engine,
          enabled: row.enabled,
          scoresTotal: row.scores_total,
          scoresToday: row.scores_today,
          playersToday: row.players_today,
          pointsToday: row.points_today,
        })),
      )
    } catch (error) {
      handleApiError(error, 'Dashboard-游戏概览')
    } finally {
      setGameRowsLoading(false)
    }
  }, [])

  // 统一刷新入口：初次加载与手动刷新按钮共用，避免逻辑重复
  const refreshAll = useCallback(() => {
    setLastUpdated(formatBeijingNow('YYYY-MM-DD HH:mm:ss'))
    loadStats()
    loadGameRows()
    // loadNovels()   // 小说模块下线，注释保留可恢复
    // loadComments() // 小说模块下线，注释保留可恢复
  }, [loadStats, loadGameRows])

  // 仅挂载时自动加载一次。权限（usePermission）为异步加载，首帧 hasPermission 为 false，
  // 若直接刷新会导致 loadStats 的权限门禁提前拦截、且后续权限就绪后 useEffect 不再二次触发，
  // 从而卡片/趋势/最近活动这批「刷新按钮对应的接口」在初始化时不会被请求。
  // 故用 didInitialLoadRef 保证：权限就绪后只自动加载一次，切回浏览器等场景不重复刷新。
  const didInitialLoadRef = useRef(false)
  useEffect(() => {
    if (didInitialLoadRef.current) return
    if (!hasPermission('admin:dashboard:list')) return
    didInitialLoadRef.current = true
    refreshAll()
  }, [hasPermission, refreshAll])

  return {
    lastUpdated,
    loading,
    userStats,
    // novelStats,        // 小说模块下线，注释保留可恢复
    // novels,            // 小说模块下线，注释保留可恢复
    // novelsLoading,     // 小说模块下线，注释保留可恢复
    // novelPagination,   // 小说模块下线，注释保留可恢复
    // comments,          // 小说模块下线，注释保留可恢复
    // commentsLoading,   // 小说模块下线，注释保留可恢复
    // commentPagination, // 小说模块下线，注释保留可恢复
    recentActivities,
    userTrendData,
    gameStats,
    gameRows,
    gameRowsLoading,
    loadGameRows,
    // loadNovels,   // 小说模块下线，注释保留可恢复
    // loadComments, // 小说模块下线，注释保留可恢复
    refreshAll,
  }
}
