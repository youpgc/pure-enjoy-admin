import React, { useEffect, useState, useCallback } from 'react'
import { Row, Col, Card, Statistic, Spin, Table, Tag, Empty, Badge, Progress, Tabs, Space, Button } from 'antd'
import {
  DatabaseOutlined,
  ApiOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  ReloadOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import { usePermission } from '../hooks/usePermission'
import { supabase, reportError } from '../utils/supabase'
import type { DbTableStat, AlertItem } from '../utils/mockData'

// 错误日志类型
interface ErrorLog {
  id: string
  level: 'error' | 'warning' | 'info'
  module: string
  message: string
  detail?: string
  created_at: string
  user_id?: string
}

// ==================== 系统概览统计 ====================
interface SystemStats {
  totalUsers: number
  totalTables: number
  apiCallToday: number
  errorCount: number
  version: string
}

// 懒加载的图表组件
const SystemOverviewCards: React.FC<{ stats: SystemStats | null; loading: boolean }> = React.lazy(() => 
  import('../components/lazy/SystemOverviewCards').then(m => ({ default: m.SystemOverviewCards }))
)

const DatabaseTableList: React.FC<{ data: DbTableStat[]; loading: boolean }> = React.lazy(() => 
  import('../components/lazy/DatabaseTableList').then(m => ({ default: m.DatabaseTableList }))
)

const ErrorAlertList: React.FC<{ data: ErrorLog[]; loading: boolean }> = React.lazy(() => 
  import('../components/lazy/ErrorAlertList').then(m => ({ default: m.ErrorAlertList }))
)

const SystemMonitor: React.FC = () => {
  const { isAdmin } = usePermission()
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')
  const [stats, setStats] = useState<SystemStats | null>(null)
  const [dbTableStats, setDbTableStats] = useState<DbTableStat[]>([])
  const [errorLogs, setErrorLogs] = useState<ErrorLog[]>([])
  const [refreshKey, setRefreshKey] = useState(0)

  // 加载系统数据
  const fetchSystemData = useCallback(async () => {
    setLoading(true)
    try {
      const now = dayjs()
      const todayStart = now.startOf('day').format('YYYY-MM-DD HH:mm:ss')
      const sevenDaysAgo = now.subtract(7, 'day').format('YYYY-MM-DD HH:mm:ss')

      // ==================== 核心统计（并行查询）====================
      const [usersRes, tablesRes, todayLogsRes, errorLogsRes, versionRes] = await Promise.all([
        // 用户总数
        supabase.from('users').select('*', { count: 'exact', head: true }),
        // 各表记录数（只查核心表）
        Promise.all([
          supabase.from('expenses').select('*', { count: 'exact', head: true }),
          supabase.from('mood_diaries').select('*', { count: 'exact', head: true }),
          supabase.from('weight_records').select('*', { count: 'exact', head: true }),
          supabase.from('notes').select('*', { count: 'exact', head: true }),
          supabase.from('novels').select('*', { count: 'exact', head: true }),
          supabase.from('user_novels').select('*', { count: 'exact', head: true }),
          supabase.from('operation_logs').select('*', { count: 'exact', head: true }),
        ]),
        // 今日操作日志
        supabase.from('operation_logs').select('id', { count: 'exact', head: true }).gte('created_at', todayStart),
        // 最近7天错误日志
        supabase.from('error_logs').select('id, level, module, message, detail, created_at, user_id').gte('created_at', sevenDaysAgo).limit(50),
        // 最新版本
        supabase.from('app_versions').select('version').order('created_at', { ascending: false }).limit(1),
      ])

      const totalUsers = usersRes.count || 0
      const tableCounts = tablesRes.map(r => r.count || 0)
      const totalTables = tableCounts.reduce((sum, count) => sum + count, 0)
      const todayLogs = todayLogsRes.count || 0
      const errorLogsData = errorLogsRes.data || []
      const errorCount = errorLogsData.filter((l: ErrorLog) => l.level === 'error').length
      const latestVersion = versionRes.data?.[0]?.version || 'v1.0.0'

      setStats({
        totalUsers,
        totalTables,
        apiCallToday: todayLogs,
        errorCount,
        version: latestVersion,
      })

      // 构建数据库表统计
      const tableNames = ['消费记录', '心情日记', '体重记录', '笔记', '小说', '用户小说', '操作日志']
      setDbTableStats(tableNames.map((name, i) => ({
        tableName: name,
        displayName: `${name}表`,
        rowCount: tableCounts[i],
        size: '-',
        lastUpdate: '-',
      })))

      setErrorLogs(errorLogsData)

      console.log('[SystemMonitor] 数据加载完成:', { totalUsers, totalTables, todayLogs, errorCount })
    } catch (err) {
      console.error('[SystemMonitor] 数据加载失败:', err)
      // 不调用 reportError，避免递归
    } finally {
      setLoading(false)
    }
  }, [refreshKey])

  useEffect(() => {
    if (isAdmin) {
      fetchSystemData()
    }
  }, [isAdmin, fetchSystemData])

  // 刷新数据
  const handleRefresh = () => {
    setRefreshKey(k => k + 1)
  }

  // 加载指示器
  const LoadingIndicator = () => (
    <div style={{ textAlign: 'center', padding: 40 }}>
      <Spin size="large" />
      <div style={{ marginTop: 16 }}>加载中...</div>
    </div>
  )

  // 核心指标卡片
  const OverviewContent = () => (
    <Row gutter={[16, 16]}>
      <Col xs={24} sm={12} lg={6}>
        <Card>
          <Statistic
            title="注册用户"
            value={stats?.totalUsers || 0}
            prefix={<DatabaseOutlined />}
            loading={loading}
          />
        </Card>
      </Col>
      <Col xs={24} sm={12} lg={6}>
        <Card>
          <Statistic
            title="今日操作"
            value={stats?.apiCallToday || 0}
            prefix={<ApiOutlined />}
            loading={loading}
          />
        </Card>
      </Col>
      <Col xs={24} sm={12} lg={6}>
        <Card>
          <Statistic
            title="近7天错误"
            value={stats?.errorCount || 0}
            prefix={<ExclamationCircleOutlined />}
            valueStyle={{ color: (stats?.errorCount || 0) > 0 ? '#cf1322' : '#3f8600' }}
            loading={loading}
          />
        </Card>
      </Col>
      <Col xs={24} sm={12} lg={6}>
        <Card>
          <Statistic
            title="数据总量"
            value={stats?.totalTables || 0}
            suffix="条"
            prefix={<DatabaseOutlined />}
            loading={loading}
          />
        </Card>
      </Col>
    </Row>
  )

  // 数据库表统计
  const DatabaseContent = () => (
    <React.Suspense fallback={<LoadingIndicator />}>
      <Table
        dataSource={dbTableStats}
        rowKey="tableName"
        loading={loading}
        pagination={false}
        columns={[
          { title: '表名', dataIndex: 'displayName', key: 'displayName' },
          { title: '记录数', dataIndex: 'rowCount', key: 'rowCount', render: (v: number) => v.toLocaleString() },
          { title: '预估大小', dataIndex: 'size', key: 'size' },
          { title: '最后更新', dataIndex: 'lastUpdate', key: 'lastUpdate' },
        ]}
      />
    </React.Suspense>
  )

  // 错误日志
  const ErrorContent = () => (
    <React.Suspense fallback={<LoadingIndicator />}>
      <Table
        dataSource={errorLogs}
        rowKey="id"
        loading={loading}
        pagination={{ pageSize: 10 }}
        columns={[
          { 
            title: '级别', 
            dataIndex: 'level', 
            key: 'level',
            render: (level: string) => (
              <Tag color={level === 'error' ? 'red' : level === 'warning' ? 'orange' : 'blue'}>
                {level === 'error' ? '错误' : level === 'warning' ? '警告' : '信息'}
              </Tag>
            )
          },
          { title: '模块', dataIndex: 'module', key: 'module' },
          { title: '消息', dataIndex: 'message', key: 'message', ellipsis: true },
          { title: '时间', dataIndex: 'created_at', key: 'created_at', render: (t: string) => dayjs(t).format('MM-DD HH:mm:ss') },
        ]}
      />
    </React.Suspense>
  )

  if (!isAdmin) {
    return <Empty description="仅管理员可访问此页面" />
  }

  return (
    <div>
      {/* 页面头部 */}
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>系统监控</h2>
        <Space>
          <span style={{ color: '#666' }}>版本: {stats?.version || '-'}</span>
          <Button icon={<ReloadOutlined />} onClick={handleRefresh} loading={loading}>
            刷新
          </Button>
        </Space>
      </div>

      {/* 概览卡片 */}
      <React.Suspense fallback={<LoadingIndicator />}>
        <OverviewContent />
      </React.Suspense>

      {/* 标签页 */}
      <Card style={{ marginTop: 16 }}>
        <Tabs 
          activeKey={activeTab} 
          onChange={setActiveTab}
          items={[
            { key: 'overview', label: '数据库统计', children: <DatabaseContent /> },
            { key: 'errors', label: `错误日志 (${errorLogs.length})`, children: <ErrorContent /> },
          ]}
        />
      </Card>
    </div>
  )
}

export default SystemMonitor
