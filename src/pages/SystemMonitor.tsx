import React, { useState, useEffect, useCallback, useRef } from 'react'
import {
  Card,
  Row,
  Col,
  Statistic,
  Table,
  Tag,
  Progress,
  Timeline,
  Alert,
  Button,
  Spin,
  Empty,
  Badge,
  Tooltip,
  Tabs,
  List,
  Typography,
  Space,
} from 'antd'
import {
  DatabaseOutlined,
  CloudServerOutlined,
  ReloadOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  ClockCircleOutlined,
  FileTextOutlined,
  WarningOutlined,
} from '@ant-design/icons'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, AreaChart, Area } from 'recharts'
import dayjs from 'dayjs'
import { supabase } from '../utils/supabase'
import { apiQuery, handleApiError } from '../utils/apiClient'

const { Text } = Typography
const { TabPane } = Tabs

// ==================== 类型定义 ====================

interface SystemMetric {
  timestamp: string
  cpu_usage: number
  memory_usage: number
  disk_usage: number
  network_in: number
  network_out: number
}

interface TableInfo {
  name: string
  row_count: number
  size_bytes: number
  last_vacuum: string | null
  last_analyze: string | null
}

interface ConnectionInfo {
  pid: number
  usename: string
  application_name: string
  client_addr: string
  state: string
  query_start: string | null
  state_change: string | null
  query: string | null
}

interface SlowQuery {
  query: string
  calls: number
  total_time: number
  mean_time: number
  max_time: number
}

interface SystemStatus {
  database: 'connected' | 'disconnected' | 'error'
  storage: 'healthy' | 'warning' | 'critical'
  auth: 'healthy' | 'warning' | 'error'
  realtime: 'healthy' | 'warning' | 'error'
}

// ==================== 组件 ====================

const SystemMonitor: React.FC = () => {
  const [loading, setLoading] = useState(false)
  const [metrics, setMetrics] = useState<SystemMetric[]>([])
  const [tables, setTables] = useState<TableInfo[]>([])
  const [connections, setConnections] = useState<ConnectionInfo[]>([])
  const [slowQueries, setSlowQueries] = useState<SlowQuery[]>([])
  const [status, setStatus] = useState<SystemStatus>({
    database: 'connected',
    storage: 'healthy',
    auth: 'healthy',
    realtime: 'healthy',
  })
  const [dbSize, setDbSize] = useState(0)
  const [activeConnections, setActiveConnections] = useState(0)
  const [maxConnections, setMaxConnections] = useState(100)
  const [uptime, setUptime] = useState(0)
  const autoRefreshRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // 获取系统指标
  const fetchMetrics = useCallback(async () => {
    try {
      // 模拟获取系统指标数据（实际项目中可能需要后端API支持）
      const now = dayjs()
      const newMetrics: SystemMetric[] = []
      for (let i = 29; i >= 0; i--) {
        const timestamp = now.subtract(i, 'minute').format('HH:mm')
        newMetrics.push({
          timestamp,
          cpu_usage: Math.random() * 30 + 20,
          memory_usage: Math.random() * 20 + 40,
          disk_usage: Math.random() * 10 + 50,
          network_in: Math.random() * 100 + 50,
          network_out: Math.random() * 100 + 50,
        })
      }
      setMetrics(newMetrics)
    } catch (error) {
      handleApiError(error, 'SystemMonitor-获取指标')
    }
  }, [])

  // 获取表信息
  const fetchTableInfo = useCallback(async () => {
    try {
      const result = await apiQuery(
        () => supabase.rpc('get_table_stats'),
        'SystemMonitor-表统计'
      )
      if (result.success) {
        setTables((result.data as any) || [])
      }
    } catch (error) {
      handleApiError(error, 'SystemMonitor-表信息')
    }
  }, [])

  // 获取连接信息
  const fetchConnections = useCallback(async () => {
    try {
      const result = await apiQuery(
        () => supabase.rpc('get_connections'),
        'SystemMonitor-连接信息'
      )
      if (result.success) {
        setConnections((result.data as any) || [])
      }
    } catch (error) {
      handleApiError(error, 'SystemMonitor-连接信息')
    }
  }, [])

  // 获取慢查询
  const fetchSlowQueries = useCallback(async () => {
    try {
      const result = await apiQuery(
        () => supabase.rpc('get_slow_queries'),
        'SystemMonitor-慢查询'
      )
      if (result.success) {
        setSlowQueries((result.data as any) || [])
      }
    } catch (error) {
      handleApiError(error, 'SystemMonitor-慢查询')
    }
  }, [])

  // 获取数据库状态
  const fetchDatabaseStatus = useCallback(async () => {
    try {
      const [sizeResult, connResult, uptimeResult] = await Promise.all([
        apiQuery(() => supabase.rpc('get_database_size'), 'SystemMonitor-数据库大小'),
        apiQuery(() => supabase.rpc('get_active_connections'), 'SystemMonitor-活跃连接'),
        apiQuery(() => supabase.rpc('get_uptime'), 'SystemMonitor-运行时间'),
      ])

      if (sizeResult.success) {
        setDbSize((sizeResult.data as any) || 0)
      }
      if (connResult.success) {
        const connData = connResult.data as any
        setActiveConnections(connData?.active || 0)
        setMaxConnections(connData?.max || 100)
      }
      if (uptimeResult.success) {
        setUptime((uptimeResult.data as any) || 0)
      }

      // 检查数据库连接状态
      const healthResult = await apiQuery(
        () => supabase.from('users').select('id', { count: 'exact', head: true }),
        'SystemMonitor-健康检查'
      )
      setStatus(prev => ({
        ...prev,
        database: healthResult.success ? 'connected' : 'error',
      }))
    } catch (error) {
      handleApiError(error, 'SystemMonitor-数据库状态')
      setStatus(prev => ({ ...prev, database: 'error' }))
    }
  }, [])

  // 加载所有数据
  const loadAllData = useCallback(async () => {
    setLoading(true)
    await Promise.all([
      fetchMetrics(),
      fetchTableInfo(),
      fetchConnections(),
      fetchSlowQueries(),
      fetchDatabaseStatus(),
    ])
    setLoading(false)
  }, [fetchMetrics, fetchTableInfo, fetchConnections, fetchSlowQueries, fetchDatabaseStatus])

  // 自动刷新
  useEffect(() => {
    loadAllData()
    autoRefreshRef.current = setInterval(() => {
      fetchDatabaseStatus()
      fetchMetrics()
    }, 30000)
    return () => {
      if (autoRefreshRef.current) {
        clearInterval(autoRefreshRef.current)
      }
    }
  }, [loadAllData, fetchDatabaseStatus, fetchMetrics])

  // 格式化字节大小
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  // 格式化运行时间
  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400)
    const hours = Math.floor((seconds % 86400) / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    return `${days}天 ${hours}小时 ${minutes}分钟`
  }

  // 表格列定义
  const tableColumns = [
    {
      title: '表名',
      dataIndex: 'name',
      key: 'name',
      render: (name: string) => <Text strong>{name}</Text>,
    },
    {
      title: '行数',
      dataIndex: 'row_count',
      key: 'row_count',
      render: (count: number) => count?.toLocaleString() || 0,
    },
    {
      title: '大小',
      dataIndex: 'size_bytes',
      key: 'size_bytes',
      render: (size: number) => formatBytes(size),
    },
    {
      title: '最后清理',
      dataIndex: 'last_vacuum',
      key: 'last_vacuum',
      render: (date: string | null) => date ? dayjs(date).format('YYYY-MM-DD HH:mm') : '-',
    },
  ]

  const connectionColumns = [
    {
      title: 'PID',
      dataIndex: 'pid',
      key: 'pid',
      width: 80,
    },
    {
      title: '用户',
      dataIndex: 'usename',
      key: 'usename',
    },
    {
      title: '应用',
      dataIndex: 'application_name',
      key: 'application_name',
    },
    {
      title: '状态',
      dataIndex: 'state',
      key: 'state',
      render: (state: string) => (
        <Badge
          status={state === 'active' ? 'processing' : state === 'idle' ? 'success' : 'default'}
          text={state}
        />
      ),
    },
    {
      title: '查询开始',
      dataIndex: 'query_start',
      key: 'query_start',
      render: (date: string | null) => date ? dayjs(date).format('HH:mm:ss') : '-',
    },
  ]

  const slowQueryColumns = [
    {
      title: '查询',
      dataIndex: 'query',
      key: 'query',
      ellipsis: true,
      render: (query: string) => (
        <Tooltip title={query}>
          <span>{query.substring(0, 100)}...</span>
        </Tooltip>
      ),
    },
    {
      title: '调用次数',
      dataIndex: 'calls',
      key: 'calls',
      width: 100,
    },
    {
      title: '总时间(ms)',
      dataIndex: 'total_time',
      key: 'total_time',
      width: 120,
      render: (time: number) => time?.toFixed(2),
    },
    {
      title: '平均时间(ms)',
      dataIndex: 'mean_time',
      key: 'mean_time',
      width: 130,
      render: (time: number) => time?.toFixed(2),
    },
    {
      title: '最大时间(ms)',
      dataIndex: 'max_time',
      key: 'max_time',
      width: 130,
      render: (time: number) => (
        <Tag color={time > 1000 ? 'red' : time > 100 ? 'orange' : 'green'}>
          {time?.toFixed(2)}
        </Tag>
      ),
    },
  ]

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected':
      case 'healthy':
        return <CheckCircleOutlined style={{ color: '#52c41a' }} />
      case 'warning':
        return <WarningOutlined style={{ color: '#faad14' }} />
      case 'error':
      case 'disconnected':
        return <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />
      default:
        return <ClockCircleOutlined />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected':
      case 'healthy':
        return 'green'
      case 'warning':
        return 'orange'
      case 'error':
      case 'disconnected':
        return 'red'
      default:
        return 'default'
    }
  }

  return (
    <div style={{ padding: 24 }}>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>系统监控</h2>
        <Button icon={<ReloadOutlined />} onClick={loadAllData} loading={loading}>
          刷新
        </Button>
      </div>

      {/* 状态概览 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="数据库状态"
              value={status.database === 'connected' ? '正常' : '异常'}
              prefix={getStatusIcon(status.database)}
              valueStyle={{ color: status.database === 'connected' ? '#52c41a' : '#ff4d4f' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="数据库大小"
              value={formatBytes(dbSize)}
              prefix={<DatabaseOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="活跃连接"
              value={`${activeConnections} / ${maxConnections}`}
              prefix={<CloudServerOutlined />}
            />
            <Progress
              percent={Math.round((activeConnections / maxConnections) * 100)}
              size="small"
              status={activeConnections / maxConnections > 0.8 ? 'exception' : 'normal'}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="运行时间"
              value={formatUptime(uptime)}
              prefix={<ClockCircleOutlined />}
            />
          </Card>
        </Col>
      </Row>

      {/* 服务状态 */}
      <Card style={{ marginBottom: 16 }}>
        <Row gutter={16}>
          <Col span={6}>
            <Space>
              {getStatusIcon(status.database)}
              <Text>数据库</Text>
              <Tag color={getStatusColor(status.database)}>
                {status.database === 'connected' ? '正常' : status.database}
              </Tag>
            </Space>
          </Col>
          <Col span={6}>
            <Space>
              {getStatusIcon(status.storage)}
              <Text>存储</Text>
              <Tag color={getStatusColor(status.storage)}>
                {status.storage === 'healthy' ? '正常' : status.storage}
              </Tag>
            </Space>
          </Col>
          <Col span={6}>
            <Space>
              {getStatusIcon(status.auth)}
              <Text>认证</Text>
              <Tag color={getStatusColor(status.auth)}>
                {status.auth === 'healthy' ? '正常' : status.auth}
              </Tag>
            </Space>
          </Col>
          <Col span={6}>
            <Space>
              {getStatusIcon(status.realtime)}
              <Text>实时</Text>
              <Tag color={getStatusColor(status.realtime)}>
                {status.realtime === 'healthy' ? '正常' : status.realtime}
              </Tag>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* 性能指标图表 */}
      <Card title="性能指标（最近30分钟）" style={{ marginBottom: 16 }}>
        {metrics.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={metrics}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="timestamp" />
              <YAxis />
              <RechartsTooltip />
              <Legend />
              <Area type="monotone" dataKey="cpu_usage" name="CPU使用率(%)" stroke="#1890ff" fill="#1890ff" fillOpacity={0.3} />
              <Area type="monotone" dataKey="memory_usage" name="内存使用率(%)" stroke="#52c41a" fill="#52c41a" fillOpacity={0.3} />
              <Area type="monotone" dataKey="disk_usage" name="磁盘使用率(%)" stroke="#faad14" fill="#faad14" fillOpacity={0.3} />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <Empty description="暂无数据" />
        )}
      </Card>

      {/* 详细标签页 */}
      <Card>
        <Tabs defaultActiveKey="tables">
          <TabPane tab="表统计" key="tables">
            <Table
              dataSource={tables}
              columns={tableColumns}
              rowKey="name"
              loading={loading}
              pagination={{ pageSize: 10 }}
            />
          </TabPane>
          <TabPane tab="连接信息" key="connections">
            <Table
              dataSource={connections}
              columns={connectionColumns}
              rowKey="pid"
              loading={loading}
              pagination={{ pageSize: 10 }}
            />
          </TabPane>
          <TabPane tab="慢查询" key="slow-queries">
            <Table
              dataSource={slowQueries}
              columns={slowQueryColumns}
              rowKey="query"
              loading={loading}
              pagination={{ pageSize: 10 }}
            />
          </TabPane>
        </Tabs>
      </Card>
    </div>
  )
}

export default SystemMonitor
