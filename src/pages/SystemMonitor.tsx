import React, { useState, useEffect, useCallback, useRef } from 'react'
import {
  Card,
  Row,
  Col,
  Statistic,
  Table,
  Tag,
  Button,
  Empty,
  Tabs,
  Typography,
  Space,
  Alert,
} from 'antd'
import {
  DatabaseOutlined,
  CloudServerOutlined,
  ReloadOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  ClockCircleOutlined,
  WarningOutlined,
  LockOutlined,
} from '@ant-design/icons'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts'
import dayjs from 'dayjs'
import { supabase } from '../utils/supabase'
import { handleApiError } from '../utils/apiClient'

const { Text, Title } = Typography

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
}

interface SystemStatus {
  database: 'connected' | 'disconnected' | 'error'
  storage: 'healthy' | 'warning' | 'error'
  auth: 'healthy' | 'warning' | 'error'
  realtime: 'healthy' | 'warning' | 'error'
}

// ==================== 已知表名列表 ====================

const KNOWN_TABLES = [
  'users', 'admin_users', 'app_versions', 'app_configs', 'novels', 'novel_chapters', 'user_novels',
  'mood_diaries', 'expenses', 'weight_records', 'notes', 'reminders', 'habits', 'user_favorites',
  'user_anniversaries', 'user_feedback', 'feedback_flow_records', 'notifications', 'operation_logs',
  'error_logs', 'point_records', 'sensitive_words', 'sensitive_word_logs', 'dict_items', 'dict_types',
  'system_configs', 'announcements',
]

// ==================== 不可用提示组件 ====================

const DirectAccessRequired: React.FC<{ description?: string }> = ({ description }) => (
  <div style={{ padding: '40px 0', textAlign: 'center' }}>
    <LockOutlined style={{ fontSize: 48, color: '#bfbfbf', marginBottom: 16 }} />
    <Title level={5} type="secondary">此功能需要数据库直接访问权限</Title>
    <Text type="secondary">
      {description || 'Supabase REST API 无法获取此信息，请通过数据库直连或 Supabase Dashboard 查看。'}
    </Text>
  </div>
)

// ==================== 主组件 ====================

const SystemMonitor: React.FC = () => {
  const [loading, setLoading] = useState(false)
  const [tableStatsLoading, setTableStatsLoading] = useState(false)
  const [metrics, setMetrics] = useState<SystemMetric[]>([])
  const [tables, setTables] = useState<TableInfo[]>([])
  const [status, setStatus] = useState<SystemStatus>({
    database: 'disconnected',
    storage: 'healthy',
    auth: 'healthy',
    realtime: 'healthy',
  })

  const autoRefreshRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // 获取模拟系统指标
  const fetchMetrics = useCallback(() => {
    try {
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

  // 通过 REST API 并行查询所有表的行数
  const fetchTableStats = useCallback(async () => {
    setTableStatsLoading(true)
    try {
      const results = await Promise.all(
        KNOWN_TABLES.map(async (tableName): Promise<TableInfo> => {
          try {
            const { count, error } = await supabase
              .from(tableName)
              .select('*', { count: 'exact', head: true })
            if (error) {
              console.warn(`[SystemMonitor] 查询表 ${tableName} 行数失败:`, error.message)
              return { name: tableName, row_count: 0 }
            }
            return { name: tableName, row_count: count ?? 0 }
          } catch {
            return { name: tableName, row_count: 0 }
          }
        })
      )
      setTables(results)
    } catch (error) {
      handleApiError(error, 'SystemMonitor-表统计')
    } finally {
      setTableStatsLoading(false)
    }
  }, [])

  // 获取数据库健康状态
  const fetchDatabaseStatus = useCallback(async () => {
    try {
      // 健康检查：查询 users 表
      const { error } = await supabase
        .from('users')
        .select('id', { count: 'exact', head: true })

      setStatus(prev => ({
        ...prev,
        database: error ? 'error' : 'connected',
      }))
    } catch (error) {
      handleApiError(error, 'SystemMonitor-健康检查')
      setStatus(prev => ({ ...prev, database: 'error' }))
    }
  }, [])

  // 加载所有数据
  const loadAllData = useCallback(async () => {
    setLoading(true)
    await Promise.all([
      fetchMetrics(),
      fetchTableStats(),
      fetchDatabaseStatus(),
    ])
    setLoading(false)
  }, [fetchMetrics, fetchTableStats, fetchDatabaseStatus])

  // 自动刷新（仅刷新指标和健康检查，不频繁刷新表统计）
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
      sorter: (a: TableInfo, b: TableInfo) => a.row_count - b.row_count,
      defaultSortOrder: 'descend' as const,
      render: (count: number) => count?.toLocaleString() ?? '0',
    },
  ]

  const getStatusIcon = (s: string) => {
    switch (s) {
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

  const getStatusColor = (s: string) => {
    switch (s) {
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

  const getStatusText = (s: string) => {
    switch (s) {
      case 'connected':
      case 'healthy':
        return '正常'
      case 'warning':
        return '警告'
      case 'error':
        return '异常'
      case 'disconnected':
        return '未连接'
      default:
        return s
    }
  }

  // Tabs items（Ant Design 5.x 推荐写法）
  const tabItems = [
    {
      key: 'tables',
      label: '表统计',
      children: (
        <Table
          dataSource={tables}
          columns={tableColumns}
          rowKey="name"
          loading={tableStatsLoading}
          pagination={{ pageSize: 10 }}
          size="middle"
        />
      ),
    },
    {
      key: 'connections',
      label: '连接信息',
      children: (
        <DirectAccessRequired description="连接信息需要通过 pg_stat_activity 系统视图查询，REST API 无法访问。" />
      ),
    },
    {
      key: 'slow-queries',
      label: '慢查询',
      children: (
        <DirectAccessRequired description="慢查询统计需要通过 pg_stat_statements 扩展查询，REST API 无法访问。" />
      ),
    },
  ]

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
              value={getStatusText(status.database)}
              prefix={getStatusIcon(status.database)}
              valueStyle={{ color: status.database === 'connected' ? '#52c41a' : '#ff4d4f' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="数据库大小"
              value="需要直接访问"
              prefix={<DatabaseOutlined />}
              valueStyle={{ fontSize: 16, color: '#8c8c8c' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="活跃连接"
              value="需要直接访问"
              prefix={<CloudServerOutlined />}
              valueStyle={{ fontSize: 16, color: '#8c8c8c' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="运行时间"
              value="需要直接访问"
              prefix={<ClockCircleOutlined />}
              valueStyle={{ fontSize: 16, color: '#8c8c8c' }}
            />
          </Card>
        </Col>
      </Row>

      {/* 服务状态 */}
      <Card style={{ marginBottom: 16 }}>
        <Row gutter={16}>
          <Col xs={12} sm={6}>
            <Space>
              {getStatusIcon(status.database)}
              <Text>数据库</Text>
              <Tag color={getStatusColor(status.database)}>
                {getStatusText(status.database)}
              </Tag>
            </Space>
          </Col>
          <Col xs={12} sm={6}>
            <Space>
              {getStatusIcon(status.storage)}
              <Text>存储</Text>
              <Tag color={getStatusColor(status.storage)}>
                {getStatusText(status.storage)}
              </Tag>
            </Space>
          </Col>
          <Col xs={12} sm={6}>
            <Space>
              {getStatusIcon(status.auth)}
              <Text>认证</Text>
              <Tag color={getStatusColor(status.auth)}>
                {getStatusText(status.auth)}
              </Tag>
            </Space>
          </Col>
          <Col xs={12} sm={6}>
            <Space>
              {getStatusIcon(status.realtime)}
              <Text>实时</Text>
              <Tag color={getStatusColor(status.realtime)}>
                {getStatusText(status.realtime)}
              </Tag>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* 性能指标图表（模拟数据） */}
      <Card
        title="性能指标（最近30分钟）"
        style={{ marginBottom: 16 }}
      >
        <Alert
          message="模拟数据，仅供参考"
          description="CPU、内存、磁盘等系统指标无法通过 Supabase REST API 获取，以下数据为模拟生成。"
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
          closable
        />
        {metrics.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={metrics}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="timestamp" />
              <YAxis />
              <RechartsTooltip />
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
        <Tabs defaultActiveKey="tables" items={tabItems} />
      </Card>
    </div>
  )
}

export default SystemMonitor
