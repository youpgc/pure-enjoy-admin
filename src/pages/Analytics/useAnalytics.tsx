// 数据分析状态与业务逻辑（从 Analytics.tsx 抽离，审查 P1 膨胀）
// 页面只负责组合渲染（含 recharts 图表），所有状态/数据加载集中此处。
import { useState, useEffect } from 'react'
import type { Dayjs } from 'dayjs'
import dayjs from 'dayjs'
import { handleApiError } from '../../utils/apiClient'
import { useMounted } from '../../hooks/useMounted'
import { fetchNewUsersByRange, fetchNewFeedbackByRange } from '../../services/analyticsService'
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

      // 并行查询（service 统一响应/错误处理）
      const [usersRes, feedbackRes] = await Promise.all([
        fetchNewUsersByRange(startDate, endDate),
        fetchNewFeedbackByRange(startDate, endDate),
      ])

      if (!mountedRef.current) return
      if (!usersRes.success || !feedbackRes.success) return

      // 处理每日统计
      const dateMap = new Map<string, DailyStat>()
      const days = dateRange[1].diff(dateRange[0], 'day') + 1
      for (let i = 0; i < days; i++) {
        // 轴标签与 formatMonthDay 派生的分桶 key 同口径（北京时区）
        const date = formatMonthDay(dateRange[0].add(i, 'day'))
        dateMap.set(date, {
          date,
          newUsers: 0,
          newFeedback: 0,
        })
      }

      ;(usersRes.data ?? []).forEach((item) => {
        const date = formatMonthDay(item.created_at)
        const stat = dateMap.get(date)
        if (stat) stat.newUsers++
      })

      ;(feedbackRes.data ?? []).forEach((item) => {
        const date = formatMonthDay(item.created_at)
        const stat = dateMap.get(date)
        if (stat) stat.newFeedback++
      })

      setDailyStats(Array.from(dateMap.values()))

      // 汇总数据
      setSummary({
        totalUsers: usersRes.data?.length || 0,
        totalFeedback: feedbackRes.data?.length || 0,
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
