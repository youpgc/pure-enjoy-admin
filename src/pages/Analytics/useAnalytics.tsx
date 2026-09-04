// 数据分析状态与业务逻辑（从 Analytics.tsx 抽离，审查 P1 膨胀）
// 页面只负责组合渲染（含 recharts 图表），所有状态/数据加载集中此处。
import { useState, useEffect } from 'react'
import type { Dayjs } from 'dayjs'
import dayjs from 'dayjs'
import { supabase } from '../../utils/supabase'
import { apiQuery, handleApiError } from '../../utils/apiClient'
import { useMounted } from '../../hooks/useMounted'
import type { DailyStat, NovelStat, TopNovel } from './types'

export const useAnalytics = () => {
  const mountedRef = useMounted()

  const [loading, setLoading] = useState(false)
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs]>([dayjs().subtract(30, 'day'), dayjs()])
  const [dailyStats, setDailyStats] = useState<DailyStat[]>([])
  const [novelStats, setNovelStats] = useState<NovelStat[]>([])
  const [topNovels, setTopNovels] = useState<TopNovel[]>([])
  const [summary, setSummary] = useState({
    totalUsers: 0,
    totalNovels: 0,
    totalChapters: 0,
    totalFeedback: 0,
  })

  const fetchAnalytics = async () => {
    setLoading(true)
    try {
      const startDate = dateRange[0].format('YYYY-MM-DD')
      const endDate = dateRange[1].format('YYYY-MM-DD')

      // 并行查询
      const [usersRes, novelsRes, chaptersRes, feedbackRes, topNovelsRes] = await Promise.all([
        apiQuery(
          () =>
            supabase
              .from('users')
              .select('created_at')
              .eq('is_deleted', false)
              .gte('created_at', startDate)
              .lte('created_at', endDate + 'T23:59:59')
              .limit(5000),
          'Analytics-用户数据',
        ),
        apiQuery(
          () =>
            supabase
              .from('novels')
              .select('created_at, category')
              .gte('created_at', startDate)
              .lte('created_at', endDate + 'T23:59:59')
              .limit(5000),
          'Analytics-小说数据',
        ),
        apiQuery(
          () =>
            supabase
              .from('novel_chapters')
              .select('created_at')
              .gte('created_at', startDate)
              .lte('created_at', endDate + 'T23:59:59')
              .limit(5000),
          'Analytics-章节数据',
        ),
        apiQuery(
          () =>
            supabase
              .from('user_feedback')
              .select('created_at')
              .eq('is_deleted', false)
              .gte('created_at', startDate)
              .lte('created_at', endDate + 'T23:59:59')
              .limit(5000),
          'Analytics-反馈数据',
        ),
        apiQuery(
          () =>
            supabase
              .from('novels')
              .select('title, author, read_count, chapter_count')
              .order('read_count', { ascending: false })
              .limit(10),
          'Analytics-热门小说',
        ),
      ])

      // 处理每日统计
      const dateMap = new Map<string, DailyStat>()
      const days = dateRange[1].diff(dateRange[0], 'day') + 1
      for (let i = 0; i < days; i++) {
        const date = dateRange[0].add(i, 'day').format('MM-DD')
        dateMap.set(date, {
          date,
          newUsers: 0,
          activeUsers: 0,
          newNovels: 0,
          newChapters: 0,
          newFeedback: 0,
        })
      }

      ;(usersRes.data as Array<{ created_at: string }>)?.forEach((item) => {
        const date = dayjs(item.created_at).format('MM-DD')
        if (dateMap.has(date)) {
          dateMap.get(date)!.newUsers++
        }
      })

      ;(novelsRes.data as Array<{ created_at: string; category: string | null }>)?.forEach((item) => {
        const date = dayjs(item.created_at).format('MM-DD')
        if (dateMap.has(date)) {
          dateMap.get(date)!.newNovels++
        }
      })

      ;(chaptersRes.data as Array<{ created_at: string }>)?.forEach((item) => {
        const date = dayjs(item.created_at).format('MM-DD')
        if (dateMap.has(date)) {
          dateMap.get(date)!.newChapters++
        }
      })

      ;(feedbackRes.data as Array<{ created_at: string }>)?.forEach((item) => {
        const date = dayjs(item.created_at).format('MM-DD')
        if (dateMap.has(date)) {
          dateMap.get(date)!.newFeedback++
        }
      })

      setDailyStats(Array.from(dateMap.values()))

      // 处理小说分类统计
      const categoryMap = new Map<string, number>()
      ;(novelsRes.data as Array<{ category: string | null }>)?.forEach((item) => {
        const category = item.category || '未分类'
        categoryMap.set(category, (categoryMap.get(category) || 0) + 1)
      })

      if (!mountedRef.current) return

      setNovelStats(
        Array.from(categoryMap.entries()).map(([category, count]) => ({
          category,
          count,
        })),
      )

      // 处理热门小说
      setTopNovels((topNovelsRes.data as TopNovel[]) || [])

      // 汇总数据
      setSummary({
        totalUsers: (usersRes.data as unknown[])?.length || 0,
        totalNovels: (novelsRes.data as unknown[])?.length || 0,
        totalChapters: (chaptersRes.data as unknown[])?.length || 0,
        totalFeedback: (feedbackRes.data as unknown[])?.length || 0,
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
    novelStats,
    topNovels,
    summary,
    fetchAnalytics,
  }
}
