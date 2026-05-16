import React, { useEffect, useState } from 'react'
import { Row, Col, Card, Statistic, Spin, Timeline, Tag } from 'antd'
import {
  UserOutlined,
  UserAddOutlined,
  WalletOutlined,
  FireOutlined,
  SmileOutlined,
  BookOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  LineChartOutlined,
} from '@ant-design/icons'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend,
  LineChart,
  Line,
} from 'recharts'
import dayjs from 'dayjs'
import { supabase } from '../utils/supabase'
import type {
  DashboardStats,
  UserTrendItem,
  ExpenseCategoryItem,
  MoodDistributionItem,
  RecentActivity,
  WeightTrendItem,
} from '../utils/mockData'
import { EXPENSE_CATEGORY_OPTIONS, MOOD_OPTIONS } from '../utils/mockData'

// ==================== 统计卡片配置 ====================
interface StatCardConfig {
  title: string
  value: number
  prefix: React.ReactNode
  color: string
  trend: number
  suffix?: string
  precision?: number
}

const Dashboard: React.FC = () => {
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [userTrend, setUserTrend] = useState<UserTrendItem[]>([])
  const [expenseByCategory, setExpenseByCategory] = useState<ExpenseCategoryItem[]>([])
  const [moodDistribution, setMoodDistribution] = useState<MoodDistributionItem[]>([])
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([])
  const [weightTrend, setWeightTrend] = useState<WeightTrendItem[]>([])

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        // 并行发起多个查询
        const now = dayjs()
        const monthStart = now.startOf('month').format('YYYY-MM-DD')
        const todayStart = now.startOf('day').format('YYYY-MM-DD')
        const thirtyDaysAgo = now.subtract(29, 'day').startOf('day').format('YYYY-MM-DD')
        const fourteenDaysAgo = now.subtract(13, 'day').startOf('day').format('YYYY-MM-DD')

        const [
          usersCountRes,
          monthExpenseRes,
          monthDiaryRes,
          ,
          todayNewUsersRes,
          monthExpensePrevRes,
          monthDiaryPrevRes,
          usersLastWeekRes,
          usersThisWeekRes,
          usersTrendRes,
          expenseCategoryRes,
          moodDistRes,
          recentExpensesRes,
          recentMoodsRes,
          recentWeightsRes,
          recentNotesRes,
          recentUsersRes,
          weightTrendRes,
        ] = await Promise.all([
          // 总用户数
          supabase.from('users').select('*', { count: 'exact', head: true }),
          // 本月消费总额
          supabase.from('expenses').select('amount').gte('date', monthStart),
          // 本月日记数
          supabase.from('mood_diaries').select('id', { count: 'exact', head: true }).gte('date', monthStart),
          // 最新体重
          supabase.from('weight_records').select('weight').order('date', { ascending: false }).limit(1),
          // 今日新增用户
          supabase.from('users').select('id', { count: 'exact', head: true }).gte('created_at', todayStart),
          // 上月消费总额（用于趋势计算）
          supabase.from('expenses').select('amount').gte('date', now.subtract(1, 'month').startOf('month').format('YYYY-MM-DD')).lt('date', monthStart),
          // 上月日记数
          supabase.from('mood_diaries').select('id', { count: 'exact', head: true }).gte('date', now.subtract(1, 'month').startOf('month').format('YYYY-MM-DD')).lt('date', monthStart),
          // 上周新增用户
          supabase.from('users').select('id', { count: 'exact', head: true }).gte('created_at', now.subtract(14, 'day').startOf('day').format('YYYY-MM-DD')).lt('created_at', now.subtract(7, 'day').startOf('day').format('YYYY-MM-DD')),
          // 本周新增用户
          supabase.from('users').select('id', { count: 'exact', head: true }).gte('created_at', now.subtract(7, 'day').startOf('day').format('YYYY-MM-DD')),
          // 用户增长趋势（30天）
          supabase.from('users').select('created_at').gte('created_at', thirtyDaysAgo),
          // 消费分类
          supabase.from('expenses').select('category, amount'),
          // 心情分布
          supabase.from('mood_diaries').select('mood'),
          // 最近消费
          supabase.from('expenses').select('id, user_id, category, amount, note, created_at').order('created_at', { ascending: false }).limit(5),
          // 最近心情日记
          supabase.from('mood_diaries').select('id, user_id, mood, content, created_at').order('created_at', { ascending: false }).limit(5),
          // 最近体重
          supabase.from('weight_records').select('id, user_id, weight, created_at').order('created_at', { ascending: false }).limit(5),
          // 最近笔记
          supabase.from('notes').select('id, user_id, title, created_at').order('created_at', { ascending: false }).limit(5),
          // 最近注册用户
          supabase.from('users').select('id, nickname, created_at').order('created_at', { ascending: false }).limit(5),
          // 体重趋势（14天）
          supabase.from('weight_records').select('weight, body_fat, date').gte('date', fourteenDaysAgo).order('date', { ascending: true }),
        ])

        // ==================== 统计卡片 ====================
        const totalUsers = usersCountRes.count || 0
        const monthExpense = monthExpenseRes.data?.reduce((sum, e) => sum + (e.amount || 0), 0) || 0
        const monthDiaryCount = monthDiaryRes.count || 0
        const todayNewUsers = todayNewUsersRes.count || 0
        const prevMonthExpense = monthExpensePrevRes.data?.reduce((sum, e) => sum + (e.amount || 0), 0) || 0
        const prevMonthDiary = monthDiaryPrevRes.count || 0
        const lastWeekNewUsers = usersLastWeekRes.count || 0
        const thisWeekNewUsers = usersThisWeekRes.count || 0

        // 计算趋势百分比
        const expenseTrend = prevMonthExpense > 0 ? parseFloat((((monthExpense - prevMonthExpense) / prevMonthExpense) * 100).toFixed(1)) : 0
        const moodTrend = prevMonthDiary > 0 ? parseFloat((((monthDiaryCount - prevMonthDiary) / prevMonthDiary) * 100).toFixed(1)) : 0
        const newUserTrend = lastWeekNewUsers > 0 ? parseFloat((((todayNewUsers * 7 - thisWeekNewUsers) / lastWeekNewUsers) * 100).toFixed(1)) : 0

        // 活跃用户数：最近7天有操作的用户（简化：最近7天有消费/日记/体重/笔记记录的用户）
        const activeUsersRes = await supabase
          .from('operation_logs')
          .select('user_id')
          .gte('created_at', now.subtract(7, 'day').format('YYYY-MM-DD'))
        const activeUserIds = new Set(activeUsersRes.data?.map(l => l.user_id) || [])
        const activeUsers = activeUserIds.size

        const lastWeekActiveRes = await supabase
          .from('operation_logs')
          .select('user_id')
          .gte('created_at', now.subtract(14, 'day').format('YYYY-MM-DD'))
          .lt('created_at', now.subtract(7, 'day').format('YYYY-MM-DD'))
        const lastWeekActiveIds = new Set(lastWeekActiveRes.data?.map(l => l.user_id) || [])
        const lastWeekActive = lastWeekActiveIds.size
        const activeTrend = lastWeekActive > 0 ? parseFloat((((activeUsers - lastWeekActive) / lastWeekActive) * 100).toFixed(1)) : 0

        // 笔记数
        const notesCountRes = await supabase.from('notes').select('id', { count: 'exact', head: true })
        const noteCount = notesCountRes.count || 0

        // 用户趋势
        const userTrendPercent = lastWeekNewUsers > 0 ? parseFloat((((thisWeekNewUsers - lastWeekNewUsers) / lastWeekNewUsers) * 100).toFixed(1)) : 0
        const noteTrend = 0 // 简化

        setStats({
          totalUsers,
          todayNewUsers,
          totalExpense: monthExpense,
          activeUsers,
          moodDiaryCount: monthDiaryCount,
          noteCount,
          userTrendPercent,
          expenseTrendPercent: expenseTrend,
          activeTrendPercent: activeTrend,
          moodTrendPercent: moodTrend,
          noteTrendPercent: noteTrend,
          newUserTrendPercent: newUserTrend,
        })

        // ==================== 用户增长趋势（30天） ====================
        const usersTrendData = usersTrendRes.data || []
        const trendMap: Record<string, number> = {}
        usersTrendData.forEach(u => {
          const dateKey = dayjs(u.created_at).format('MM-DD')
          trendMap[dateKey] = (trendMap[dateKey] || 0) + 1
        })
        const trendItems: UserTrendItem[] = []
        let cumulative = totalUsers
        for (let i = 29; i >= 0; i--) {
          const dateKey = now.subtract(i, 'day').format('MM-DD')
          const count = trendMap[dateKey] || 0
          cumulative = cumulative - count
          trendItems.push({ date: dateKey, count, cumulative: Math.max(cumulative, 0) })
        }
        // 重新计算累计（从前往后累加）
        let cum = 0
        for (let i = 0; i < trendItems.length; i++) {
          cum += trendItems[i]!.count
          trendItems[i]!.cumulative = cum
        }
        setUserTrend(trendItems)

        // ==================== 消费分类饼图 ====================
        const expenseData = expenseCategoryRes.data || []
        const categoryMap: Record<string, number> = {}
        expenseData.forEach(e => {
          categoryMap[e.category] = (categoryMap[e.category] || 0) + (e.amount || 0)
        })
        const categoryColors: Record<string, string> = {
          '餐饮': '#6C63FF',
          '交通': '#FF6B6B',
          '购物': '#4ECDC4',
          '娱乐': '#45B7D1',
          '其他': '#96CEB4',
        }
        const categoryItems: ExpenseCategoryItem[] = EXPENSE_CATEGORY_OPTIONS.map(opt => ({
          name: opt.label,
          value: parseFloat((categoryMap[opt.value] || 0).toFixed(2)),
          color: categoryColors[opt.value] || '#999',
        })).filter(item => item.value > 0)
        setExpenseByCategory(categoryItems)

        // ==================== 心情分布 ====================
        const moodData = moodDistRes.data || []
        const moodMap: Record<string, number> = {}
        moodData.forEach(m => {
          moodMap[m.mood] = (moodMap[m.mood] || 0) + 1
        })
        const moodColors: Record<string, string> = {
          '开心': '#52c41a',
          '平静': '#1890ff',
          '一般': '#faad14',
          '难过': '#ff4d4f',
          '焦虑': '#722ed1',
        }
        const moodItems: MoodDistributionItem[] = MOOD_OPTIONS.map(opt => ({
          mood: (opt.label.split(' ')[1]) || opt.value,
          count: moodMap[opt.value] || 0,
          color: moodColors[opt.value] || '#999',
        })).filter(item => item.count > 0)
        setMoodDistribution(moodItems)

        // ==================== 最近动态 ====================
        const activities: RecentActivity[] = []

        // 最近注册用户
        ;(recentUsersRes.data || []).forEach(u => {
          activities.push({
            id: u.id,
            type: 'user_register',
            title: '新用户注册',
            description: `用户 "${u.nickname || '未知'}" 完成注册`,
            time: dayjs(u.created_at).format('HH:mm'),
            color: '#6C63FF',
          })
        })

        // 最近消费
        ;(recentExpensesRes.data || []).forEach(e => {
          activities.push({
            id: e.id,
            type: 'expense',
            title: '新增消费',
            description: `记录了一笔${e.category}消费 ¥${(e.amount || 0).toFixed(2)}`,
            time: dayjs(e.created_at).format('HH:mm'),
            color: '#FF6B6B',
          })
        })

        // 最近心情日记
        ;(recentMoodsRes.data || []).forEach(m => {
          activities.push({
            id: m.id,
            type: 'mood_diary',
            title: '心情日记',
            description: `记录了今日心情：${m.mood}`,
            time: dayjs(m.created_at).format('HH:mm'),
            color: '#4ECDC4',
          })
        })

        // 最近笔记
        ;(recentNotesRes.data || []).forEach(n => {
          activities.push({
            id: n.id,
            type: 'note',
            title: '新建笔记',
            description: `创建了笔记 "${n.title}"`,
            time: dayjs(n.created_at).format('HH:mm'),
            color: '#45B7D1',
          })
        })

        // 最近体重
        ;(recentWeightsRes.data || []).forEach(w => {
          activities.push({
            id: w.id,
            type: 'weight',
            title: '体重记录',
            description: `记录体重 ${w.weight}kg`,
            time: dayjs(w.created_at).format('HH:mm'),
            color: '#96CEB4',
          })
        })

        // 按时间排序，取前10条
        activities.sort((a, b) => b.time.localeCompare(a.time))
        setRecentActivities(activities.slice(0, 10))

        // ==================== 体重趋势（14天） ====================
        const weightData = weightTrendRes.data || []
        const weightItems: WeightTrendItem[] = weightData.map(w => ({
          date: dayjs(w.date).format('MM-DD'),
          weight: w.weight,
          body_fat: w.body_fat || 0,
        }))
        setWeightTrend(weightItems)
      } catch (err) {
        console.error('Dashboard 数据加载失败:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchDashboardData()
  }, [])

  if (loading || !stats) {
    return (
      <div style={{ textAlign: 'center', padding: 100 }}>
        <Spin size="large" tip="加载中..." />
      </div>
    )
  }

  // ==================== 统计卡片数据 ====================
  const statCards: StatCardConfig[] = [
    {
      title: '注册用户',
      value: stats.totalUsers,
      prefix: <UserOutlined />,
      color: '#6C63FF',
      trend: stats.userTrendPercent,
    },
    {
      title: '今日新增',
      value: stats.todayNewUsers,
      prefix: <UserAddOutlined />,
      color: '#36CFC9',
      trend: stats.newUserTrendPercent,
    },
    {
      title: '本月消费',
      value: stats.totalExpense,
      prefix: <WalletOutlined />,
      color: '#FF6B6B',
      trend: stats.expenseTrendPercent,
      suffix: '元',
      precision: 1,
    },
    {
      title: '活跃用户',
      value: stats.activeUsers,
      prefix: <FireOutlined />,
      color: '#FA8C16',
      trend: stats.activeTrendPercent,
    },
    {
      title: '本月日记',
      value: stats.moodDiaryCount,
      prefix: <SmileOutlined />,
      color: '#4ECDC4',
      trend: stats.moodTrendPercent,
    },
    {
      title: '笔记数量',
      value: stats.noteCount,
      prefix: <BookOutlined />,
      color: '#45B7D1',
      trend: stats.noteTrendPercent,
    },
  ]

  // ==================== 渲染统计卡片 ====================
  const renderStatCards = () => (
    <Row gutter={[16, 16]}>
      {statCards.map((card, index) => (
        <Col xs={24} sm={12} lg={8} xl={4} key={index}>
          <Card
            hoverable
            style={{ borderRadius: 8 }}
            bodyStyle={{ padding: '20px 24px' }}
          >
            <Statistic
              title={
                <span style={{ fontSize: 14, color: '#8c8c8c' }}>{card.title}</span>
              }
              value={card.value}
              precision={card.precision}
              prefix={
                <span style={{ color: card.color, marginRight: 8 }}>{card.prefix}</span>
              }
              suffix={card.suffix}
              valueStyle={{ color: card.color, fontWeight: 600 }}
            />
            <div style={{ marginTop: 8, fontSize: 13 }}>
              {card.trend >= 0 ? (
                <span style={{ color: '#52c41a' }}>
                  <ArrowUpOutlined /> {card.trend}%
                </span>
              ) : (
                <span style={{ color: '#ff4d4f' }}>
                  <ArrowDownOutlined /> {Math.abs(card.trend)}%
                </span>
              )}
              <span style={{ color: '#bfbfbf', marginLeft: 6 }}>较上周</span>
            </div>
          </Card>
        </Col>
      ))}
    </Row>
  )

  // ==================== 渲染用户增长趋势 ====================
  const renderUserTrend = () => (
    <Card
      title="用户增长趋势"
      extra={<Tag color="blue">最近30天</Tag>}
      style={{ borderRadius: 8 }}
    >
      <ResponsiveContainer width="100%" height={320}>
        <AreaChart data={userTrend} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#6C63FF" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#6C63FF" stopOpacity={0.02} />
            </linearGradient>
            <linearGradient id="colorCumulative" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#4ECDC4" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#4ECDC4" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="date" tick={{ fontSize: 12 }} />
          <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
          <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} />
          <Tooltip
            contentStyle={{
              borderRadius: 8,
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            }}
          />
          <Legend />
          <Area
            yAxisId="left"
            type="monotone"
            dataKey="count"
            name="每日新增"
            stroke="#6C63FF"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#colorCount)"
          />
          <Area
            yAxisId="right"
            type="monotone"
            dataKey="cumulative"
            name="累计用户"
            stroke="#4ECDC4"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#colorCumulative)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </Card>
  )

  // ==================== 渲染消费分类饼图 ====================
  const renderExpensePie = () => {
    const total = expenseByCategory.reduce((sum, item) => sum + item.value, 0)
    return (
      <Card
        title="消费分类"
        extra={<Tag color="orange">全部</Tag>}
        style={{ borderRadius: 8 }}
      >
        <ResponsiveContainer width="100%" height={320}>
          <PieChart>
            <Pie
              data={expenseByCategory}
              cx="50%"
              cy="50%"
              innerRadius={60}
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
              formatter={(value: number) => [`¥${value.toLocaleString()}`, '']}
              contentStyle={{
                borderRadius: 8,
                boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
              }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div style={{ textAlign: 'center', color: '#8c8c8c', fontSize: 13 }}>
          总消费: <span style={{ color: '#FF6B6B', fontWeight: 600 }}>¥{total.toLocaleString()}</span>
        </div>
      </Card>
    )
  }

  // ==================== 渲染心情分布柱状图 ====================
  const renderMoodBar = () => (
    <Card
      title="心情分布"
      extra={<Tag color="green">全部</Tag>}
      style={{ borderRadius: 8 }}
    >
      <ResponsiveContainer width="100%" height={320}>
        <BarChart data={moodDistribution} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="mood" tick={{ fontSize: 13 }} />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip
            contentStyle={{
              borderRadius: 8,
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            }}
          />
          <Bar dataKey="count" name="日记数量" radius={[6, 6, 0, 0]} barSize={48}>
            {moodDistribution.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </Card>
  )

  // ==================== 渲染最近动态 ====================
  const renderRecentActivities = () => {
    const typeIconMap: Record<string, React.ReactNode> = {
      user_register: <UserAddOutlined />,
      expense: <WalletOutlined />,
      mood_diary: <SmileOutlined />,
      note: <BookOutlined />,
      weight: <LineChartOutlined />,
    }

    return (
      <Card
        title="最近动态"
        extra={<Tag color="purple">实时</Tag>}
        style={{ borderRadius: 8 }}
        bodyStyle={{ padding: '12px 24px' }}
      >
        {recentActivities.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#bfbfbf', padding: '40px 0' }}>暂无动态</div>
        ) : (
          <Timeline
            items={recentActivities.map(activity => ({
              color: activity.color,
              children: (
                <div style={{ paddingBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{ color: activity.color }}>{typeIconMap[activity.type]}</span>
                    <span style={{ fontWeight: 500, fontSize: 14 }}>{activity.title}</span>
                    <span style={{ color: '#bfbfbf', fontSize: 12, marginLeft: 'auto' }}>
                      {activity.time}
                    </span>
                  </div>
                  <div style={{ color: '#8c8c8c', fontSize: 13, paddingLeft: 28 }}>
                    {activity.description}
                  </div>
                </div>
              ),
            }))}
          />
        )}
      </Card>
    )
  }

  // ==================== 渲染体重趋势 ====================
  const renderWeightTrend = () => (
    <Card
      title="体重趋势"
      extra={<Tag color="cyan">最近14天</Tag>}
      style={{ borderRadius: 8 }}
    >
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={weightTrend} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="date" tick={{ fontSize: 12 }} />
          <YAxis domain={['dataMin - 1', 'dataMax + 1']} tick={{ fontSize: 12 }} />
          <Tooltip
            contentStyle={{
              borderRadius: 8,
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            }}
          />
          <Legend />
          <Line
            type="monotone"
            dataKey="weight"
            name="体重 (kg)"
            stroke="#45B7D1"
            strokeWidth={2.5}
            dot={{ fill: '#45B7D1', r: 4 }}
            activeDot={{ r: 6 }}
          />
          <Line
            type="monotone"
            dataKey="body_fat"
            name="体脂率 (%)"
            stroke="#FF6B6B"
            strokeWidth={2}
            strokeDasharray="5 5"
            dot={{ fill: '#FF6B6B', r: 3 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </Card>
  )

  // ==================== 主渲染 ====================
  return (
    <div>
      {/* 第一行：统计卡片 */}
      {renderStatCards()}

      {/* 第二行：用户增长趋势 + 消费分类饼图 */}
      <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
        <Col xs={24} lg={16}>
          {renderUserTrend()}
        </Col>
        <Col xs={24} lg={8}>
          {renderExpensePie()}
        </Col>
      </Row>

      {/* 第三行：心情分布 + 最近动态 */}
      <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
        <Col xs={24} lg={16}>
          {renderMoodBar()}
        </Col>
        <Col xs={24} lg={8}>
          {renderRecentActivities()}
        </Col>
      </Row>

      {/* 第四行：体重趋势 */}
      <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
        <Col span={24}>
          {renderWeightTrend()}
        </Col>
      </Row>
    </div>
  )
}

export default Dashboard
