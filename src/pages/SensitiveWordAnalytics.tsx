import React, { useState, useEffect, useCallback } from 'react'
import {
  Card,
  Row,
  Col,
  Statistic,
  Table,
  Tag,
  Typography,
  Space,
  DatePicker,
  Spin,
  Empty,
  Tabs,
  Select,
  Badge,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import {
  SafetyCertificateOutlined,
  FileTextOutlined,
  ExclamationCircleOutlined,
  AlertOutlined,
  UserOutlined,
  FireOutlined,
} from '@ant-design/icons'
import {
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import dayjs from 'dayjs'
import { supabase } from '../utils/supabase'
import { usePermission } from '../hooks/usePermission'

const { Text } = Typography
const { RangePicker } = DatePicker

// ==================== 类型定义 ====================

interface LogRecord {
  id: string
  word_id: string
  word: string
  category: string
  source: string
  source_id: string | null
  user_id: string | null
  content_snippet: string | null
  action_taken: string
  ip_address: string | null
  created_at: string
}

interface TrendItem {
  date: string
  novel: number
  system: number
  total: number
}

interface SourceItem {
  name: string
  value: number
  color: string
}

interface TopWordItem {
  word: string
  category: string
  hit_count: number
}

// ==================== 常量 ====================

const SOURCE_COLORS: Record<string, string> = {
  novel_content: '#722ed1',
  user_comment: '#13c2c2',
  user_nickname: '#1890ff',
  user_bio: '#52c41a',
  other: '#faad14',
}

const SOURCE_LABELS: Record<string, string> = {
  novel_content: '小说内容',
  user_comment: '用户评论',
  user_nickname: '用户昵称',
  user_bio: '用户简介',
  other: '其他',
}

const ACTION_COLORS: Record<string, string> = {
  blocked: '#ff4d4f',
  replaced: '#faad14',
  warned: '#1890ff',
}

const ACTION_LABELS: Record<string, string> = {
  blocked: '已屏蔽',
  replaced: '已替换',
  warned: '已警告',
}

// ==================== 组件 ====================

const SensitiveWordAnalytics: React.FC = () => {
  const [loading, setLoading] = useState(false)
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs]>([
    dayjs().subtract(7, 'day'),
    dayjs(),
  ])
  const [categoryFilter, setCategoryFilter] = useState<string>('all')

  // 数据
  const [totalLogs, setTotalLogs] = useState(0)
  const [todayLogs, setTodayLogs] = useState(0)
  const [novelLogs, setNovelLogs] = useState(0)
  const [systemLogs, setSystemLogs] = useState(0)
  const [uniqueUsers, setUniqueUsers] = useState(0)
  const [blockedCount, setBlockedCount] = useState(0)
  const [trendData, setTrendData] = useState<TrendItem[]>([])
  const [sourceData, setSourceData] = useState<SourceItem[]>([])
  const [topWords, setTopWords] = useState<TopWordItem[]>([])
  const [recentLogs, setRecentLogs] = useState<LogRecord[]>([])

  const { isAdmin } = usePermission()

  // ==================== 数据加载 ====================

  const fetchAnalytics = useCallback(async () => {
    if (!isAdmin) return
    setLoading(true)

    const startDate = dateRange[0].format('YYYY-MM-DD')
    const endDate = dateRange[1].format('YYYY-MM-DD')

    try {
      // 基础查询条件
      const baseQuery = supabase
        .from('sensitive_word_logs')
        .select('*')
        .gte('created_at', startDate)
        .lte('created_at', endDate + 'T23:59:59')
        .order('created_at', { ascending: false })

      // 分类筛选
      const query = categoryFilter === 'all'
        ? baseQuery
        : baseQuery.eq('category', categoryFilter)

      const { data: logs, error } = await query

      if (error) throw error

      const allLogs = logs || []

      // 基础统计
      setTotalLogs(allLogs.length)
      const today = dayjs().format('YYYY-MM-DD')
      setTodayLogs(allLogs.filter(l => l.created_at.startsWith(today)).length)
      setNovelLogs(allLogs.filter(l => l.category === 'novel').length)
      setSystemLogs(allLogs.filter(l => l.category === 'system').length)
      setUniqueUsers(new Set(allLogs.filter(l => l.user_id).map(l => l.user_id)).size)
      setBlockedCount(allLogs.filter(l => l.action_taken === 'blocked').length)

      // 趋势数据（按天聚合）
      const trendMap = new Map<string, { novel: number; system: number }>()
      allLogs.forEach(log => {
        const date = log.created_at.split('T')[0]
        const existing = trendMap.get(date) || { novel: 0, system: 0 }
        if (log.category === 'novel') existing.novel++
        else existing.system++
        trendMap.set(date, existing)
      })

      // 生成完整日期范围
      const trend: TrendItem[] = []
      let current = dayjs(startDate)
      const end = dayjs(endDate)
      while (current.isBefore(end) || current.isSame(end, 'day')) {
        const dateStr = current.format('YYYY-MM-DD')
        const dayData = trendMap.get(dateStr) || { novel: 0, system: 0 }
        trend.push({
          date: dateStr.substring(5), // MM-DD
          novel: dayData.novel,
          system: dayData.system,
          total: dayData.novel + dayData.system,
        })
        current = current.add(1, 'day')
      }
      setTrendData(trend)

      // 来源分布
      const sourceMap = new Map<string, number>()
      allLogs.forEach(log => {
        const count = sourceMap.get(log.source) || 0
        sourceMap.set(log.source, count + 1)
      })
      setSourceData(
        Array.from(sourceMap.entries())
          .map(([name, value]) => ({
            name: SOURCE_LABELS[name] || name,
            value,
            color: SOURCE_COLORS[name] || '#999',
          }))
          .sort((a, b) => b.value - a.value)
      )

      // Top 敏感词
      const wordMap = new Map<string, { word: string; category: string; count: number }>()
      allLogs.forEach(log => {
        const existing = wordMap.get(log.word) || { word: log.word, category: log.category, count: 0 }
        existing.count++
        wordMap.set(log.word, existing)
      })
      setTopWords(
        Array.from(wordMap.values())
          .sort((a, b) => b.count - a.count)
          .slice(0, 20)
          .map(item => ({ word: item.word, category: item.category, hit_count: item.count }))
      )

      // 最近日志
      setRecentLogs(allLogs.slice(0, 50))
    } catch (error: any) {
      console.error('加载统计数据失败:', error)
    } finally {
      setLoading(false)
    }
  }, [isAdmin, dateRange, categoryFilter])

  useEffect(() => {
    fetchAnalytics()
  }, [fetchAnalytics])

  // ==================== 表格列 ====================

  const logColumns: ColumnsType<LogRecord> = [
    {
      title: '敏感词',
      dataIndex: 'word',
      key: 'word',
      width: 150,
      render: (word: string) => <Text style={{ color: '#ff4d4f' }}>{word}</Text>,
    },
    {
      title: '分类',
      dataIndex: 'category',
      key: 'category',
      width: 80,
      render: (cat: string) => (
        <Tag color={cat === 'novel' ? 'purple' : 'cyan'}>
          {cat === 'novel' ? '小说' : '系统'}
        </Tag>
      ),
    },
    {
      title: '来源',
      dataIndex: 'source',
      key: 'source',
      width: 100,
      render: (source: string) => (
        <Tag color={SOURCE_COLORS[source] || 'default'}>
          {SOURCE_LABELS[source] || source}
        </Tag>
      ),
    },
    {
      title: '处理动作',
      dataIndex: 'action_taken',
      key: 'action_taken',
      width: 90,
      render: (action: string) => (
        <Tag color={ACTION_COLORS[action]}>{ACTION_LABELS[action] || action}</Tag>
      ),
    },
    {
      title: '内容片段',
      dataIndex: 'content_snippet',
      key: 'content_snippet',
      width: 250,
      ellipsis: true,
      render: (text: string | null) => text || '-',
    },
    {
      title: '用户ID',
      dataIndex: 'user_id',
      key: 'user_id',
      width: 120,
      render: (id: string | null) => id ? (
        <Text copyable style={{ fontSize: 12 }}>{id.substring(0, 16)}...</Text>
      ) : '-',
    },
    {
      title: '时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 160,
      render: (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm:ss'),
    },
  ]

  const topWordColumns: ColumnsType<TopWordItem> = [
    {
      title: '排名',
      key: 'rank',
      width: 60,
      render: (_, __, index) => (
        <Badge
          count={index + 1}
          style={{
            backgroundColor: index < 3 ? '#ff4d4f' : '#d9d9d9',
          }}
        />
      ),
    },
    {
      title: '敏感词',
      dataIndex: 'word',
      key: 'word',
      width: 200,
      render: (word: string) => <Text strong style={{ color: '#ff4d4f' }}>{word}</Text>,
    },
    {
      title: '分类',
      dataIndex: 'category',
      key: 'category',
      width: 80,
      render: (cat: string) => (
        <Tag color={cat === 'novel' ? 'purple' : 'cyan'}>
          {cat === 'novel' ? '小说' : '系统'}
        </Tag>
      ),
    },
    {
      title: '命中次数',
      dataIndex: 'hit_count',
      key: 'hit_count',
      width: 100,
      sorter: (a, b) => a.hit_count - b.hit_count,
      render: (count: number) => (
        <Text strong style={{ color: count > 10 ? '#ff4d4f' : count > 5 ? '#faad14' : '#52c41a' }}>
          {count}
        </Text>
      ),
    },
  ]

  // ==================== 渲染 ====================

  if (!isAdmin) {
    return <Empty description="仅管理员可查看" />
  }

  if (loading) {
    return <Spin size="large" style={{ display: 'block', margin: '100px auto' }} />
  }

  return (
    <div>
      {/* 顶部操作栏 */}
      <Card size="small" style={{ marginBottom: 16 }}>
        <Space>
          <RangePicker
            value={dateRange}
            onChange={(dates) => {
              if (dates && dates[0] && dates[1]) {
                setDateRange([dates[0], dates[1]])
              }
            }}
            presets={[
              { label: '近7天', value: [dayjs().subtract(7, 'day'), dayjs()] },
              { label: '近30天', value: [dayjs().subtract(30, 'day'), dayjs()] },
              { label: '近90天', value: [dayjs().subtract(90, 'day'), dayjs()] },
            ]}
          />
          <Select
            value={categoryFilter}
            onChange={setCategoryFilter}
            style={{ width: 140 }}
            options={[
              { label: '全部分类', value: 'all' },
              { label: '小说敏感词', value: 'novel' },
              { label: '系统敏感词', value: 'system' },
            ]}
          />
        </Space>
      </Card>

      {/* 统计卡片 */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={4}>
          <Card size="small">
            <Statistic title="总命中次数" value={totalLogs} prefix={<AlertOutlined />} />
          </Card>
        </Col>
        <Col span={4}>
          <Card size="small">
            <Statistic title="今日命中" value={todayLogs} valueStyle={{ color: '#ff4d4f' }} prefix={<FireOutlined />} />
          </Card>
        </Col>
        <Col span={4}>
          <Card size="small">
            <Statistic title="小说命中" value={novelLogs} valueStyle={{ color: '#722ed1' }} prefix={<FileTextOutlined />} />
          </Card>
        </Col>
        <Col span={4}>
          <Card size="small">
            <Statistic title="系统命中" value={systemLogs} valueStyle={{ color: '#13c2c2' }} prefix={<ExclamationCircleOutlined />} />
          </Card>
        </Col>
        <Col span={4}>
          <Card size="small">
            <Statistic title="涉及用户" value={uniqueUsers} prefix={<UserOutlined />} />
          </Card>
        </Col>
        <Col span={4}>
          <Card size="small">
            <Statistic title="已屏蔽" value={blockedCount} valueStyle={{ color: '#ff4d4f' }} prefix={<SafetyCertificateOutlined />} />
          </Card>
        </Col>
      </Row>

      {/* 图表区域 */}
      <Tabs
        defaultActiveKey="trend"
        items={[
          {
            key: 'trend',
            label: '命中趋势',
            children: (
              <Row gutter={16}>
                <Col span={16}>
                  <Card title="命中趋势（按天）" size="small">
                    <ResponsiveContainer width="100%" height={350}>
                      <LineChart data={trendData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" fontSize={12} />
                        <YAxis fontSize={12} />
                        <RechartsTooltip />
                        <Legend />
                        <Line type="monotone" dataKey="novel" name="小说" stroke="#722ed1" strokeWidth={2} />
                        <Line type="monotone" dataKey="system" name="系统" stroke="#13c2c2" strokeWidth={2} />
                        <Line type="monotone" dataKey="total" name="总计" stroke="#ff4d4f" strokeWidth={2} strokeDasharray="5 5" />
                      </LineChart>
                    </ResponsiveContainer>
                  </Card>
                </Col>
                <Col span={8}>
                  <Card title="来源分布" size="small">
                    <ResponsiveContainer width="100%" height={350}>
                      <PieChart>
                        <Pie
                          data={sourceData}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={80}
                          dataKey="value"
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          labelLine={false}
                        >
                          {sourceData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <RechartsTooltip />
                      </PieChart>
                    </ResponsiveContainer>
                    {sourceData.length === 0 && (
                      <div style={{ textAlign: 'center', marginTop: 80 }}>
                        <Text type="secondary">暂无数据</Text>
                      </div>
                    )}
                  </Card>
                </Col>
              </Row>
            ),
          },
          {
            key: 'topWords',
            label: '高频敏感词',
            children: (
              <Card title="命中次数 Top 20" size="small">
                <Row gutter={16}>
                  <Col span={16}>
                    <Table
                      columns={topWordColumns}
                      dataSource={topWords}
                      rowKey="word"
                      pagination={false}
                      size="small"
                      scroll={{ y: 500 }}
                    />
                  </Col>
                  <Col span={8}>
                    <Card title="分类占比" size="small" style={{ marginTop: 0 }}>
                      <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                          <Pie
                            data={[
                              { name: '小说', value: novelLogs },
                              { name: '系统', value: systemLogs },
                            ].filter(d => d.value > 0)}
                            cx="50%"
                            cy="50%"
                            innerRadius={40}
                            outerRadius={70}
                            dataKey="value"
                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          >
                            <Cell fill="#722ed1" />
                            <Cell fill="#13c2c2" />
                          </Pie>
                          <RechartsTooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </Card>
                  </Col>
                </Row>
              </Card>
            ),
          },
          {
            key: 'logs',
            label: '命中日志',
            children: (
              <Card title="最近命中日志" size="small">
                <Table
                  columns={logColumns}
                  dataSource={recentLogs}
                  rowKey="id"
                  size="small"
                  scroll={{ x: 1000 }}
                  pagination={{
                    defaultPageSize: 20,
                    showTotal: (total) => `共 ${total} 条`,
                    showSizeChanger: true,
                    pageSizeOptions: ['10', '20', '50'],
                  }}
                />
              </Card>
            ),
          },
        ]}
      />
    </div>
  )
}

export default SensitiveWordAnalytics
