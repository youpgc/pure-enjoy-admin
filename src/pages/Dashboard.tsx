import React, { useState, useEffect, useCallback, useMemo } from 'react'
import {
  Card, Row, Col, Spin, message,
  Tag, Table, Avatar, Tooltip, Typography, Empty, Space
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import { useNavigate } from 'react-router-dom'
import {
  UserOutlined, RiseOutlined, BookOutlined, MessageOutlined,
  ClockCircleOutlined, FireOutlined,
  EyeOutlined, ArrowUpOutlined, ArrowDownOutlined
} from '@ant-design/icons'
import { supabase } from '../utils/supabase'
import { usePermission } from '../hooks/usePermission'
import { formatDateTime } from '../utils/format'
import { useMounted } from '../hooks/useMounted'
import { usePagination } from '../hooks/usePagination'
import { dashboardService } from '../services/dashboardService'

const { Text } = Typography

// ==================== 类型定义 ====================

interface NovelListItem {
  id: string
  title: string
  author: string | null
  read_count: number | null
  rating: number | null
  created_at: string
  category: string | null
}

interface CommentItem {
  id: string
  novel_id: string
  user_id: string
  user_nickname: string | null
  novel_title: string | null
  content: string
  rating: number | null
  created_at: string
}

// ==================== 辅助函数 ====================

function safeCount(count: unknown): number {
  return typeof count === 'number' ? count : 0
}

function getWeekMonday(date = new Date()): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  return new Date(d.setDate(diff))
}

function formatNumber(n: number) {
  return n.toLocaleString('zh-CN')
}

// ==================== 主组件 ====================

const Dashboard: React.FC = () => {
  const { hasPermission } = usePermission()
  const navigate = useNavigate()
  const mountedRef = useMounted()

  const [loading, setLoading] = useState(false)
  const [userStats, setUserStats] = useState({
    total: 0,
    newToday: 0,
    newWeek: 0,
    newMonth: 0,
    activeToday: 0,
    activeWeek: 0,
    activeMonth: 0,
    retention: 0,
    retentionChange: 0,
  })
  const [novelStats, setNovelStats] = useState({
    total: 0,
    totalRead: 0,
    readers: 0,
    newReaders: 0,
  })

  // 小说列表分页
  const [novels, setNovels] = useState<NovelListItem[]>([])
  const [novelsLoading, setNovelsLoading] = useState(false)
  const novelPagination = usePagination(20)

  // 评论列表分页
  const [comments, setComments] = useState<CommentItem[]>([])
  const [commentsLoading, setCommentsLoading] = useState(false)
  const commentPagination = usePagination(20)

  // 最近活动
  const [recentActivities, setRecentActivities] = useState<{
    id: string
    action: string
    module: string | null
    user_id: string | null
    created_at: string
    user_nickname: string | null
  }[]>([])

  // 用户增长趋势
  const [userTrendData, setUserTrendData] = useState<{ date: string; count: number }[]>([])

  // ==================== 加载数据 ====================
  const loadStats = useCallback(async () => {
    if (!hasPermission('dashboard:read')) return
    setLoading(true)

    try {
      const todayStart = dayjs().startOf('day').toISOString()
      const weekStart = dayjs(getWeekMonday()).startOf('day').toISOString()
      const monthStart = dayjs().startOf('month').toISOString()
      const lastWeekStart = dayjs().subtract(1, 'week').startOf('day').toISOString()
      const lastMonthStart = dayjs().subtract(1, 'month').startOf('month').toISOString()
      const lastMonthEnd = dayjs().subtract(1, 'month').endOf('month').toISOString()
      const trendStart = dayjs().subtract(30, 'day').startOf('day').toISOString()

      // 原实现为顺序 await 瀑布（约 13 个相互独立的接口逐个等待），
      // 首屏耗时≈请求数×单程延迟。改为一次性并发发出，墙钟时间≈最慢单个请求。
      const [
        totalRes,
        todayRes,
        weekRes,
        monthRes,
        lastWeekRes,
        activeEventsRes,
        lastMonthUsersRes,
        novelsRes,
        readCountRes,
        trendRes,
        logsRes,
      ] = await Promise.all([
        dashboardService.getTotalUsers(),
        dashboardService.getTodayNewUsers(todayStart),
        dashboardService.getNewUsersSince(weekStart),
        dashboardService.getNewUsersSince(monthStart),
        dashboardService.getNewUsersInRange(lastWeekStart, weekStart),
        dashboardService.getActiveUserEvents(monthStart),
        dashboardService.getNewUserIdsInRange(lastMonthStart, lastMonthEnd),
        dashboardService.getNovelsCount(),
        dashboardService.getNovelReadCounts(),
        dashboardService.getUserTrendData(trendStart),
        dashboardService.getRecentLogs(),
      ])

      if (!mountedRef.current) return

      const totalUsers = safeCount(totalRes.count)
      const newToday = safeCount(todayRes.count)
      const newWeek = safeCount(weekRes.count)
      const newMonth = safeCount(monthRes.count)
      const lastWeekNew = safeCount(lastWeekRes.count)

      // 活跃用户数（基于真实用户行为：阅读 + 评论/书签/批注/听书/推荐反馈，
      // 不再依赖 operation_logs，因其仅记录后台操作，不含用户阅读行为）
      // 一次性拉取「本月」窗口内的全部活跃事件，客户端按时间筛出日/周/月活跃。
      const activeEvents = activeEventsRes.success ? (activeEventsRes.data || []) : []
      const activeToday = new Set(
        activeEvents.filter(e => e.created_at >= todayStart).map(e => e.user_id)
      ).size
      const activeWeek = new Set(
        activeEvents.filter(e => e.created_at >= weekStart).map(e => e.user_id)
      ).size
      const activeMonth = new Set(activeEvents.map(e => e.user_id)).size
      // 本周活跃用户集合，留存率计算时与「上月注册用户」取交集
      const thisWeekActiveUserIds = new Set(
        activeEvents.filter(e => e.created_at >= weekStart).map(e => e.user_id)
      )

      // 留存率（上月注册且本周活跃的用户）
      const lastMonthUserIds = new Set((lastMonthUsersRes.data || []).map(u => u.id))
      const lastMonthUsersCount = lastMonthUserIds.size
      // 取「上月注册」与「本周活跃」的交集，才是真正的留存用户
      const retainedUsers = [...thisWeekActiveUserIds].filter(id => lastMonthUserIds.has(id)).length
      const retention = lastMonthUsersCount > 0
        ? Math.round((retainedUsers / lastMonthUsersCount) * 100)
        : 0
      const retentionChange = lastWeekNew > 0
        ? Math.round(((newWeek - lastWeekNew) / lastWeekNew) * 100)
        : 0

      if (!mountedRef.current) return

      setUserStats({
        total: totalUsers,
        newToday,
        newWeek,
        newMonth,
        activeToday,
        activeWeek,
        activeMonth,
        retention,
        retentionChange,
      })

      // 小说统计
      const novelsTotal = safeCount(novelsRes.count)
      const totalRead = readCountRes.success
        ? (readCountRes.data || []).reduce((sum, n) => sum + (n.read_count || 0), 0)
        : 0

      // 活跃读者（本周/今日阅读过小说）：复用上方已拉取的阅读类活跃事件
      // （source==='read' 即 user_novels.last_read_at），无需再发两次 getActiveReaders 请求
      const readEvents = activeEvents.filter(e => e.source === 'read')
      const readers = new Set(
        readEvents.filter(e => e.created_at >= weekStart).map(e => e.user_id)
      ).size
      const newReaders = new Set(
        readEvents.filter(e => e.created_at >= todayStart).map(e => e.user_id)
      ).size

      if (!mountedRef.current) return

      setNovelStats({
        total: novelsTotal,
        totalRead,
        readers,
        newReaders,
      })

      // 用户增长趋势（最近30天）
      if (trendRes.success) {
        const counts: Record<string, number> = {}
        for (let i = 29; i >= 0; i--) {
          counts[dayjs().subtract(i, 'day').format('YYYY-MM-DD')] = 0
        }
        for (const u of (trendRes.data || [])) {
          if (u.created_at) {
            counts[dayjs(u.created_at).format('YYYY-MM-DD')] = (counts[dayjs(u.created_at).format('YYYY-MM-DD')] || 0) + 1
          }
        }
        setUserTrendData(Object.entries(counts).map(([date, count]) => ({ date, count })))
      }

      // 最近活动（昵称查询依赖最近活动结果，单独发出，不再阻塞前面的统计）
      if (logsRes.success && logsRes.data && logsRes.data.length > 0) {
        const userIds = [...new Set(logsRes.data.map(l => l.user_id).filter(Boolean))] as string[]
        if (userIds.length > 0) {
          const nickRes = await dashboardService.getUserNicknames(userIds)
          const nickMap = new Map(
            (nickRes.data || []).map(u => [u.id, u.nickname || u.id])
          )
          setRecentActivities(
            logsRes.data.map(l => ({
              ...l,
              user_nickname: l.user_id ? (nickMap.get(l.user_id) || l.user_id) : '系统',
            }))
          )
        } else {
          setRecentActivities(logsRes.data.map(l => ({ ...l, user_nickname: '系统' })))
        }
      } else {
        setRecentActivities([])
      }
    } catch (error) {
      console.error('加载数据失败:', error)
      if (mountedRef.current) message.error('加载数据失败，请检查网络连接后重试')
    } finally {
      if (mountedRef.current) setLoading(false)
    }
  }, [hasPermission])

  // 小说列表
  const loadNovels = useCallback(async (page = novelPagination.pagination.current, pageSize = novelPagination.pagination.pageSize) => {
    setNovelsLoading(true)
    try {
      const from = (page - 1) * pageSize
      const to = from + pageSize - 1
      const { data, error, count } = await supabase
        .from('novels')
        .select('id, title, author, read_count, rating, created_at, category', { count: 'exact' })
        .order('read_count', { ascending: false })
        .range(from, to)

      if (error) throw error
      if (!mountedRef.current) return
      setNovels((data as NovelListItem[]) || [])
      novelPagination.setTotal(count || 0)
    } catch (error) {
      console.error('获取小说列表失败:', error)
      if (mountedRef.current) message.error('获取小说列表失败')
    } finally {
      if (mountedRef.current) setNovelsLoading(false)
    }
  }, [novelPagination.pagination.current, novelPagination.pagination.pageSize])

  // 评论列表
  const loadComments = useCallback(async (page = commentPagination.pagination.current, pageSize = commentPagination.pagination.pageSize) => {
    setCommentsLoading(true)
    try {
      const from = (page - 1) * pageSize
      const to = from + pageSize - 1
      const { data, error, count } = await supabase
        .from('novel_comments')
        .select(`
          id,
          novel_id,
          user_id,
          user_nickname,
          content,
          rating,
          created_at,
          novels: novel_id (title)
        `, { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(from, to)

      if (error) throw error
      if (!mountedRef.current) return
      const processedComments = ((data || []) as unknown as Array<{
        id: string
        novel_id: string
        user_id: string
        user_nickname: string | null
        content: string
        rating: number | null
        created_at: string
        novels: { title: string | null } | { title: string | null }[] | null
      }>).map(comment => {
        const novelData = comment.novels
        return {
          ...comment,
          novel_title: Array.isArray(novelData) ? novelData[0]?.title : novelData?.title,
          novels: undefined,
        }
      })
      setComments(processedComments as unknown as CommentItem[])
      commentPagination.setTotal(count || 0)
    } catch (error) {
      console.error('获取评论列表失败:', error)
      if (mountedRef.current) message.error('获取评论列表失败')
    } finally {
      if (mountedRef.current) setCommentsLoading(false)
    }
  }, [commentPagination.pagination.current, commentPagination.pagination.pageSize])

  useEffect(() => {
    loadStats()
    loadNovels()
    loadComments()
  }, [loadStats, loadNovels, loadComments])

  // 统计卡片
  const statsCards = useMemo(() => [
    {
      title: '总用户数',
      value: userStats.total,
      icon: <UserOutlined style={{ fontSize: 24, color: '#1890ff' }} />,
      change: userStats.newWeek,
      changeLabel: '本周新增',
      link: '/users',
    },
    {
      title: '今日新增用户',
      value: userStats.newToday,
      icon: <RiseOutlined style={{ fontSize: 24, color: '#52c41a' }} />,
      change: userStats.activeToday,
      changeLabel: '今日活跃',
      link: '/users',
    },
    {
      title: '本周活跃用户',
      value: userStats.activeWeek,
      icon: <FireOutlined style={{ fontSize: 24, color: '#fa8c16' }} />,
      change: userStats.newWeek,
      changeLabel: '本周新增',
      link: '/users',
    },
    {
      title: '小说总数',
      value: novelStats.total,
      icon: <BookOutlined style={{ fontSize: 24, color: '#722ed1' }} />,
      change: novelStats.totalRead,
      changeLabel: '总阅读',
      link: '/novels',
    },
    {
      title: '活跃读者',
      value: novelStats.readers,
      icon: <EyeOutlined style={{ fontSize: 24, color: '#13c2c2' }} />,
      change: novelStats.newReaders,
      changeLabel: '今日新增',
      link: '/novels',
    },
    {
      title: '留存率',
      value: `${userStats.retention}%`,
      icon: <ClockCircleOutlined style={{ fontSize: 24, color: '#eb2f96' }} />,
      change: userStats.retentionChange,
      changeLabel: '环比',
      isPercentage: true,
      link: '/users',
    },
  ], [userStats, novelStats])

  // 小说列表列
  const novelColumns: ColumnsType<NovelListItem> = useMemo(() => [
    {
      title: '标题',
      dataIndex: 'title',
      key: 'title',
      render: (title: string) => <Text strong>{title}</Text>,
    },
    {
      title: '作者',
      dataIndex: 'author',
      key: 'author',
      render: (author: string | null) => author || '-',
    },
    {
      title: '分类',
      dataIndex: 'category',
      key: 'category',
      render: (category: string | null) => category || '-',
    },
    {
      title: '阅读量',
      dataIndex: 'read_count',
      key: 'read_count',
      render: (count: number | null) => formatNumber(count || 0),
      sorter: (a, b) => (a.read_count || 0) - (b.read_count || 0),
    },
    {
      title: '评分',
      dataIndex: 'rating',
      key: 'rating',
      render: (rating: number | null) => rating ? `${rating.toFixed(1)} ⭐` : '-',
      sorter: (a, b) => (a.rating || 0) - (b.rating || 0),
    },
    {
      title: '发布时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date: string) => formatDateTime(date),
      sorter: (a, b) => dayjs(a.created_at).unix() - dayjs(b.created_at).unix(),
    },
  ], [])

  // 评论列表列
  const commentColumns: ColumnsType<CommentItem> = useMemo(() => [
    {
      title: '用户',
      key: 'user',
      width: 120,
      render: (_, record) => (
        <Space>
          <Avatar size="small" icon={<UserOutlined />} />
          <Text>{record.user_nickname || '匿名用户'}</Text>
        </Space>
      ),
    },
    {
      title: '小说',
      dataIndex: 'novel_title',
      key: 'novel_title',
      render: (title: string | null) => (
        <Tooltip title={title || '未知小说'}>
          <Text ellipsis style={{ maxWidth: 150 }}>
            {title || '未知小说'}
          </Text>
        </Tooltip>
      ),
    },
    {
      title: '评论内容',
      dataIndex: 'content',
      key: 'content',
      ellipsis: true,
      render: (content: string) => (
        <Tooltip title={content}>
          <Text>{content}</Text>
        </Tooltip>
      ),
    },
    {
      title: '评分',
      dataIndex: 'rating',
      key: 'rating',
      width: 80,
      render: (rating: number | null) => rating ? `${rating} ⭐` : '-',
    },
    {
      title: '评论时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 160,
      render: (date: string) => formatDateTime(date),
    },
  ], [])

  if (!hasPermission('dashboard:read')) {
    return (
      <div style={{ padding: 24, textAlign: 'center' }}>
        <Empty description="暂无仪表盘访问权限" />
      </div>
    )
  }

  return (
    <Spin spinning={loading} tip="加载中...">
      <div style={{ padding: '0 0 24px' }}>
        {/* 统计卡片 */}
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          {statsCards.map((card, index) => (
            <Col xs={24} sm={12} lg={8} xl={8} key={index}>
              <Card
                hoverable
                onClick={() => navigate(card.link)}
                bodyStyle={{ padding: 16 }}
              >
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
                  {card.icon}
                  <Text type="secondary" style={{ marginLeft: 8, fontSize: 14 }}>{card.title}</Text>
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                  <Text style={{ fontSize: 28, fontWeight: 700, color: '#262626' }}>
                    {typeof card.value === 'number' ? formatNumber(card.value) : card.value}
                  </Text>
                  {card.change !== undefined && (
                    <Tag
                      color={card.change >= 0 ? 'success' : 'error'}
                      style={{ fontSize: 12 }}
                    >
                      {card.change >= 0 ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
                      {card.isPercentage ? `${Math.abs(card.change)}%` : Math.abs(card.change)}
                      {card.changeLabel}
                    </Tag>
                  )}
                </div>
              </Card>
            </Col>
          ))}
        </Row>

        {/* 用户增长趋势 */}
        <Card title="用户增长趋势" style={{ marginBottom: 24 }}>
          <div style={{ height: 300 }}>
            <TrendChart data={userTrendData} />
          </div>
        </Card>

        {/* 最近活动 */}
        <Card title="最近活动" style={{ marginBottom: 24 }}>
          {recentActivities.length === 0 ? (
            <Empty description="暂无活动记录" />
          ) : (
            <div>
              {recentActivities.map((activity) => (
                <div key={activity.id} style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '12px 0',
                  borderBottom: '1px solid #f0f0f0',
                }}>
                  <Avatar size="small" icon={<UserOutlined />} style={{ marginRight: 12 }} />
                  <div style={{ flex: 1 }}>
                    <Text strong>{activity.user_nickname || '系统'}</Text>
                    <Text style={{ marginLeft: 8 }}>{activity.action}</Text>
                    {activity.module && (
                      <Tag color="blue" style={{ marginLeft: 8 }}>{activity.module}</Tag>
                    )}
                  </div>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {formatDateTime(activity.created_at)}
                  </Text>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* 小说排行榜 */}
        <Card
          title={
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <BookOutlined style={{ marginRight: 8, color: '#722ed1' }} />
              <span>小说排行榜</span>
            </div>
          }
          style={{ marginBottom: 24 }}
        >
          <Table
            columns={novelColumns}
            dataSource={novels}
            rowKey="id"
            loading={novelsLoading}
            pagination={{
              ...novelPagination.tablePagination,
              pageSizeOptions: ['10', '20', '50'],
              showTotal: (total, range) => `显示 ${range[0]}-${range[1]} 条，共 ${total} 条`,
              onChange: (page, pageSize) => {
                novelPagination.handlePageChange(page, pageSize)
                loadNovels(page, pageSize)
              },
            }}
            size="small"
          />
        </Card>

        {/* 最新评论 */}
        <Card
          title={
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <MessageOutlined style={{ marginRight: 8, color: '#52c41a' }} />
              <span>最新评论</span>
            </div>
          }
        >
          <Table
            columns={commentColumns}
            dataSource={comments}
            rowKey="id"
            loading={commentsLoading}
            pagination={{
              ...commentPagination.tablePagination,
              pageSizeOptions: ['10', '20', '50'],
              showTotal: (total, range) => `显示 ${range[0]}-${range[1]} 条，共 ${total} 条`,
              onChange: (page, pageSize) => {
                commentPagination.handlePageChange(page, pageSize)
                loadComments(page, pageSize)
              },
            }}
            size="small"
          />
        </Card>
      </div>
    </Spin>
  )
}

// ==================== 趋势图组件 ====================

const TrendChart: React.FC<{ data: { date: string; count: number }[] }> = ({ data }) => {
  if (data.length === 0) {
    return <Empty description="暂无数据" />
  }

  const maxCount = Math.max(...data.map(d => d.count), 1)
  const barWidth = Math.max(20, 800 / data.length)

  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', height: '100%', gap: 2, padding: '20px 0' }}>
      {data.map((item, index) => {
        const height = (item.count / maxCount) * 250
        const isToday = dayjs(item.date).isSame(dayjs(), 'day')
        return (
          <Tooltip key={index} title={`${item.date}: ${item.count} 人`}>
            <div style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              cursor: 'pointer',
            }}>
              <div style={{
                width: barWidth,
                height: Math.max(height, 4),
                backgroundColor: isToday ? '#1890ff' : '#91d5ff',
                borderRadius: '2px 2px 0 0',
                transition: 'height 0.3s',
              }} />
              <Text type="secondary" style={{ fontSize: 10, marginTop: 4, transform: 'rotate(-45deg)', transformOrigin: 'top left' }}>
                {dayjs(item.date).format('MM-DD')}
              </Text>
            </div>
          </Tooltip>
        )
      })}
    </div>
  )
}

export default Dashboard
