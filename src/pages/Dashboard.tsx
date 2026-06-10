import React, { useEffect, useState } from 'react'
import { Row, Col, Card, Statistic, Spin, Tag, Table, Progress } from 'antd'
import {
  UserOutlined,
  UserAddOutlined,
  TeamOutlined,
  RiseOutlined,
  FallOutlined,
  DashboardOutlined,
  FileTextOutlined,
  HeartOutlined,
  BookOutlined,
  WalletOutlined,
  ReadOutlined,
  FireOutlined,
} from '@ant-design/icons'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import dayjs from 'dayjs'
import { supabase } from '../utils/supabase'
import { useDictOptions, useDictColors } from '../hooks/useDictOptions'

// ==================== 类型定义 ====================
interface UserTrendItem {
  date: string
  newUsers: number
  activeUsers: number
}

interface UserActivityItem {
  id: string
  userId: string
  userName: string
  action: string
  module: string
  time: string
}

interface ModuleUsageItem {
  module: string
  count: number
  percentage: number
}

interface DashboardStats {
  totalUsers: number
  todayNewUsers: number
  activeUsers7d: number
  activeUsers30d: number
  userTrendPercent: number
  activeTrendPercent: number
}

const Dashboard: React.FC = () => {
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [userTrend, setUserTrend] = useState<UserTrendItem[]>([])
  const [recentActivities, setRecentActivities] = useState<UserActivityItem[]>([])
  const [moduleUsage, setModuleUsage] = useState<ModuleUsageItem[]>([])
  // 小说统计
  const [novelDashboardStats, setNovelDashboardStats] = useState({
    totalNovels: 0,
    totalReadCount: 0,
    activeReaders: 0,
  })

  // 字典查询
  const { options: actionOptions } = useDictOptions('operation_action', [])
  const { options: moduleOptions } = useDictOptions('operation_module', [])
  const { getColor: getActionColor } = useDictColors('operation_action')

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      const now = dayjs()
      const todayStart = now.startOf('day').format('YYYY-MM-DDTHH:mm:ss')
      const sevenDaysAgo = now.subtract(7, 'day').startOf('day').format('YYYY-MM-DDTHH:mm:ss')
      const fourteenDaysAgo = now.subtract(14, 'day').startOf('day').format('YYYY-MM-DDTHH:mm:ss')
      const thirtyDaysAgo = now.subtract(30, 'day').startOf('day').format('YYYY-MM-DDTHH:mm:ss')

      // 并行查询
      const [
        usersCountRes,
        todayNewUsersRes,
        weekNewUsersRes,
        lastWeekNewUsersRes,
        operationLogs7dRes,
        operationLogs14dRes,
        usersTrendRes,
        recentLogsRes,
        novelsCountRes,
        novelsReadCountRes,
        userNovelsActiveRes,
      ] = await Promise.all([
        // 总用户数
        supabase.from('users').select('*', { count: 'exact', head: true }),
        // 今日新增用户
        supabase.from('users').select('id', { count: 'exact', head: true }).gte('created_at', todayStart),
        // 本周新增用户
        supabase.from('users').select('id', { count: 'exact', head: true }).gte('created_at', sevenDaysAgo),
        // 上周新增用户
        supabase.from('users').select('id', { count: 'exact', head: true }).gte('created_at', fourteenDaysAgo).lt('created_at', sevenDaysAgo),
        // 最近7天活跃用户（包含模块信息）
        supabase.from('operation_logs').select('user_id, module').gte('created_at', sevenDaysAgo),
        // 上周活跃用户
        supabase.from('operation_logs').select('user_id').gte('created_at', fourteenDaysAgo).lt('created_at', sevenDaysAgo),
        // 用户增长趋势（30天）
        supabase.from('users').select('created_at').gte('created_at', thirtyDaysAgo),
        // 最近操作日志
        supabase.from('operation_logs').select('id, user_id, action, module, created_at').order('created_at', { ascending: false }).limit(20),
        // 小说总数
        supabase.from('novels').select('id', { count: 'exact', head: true }),
        // 小说总阅读量
        supabase.from('novels').select('read_count'),
        // 活跃读者数（user_novels 最近7天有阅读记录的用户）
        supabase.from('user_novels').select('user_id, last_read_at').gte('last_read_at', sevenDaysAgo),
      ])

      // ==================== 基础统计 ====================
      const totalUsers = usersCountRes.count || 0
      const todayNewUsers = todayNewUsersRes.count || 0
      const weekNewUsers = weekNewUsersRes.count || 0
      const lastWeekNewUsers = lastWeekNewUsersRes.count || 0

      // 活跃用户（去重）
      const activeUserIds7d = new Set(operationLogs7dRes.data?.map(l => l.user_id).filter(Boolean) || [])
      const activeUserIds14d = new Set(operationLogs14dRes.data?.map(l => l.user_id).filter(Boolean) || [])
      const activeUsers7d = activeUserIds7d.size
      const lastWeekActive = activeUserIds14d.size - activeUserIds7d.size

      // 趋势计算
      const userTrendPercent = lastWeekNewUsers > 0 
        ? parseFloat((((weekNewUsers - lastWeekNewUsers) / lastWeekNewUsers) * 100).toFixed(1)) 
        : weekNewUsers > 0 ? 100 : 0
      const activeTrendPercent = lastWeekActive > 0 
        ? parseFloat((((activeUsers7d - lastWeekActive) / lastWeekActive) * 100).toFixed(1)) 
        : activeUsers7d > 0 ? 100 : 0

      setStats({
        totalUsers,
        todayNewUsers,
        activeUsers7d,
        activeUsers30d: activeUserIds7d.size, // 简化用7天数据
        userTrendPercent,
        activeTrendPercent,
      })

      // ==================== 用户增长趋势（30天） ====================
      const usersTrendData = usersTrendRes.data || []
      const newUsersByDate: Record<string, number> = {}
      usersTrendData.forEach(u => {
        const dateKey = dayjs(u.created_at).format('MM-DD')
        newUsersByDate[dateKey] = (newUsersByDate[dateKey] || 0) + 1
      })

      const trendItems: UserTrendItem[] = []
      for (let i = 29; i >= 0; i--) {
        const dateKey = now.subtract(i, 'day').format('MM-DD')
        trendItems.push({
          date: dateKey,
          newUsers: newUsersByDate[dateKey] || 0,
          activeUsers: Math.floor(Math.random() * 10) + 5, // 模拟活跃数据
        })
      }
      setUserTrend(trendItems)

      // ==================== 最近动态 ====================
      // 获取用户昵称
      const userIds = [...new Set(recentLogsRes.data?.map(l => l.user_id).filter(Boolean) || [])]
      let userNames: Record<string, string> = {}
      if (userIds.length > 0) {
        const { data: users } = await supabase
          .from('users')
          .select('id, nickname')
          .in('id', userIds)
        users?.forEach(u => { userNames[u.id] = u.nickname || '未知用户' })
      }

      const activities: UserActivityItem[] = (recentLogsRes.data || []).map(log => ({
        id: log.id,
        userId: log.user_id,
        userName: userNames[log.user_id] || '未知用户',
        action: log.action || '',
        module: log.module || '',
        time: dayjs(log.created_at).format('MM-DD HH:mm'),
      }))
      setRecentActivities(activities)

      // ==================== 模块使用统计 ====================
      const moduleCounts: Record<string, number> = {}
      ;(operationLogs7dRes.data || []).forEach((log: any) => {
        if (log.module) {
          moduleCounts[log.module] = (moduleCounts[log.module] || 0) + 1
        }
      })
      const totalOperations = Object.values(moduleCounts).reduce((a, b) => a + b, 0) || 1
      const moduleItems: ModuleUsageItem[] = Object.entries(moduleCounts)
        .map(([module, count]) => ({
          module,
          count,
          percentage: parseFloat(((count / totalOperations) * 100).toFixed(1)),
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 6)
      setModuleUsage(moduleItems)

      // ==================== 小说统计 ====================
      const totalNovels = novelsCountRes.count || 0
      const totalNovelReadCount = novelsReadCountRes.data?.reduce((sum, n) => sum + (n.read_count || 0), 0) || 0
      const activeReaderIds = new Set(userNovelsActiveRes.data?.map(n => n.user_id).filter(Boolean) || [])
      setNovelDashboardStats({
        totalNovels,
        totalReadCount: totalNovelReadCount,
        activeReaders: activeReaderIds.size,
      })

    } catch (error) {
      console.error('获取仪表盘数据失败:', error)
    } finally {
      setLoading(false)
    }
  }

  // ==================== 渲染 ====================
  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 0' }}>
        <Spin size="large" />
      </div>
    )
  }

  const COLORS = ['#1890ff', '#52c41a', '#faad14', '#ff4d4f', '#722ed1', '#13c2c2']

  return (
    <div style={{ padding: 24 }}>
      {/* ==================== 核心指标卡片 ==================== */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="总用户数"
              value={stats?.totalUsers || 0}
              prefix={<TeamOutlined style={{ color: '#1890ff' }} />}
              valueStyle={{ color: '#1890ff' }}
            />
            <div style={{ marginTop: 8, fontSize: 12, color: '#999' }}>
              累计注册用户
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="今日新增用户"
              value={stats?.todayNewUsers || 0}
              prefix={<UserAddOutlined style={{ color: '#52c41a' }} />}
              valueStyle={{ color: '#52c41a' }}
            />
            <div style={{ marginTop: 8 }}>
              {stats?.userTrendPercent !== undefined && (
                <Tag color={stats.userTrendPercent >= 0 ? 'green' : 'red'}>
                  {stats.userTrendPercent >= 0 ? <RiseOutlined /> : <FallOutlined />}
                  {' '}{Math.abs(stats.userTrendPercent)}% 较上周
                </Tag>
              )}
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="活跃用户（7天）"
              value={stats?.activeUsers7d || 0}
              prefix={<UserOutlined style={{ color: '#722ed1' }} />}
              valueStyle={{ color: '#722ed1' }}
            />
            <div style={{ marginTop: 8 }}>
              {stats?.activeTrendPercent !== undefined && (
                <Tag color={stats.activeTrendPercent >= 0 ? 'green' : 'red'}>
                  {stats.activeTrendPercent >= 0 ? <RiseOutlined /> : <FallOutlined />}
                  {' '}{Math.abs(stats.activeTrendPercent)}% 较上周
                </Tag>
              )}
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="用户活跃率"
              value={stats?.totalUsers ? parseFloat(((stats.activeUsers7d / stats.totalUsers) * 100).toFixed(1)) : 0}
              suffix="%"
              prefix={<DashboardOutlined style={{ color: '#faad14' }} />}
              valueStyle={{ color: '#faad14' }}
            />
            <div style={{ marginTop: 8, fontSize: 12, color: '#999' }}>
              7天内活跃用户占比
            </div>
          </Card>
        </Col>
      </Row>

      {/* ==================== 小说统计卡片 ==================== */}
      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="小说总数"
              value={novelDashboardStats.totalNovels}
              prefix={<BookOutlined style={{ color: '#1890ff' }} />}
              valueStyle={{ color: '#1890ff' }}
            />
            <div style={{ marginTop: 8, fontSize: 12, color: '#999' }}>
              平台收录小说总量
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="总阅读量"
              value={novelDashboardStats.totalReadCount}
              prefix={<ReadOutlined style={{ color: '#ff7a45' }} />}
              valueStyle={{ color: '#ff7a45' }}
            />
            <div style={{ marginTop: 8, fontSize: 12, color: '#999' }}>
              所有小说累计阅读次数
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="活跃读者数"
              value={novelDashboardStats.activeReaders}
              prefix={<FireOutlined style={{ color: '#52c41a' }} />}
              valueStyle={{ color: '#52c41a' }}
            />
            <div style={{ marginTop: 8, fontSize: 12, color: '#999' }}>
              最近7天有阅读记录的用户
            </div>
          </Card>
        </Col>
      </Row>

      {/* ==================== 用户增长趋势 ==================== */}
      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={16}>
          <Card title="用户增长趋势（30天）" extra={<Tag color="blue">每日新增</Tag>}>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={userTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="newUsers"
                  name="新增用户"
                  stroke="#1890ff"
                  fill="#1890ff"
                  fillOpacity={0.3}
                />
              </AreaChart>
            </ResponsiveContainer>
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card title="功能模块使用分布（7天）">
            {moduleUsage.length > 0 ? (
              moduleUsage.map((item, index) => (
                <div key={item.module} style={{ marginBottom: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span>{item.module}</span>
                    <span style={{ color: COLORS[index % COLORS.length] }}>{item.count} 次</span>
                  </div>
                  <Progress
                    percent={item.percentage}
                    strokeColor={COLORS[index % COLORS.length]}
                    showInfo={false}
                    size="small"
                  />
                </div>
              ))
            ) : (
              <div style={{ textAlign: 'center', color: '#999', padding: 40 }}>暂无数据</div>
            )}
          </Card>
        </Col>
      </Row>

      {/* ==================== 最近用户动态 ==================== */}
      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24}>
          <Card title="最近用户动态">
            <Table
              dataSource={recentActivities}
              rowKey="id"
              size="small"
              pagination={{ pageSize: 10 }}
              columns={[
                {
                  title: '用户',
                  dataIndex: 'userName',
                  key: 'userName',
                  render: (text: string) => <Tag color="blue">{text}</Tag>,
                },
                {
                  title: '操作',
                  dataIndex: 'action',
                  key: 'action',
                  render: (text: string) => {
                    const colorMapFallback: Record<string, string> = {
                      'create': 'green',
                      'update': 'blue',
                      'delete': 'red',
                      'login': 'purple',
                      'view': 'default',
                    }
                    const dictOpt = actionOptions.find(opt => opt.value === text)
                    return <Tag color={getActionColor(text) || colorMapFallback[text] || 'default'}>{dictOpt?.label || text}</Tag>
                  },
                },
                {
                  title: '模块',
                  dataIndex: 'module',
                  key: 'module',
                  render: (text: string) => {
                    const iconMapFallback: Record<string, React.ReactNode> = {
                      'expenses': <WalletOutlined />,
                      'mood_diaries': <HeartOutlined />,
                      'notes': <FileTextOutlined />,
                      'novels': <BookOutlined />,
                      'users': <UserOutlined />,
                    }
                    const dictOpt = moduleOptions.find(opt => opt.value === text)
                    return (
                      <span>
                        {iconMapFallback[text] || null} {dictOpt?.label || text}
                      </span>
                    )
                  },
                },
                {
                  title: '时间',
                  dataIndex: 'time',
                  key: 'time',
                  render: (text: string) => <span style={{ color: '#999' }}>{text}</span>,
                },
              ]}
            />
          </Card>
        </Col>
      </Row>
    </div>
  )
}

export default Dashboard
