import React, { useEffect, useState } from 'react'
import { Row, Col, Card, Statistic, Spin, DatePicker, Table, Tag, Empty, Tabs, Alert, message } from 'antd'
import {
  UserOutlined,
  UserAddOutlined,
  WalletOutlined,
  FireOutlined,
  BookOutlined,
  SmileOutlined,
  ReadOutlined,
  DollarOutlined,
  StarOutlined,
  ClockCircleOutlined,
  HeartOutlined,
} from '@ant-design/icons'
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer,
} from 'recharts'
import dayjs from 'dayjs'
import type { Dayjs } from 'dayjs'
import { usePermission } from '../hooks/usePermission'
import { supabase } from '../utils/supabase'
import type {
  AnalyticsKeyMetrics,
  UserTrendItem,
  UserActivityItem,
  RetentionRate,
  ExpenseTrendItem,
  MoodTrendItem,
  WeightAnalyticsItem,
  NoteActivityItem,
  UserDistribution,
  ExpenseCategoryItem,
} from '../utils/mockData'
import { EXPENSE_CATEGORY_OPTIONS } from '../utils/mockData'
import { useDictOptions } from '../hooks/useDictOptions'

const { RangePicker } = DatePicker

const Analytics: React.FC = () => {
  const { isAdmin } = usePermission()
  const { options: expenseCategoryOptions } = useDictOptions('expense_category', EXPENSE_CATEGORY_OPTIONS)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null]>([
    dayjs().subtract(30, 'day'),
    dayjs(),
  ])

  const [metrics, setMetrics] = useState<AnalyticsKeyMetrics | null>(null)
  const [userTrend, setUserTrend] = useState<UserTrendItem[]>([])
  const [userActivity, setUserActivity] = useState<UserActivityItem[]>([])
  const [retentionRates, setRetentionRates] = useState<RetentionRate[]>([])
  const [expenseTrend, setExpenseTrend] = useState<ExpenseTrendItem[]>([])
  const [moodTrend, setMoodTrend] = useState<MoodTrendItem[]>([])
  const [weightAnalytics, setWeightAnalytics] = useState<WeightAnalyticsItem[]>([])
  const [noteActivity, setNoteActivity] = useState<NoteActivityItem[]>([])
  const [userByRole, setUserByRole] = useState<UserDistribution[]>([])
  const [userByMemberLevel, setUserByMemberLevel] = useState<UserDistribution[]>([])
  const [userByStatus, setUserByStatus] = useState<UserDistribution[]>([])
  const [expenseByCategory, setExpenseByCategory] = useState<ExpenseCategoryItem[]>([])
  // 小说阅读统计
  const [novelStats, setNovelStats] = useState({
    totalNovels: 0,
    totalChapters: 0,
    totalReadCount: 0,
    totalWordCount: 0,
    totalCollectCount: 0,
    avgRating: 0,
    categoryDistribution: [] as { name: string; value: number; color: string }[],
    statusDistribution: [] as { name: string; value: number; color: string }[],
    topNovels: [] as { title: string; readCount: number; author: string }[],
  })
  // user_novels 表统计
  const [userNovelStats, setUserNovelStats] = useState({
    totalRecords: 0,
    avgProgress: 0,
    activeReaders: 0,
  })
  // 扩展统计
  const [extendedStats, setExtendedStats] = useState({
    favoritesCount: 0,
    remindersCount: 0,
    habitsCount: 0,
    weightRecordsCount: 0,
  })

  useEffect(() => {
    const fetchAnalyticsData = async () => {
      try {
        setError(null)
        const now = dayjs()
        const todayStart = now.startOf('day').format('YYYY-MM-DD')
        const sevenDaysAgo = now.subtract(7, 'day').format('YYYY-MM-DD')
        const thirtyDaysAgo = now.subtract(29, 'day').startOf('day').format('YYYY-MM-DD')
        const fourteenDaysAgo = now.subtract(13, 'day').startOf('day').format('YYYY-MM-DD')

        // ==================== 并行查询核心数据 ====================
        const [
          usersCountRes,
          todayNewUsersRes,
          activeUsersLogsRes,
          totalExpenseRes,
          totalDiariesRes,
          totalNotesRes,
          novelReadCountRes,
          usersTrendRes,
          allUsersRes,
          opLogsRes,
          expenseTrendRes,
          moodTrendRes,
          weightAnalyticsRes,
          noteActivityRes,
          expenseCategoryRes,
          novelStatsRes,
          chapterCountRes,
          userNovelsRes,
          favoritesCountRes,
          remindersCountRes,
          habitsCountRes,
          weightRecordsCountRes,
        ] = await Promise.all([
          // 总用户数
          supabase.from('users').select('*', { count: 'exact', head: true }),
          // 今日新增
          supabase.from('users').select('id', { count: 'exact', head: true }).gte('created_at', todayStart),
          // 活跃用户：最近7天有操作日志的用户
          supabase.from('operation_logs').select('user_id').gte('created_at', sevenDaysAgo),
          // 总消费
          supabase.from('expenses').select('amount'),
          // 总日记数
          supabase.from('mood_diaries').select('id', { count: 'exact', head: true }),
          // 总笔记数
          supabase.from('notes').select('id', { count: 'exact', head: true }),
          // 小说阅读量（novels 的 read_count 总和）
          supabase.from('novels').select('read_count'),
          // 用户增长趋势（30天）
          supabase.from('users').select('created_at').gte('created_at', thirtyDaysAgo),
          // 所有用户（用于分布统计和留存率计算）
          supabase.from('users').select('id, role, member_level, status, created_at'),
          // 操作日志（用于活跃度统计）
          supabase.from('operation_logs').select('user_id, created_at').gte('created_at', thirtyDaysAgo),
          // 消费趋势（30天）
          supabase.from('expenses').select('amount, date').gte('date', thirtyDaysAgo),
          // 心情趋势（14天）
          supabase.from('mood_diaries').select('mood, date').gte('date', fourteenDaysAgo),
          // 体重分析（30天，使用数据库已有的 bmi 字段）
          supabase.from('weight_records').select('weight, bmi, date').gte('date', thirtyDaysAgo),
          // 笔记活跃度（30天）
          supabase.from('notes').select('created_at').gte('created_at', thirtyDaysAgo),
          // 消费分类
          supabase.from('expenses').select('category, amount'),
          // 小说统计
          supabase.from('novels').select('id, category, read_count, title, author, word_count, collect_count, rating, status'),
          // 章节统计
          supabase.from('novel_chapters').select('id', { count: 'exact', head: true }),
          // user_novels 统计
          supabase.from('user_novels').select('progress, last_read_at, user_id'),
          // 收藏总数
          supabase.from('user_favorites').select('id', { count: 'exact', head: true }),
          // 提醒总数
          supabase.from('user_reminders').select('id', { count: 'exact', head: true }),
          // 习惯总数
          supabase.from('user_habits').select('id', { count: 'exact', head: true }),
          // 体重记录总数
          supabase.from('weight_records').select('id', { count: 'exact', head: true }),
        ])

        // 检查关键查询是否有错误
        const criticalErrors: string[] = []
        if (usersCountRes.error) criticalErrors.push(`用户统计: ${usersCountRes.error.message}`)
        if (totalExpenseRes.error) criticalErrors.push(`消费统计: ${totalExpenseRes.error.message}`)
        if (totalDiariesRes.error) criticalErrors.push(`心情统计: ${totalDiariesRes.error.message}`)
        if (totalNotesRes.error) criticalErrors.push(`笔记统计: ${totalNotesRes.error.message}`)
        if (novelReadCountRes.error) criticalErrors.push(`小说统计: ${novelReadCountRes.error.message}`)
        if (favoritesCountRes.error) criticalErrors.push(`收藏统计: ${favoritesCountRes.error.message}`)
        if (remindersCountRes.error) criticalErrors.push(`提醒统计: ${remindersCountRes.error.message}`)
        if (habitsCountRes.error) criticalErrors.push(`习惯统计: ${habitsCountRes.error.message}`)
        if (weightRecordsCountRes.error) criticalErrors.push(`体重统计: ${weightRecordsCountRes.error.message}`)

        if (criticalErrors.length > 0) {
          const errorMsg = `数据查询失败: ${criticalErrors.join('; ')}`
          setError(errorMsg)
          message.error('部分数据加载失败，请检查网络或数据库连接')
          console.error('Analytics 关键查询错误:', criticalErrors)
        }

        // ==================== 核心指标 ====================
        const totalUsers = usersCountRes.count || 0
        const todayNewUsers = todayNewUsersRes.count || 0
        const activeUserIds = new Set(activeUsersLogsRes.data?.map(l => l.user_id) || [])
        const activeUsers = activeUserIds.size
        const totalExpense = totalExpenseRes.data?.reduce((sum, e) => sum + (e.amount || 0), 0) || 0
        const totalDiaries = totalDiariesRes.count || 0
        const totalNotes = totalNotesRes.count || 0
        const novelReadCount = novelReadCountRes.data?.reduce((sum, n) => sum + (n.read_count || 0), 0) || 0
        const avgExpense = totalUsers > 0 ? parseFloat((totalExpense / totalUsers).toFixed(1)) : 0

        setMetrics({
          totalUsers,
          todayNewUsers,
          activeUsers,
          totalExpense,
          avgExpense,
          totalNotes,
          totalDiaries,
          novelReadCount,
        })

        // ==================== 扩展统计 ====================
        setExtendedStats({
          favoritesCount: favoritesCountRes.count || 0,
          remindersCount: remindersCountRes.count || 0,
          habitsCount: habitsCountRes.count || 0,
          weightRecordsCount: weightRecordsCountRes.count || 0,
        })

        // ==================== 用户增长趋势（30天） ====================
        const usersTrendData = usersTrendRes.data || []
        const trendMap: Record<string, number> = {}
        usersTrendData.forEach(u => {
          const dateKey = dayjs(u.created_at).format('MM-DD')
          trendMap[dateKey] = (trendMap[dateKey] || 0) + 1
        })
        const trendItems: UserTrendItem[] = []
        let cum = 0
        for (let i = 29; i >= 0; i--) {
          const dateKey = now.subtract(i, 'day').format('MM-DD')
          const count = trendMap[dateKey] || 0
          cum += count
          trendItems.push({ date: dateKey, count, cumulative: cum })
        }
        setUserTrend(trendItems)

        // ==================== 用户活跃度（DAU/WAU/MAU） ====================
        const opLogsData = opLogsRes.data || []
        // 按日期统计每日活跃用户
        const dailyActiveMap: Record<string, Set<string>> = {}
        opLogsData.forEach(log => {
          const dateKey = dayjs(log.created_at).format('MM-DD')
          if (!dailyActiveMap[dateKey]) dailyActiveMap[dateKey] = new Set()
          dailyActiveMap[dateKey].add(log.user_id)
        })

        // 计算每周和每月活跃用户
        const weekActiveSet = new Set<string>()
        const monthActiveSet = new Set<string>()
        opLogsData.forEach(log => {
          monthActiveSet.add(log.user_id)
        })
        // 最近7天的活跃用户
        const recentLogsRes = await supabase.from('operation_logs').select('user_id').gte('created_at', sevenDaysAgo)
        ;(recentLogsRes.data || []).forEach(l => weekActiveSet.add(l.user_id))

        const activityItems: UserActivityItem[] = []
        for (let i = 29; i >= 0; i--) {
          const dateKey = now.subtract(i, 'day').format('MM-DD')
          const dau = dailyActiveMap[dateKey]?.size || 0
          activityItems.push({
            date: dateKey,
            DAU: dau,
            WAU: weekActiveSet.size,
            MAU: monthActiveSet.size,
          })
        }
        setUserActivity(activityItems)

        // ==================== 留存率（简化版） ====================
        const allUsersData = allUsersRes.data || []
        // 统计注册后7天内仍有操作的用户比例
        const sevenDayRetentionUsers = allUsersData.filter(u => {
          return opLogsData.some(log => {
            const logDate = dayjs(log.created_at)
            const regDate = dayjs(u.created_at)
            return log.user_id === u.id && logDate.isAfter(regDate) && logDate.isBefore(regDate.add(7, 'day'))
          })
        })
        const sevenDayRate = allUsersData.length > 0 ? parseFloat(((sevenDayRetentionUsers.length / allUsersData.length) * 100).toFixed(1)) : 0

        // 统计次日留存
        const oneDayRetentionUsers = allUsersData.filter(u => {
          return opLogsData.some(log => {
            const logDate = dayjs(log.created_at)
            const regDate = dayjs(u.created_at)
            return log.user_id === u.id && logDate.isAfter(regDate) && logDate.isBefore(regDate.add(1, 'day'))
          })
        })
        const oneDayRate = allUsersData.length > 0 ? parseFloat(((oneDayRetentionUsers.length / allUsersData.length) * 100).toFixed(1)) : 0

        // 3日留存
        const threeDayRetentionUsers = allUsersData.filter(u => {
          return opLogsData.some(log => {
            const logDate = dayjs(log.created_at)
            const regDate = dayjs(u.created_at)
            return log.user_id === u.id && logDate.isAfter(regDate) && logDate.isBefore(regDate.add(3, 'day'))
          })
        })
        const threeDayRate = allUsersData.length > 0 ? parseFloat(((threeDayRetentionUsers.length / allUsersData.length) * 100).toFixed(1)) : 0

        // 30日留存
        const thirtyDayRetentionUsers = allUsersData.filter(u => {
          const regDate = dayjs(u.created_at)
          return regDate.isBefore(now.subtract(30, 'day')) && opLogsData.some(log => {
            const logDate = dayjs(log.created_at)
            return log.user_id === u.id && logDate.isAfter(regDate) && logDate.isBefore(regDate.add(30, 'day'))
          })
        })
        const thirtyDayEligible = allUsersData.filter(u => dayjs(u.created_at).isBefore(now.subtract(30, 'day')))
        const thirtyDayRate = thirtyDayEligible.length > 0 ? parseFloat(((thirtyDayRetentionUsers.length / thirtyDayEligible.length) * 100).toFixed(1)) : 0

        setRetentionRates([
          { period: '次日留存', rate: oneDayRate, userCount: oneDayRetentionUsers.length },
          { period: '3日留存', rate: threeDayRate, userCount: threeDayRetentionUsers.length },
          { period: '7日留存', rate: sevenDayRate, userCount: sevenDayRetentionUsers.length },
          { period: '30日留存', rate: thirtyDayRate, userCount: thirtyDayRetentionUsers.length },
        ])

        // ==================== 消费趋势 ====================
        const expenseTrendData = expenseTrendRes.data || []
        const expenseMap: Record<string, number> = {}
        expenseTrendData.forEach(e => {
          const dateKey = dayjs(e.date).format('MM-DD')
          expenseMap[dateKey] = (expenseMap[dateKey] || 0) + (e.amount || 0)
        })
        const expenseItems: ExpenseTrendItem[] = []
        for (let i = 29; i >= 0; i--) {
          const dateKey = now.subtract(i, 'day').format('MM-DD')
          expenseItems.push({
            date: dateKey,
            amount: parseFloat((expenseMap[dateKey] || 0).toFixed(2)),
          })
        }
        setExpenseTrend(expenseItems)

        // ==================== 心情分布趋势 ====================
        const moodTrendData = moodTrendRes.data || []
        const moodDateMap: Record<string, Record<string, number>> = {}
        moodTrendData.forEach(m => {
          const dateKey = dayjs(m.date).format('MM-DD')
          if (!moodDateMap[dateKey]) moodDateMap[dateKey] = { '开心': 0, '平静': 0, '一般': 0, '难过': 0, '焦虑': 0 }
          const moodEntry = moodDateMap[dateKey]!
          const moodKey = m.mood as keyof typeof moodEntry
          if (moodEntry[moodKey] !== undefined) {
            ;(moodEntry[moodKey] as number)++
          }
        })
        const moodItems: MoodTrendItem[] = []
        for (let i = 13; i >= 0; i--) {
          const dateKey = now.subtract(i, 'day').format('MM-DD')
          const moodData = moodDateMap[dateKey] || { '开心': 0, '平静': 0, '一般': 0, '难过': 0, '焦虑': 0 }
          moodItems.push({ date: dateKey, '开心': moodData['开心'] || 0, '平静': moodData['平静'] || 0, '一般': moodData['一般'] || 0, '难过': moodData['难过'] || 0, '焦虑': moodData['焦虑'] || 0 })
        }
        setMoodTrend(moodItems)

        // ==================== 体重趋势分析 ====================
        // weight_records 表已有 bmi 字段，直接使用
        const weightData = weightAnalyticsRes.data || []
        const weightDateMap: Record<string, { weights: number[]; bmis: number[] }> = {}
        weightData.forEach(w => {
          const dateKey = dayjs(w.date).format('MM-DD')
          if (!weightDateMap[dateKey]) weightDateMap[dateKey] = { weights: [], bmis: [] }
          weightDateMap[dateKey].weights.push(w.weight)
          // 直接使用数据库中的 bmi 值
          if (w.bmi) {
            weightDateMap[dateKey].bmis.push(w.bmi)
          }
        })
        const weightItems: WeightAnalyticsItem[] = []
        for (let i = 29; i >= 0; i--) {
          const dateKey = now.subtract(i, 'day').format('MM-DD')
          const data = weightDateMap[dateKey]
          if (data && data.weights.length > 0) {
            const avgWeight = parseFloat((data.weights.reduce((a, b) => a + b, 0) / data.weights.length).toFixed(1))
            const avgBMI = data.bmis.length > 0
              ? parseFloat((data.bmis.reduce((a, b) => a + b, 0) / data.bmis.length).toFixed(1))
              : 0
            weightItems.push({ date: dateKey, avgWeight, avgBMI })
          } else {
            weightItems.push({ date: dateKey, avgWeight: 0, avgBMI: 0 })
          }
        }
        setWeightAnalytics(weightItems)

        // ==================== 笔记活跃度 ====================
        const noteData = noteActivityRes.data || []
        const noteDateMap: Record<string, number> = {}
        noteData.forEach(n => {
          const dateKey = dayjs(n.created_at).format('MM-DD')
          noteDateMap[dateKey] = (noteDateMap[dateKey] || 0) + 1
        })
        const noteItems: NoteActivityItem[] = []
        for (let i = 29; i >= 0; i--) {
          const dateKey = now.subtract(i, 'day').format('MM-DD')
          noteItems.push({ date: dateKey, count: noteDateMap[dateKey] || 0 })
        }
        setNoteActivity(noteItems)

        // ==================== 用户分布 ====================
        // 角色分布
        const roleMap: Record<string, number> = {}
        const roleColors: Record<string, string> = { 'user': '#1890ff', 'admin': '#36cfc9', 'super_admin': '#9254de' }
        const roleLabels: Record<string, string> = { 'user': '普通用户', 'admin': '管理员', 'super_admin': '超级管理员' }
        allUsersData.forEach(u => { roleMap[u.role] = (roleMap[u.role] || 0) + 1 })
        setUserByRole(
          Object.entries(roleMap).map(([role, count]) => ({
            name: roleLabels[role] || role,
            value: count,
            color: roleColors[role] || '#999',
          }))
        )

        // 会员等级分布
        const memberMap: Record<string, number> = {}
        const memberColors: Record<string, string> = { 'normal': '#1890ff', 'member': '#597ef7', 'super_member': '#f759ab' }
        const memberLabels: Record<string, string> = { 'normal': '普通会员', 'member': '会员', 'super_member': '超级会员' }
        allUsersData.forEach(u => { memberMap[u.member_level] = (memberMap[u.member_level] || 0) + 1 })
        setUserByMemberLevel(
          Object.entries(memberMap).map(([level, count]) => ({
            name: memberLabels[level] || level,
            value: count,
            color: memberColors[level] || '#999',
          }))
        )

        // 用户状态分布
        const statusMap: Record<string, number> = {}
        const statusColors: Record<string, string> = { 'active': '#52c41a', 'abnormal': '#faad14', 'disabled': '#d9d9d9', 'banned': '#ff4d4f' }
        const statusLabels: Record<string, string> = { 'active': '正常', 'abnormal': '异常', 'disabled': '禁用', 'banned': '封禁' }
        allUsersData.forEach(u => { statusMap[u.status] = (statusMap[u.status] || 0) + 1 })
        setUserByStatus(
          Object.entries(statusMap).map(([status, count]) => ({
            name: statusLabels[status] || status,
            value: count,
            color: statusColors[status] || '#999',
          }))
        )

        // ==================== 消费分类占比 ====================
        const expCategoryData = expenseCategoryRes.data || []
        const expCategoryMap: Record<string, number> = {}
        expCategoryData.forEach(e => {
          expCategoryMap[e.category] = (expCategoryMap[e.category] || 0) + (e.amount || 0)
        })
        const expCategoryColors: Record<string, string> = {
          '餐饮': '#6C63FF', '交通': '#FF6B6B', '购物': '#4ECDC4', '娱乐': '#45B7D1', '其他': '#96CEB4',
        }
        const expCategoryItems: ExpenseCategoryItem[] = expenseCategoryOptions.map(opt => ({
          name: opt.label,
          value: parseFloat((expCategoryMap[opt.value] || 0).toFixed(2)),
          color: expCategoryColors[opt.value] || '#999',
        })).filter(item => item.value > 0)
        setExpenseByCategory(expCategoryItems)

        // ==================== 小说阅读统计 ====================
        const novelsData = novelStatsRes.data || []
        const totalNovels = novelsData.length
        const totalChapters = chapterCountRes.count || 0
        const totalReadCount = novelsData.reduce((sum, n) => sum + (n.read_count || 0), 0)
        const totalWordCount = novelsData.reduce((sum, n) => sum + (n.word_count || 0), 0)
        const totalCollectCount = novelsData.reduce((sum, n) => sum + (n.collect_count || 0), 0)
        const avgRating = novelsData.length > 0
          ? parseFloat((novelsData.reduce((sum, n) => sum + (n.rating || 0), 0) / novelsData.length).toFixed(1))
          : 0

        // 小说分类分布
        const novelCategoryMap: Record<string, number> = {}
        const novelCategoryColors: Record<string, string> = {
          '玄幻': '#ff6b6b', '仙侠': '#4ecdc4', '都市': '#45b7d1', '历史': '#f9ca24',
          '武侠': '#6c5ce7', '科幻': '#a29bfe', '游戏': '#fd79a8', '悬疑': '#636e72',
          '灵异': '#2d3436', '言情': '#e17055', '其他': '#b2bec3',
        }
        novelsData.forEach(n => {
          const category = n.category || '其他'
          novelCategoryMap[category] = (novelCategoryMap[category] || 0) + 1
        })
        const categoryDistribution = Object.entries(novelCategoryMap).map(([name, value]) => ({
          name,
          value,
          color: novelCategoryColors[name] || '#999',
        }))

        // 小说状态分布
        const novelStatusMap: Record<string, number> = {}
        const novelStatusColors: Record<string, string> = { 'ongoing': '#1890ff', 'completed': '#52c41a' }
        const novelStatusLabels: Record<string, string> = { 'ongoing': '连载中', 'completed': '已完结' }
        novelsData.forEach(n => {
          const status = n.status || 'ongoing'
          novelStatusMap[status] = (novelStatusMap[status] || 0) + 1
        })
        const statusDistribution = Object.entries(novelStatusMap).map(([status, value]) => ({
          name: novelStatusLabels[status] || status,
          value,
          color: novelStatusColors[status] || '#999',
        }))

        // 热门小说 Top 10
        const topNovels = novelsData
          .sort((a, b) => (b.read_count || 0) - (a.read_count || 0))
          .slice(0, 10)
          .map(n => ({
            title: n.title,
            readCount: n.read_count || 0,
            author: n.author || '未知',
          }))

        setNovelStats({
          totalNovels,
          totalChapters,
          totalReadCount,
          totalWordCount,
          totalCollectCount,
          avgRating,
          categoryDistribution,
          statusDistribution,
          topNovels,
        })

        // ==================== user_novels 表统计 ====================
        const userNovelsData = userNovelsRes.data || []
        const totalUserNovelRecords = userNovelsData.length
        const avgProgress = totalUserNovelRecords > 0
          ? parseFloat((userNovelsData.reduce((sum, n) => sum + (n.progress || 0), 0) / totalUserNovelRecords * 100).toFixed(1))
          : 0
        // 去重计算活跃读者数（最近7天有阅读记录的用户）
        const activeReaderSet = new Set(
          userNovelsData
            .filter(n => n.last_read_at && dayjs(n.last_read_at).isAfter(dayjs().subtract(7, 'day')))
            .map(n => n.user_id)
        )
        setUserNovelStats({
          totalRecords: totalUserNovelRecords,
          avgProgress,
          activeReaders: activeReaderSet.size,
        })

      } catch (err) {
        console.error('Analytics 数据加载失败:', err)
        const errorMessage = err instanceof Error ? err.message : '未知错误'
        setError(`数据加载异常: ${errorMessage}`)
        message.error('数据分析加载失败，请稍后重试')
      } finally {
        setLoading(false)
      }
    }

    fetchAnalyticsData()
  }, [])

  if (!isAdmin) {
    return (
      <div style={{ textAlign: 'center', padding: 100 }}>
        <Empty description="无权限访问此页面" />
      </div>
    )
  }

  if (loading || !metrics) {
    return (
      <div style={{ textAlign: 'center', padding: 100 }}>
        <Spin size="large" tip="加载分析数据..." />
      </div>
    )
  }

  // 错误提示
  const errorAlert = error ? (
    <Alert
      type="error"
      message="数据加载异常"
      description={error}
      showIcon
      closable
      onClose={() => setError(null)}
      style={{ marginBottom: 16 }}
    />
  ) : null

  // ==================== 关键指标卡片 ====================
  const metricCards = [
    { title: '总用户数', value: metrics.totalUsers, icon: <UserOutlined />, color: '#1890ff' },
    { title: '今日新增', value: metrics.todayNewUsers, icon: <UserAddOutlined />, color: '#36cfc9' },
    { title: '活跃用户', value: metrics.activeUsers, icon: <FireOutlined />, color: '#597ef7' },
    { title: '总消费额', value: metrics.totalExpense, icon: <WalletOutlined />, color: '#f759ab', precision: 1, prefix: '\u00A5' },
    { title: '平均消费', value: metrics.avgExpense, icon: <DollarOutlined />, color: '#fa8c16', precision: 1, prefix: '\u00A5' },
    { title: '总笔记数', value: metrics.totalNotes, icon: <BookOutlined />, color: '#9254de' },
    { title: '总日记数', value: metrics.totalDiaries, icon: <SmileOutlined />, color: '#52c41a' },
    { title: '小说阅读量', value: metrics.novelReadCount, icon: <ReadOutlined />, color: '#ff7a45' },
  ]

  // ==================== 小说统计指标卡片 ====================
  const novelMetricCards = [
    { title: '小说总数', value: novelStats.totalNovels, icon: <BookOutlined />, color: '#1890ff' },
    { title: '章节总数', value: novelStats.totalChapters, icon: <ReadOutlined />, color: '#36cfc9' },
    { title: '总阅读量', value: novelStats.totalReadCount, icon: <FireOutlined />, color: '#ff7a45' },
    { title: '总字数', value: novelStats.totalWordCount, icon: <BookOutlined />, color: '#9254de' },
    { title: '收藏总量', value: novelStats.totalCollectCount, icon: <StarOutlined />, color: '#faad14' },
    { title: '平均评分', value: novelStats.avgRating, icon: <StarOutlined />, color: '#f759ab', suffix: ' 分' },
    { title: '平均每本阅读', value: novelStats.totalNovels > 0 ? Math.round(novelStats.totalReadCount / novelStats.totalNovels) : 0, icon: <DollarOutlined />, color: '#597ef7' },
  ]

  // ==================== 留存率表格列 ====================
  const retentionColumns = [
    { title: '留存周期', dataIndex: 'period', key: 'period' },
    {
      title: '留存率',
      dataIndex: 'rate',
      key: 'rate',
      render: (rate: number) => (
        <span style={{ color: rate >= 50 ? '#52c41a' : rate >= 30 ? '#faad14' : '#ff4d4f', fontWeight: 600 }}>
          {rate}%
        </span>
      ),
    },
    {
      title: '用户数',
      dataIndex: 'userCount',
      key: 'userCount',
      render: (count: number) => count.toLocaleString(),
    },
    {
      title: '留存比例',
      key: 'bar',
      render: (_: unknown, record: RetentionRate) => (
        <div style={{ width: '100%', maxWidth: 200 }}>
          <div
            style={{
              height: 8,
              borderRadius: 4,
              background: '#f0f0f0',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${record.rate}%`,
                borderRadius: 4,
                background: record.rate >= 50 ? '#52c41a' : record.rate >= 30 ? '#faad14' : '#ff4d4f',
                transition: 'width 0.3s',
              }}
            />
          </div>
        </div>
      ),
    },
  ]

  // ==================== Tooltip 样式 ====================
  const tooltipStyle = {
    borderRadius: 8,
    boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
  }

  // ==================== 渲染饼图 ====================
  const renderPieChart = (data: { name: string; value: number; color: string }[], title: string) => (
    <Card title={title} style={{ borderRadius: 8, height: '100%' }}>
      <ResponsiveContainer width="100%" height={280}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={50}
            outerRadius={90}
            paddingAngle={3}
            dataKey="value"
            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
            labelLine={{ stroke: '#999' }}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip contentStyle={tooltipStyle} />
        </PieChart>
      </ResponsiveContainer>
    </Card>
  )

  return (
    <div>
      {/* 日期范围筛选 */}
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0 }}>数据分析总览</h3>
        <RangePicker
          value={dateRange as [Dayjs, Dayjs]}
          onChange={(dates) => setDateRange(dates as [Dayjs | null, Dayjs | null])}
          allowClear={false}
          presets={[
            { label: '最近7天', value: [dayjs().subtract(7, 'day'), dayjs()] },
            { label: '最近30天', value: [dayjs().subtract(30, 'day'), dayjs()] },
            { label: '最近90天', value: [dayjs().subtract(90, 'day'), dayjs()] },
          ]}
        />
      </div>

      {/* 错误提示 */}
      {errorAlert}

      {/* 关键指标卡片 */}
      <Row gutter={[16, 16]}>
        {metricCards.map((card, index) => (
          <Col xs={12} sm={8} md={6} lg={3} key={index}>
            <Card hoverable style={{ borderRadius: 8 }} bodyStyle={{ padding: '16px 20px' }}>
              <Statistic
                title={<span style={{ fontSize: 13, color: '#8c8c8c' }}>{card.title}</span>}
                value={card.value}
                precision={card.precision}
                prefix={
                  <span style={{ color: card.color, marginRight: 6, fontSize: 16 }}>{card.icon}</span>
                }
                suffix={card.prefix}
                valueStyle={{ color: card.color, fontWeight: 600, fontSize: 20 }}
              />
            </Card>
          </Col>
        ))}
      </Row>

      {/* 扩展统计卡片 */}
      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={12} sm={6}>
          <Card hoverable style={{ borderRadius: 8 }} bodyStyle={{ padding: '16px 20px' }}>
            <Statistic
              title={<span style={{ fontSize: 13, color: '#8c8c8c' }}>收藏总数</span>}
              value={extendedStats.favoritesCount}
              prefix={<StarOutlined style={{ color: '#faad14', marginRight: 6, fontSize: 16 }} />}
              valueStyle={{ color: '#faad14', fontWeight: 600, fontSize: 20 }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card hoverable style={{ borderRadius: 8 }} bodyStyle={{ padding: '16px 20px' }}>
            <Statistic
              title={<span style={{ fontSize: 13, color: '#8c8c8c' }}>提醒总数</span>}
              value={extendedStats.remindersCount}
              prefix={<ClockCircleOutlined style={{ color: '#597ef7', marginRight: 6, fontSize: 16 }} />}
              valueStyle={{ color: '#597ef7', fontWeight: 600, fontSize: 20 }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card hoverable style={{ borderRadius: 8 }} bodyStyle={{ padding: '16px 20px' }}>
            <Statistic
              title={<span style={{ fontSize: 13, color: '#8c8c8c' }}>习惯总数</span>}
              value={extendedStats.habitsCount}
              prefix={<HeartOutlined style={{ color: '#f759ab', marginRight: 6, fontSize: 16 }} />}
              valueStyle={{ color: '#f759ab', fontWeight: 600, fontSize: 20 }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card hoverable style={{ borderRadius: 8 }} bodyStyle={{ padding: '16px 20px' }}>
            <Statistic
              title={<span style={{ fontSize: 13, color: '#8c8c8c' }}>体重记录总数</span>}
              value={extendedStats.weightRecordsCount}
              prefix={<SmileOutlined style={{ color: '#52c41a', marginRight: 6, fontSize: 16 }} />}
              valueStyle={{ color: '#52c41a', fontWeight: 600, fontSize: 20 }}
            />
          </Card>
        </Col>
      </Row>

      {/* 用户行为分析 */}
      <Tabs
        defaultActiveKey="user"
        items={[
          {
            key: 'user',
            label: '用户行为分析',
            children: (
              <div>
                {/* 用户增长趋势 */}
                <Card title="用户增长趋势" extra={<Tag color="blue">最近30天</Tag>} style={{ borderRadius: 8, marginTop: 16 }}>
                  <ResponsiveContainer width="100%" height={320}>
                    <LineChart data={userTrend} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                      <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
                      <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Legend />
                      <Line yAxisId="left" type="monotone" dataKey="count" name="每日新增" stroke="#1890ff" strokeWidth={2} dot={{ r: 3 }} />
                      <Line yAxisId="right" type="monotone" dataKey="cumulative" name="累计用户" stroke="#36cfc9" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </Card>

                {/* 用户活跃度 + 用户留存率 */}
                <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
                  <Col xs={24} lg={14}>
                    <Card title="用户活跃度" extra={<Tag color="cyan">DAU/WAU/MAU</Tag>} style={{ borderRadius: 8 }}>
                      <ResponsiveContainer width="100%" height={320}>
                        <BarChart data={userActivity} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                          <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                          <YAxis tick={{ fontSize: 12 }} />
                          <Tooltip contentStyle={tooltipStyle} />
                          <Legend />
                          <Bar dataKey="DAU" name="日活(DAU)" fill="#1890ff" radius={[2, 2, 0, 0]} barSize={8} />
                          <Bar dataKey="WAU" name="周活(WAU)" fill="#36cfc9" radius={[2, 2, 0, 0]} barSize={8} />
                          <Bar dataKey="MAU" name="月活(MAU)" fill="#597ef7" radius={[2, 2, 0, 0]} barSize={8} />
                        </BarChart>
                      </ResponsiveContainer>
                    </Card>
                  </Col>
                  <Col xs={24} lg={10}>
                    <Card title="用户留存率" style={{ borderRadius: 8 }}>
                      <Table
                        dataSource={retentionRates}
                        columns={retentionColumns}
                        pagination={false}
                        size="small"
                        rowKey="period"
                      />
                    </Card>
                  </Col>
                </Row>

                {/* 用户分布饼图 */}
                <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
                  <Col xs={24} md={8}>
                    {renderPieChart(userByRole, '用户角色分布')}
                  </Col>
                  <Col xs={24} md={8}>
                    {renderPieChart(userByMemberLevel, '会员等级分布')}
                  </Col>
                  <Col xs={24} md={8}>
                    {renderPieChart(userByStatus, '用户状态分布')}
                  </Col>
                </Row>
              </div>
            ),
          },
          {
            key: 'data',
            label: '数据趋势图表',
            children: (
              <div>
                {/* 消费趋势 */}
                <Card title="消费趋势" extra={<Tag color="orange">每日消费金额</Tag>} style={{ borderRadius: 8, marginTop: 16 }}>
                  <ResponsiveContainer width="100%" height={320}>
                    <AreaChart data={expenseTrend} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="expenseGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#f759ab" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#f759ab" stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip
                        contentStyle={tooltipStyle}
                        formatter={(value: number) => [`\u00A5${value.toLocaleString()}`, '消费金额']}
                      />
                      <Area
                        type="monotone"
                        dataKey="amount"
                        name="消费金额"
                        stroke="#f759ab"
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#expenseGradient)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </Card>

                {/* 消费分类占比 + 心情分布 */}
                <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
                  <Col xs={24} lg={12}>
                    <Card title="消费分类占比" extra={<Tag color="purple">环形图</Tag>} style={{ borderRadius: 8 }}>
                      <ResponsiveContainer width="100%" height={320}>
                        <PieChart>
                          <Pie
                            data={expenseByCategory}
                            cx="50%"
                            cy="50%"
                            innerRadius={65}
                            outerRadius={100}
                            paddingAngle={3}
                            dataKey="value"
                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                            labelLine={{ stroke: '#999' }}
                          >
                            {expenseByCategory.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={tooltipStyle}
                            formatter={(value: number) => [`\u00A5${value.toLocaleString()}`, '']}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </Card>
                  </Col>
                  <Col xs={24} lg={12}>
                    <Card title="心情分布趋势" extra={<Tag color="green">最近14天</Tag>} style={{ borderRadius: 8 }}>
                      <ResponsiveContainer width="100%" height={320}>
                        <BarChart data={moodTrend} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                          <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                          <YAxis tick={{ fontSize: 12 }} />
                          <Tooltip contentStyle={tooltipStyle} />
                          <Legend />
                          <Bar dataKey="开心" stackId="mood" fill="#52c41a" />
                          <Bar dataKey="平静" stackId="mood" fill="#1890ff" />
                          <Bar dataKey="一般" stackId="mood" fill="#faad14" />
                          <Bar dataKey="难过" stackId="mood" fill="#ff4d4f" />
                          <Bar dataKey="焦虑" stackId="mood" fill="#722ed1" />
                        </BarChart>
                      </ResponsiveContainer>
                    </Card>
                  </Col>
                </Row>

                {/* 体重趋势 + 笔记活跃度 */}
                <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
                  <Col xs={24} lg={12}>
                    <Card title="体重趋势" extra={<Tag color="cyan">平均体重 + 平均BMI</Tag>} style={{ borderRadius: 8 }}>
                      <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={weightAnalytics} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                          <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                          <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
                          <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} />
                          <Tooltip contentStyle={tooltipStyle} />
                          <Legend />
                          <Line yAxisId="left" type="monotone" dataKey="avgWeight" name="平均体重(kg)" stroke="#1890ff" strokeWidth={2} dot={{ r: 3 }} />
                          <Line yAxisId="right" type="monotone" dataKey="avgBMI" name="平均BMI" stroke="#f759ab" strokeWidth={2} strokeDasharray="5 5" dot={{ r: 2 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </Card>
                  </Col>
                  <Col xs={24} lg={12}>
                    <Card title="笔记活跃度" extra={<Tag color="geekblue">每日新增笔记</Tag>} style={{ borderRadius: 8 }}>
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={noteActivity} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                          <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                          <YAxis tick={{ fontSize: 12 }} />
                          <Tooltip contentStyle={tooltipStyle} />
                          <Bar dataKey="count" name="新增笔记数" fill="#597ef7" radius={[4, 4, 0, 0]} barSize={16} />
                        </BarChart>
                      </ResponsiveContainer>
                    </Card>
                  </Col>
                </Row>
              </div>
            ),
          },
          {
            key: 'novel',
            label: '小说阅读分析',
            children: (
              <div>
                {/* 小说统计指标卡片 */}
                <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
                  {novelMetricCards.map((card, index) => (
                    <Col xs={12} sm={6} key={index}>
                      <Card hoverable style={{ borderRadius: 8 }} bodyStyle={{ padding: '16px 20px' }}>
                        <Statistic
                          title={<span style={{ fontSize: 13, color: '#8c8c8c' }}>{card.title}</span>}
                          value={card.value}
                          prefix={
                            <span style={{ color: card.color, marginRight: 6, fontSize: 16 }}>{card.icon}</span>
                          }
                          suffix={card.suffix}
                          valueStyle={{ color: card.color, fontWeight: 600, fontSize: 20 }}
                        />
                      </Card>
                    </Col>
                  ))}
                </Row>

                {/* user_novels 统计卡片 */}
                <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
                  <Col xs={12} sm={6}>
                    <Card hoverable style={{ borderRadius: 8 }} bodyStyle={{ padding: '16px 20px' }}>
                      <Statistic
                        title={<span style={{ fontSize: 13, color: '#8c8c8c' }}>书架总记录数</span>}
                        value={userNovelStats.totalRecords}
                        prefix={<span style={{ color: '#1890ff', marginRight: 6, fontSize: 16 }}><BookOutlined /></span>}
                        valueStyle={{ color: '#1890ff', fontWeight: 600, fontSize: 20 }}
                      />
                    </Card>
                  </Col>
                  <Col xs={12} sm={6}>
                    <Card hoverable style={{ borderRadius: 8 }} bodyStyle={{ padding: '16px 20px' }}>
                      <Statistic
                        title={<span style={{ fontSize: 13, color: '#8c8c8c' }}>平均阅读进度</span>}
                        value={userNovelStats.avgProgress}
                        prefix={<span style={{ color: '#36cfc9', marginRight: 6, fontSize: 16 }}><ReadOutlined /></span>}
                        suffix="%"
                        valueStyle={{ color: '#36cfc9', fontWeight: 600, fontSize: 20 }}
                      />
                    </Card>
                  </Col>
                  <Col xs={12} sm={6}>
                    <Card hoverable style={{ borderRadius: 8 }} bodyStyle={{ padding: '16px 20px' }}>
                      <Statistic
                        title={<span style={{ fontSize: 13, color: '#8c8c8c' }}>活跃读者数</span>}
                        value={userNovelStats.activeReaders}
                        prefix={<span style={{ color: '#ff7a45', marginRight: 6, fontSize: 16 }}><FireOutlined /></span>}
                        suffix="人"
                        valueStyle={{ color: '#ff7a45', fontWeight: 600, fontSize: 20 }}
                      />
                    </Card>
                  </Col>
                </Row>

                {/* 小说分类分布 + 状态分布 */}
                <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
                  <Col xs={24} lg={8}>
                    <Card title="小说分类分布" extra={<Tag color="purple">按分类统计</Tag>} style={{ borderRadius: 8 }}>
                      <ResponsiveContainer width="100%" height={320}>
                        <PieChart>
                          <Pie
                            data={novelStats.categoryDistribution}
                            cx="50%"
                            cy="50%"
                            innerRadius={55}
                            outerRadius={85}
                            paddingAngle={3}
                            dataKey="value"
                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                            labelLine={{ stroke: '#999' }}
                          >
                            {novelStats.categoryDistribution.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip contentStyle={tooltipStyle} />
                        </PieChart>
                      </ResponsiveContainer>
                    </Card>
                  </Col>
                  <Col xs={24} lg={8}>
                    {renderPieChart(novelStats.statusDistribution, '小说状态分布')}
                  </Col>
                  <Col xs={24} lg={8}>
                    <Card title="热门小说 Top 10" extra={<Tag color="orange">按阅读量排序</Tag>} style={{ borderRadius: 8 }}>
                      <Table
                        dataSource={novelStats.topNovels}
                        pagination={false}
                        size="small"
                        rowKey="title"
                        columns={[
                          { title: '排名', key: 'rank', width: 60, render: (_, __, index) => <Tag color={index < 3 ? 'gold' : 'default'}>{index + 1}</Tag> },
                          { title: '书名', dataIndex: 'title', ellipsis: true },
                          { title: '作者', dataIndex: 'author', width: 100 },
                          { title: '阅读量', dataIndex: 'readCount', width: 100, render: (v) => v.toLocaleString() },
                        ]}
                      />
                    </Card>
                  </Col>
                </Row>
              </div>
            ),
          },
        ]}
      />
    </div>
  )
}

export default Analytics
