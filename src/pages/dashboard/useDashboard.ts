// Dashboard 数据加载 Hook（从 Dashboard.tsx 抽取，行为保持）
import { useState, useCallback, useEffect, useRef } from 'react'
import dayjs from 'dayjs'
import { message } from 'antd'
import { supabase } from '../../utils/supabase'
import { usePermission } from '../../hooks/usePermission'
import { useMounted } from '../../hooks/useMounted'
import { usePagination } from '../../hooks/usePagination'
import { dashboardService } from '../../services/dashboardService'
import type {
  CommentItem,
  NovelListItem,
  NovelStats,
  RecentActivity,
  TrendPoint,
  UserStats,
} from './types'

function safeCount(count: unknown): number {
  return typeof count === 'number' ? count : 0
}

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
  // （触发 Supabase onAuthStateChange → loadPermissions 生成新 permissions 数组）而频繁变化，
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
  const [novelStats, setNovelStats] = useState<NovelStats>({
    total: 0,
    totalRead: 0,
    readers: 0,
    newReaders: 0,
  })

  // 小说列表分页
  const [novels, setNovels] = useState<NovelListItem[]>([])
  const [novelsLoading, setNovelsLoading] = useState(false)
  const novelPagination = usePagination(20)

  // 评论列表分页
  const [comments, setComments] = useState<CommentItem[]>([])
  const [commentsLoading, setCommentsLoading] = useState(false)
  const commentPagination = usePagination(20)

  // 最近活动
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([])

  // 用户增长趋势
  const [userTrendData, setUserTrendData] = useState<TrendPoint[]>([])

  // ==================== 加载数据 ====================
  const loadStats = useCallback(async () => {
    if (!hasPermissionRef.current('dashboard:read')) return
    setLoading(true)

    try {
      const todayStart = dayjs().startOf('day').toISOString()
      const weekStart = dayjs(getWeekMonday()).startOf('day').toISOString()
      const monthStart = dayjs().startOf('month').toISOString()
      const lastWeekStart = dayjs().subtract(1, 'week').startOf('day').toISOString()
      const lastMonthStart = dayjs().subtract(1, 'month').startOf('month').toISOString()
      const lastMonthEnd = dayjs().subtract(1, 'month').endOf('month').toISOString()
      const trendStart = dayjs().subtract(30, 'day').startOf('day').toISOString()

      // 原实现为顺序 await 瀑布（约 13 个相互独立的接口逐个等待），
      // 首屏耗时≈请求数×单程延迟。改为一次性并发发出，墙钟时间≈最慢单个请求。
      const [
        totalRes,
        todayRes,
        weekRes,
        monthRes,
        lastWeekRes,
        activeEventsRes,
        lastMonthUsersRes,
        novelsRes,
        readCountRes,
        trendRes,
        logsRes,
      ] = await Promise.all([
        dashboardService.getTotalUsers(),
        dashboardService.getTodayNewUsers(todayStart),
        dashboardService.getNewUsersSince(weekStart),
        dashboardService.getNewUsersSince(monthStart),
        dashboardService.getNewUsersInRange(lastWeekStart, weekStart),
        dashboardService.getActiveUserEvents(monthStart),
        dashboardService.getNewUserIdsInRange(lastMonthStart, lastMonthEnd),
        dashboardService.getNovelsCount(),
        dashboardService.getNovelReadCounts(),
        dashboardService.getUserTrendData(trendStart),
        dashboardService.getRecentLogs(),
      ])

      if (!mountedRef.current) return

      const totalUsers = safeCount(totalRes.count)
      const newToday = safeCount(todayRes.count)
      const newWeek = safeCount(weekRes.count)
      const newMonth = safeCount(monthRes.count)
      const lastWeekNew = safeCount(lastWeekRes.count)

      // 活跃用户数（基于真实用户行为：阅读 + 评论/书签/批注/听书/推荐反馈，
      // 不再依赖 operation_logs，因其仅记录后台操作，不含用户阅读行为）
      // 一次性拉取「本月」窗口内的全部活跃事件，客户端按时间筛出日/周/月活跃。
      const activeEvents = activeEventsRes.success ? (activeEventsRes.data || []) : []
      const activeToday = new Set(
        activeEvents.filter(e => e.created_at >= todayStart).map(e => e.user_id)
      ).size
      const activeWeek = new Set(
        activeEvents.filter(e => e.created_at >= weekStart).map(e => e.user_id)
      ).size
      const activeMonth = new Set(activeEvents.map(e => e.user_id)).size
      // 本周活跃用户集合，留存率计算时与「上月注册用户」取交集
      const thisWeekActiveUserIds = new Set(
        activeEvents.filter(e => e.created_at >= weekStart).map(e => e.user_id)
      )

      // 留存率（上月注册且本周活跃的用户）
      const lastMonthUserIds = new Set((lastMonthUsersRes.data || []).map(u => u.id))
      const lastMonthUsersCount = lastMonthUserIds.size
      // 取「上月注册」与「本周活跃」的交集，才是真正的留存用户
      const retainedUsers = [...thisWeekActiveUserIds].filter(id => lastMonthUserIds.has(id)).length
      const retention = lastMonthUsersCount > 0
        ? Math.round((retainedUsers / lastMonthUsersCount) * 100)
        : 0
      const retentionChange = lastWeekNew > 0
        ? Math.round(((newWeek - lastWeekNew) / lastWeekNew) * 100)
        : 0

      if (!mountedRef.current) return

      setUserStats({
        total: totalUsers,
        newToday,
        newWeek,
        newMonth,
        activeToday,
        activeWeek,
        activeMonth,
        retention,
        retentionChange,
      })

      // 小说统计
      const novelsTotal = safeCount(novelsRes.count)
      const totalRead = readCountRes.success
        ? (readCountRes.data || []).reduce((sum, n) => sum + (n.read_count || 0), 0)
        : 0

      // 活跃读者（本周/今日阅读过小说）：复用上方已拉取的阅读类活跃事件
      // （source==='read' 即 user_novels.last_read_at），无需再发两次 getActiveReaders 请求
      const readEvents = activeEvents.filter(e => e.source === 'read')
      const readers = new Set(
        readEvents.filter(e => e.created_at >= weekStart).map(e => e.user_id)
      ).size
      const newReaders = new Set(
        readEvents.filter(e => e.created_at >= todayStart).map(e => e.user_id)
      ).size

      if (!mountedRef.current) return

      setNovelStats({
        total: novelsTotal,
        totalRead,
        readers,
        newReaders,
      })

      // 用户增长趋势（最近30天）
      if (trendRes.success) {
        const counts: Record<string, number> = {}
        for (let i = 29; i >= 0; i--) {
          counts[dayjs().subtract(i, 'day').format('YYYY-MM-DD')] = 0
        }
        for (const u of (trendRes.data || [])) {
          if (u.created_at) {
            counts[dayjs(u.created_at).format('YYYY-MM-DD')] = (counts[dayjs(u.created_at).format('YYYY-MM-DD')] || 0) + 1
          }
        }
        setUserTrendData(Object.entries(counts).map(([date, count]) => ({ date, count })))
      }

      // 最近活动（昵称查询依赖最近活动结果，单独发出，不再阻塞前面的统计）
      if (logsRes.success && logsRes.data && logsRes.data.length > 0) {
        const userIds = [...new Set(logsRes.data.map(l => l.user_id).filter(Boolean))] as string[]
        if (userIds.length > 0) {
          const nickRes = await dashboardService.getUserNicknames(userIds)
          const nickMap = new Map(
            (nickRes.data || []).map(u => [u.id, u.nickname || u.id])
          )
          setRecentActivities(
            logsRes.data.map(l => ({
              ...l,
              user_nickname: l.user_id ? (nickMap.get(l.user_id) || l.user_id) : '系统',
            }))
          )
        } else {
          setRecentActivities(logsRes.data.map(l => ({ ...l, user_nickname: '系统' })))
        }
      } else {
        setRecentActivities([])
      }
    } catch (error) {
      console.error('加载数据失败:', error)
      if (mountedRef.current) message.error('加载数据失败，请检查网络连接后重试')
    } finally {
      if (mountedRef.current) setLoading(false)
    }
  }, []) // 依赖清空：hasPermission 改为经 hasPermissionRef 读取最新值，避免引用变化触发重复刷新

  // 小说列表
  const loadNovels = useCallback(async (page = novelPagination.pagination.current, pageSize = novelPagination.pagination.pageSize) => {
    setNovelsLoading(true)
    try {
      const from = (page - 1) * pageSize
      const to = from + pageSize - 1
      const { data, error, count } = await supabase
        .from('novels')
        .select('id, title, author, read_count, rating, created_at, category', { count: 'exact' })
        .order('read_count', { ascending: false })
        .range(from, to)

      if (error) throw error
      if (!mountedRef.current) return
      setNovels((data as NovelListItem[]) || [])
      novelPagination.setTotal(count || 0)
    } catch (error) {
      console.error('获取小说列表失败:', error)
      if (mountedRef.current) message.error('获取小说列表失败')
    } finally {
      if (mountedRef.current) setNovelsLoading(false)
    }
  }, [novelPagination.pagination.current, novelPagination.pagination.pageSize])

  // 评论列表
  const loadComments = useCallback(async (page = commentPagination.pagination.current, pageSize = commentPagination.pagination.pageSize) => {
    setCommentsLoading(true)
    try {
      const from = (page - 1) * pageSize
      const to = from + pageSize - 1
      const { data, error, count } = await supabase
        .from('novel_comments')
        .select(`
          id,
          novel_id,
          user_id,
          user_nickname,
          content,
          rating,
          created_at,
          novels: novel_id (title)
        `, { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(from, to)

      if (error) throw error
      if (!mountedRef.current) return
      const processedComments = ((data || []) as unknown as Array<{
        id: string
        novel_id: string
        user_id: string
        user_nickname: string | null
        content: string
        rating: number | null
        created_at: string
        novels: { title: string | null } | { title: string | null }[] | null
      }>).map(comment => {
        const novelData = comment.novels
        return {
          ...comment,
          novel_title: Array.isArray(novelData) ? novelData[0]?.title : novelData?.title,
          novels: undefined,
        }
      })
      setComments(processedComments as unknown as CommentItem[])
      commentPagination.setTotal(count || 0)
    } catch (error) {
      console.error('获取评论列表失败:', error)
      if (mountedRef.current) message.error('获取评论列表失败')
    } finally {
      if (mountedRef.current) setCommentsLoading(false)
    }
  }, [commentPagination.pagination.current, commentPagination.pagination.pageSize])

  // 统一刷新入口：初次加载与手动刷新按钮共用，避免逻辑重复
  const refreshAll = useCallback(() => {
    setLastUpdated(dayjs().format('YYYY-MM-DD HH:mm:ss'))
    loadStats()
    loadNovels()
    loadComments()
  }, [loadStats, loadNovels, loadComments])

  // 仅挂载时自动加载一次。权限（usePermission）为异步加载，首帧 hasPermission 为 false，
  // 若直接刷新会导致 loadStats 的权限门禁提前拦截、且后续权限就绪后 useEffect 不再二次触发，
  // 从而卡片/趋势/最近活动这批「刷新按钮对应的接口」在初始化时不会被请求。
  // 故用 didInitialLoadRef 保证：权限就绪后只自动加载一次，切回浏览器等场景不重复刷新。
  const didInitialLoadRef = useRef(false)
  useEffect(() => {
    if (didInitialLoadRef.current) return
    if (!hasPermission('dashboard:read')) return
    didInitialLoadRef.current = true
    refreshAll()
  }, [hasPermission, refreshAll])

  return {
    lastUpdated,
    loading,
    userStats,
    novelStats,
    novels,
    novelsLoading,
    novelPagination,
    comments,
    commentsLoading,
    commentPagination,
    recentActivities,
    userTrendData,
    loadNovels,
    loadComments,
    refreshAll,
  }
}
