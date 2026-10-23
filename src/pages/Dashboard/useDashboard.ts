// Dashboard 数据加载 Hook（从 Dashboard.tsx 抽取，行为保持）
import { useState, useCallback, useEffect, useRef } from 'react'
import dayjs from 'dayjs'
import { usePermission } from '../../hooks/usePermission'
import { useMounted } from '../../hooks/useMounted'
import { dashboardService } from '../../services/dashboardService'
import { handleApiError } from '../../utils/apiClient'
import { userDisplayName } from '../../utils/userDisplay'
import type { UserDisplayInfo } from '../../utils/userDisplay'
import type {
  RecentActivity,
  TrendPoint,
  UserStats,
  GameStats,
  GameOverviewRow,
} from './types'
import { formatBeijing, formatBeijingNow, formatDate } from '../../utils/format'

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
  })

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
    if (!hasPermissionRef.current('dashboard:read')) return
    setLoading(true)

    try {
      const todayStart = dayjs().startOf('day').toISOString()
      const weekStart = dayjs(getWeekMonday()).startOf('day').toISOString()
      const monthStart = dayjs().startOf('month').toISOString()
      const trendStart = dayjs().subtract(30, 'day').startOf('day').toISOString()

      // 原实现为顺序 await 瀑布（约 13 个相互独立的接口逐个等待），
      // 首屏耗时≈请求数×单程延迟。改为一次性并发发出，墙钟时间≈最慢单个请求。
      const [
        totalRes,
        todayRes,
        weekRes,
        monthRes,
        trendRes,
        logsRes,
        gameListRes,
        gameScoresTotalRes,
        gameScoresTodayRes,
        gamePlayersTodayRes,
        gamePlayersWeekRes,
        gamePointsTodayRes,
      ] = await Promise.all([
        dashboardService.getTotalUsers(),
        dashboardService.getTodayNewUsers(todayStart),
        dashboardService.getNewUsersSince(weekStart),
        dashboardService.getNewUsersSince(monthStart),
        dashboardService.getUserTrendData(trendStart),
        // 最近活动最多展示 10 条（超出由「查看更多」跳操作日志页查看）
        dashboardService.getRecentLogs(10),
        // 游戏模块统计
        dashboardService.getGamesList(),
        dashboardService.getGameScoresCount(),
        dashboardService.getGameScoresCount(undefined, todayStart),
        dashboardService.getGameActivePlayers(todayStart),
        dashboardService.getGameActivePlayers(weekStart),
        dashboardService.getGamePointsSum(todayStart),
      ])

      if (!mountedRef.current) return

      const totalUsers = safeCount(totalRes.count)
      const newToday = safeCount(todayRes.count)
      const newWeek = safeCount(weekRes.count)
      const newMonth = safeCount(monthRes.count)

      setUserStats({
        total: totalUsers,
        newToday,
        newWeek,
        newMonth,
      })

      // 游戏模块统计
      const gameList = gameListRes.success ? (gameListRes.data || []) : []
      setGameStats({
        total: gameList.length,
        enabled: gameList.filter((g) => g.enabled).length,
        scoresTotal: safeCount(gameScoresTotalRes.count),
        scoresToday: safeCount(gameScoresTodayRes.count),
        playersToday: gamePlayersTodayRes.success ? (gamePlayersTodayRes.data || []).length : 0,
        playersWeek: gamePlayersWeekRes.success ? (gamePlayersWeekRes.data || []).length : 0,
        pointsToday: gamePointsTodayRes.success ? (gamePointsTodayRes.data || 0) : 0,
      })

      // 用户增长趋势（最近30天）
      if (trendRes.success) {
        const counts: Record<string, number> = {}
        for (let i = 29; i >= 0; i--) {
          counts[formatBeijing(dayjs().subtract(i, 'day'), 'YYYY-MM-DD')] = 0
        }
        for (const u of (trendRes.data || [])) {
          if (u.created_at) {
            counts[formatDate(u.created_at)] = (counts[formatDate(u.created_at)] || 0) + 1
          }
        }
        setUserTrendData(Object.entries(counts).map(([date, count]) => ({ date, count })))
      }

      // 最近活动（昵称查询依赖最近活动结果，单独发出，不再阻塞前面的统计）
      if (logsRes.success && logsRes.data && logsRes.data.length > 0) {
        const userIds = [...new Set(logsRes.data.map(l => l.user_id).filter(Boolean))] as string[]
        if (userIds.length > 0) {
          const nickRes = await dashboardService.getUserNicknames(userIds)
          // 显示名统一走 userDisplayName（username → nickname → 未知用户）。
          // 此前用 `nickname || u.id`，会把原始 ID 当显示名展示。
          const nickMap = new Map<string, UserDisplayInfo>()
          for (const u of (nickRes.data || [])) {
            const info: UserDisplayInfo = { username: u.username, nickname: u.nickname }
            nickMap.set(u.id, info)
            if (u.auth_id) nickMap.set(u.auth_id, info)
          }
          setRecentActivities(
            logsRes.data.map(l => ({
              ...l,
              user_nickname: l.user_id
                ? userDisplayName(l.user_id, nickMap.get(l.user_id))
                : '系统',
            }))
          )
        } else {
          setRecentActivities(logsRes.data.map(l => ({ ...l, user_nickname: '系统' })))
        }
      } else {
        setRecentActivities([])
      }
    } catch (error) {
      handleApiError(error, 'Dashboard-加载数据')
    } finally {
      setLoading(false)
    }
  }, []) // 依赖清空：hasPermission 改为经 hasPermissionRef 读取最新值，避免引用变化触发重复刷新

  // 游戏数据概览表（按游戏聚合：累计/今日成绩、今日活跃玩家、今日积分发放）
  const loadGameRows = useCallback(async () => {
    setGameRowsLoading(true)
    try {
      const todayStart = dayjs().startOf('day').toISOString()
      const listRes = await dashboardService.getGamesList()
      if (!listRes.success) {
        handleApiError(listRes.errorMessage, 'Dashboard-游戏概览列表')
        return
      }
      if (!mountedRef.current) return
      const games = listRes.data || []
      const rows = await Promise.all(
        games.map(async (g) => {
          const [scoresTotal, scoresToday, playersToday, pointsToday] = await Promise.all([
            dashboardService.getGameScoresCount(g.id),
            dashboardService.getGameScoresCount(g.id, todayStart),
            dashboardService.getGameActivePlayers(todayStart, g.id),
            dashboardService.getGamePointsSum(todayStart, g.id),
          ])
          return {
            ...g,
            scoresTotal: safeCount(scoresTotal.count),
            scoresToday: safeCount(scoresToday.count),
            playersToday: playersToday.success ? (playersToday.data || []).length : 0,
            pointsToday: pointsToday.success ? (pointsToday.data || 0) : 0,
          } satisfies GameOverviewRow
        })
      )
      if (!mountedRef.current) return
      setGameRows(rows)
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
  }, [loadStats, loadGameRows])

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
    recentActivities,
    userTrendData,
    gameStats,
    gameRows,
    gameRowsLoading,
    loadGameRows,
    refreshAll,
  }
}
