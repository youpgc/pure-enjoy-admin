import React, { useState, useEffect } from 'react'
import {
  Card,
  Row,
  Col,
  Statistic,
  DatePicker,
  Button,
  Spin,
  Empty,
  Table,
  Tag,
} from 'antd'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import {
  UserOutlined,
  BookOutlined,
  ReadOutlined,
  MessageOutlined,
  ReloadOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import { supabase } from '../utils/supabase'
import { apiQuery, handleApiError } from '../utils/apiClient'
import { useMounted } from '../hooks/useMounted'
import EllipsisText from '../components/EllipsisText'

const { RangePicker } = DatePicker

const COLORS = ['#1890ff', '#52c41a', '#faad14', '#ff4d4f', '#722ed1', '#13c2c2']

interface DailyStat {
  date: string
  newUsers: number
  activeUsers: number
  newNovels: number
  newChapters: number
  newFeedback: number
}

interface NovelStat {
  category: string
  count: number
}

interface TopNovel {
  title: string
  author: string
  read_count: number
  chapter_count: number
}

const Analytics: React.FC = () => {
  const mountedRef = useMounted()

  const [loading, setLoading] = useState(false)
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs]>([
    dayjs().subtract(30, 'day'),
    dayjs(),
  ])
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
        apiQuery(() =>
          supabase
            .from('users')
            .select('created_at')
            .eq('is_deleted', false)
            .gte('created_at', startDate)
            .lte('created_at', endDate + 'T23:59:59')
            .limit(5000),
          'Analytics-用户数据'
        ),
        apiQuery(() =>
          supabase
            .from('novels')
            .select('created_at, category')
            .gte('created_at', startDate)
            .lte('created_at', endDate + 'T23:59:59')
            .limit(5000),
          'Analytics-小说数据'
        ),
        apiQuery(() =>
          supabase
            .from('novel_chapters')
            .select('created_at')
            .gte('created_at', startDate)
            .lte('created_at', endDate + 'T23:59:59')
            .limit(5000),
          'Analytics-章节数据'
        ),
        apiQuery(() =>
          supabase
            .from('user_feedback')
            .select('created_at')
            .eq('is_deleted', false)
            .gte('created_at', startDate)
            .lte('created_at', endDate + 'T23:59:59')
            .limit(5000),
          'Analytics-反馈数据'
        ),
        apiQuery(() =>
          supabase
            .from('novels')
            .select('title, author, read_count, chapter_count')
            .order('read_count', { ascending: false })
            .limit(10),
          'Analytics-热门小说'
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

      ;(usersRes.data)?.forEach((item: any) => {
        const date = dayjs(item.created_at).format('MM-DD')
        if (dateMap.has(date)) {
          const stat = dateMap.get(date)!
          stat.newUsers++
        }
      })

      ;(novelsRes.data)?.forEach((item: any) => {
        const date = dayjs(item.created_at).format('MM-DD')
        if (dateMap.has(date)) {
          const stat = dateMap.get(date)!
          stat.newNovels++
        }
      })

      ;(chaptersRes.data)?.forEach((item: any) => {
        const date = dayjs(item.created_at).format('MM-DD')
        if (dateMap.has(date)) {
          const stat = dateMap.get(date)!
          stat.newChapters++
        }
      })

      ;(feedbackRes.data)?.forEach((item: any) => {
        const date = dayjs(item.created_at).format('MM-DD')
        if (dateMap.has(date)) {
          const stat = dateMap.get(date)!
          stat.newFeedback++
        }
      })

      setDailyStats(Array.from(dateMap.values()))

      // 处理小说分类统计
      const categoryMap = new Map<string, number>()
      ;(novelsRes.data)?.forEach((item: any) => {
        const category = item.category || '未分类'
        categoryMap.set(category, (categoryMap.get(category) || 0) + 1)
      })

      if (!mountedRef.current) return

      setNovelStats(
        Array.from(categoryMap.entries()).map(([category, count]) => ({
          category,
          count,
        }))
      )

      // 处理热门小说
      setTopNovels((topNovelsRes.data) || [])

      // 汇总数据
      setSummary({
        totalUsers: (usersRes.data)?.length || 0,
        totalNovels: (novelsRes.data)?.length || 0,
        totalChapters: (chaptersRes.data)?.length || 0,
        totalFeedback: (feedbackRes.data)?.length || 0,
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

  const topNovelColumns = [
    {
      title: '排名',
      key: 'rank',
      width: 60,
      render: (_: any, __: any, index: number) => index + 1,
    },
    {
      title: '书名',
      dataIndex: 'title',
      key: 'title',
      render: (title: string) => <EllipsisText text={title} maxWidth={180} />,
    },
    {
      title: '作者',
      dataIndex: 'author',
      key: 'author',
    },
    {
      title: '阅读量',
      dataIndex: 'read_count',
      key: 'read_count',
      render: (count: number) => <Tag color="blue">{count}</Tag>,
    },
    {
      title: '章节数',
      dataIndex: 'chapter_count',
      key: 'chapter_count',
    },
  ]

  return (
    <div style={{ padding: 24 }}>
      <Card style={{ marginBottom: 16 }}>
        <Row gutter={16} align="middle">
          <Col>
            <RangePicker
              value={dateRange}
              onChange={(dates) => {
                if (dates && dates[0] && dates[1]) {
                  setDateRange([dates[0], dates[1]])
                }
              }}
            />
          </Col>
          <Col>
            <Button icon={<ReloadOutlined />} onClick={fetchAnalytics}>
              刷新
            </Button>
          </Col>
        </Row>
      </Card>

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="新增用户"
              value={summary.totalUsers}
              prefix={<UserOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="新增小说"
              value={summary.totalNovels}
              prefix={<BookOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="新增章节"
              value={summary.totalChapters}
              prefix={<ReadOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="新增反馈"
              value={summary.totalFeedback}
              prefix={<MessageOutlined />}
            />
          </Card>
        </Col>
      </Row>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 100 }}>
          <Spin size="large" />
        </div>
      ) : (
        <>
          <Card title="每日数据统计" style={{ marginBottom: 16 }}>
            {dailyStats.length > 0 ? (
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={dailyStats}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="newUsers"
                    name="新增用户"
                    stroke="#1890ff"
                  />
                  <Line
                    type="monotone"
                    dataKey="newNovels"
                    name="新增小说"
                    stroke="#52c41a"
                  />
                  <Line
                    type="monotone"
                    dataKey="newChapters"
                    name="新增章节"
                    stroke="#faad14"
                  />
                  <Line
                    type="monotone"
                    dataKey="newFeedback"
                    name="新增反馈"
                    stroke="#ff4d4f"
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <Empty description="暂无数据" />
            )}
          </Card>

          <Row gutter={[16, 16]}>
            <Col xs={24} lg={12}>
              <Card title="小说分类分布">
                {novelStats.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={novelStats}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        dataKey="count"
                        nameKey="category"
                        label={({ category, count }) => `${category}: ${count}`}
                      >
                        {novelStats.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <Empty description="暂无数据" />
                )}
              </Card>
            </Col>
            <Col xs={24} lg={12}>
              <Card title="热门小说 Top 10">
                <Table
                  dataSource={topNovels}
                  columns={topNovelColumns}
                  rowKey="title"
                  pagination={false}
                  size="small"
                />
              </Card>
            </Col>
          </Row>
        </>
      )}
    </div>
  )
}

export default Analytics
