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
import {
  mockDashboardStats,
  mockUserTrend,
  mockExpenseByCategory,
  mockMoodDistribution,
  mockRecentActivities,
  mockWeightTrend,
} from '../utils/mockData'
import type { DashboardStats, UserTrendItem, WeightTrendItem } from '../utils/mockData'

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
  const [weightTrend, setWeightTrend] = useState<WeightTrendItem[]>([])

  useEffect(() => {
    // 模拟加载延迟
    const timer = setTimeout(() => {
      setStats(mockDashboardStats)
      setUserTrend(mockUserTrend)
      setWeightTrend(mockWeightTrend)
      setLoading(false)
    }, 800)
    return () => clearTimeout(timer)
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
      title: '消费总额',
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
      title: '心情日记数',
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
    const total = mockExpenseByCategory.reduce((sum, item) => sum + item.value, 0)
    return (
      <Card
        title="消费分类"
        extra={<Tag color="orange">本月</Tag>}
        style={{ borderRadius: 8 }}
      >
        <ResponsiveContainer width="100%" height={320}>
          <PieChart>
            <Pie
              data={mockExpenseByCategory}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={100}
              paddingAngle={3}
              dataKey="value"
              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              labelLine={{ stroke: '#999' }}
            >
              {mockExpenseByCategory.map((entry, index) => (
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
        <BarChart data={mockMoodDistribution} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
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
            {mockMoodDistribution.map((entry, index) => (
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
        <Timeline
          items={mockRecentActivities.map(activity => ({
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
