import React, { useEffect, useState } from 'react'
import { Row, Col, Card, Statistic, Spin, DatePicker, Table, Tag, Empty, Tabs } from 'antd'
import {
  UserOutlined,
  UserAddOutlined,
  WalletOutlined,
  FireOutlined,
  BookOutlined,
  SmileOutlined,
  ReadOutlined,
  DollarOutlined,
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
import {
  mockAnalyticsMetrics,
  mockUserTrend,
  mockUserActivity,
  mockRetentionRates,
  mockUserByRole,
  mockUserByMemberLevel,
  mockUserByStatus,
  mockExpenseTrend,
  mockExpenseByCategory,
  mockMoodTrend,
  mockWeightAnalytics,
  mockNoteActivity,
} from '../utils/mockData'
import type {
  AnalyticsKeyMetrics,
  UserTrendItem,
  UserActivityItem,
  RetentionRate,
  ExpenseTrendItem,
  MoodTrendItem,
  WeightAnalyticsItem,
  NoteActivityItem,
} from '../utils/mockData'

const { RangePicker } = DatePicker

const Analytics: React.FC = () => {
  const { isAdmin } = usePermission()
  const [loading, setLoading] = useState(true)
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

  useEffect(() => {
    const timer = setTimeout(() => {
      setMetrics(mockAnalyticsMetrics)
      setUserTrend(mockUserTrend)
      setUserActivity(mockUserActivity)
      setRetentionRates(mockRetentionRates)
      setExpenseTrend(mockExpenseTrend)
      setMoodTrend(mockMoodTrend)
      setWeightAnalytics(mockWeightAnalytics)
      setNoteActivity(mockNoteActivity)
      setLoading(false)
    }, 600)
    return () => clearTimeout(timer)
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
                    {renderPieChart(mockUserByRole, '用户角色分布')}
                  </Col>
                  <Col xs={24} md={8}>
                    {renderPieChart(mockUserByMemberLevel, '会员等级分布')}
                  </Col>
                  <Col xs={24} md={8}>
                    {renderPieChart(mockUserByStatus, '用户状态分布')}
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
                            data={mockExpenseByCategory}
                            cx="50%"
                            cy="50%"
                            innerRadius={65}
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
        ]}
      />
    </div>
  )
}

export default Analytics
