// 数据分析状态与业务逻辑（从 Analytics.tsx 抽离，审查 P1 膨胀）
// 页面只负责组合渲染（含 recharts 图表），所有状态/数据加载集中此处。
// 通道：users / user_feedback 走本地后端通用表层 /admin/table/**。
// 小说域（novels / novel_chapters / 热门小说）已随小说模块下线整体剥离（分支有备份）。
import { useState, useEffect } from 'react'
import type { Dayjs } from 'dayjs'
import dayjs from 'dayjs'
import { apiRequest } from '../../utils/adminHttp'
import { handleApiError } from '../../utils/apiClient'
import { useMounted } from '../../hooks/useMounted'
import type { DailyStat } from './types'
import { formatMonthDay } from '../../utils/format'

export const useAnalytics = () => {
  const mountedRef = useMounted()

  const [loading, setLoading] = useState(false)
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs]>([dayjs().subtract(30, 'day'), dayjs()])
  const [dailyStats, setDailyStats] = useState<DailyStat[]>([])
  const [summary, setSummary] = useState({
    totalUsers: 0,
    totalFeedback: 0,
  })

  const fetchAnalytics = async () => {
    setLoading(true)
    try {
      const startDate = dateRange[0].format('YYYY-MM-DD')
      const endDate = dateRange[1].format('YYYY-MM-DD')

      // 时间窗过滤条件（created_at，闭区间到当日 23:59:59；is_deleted=false）
      const windowWhere = (extra: Record<string, unknown>[]) =>
        encodeURIComponent(JSON.stringify([
          ...extra,
          { col: 'created_at', op: 'gte', val: startDate },
          { col: 'created_at', op: 'lte', val: endDate + 'T23:59:59' },
        ]))

      // 并行查询：users / user_feedback 走通用表层
      const [usersRes, feedbackRes] = await Promise.all([
        apiRequest<Array<{ created_at: string }>>(
          'GET',
          `/admin/table/users?where=${windowWhere([{ col: 'is_deleted', op: 'eq', val: false }])}&cols=created_at&order=created_at&asc=true`
        ).catch(() => [] as Array<{ created_at: string }>),
        apiRequest<Array<{ created_at: string }>>(
          'GET',
          `/admin/table/user_feedback?where=${windowWhere([{ col: 'is_deleted', op: 'eq', val: false }])}&cols=created_at&order=created_at&asc=true`
        ).catch(() => [] as Array<{ created_at: string }>),
      ])

      // 处理每日统计
      const dateMap = new Map<string, DailyStat>()
      const days = dateRange[1].diff(dateRange[0], 'day') + 1
      for (let i = 0; i < days; i++) {
        // 轴标签与 formatMonthDay 派生的分桶 key 同口径（北京时区）
        const date = formatMonthDay(dateRange[0].add(i, 'day'))
        dateMap.set(date, {
          date,
          newUsers: 0,
          activeUsers: 0,
          newFeedback: 0,
        })
      }

      ;(usersRes || []).forEach((item) => {
        const date = formatMonthDay(item.created_at)
        if (dateMap.has(date)) {
          dateMap.get(date)!.newUsers++
        }
      })

      ;(feedbackRes || []).forEach((item) => {
        const date = formatMonthDay(item.created_at)
        if (dateMap.has(date)) {
          dateMap.get(date)!.newFeedback++
        }
      })

      if (!mountedRef.current) return

      setDailyStats(Array.from(dateMap.values()))

      // 汇总数据
      setSummary({
        totalUsers: (usersRes || []).length || 0,
        totalFeedback: (feedbackRes || []).length || 0,
      })
    } catch (error) {
      handleApiError(error, 'Analytics-加载数据')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAnalytics()
  }, [dateRange])

  return {
    loading,
    dateRange,
    setDateRange,
    dailyStats,
    summary,
    fetchAnalytics,
  }
}
