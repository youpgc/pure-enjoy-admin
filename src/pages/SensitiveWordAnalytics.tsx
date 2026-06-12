import React, { useState, useEffect, useCallback } from 'react'
import {
  Card,
  Row,
  Col,
  Statistic,
  Table,
  Tag,
  Spin,
  Empty,
  DatePicker,
  Button,
  Space,
  Typography,
} from 'antd'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import {
  WarningOutlined,
  ReloadOutlined,
  FileTextOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import { BaseService, handleApiError } from '../utils/apiClient'

const { Text, Title } = Typography
const { RangePicker } = DatePicker

const COLORS = ['#ff4d4f', '#faad14', '#52c41a', '#1890ff', '#722ed1']

// ==================== 类型定义 ====================

interface SensitiveWordHit {
  id: string
  word: string
  category: string
  level: string
  source: string
  source_id: string
  word_id: string
  user_id: string
  content_snippet: string
  action_taken: string
  ip_address: string
  created_at: string
}

interface CategoryStat {
  category: string
  count: number
}

interface DailyStat {
  date: string
  count: number
}

// ==================== 组件 ====================

const SensitiveWordAnalytics: React.FC = () => {
  const [loading, setLoading] = useState(false)
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs]>([
    dayjs().subtract(30, 'day'),
    dayjs(),
  ])
  const [hits, setHits] = useState<SensitiveWordHit[]>([])
  const [categoryStats, setCategoryStats] = useState<CategoryStat[]>([])
  const [dailyStats, setDailyStats] = useState<DailyStat[]>([])
  const [topWords, setTopWords] = useState<{ word: string; count: number }[]>([])

  const hitService = new BaseService<SensitiveWordHit>('sensitive_word_logs', { defaultOrder: { column: 'created_at', ascending: false } })

  // 加载统计数据
  const loadAnalytics = useCallback(async () => {
    setLoading(true)
    try {
      const startDate = dateRange[0].format('YYYY-MM-DD')
      const endDate = dateRange[1].format('YYYY-MM-DD') + 'T23:59:59'

      // 加载命中记录
      const result = await hitService.findAll((q) =>
        q.gte('created_at', startDate).lte('created_at', endDate)
      )
      if (!result.success) {
        handleApiError(result.errorMessage, 'SensitiveWordAnalytics-加载数据')
        return
      }

      const hitData = result.data || []
      setHits(hitData)

      // 分类统计
      const categoryMap = new Map<string, number>()
      hitData.forEach((hit) => {
        const cat = hit.category || '未分类'
        categoryMap.set(cat, (categoryMap.get(cat) || 0) + 1)
      })
      setCategoryStats(
        Array.from(categoryMap.entries()).map(([category, count]) => ({ category, count }))
      )

      // 每日统计
      const dateMap = new Map<string, number>()
      const days = dateRange[1].diff(dateRange[0], 'day') + 1
      for (let i = 0; i < days; i++) {
        const date = dateRange[0].add(i, 'day').format('MM-DD')
        dateMap.set(date, 0)
      }
      hitData.forEach((hit) => {
        const date = dayjs(hit.created_at).format('MM-DD')
        if (dateMap.has(date)) {
          dateMap.set(date, (dateMap.get(date) || 0) + 1)
        }
      })
      setDailyStats(
        Array.from(dateMap.entries()).map(([date, count]) => ({ date, count }))
      )

      // 热门敏感词
      const wordMap = new Map<string, number>()
      hitData.forEach((hit) => {
        wordMap.set(hit.word, (wordMap.get(hit.word) || 0) + 1)
      })
      setTopWords(
        Array.from(wordMap.entries())
          .map(([word, count]) => ({ word, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 10)
      )
    } catch (error) {
      handleApiError(error, 'SensitiveWordAnalytics-加载统计')
    } finally {
      setLoading(false)
    }
  }, [dateRange])

  useEffect(() => {
    loadAnalytics()
  }, [loadAnalytics])

  // 表格列定义
  const columns = [
    {
      title: '敏感词',
      dataIndex: 'word',
      key: 'word',
      render: (word: string) => <Text strong style={{ color: '#ff4d4f' }}>{word}</Text>,
    },
    {
      title: '分类',
      dataIndex: 'category',
      key: 'category',
      render: (category: string) => <Tag>{category}</Tag>,
    },
    {
      title: '等级',
      dataIndex: 'level',
      key: 'level',
      render: (level: string) => {
        const color = level === 'high' ? 'purple' : level === 'medium' ? 'red' : 'orange'
        return <Tag color={color}>{level}</Tag>
      },
    },
    {
      title: '来源',
      dataIndex: 'source',
      key: 'source',
    },
    {
      title: '来源ID',
      dataIndex: 'source_id',
      key: 'source_id',
      width: 100,
    },
    {
      title: '处理方式',
      dataIndex: 'action_taken',
      key: 'action_taken',
      width: 100,
    },
    {
      title: 'IP地址',
      dataIndex: 'ip_address',
      key: 'ip_address',
      width: 130,
      render: (ip: string) => ip || '-',
    },
    {
      title: '时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm'),
    },
  ]

  return (
    <div style={{ padding: 24 }}>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Title level={4} style={{ margin: 0 }}>敏感词分析</Title>
        <Space>
          <RangePicker
            value={dateRange}
            onChange={(dates) => {
              if (dates && dates[0] && dates[1]) {
                setDateRange([dates[0], dates[1]])
              }
            }}
          />
          <Button icon={<ReloadOutlined />} onClick={loadAnalytics} loading={loading}>
            刷新
          </Button>
        </Space>
      </div>

      {/* 统计卡片 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="总命中数"
              value={hits.length}
              prefix={<WarningOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="涉及分类"
              value={categoryStats.length}
              prefix={<FileTextOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="今日命中"
              value={hits.filter(h => dayjs(h.created_at).isSame(dayjs(), 'day')).length}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#ff4d4f' }}
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
          <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
            <Col xs={24} lg={12}>
              <Card title="分类分布">
                {categoryStats.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={categoryStats}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        dataKey="count"
                        nameKey="category"
                        label={({ category, count }) => `${category}: ${count}`}
                      >
                        {categoryStats.map((_, index) => (
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
              <Card title="每日命中趋势">
                {dailyStats.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={dailyStats}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="count" name="命中数" fill="#ff4d4f" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <Empty description="暂无数据" />
                )}
              </Card>
            </Col>
          </Row>

          <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
            <Col xs={24} lg={12}>
              <Card title="热门敏感词 Top 10">
                <Table
                  dataSource={topWords}
                  columns={[
                    { title: '排名', key: 'rank', width: 60, render: (_: any, __: any, index: number) => index + 1 },
                    { title: '敏感词', dataIndex: 'word', key: 'word' },
                    { title: '命中次数', dataIndex: 'count', key: 'count' },
                  ]}
                  rowKey="word"
                  pagination={false}
                  size="small"
                />
              </Card>
            </Col>
            <Col xs={24} lg={12}>
              <Card title="最近命中记录">
                <Table
                  dataSource={hits.slice(0, 10)}
                  columns={columns}
                  rowKey="id"
                  pagination={false}
                  size="small"
                  scroll={{ x: 600 }}
                />
              </Card>
            </Col>
          </Row>
        </>
      )}
    </div>
  )
}

export default SensitiveWordAnalytics
