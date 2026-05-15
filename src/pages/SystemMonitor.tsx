import React, { useEffect, useState } from 'react'
import { Row, Col, Card, Statistic, Spin, Table, Tag, Empty, Badge, Progress, Tooltip } from 'antd'
import {
  DatabaseOutlined,
  ApiOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  InfoCircleOutlined,
  WarningOutlined,
  CloseCircleOutlined,
  ThunderboltOutlined,
  HddOutlined,
  TeamOutlined,
} from '@ant-design/icons'
import { usePermission } from '../hooks/usePermission'
import {
  mockSystemStats,
  mockDbTableStats,
  mockApiRequests,
  mockAlerts,
} from '../utils/mockData'
import type { SystemStats, DbTableStat, ApiRequestItem, AlertItem } from '../utils/mockData'

const SystemMonitor: React.FC = () => {
  const { isAdmin } = usePermission()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<SystemStats | null>(null)
  const [dbTableStats, setDbTableStats] = useState<DbTableStat[]>([])
  const [apiRequests, setApiRequests] = useState<ApiRequestItem[]>([])
  const [alerts, setAlerts] = useState<AlertItem[]>([])

  useEffect(() => {
    const timer = setTimeout(() => {
      setStats(mockSystemStats)
      setDbTableStats(mockDbTableStats)
      setApiRequests(mockApiRequests)
      setAlerts(mockAlerts)
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

  if (loading || !stats) {
    return (
      <div style={{ textAlign: 'center', padding: 100 }}>
        <Spin size="large" tip="加载系统监控数据..." />
      </div>
    )
  }

  // 存储使用率计算
  const storageUsedNum = parseFloat(stats.storageUsed)
  const storageTotalNum = parseFloat(stats.storageTotal)
  const storagePercent = ((storageUsedNum / storageTotalNum) * 100).toFixed(1)

  // ==================== 系统概览卡片 ====================
  const overviewCards = [
    {
      title: '总用户数',
      value: stats.totalUsers,
      icon: <TeamOutlined />,
      color: '#1890ff',
      bg: '#e6f7ff',
    },
    {
      title: '总数据量',
      value: stats.totalDataSize,
      icon: <DatabaseOutlined />,
      color: '#597ef7',
      bg: '#f0f5ff',
    },
    {
      title: '存储使用',
      value: `${storageUsedNum}/${storageTotalNum} GB`,
      icon: <HddOutlined />,
      color: '#36cfc9',
      bg: '#e6fffb',
      extra: (
        <Progress
          percent={parseFloat(storagePercent)}
          size="small"
          strokeColor="#36cfc9"
          style={{ marginTop: 8 }}
        />
      ),
    },
    {
      title: 'API调用次数',
      value: stats.apiCallCount.toLocaleString(),
      icon: <ApiOutlined />,
      color: '#f759ab',
      bg: '#fff0f6',
      extra: (
        <div style={{ marginTop: 4, fontSize: 12, color: '#8c8c8c' }}>
          今日: {stats.apiCallToday.toLocaleString()}
        </div>
      ),
    },
    {
      title: '平均响应时间',
      value: `${stats.avgResponseTime}ms`,
      icon: <ClockCircleOutlined />,
      color: stats.avgResponseTime < 200 ? '#52c41a' : '#faad14',
      bg: stats.avgResponseTime < 200 ? '#f6ffed' : '#fffbe6',
    },
    {
      title: '错误率',
      value: `${stats.errorRate}%`,
      icon: <WarningOutlined />,
      color: stats.errorRate < 1 ? '#52c41a' : '#ff4d4f',
      bg: stats.errorRate < 1 ? '#f6ffed' : '#fff2f0',
    },
    {
      title: '系统可用性',
      value: stats.uptime,
      icon: <CheckCircleOutlined />,
      color: '#52c41a',
      bg: '#f6ffed',
    },
    {
      title: '当前版本',
      value: stats.version,
      icon: <ThunderboltOutlined />,
      color: '#9254de',
      bg: '#f9f0ff',
    },
  ]

  // ==================== 数据库表统计列 ====================
  const dbTableColumns = [
    {
      title: '表名',
      dataIndex: 'tableName',
      key: 'tableName',
      render: (name: string) => <code style={{ color: '#1890ff', background: '#f5f5f5', padding: '2px 6px', borderRadius: 3 }}>{name}</code>,
    },
    {
      title: '显示名称',
      dataIndex: 'displayName',
      key: 'displayName',
    },
    {
      title: '行数',
      dataIndex: 'rowCount',
      key: 'rowCount',
      render: (count: number) => count.toLocaleString(),
      sorter: (a: DbTableStat, b: DbTableStat) => a.rowCount - b.rowCount,
      defaultSortOrder: 'descend' as const,
    },
    {
      title: '大小',
      dataIndex: 'size',
      key: 'size',
    },
    {
      title: '最后更新',
      dataIndex: 'lastUpdate',
      key: 'lastUpdate',
      width: 180,
    },
  ]

  // ==================== API请求列 ====================
  const apiColumns = [
    {
      title: '时间',
      dataIndex: 'time',
      key: 'time',
      width: 170,
    },
    {
      title: '方法',
      dataIndex: 'method',
      key: 'method',
      width: 80,
      render: (method: string) => {
        const colorMap: Record<string, string> = {
          GET: 'green',
          POST: 'blue',
          PUT: 'orange',
          DELETE: 'red',
        }
        return <Tag color={colorMap[method] || 'default'}>{method}</Tag>
      },
    },
    {
      title: '路径',
      dataIndex: 'path',
      key: 'path',
      width: 180,
      render: (path: string) => <code style={{ fontSize: 12 }}>{path}</code>,
    },
    {
      title: '状态码',
      dataIndex: 'status',
      key: 'status',
      width: 90,
      render: (status: number) => {
        const color = status >= 200 && status < 300 ? 'green' : status >= 400 && status < 500 ? 'orange' : 'red'
        return <Tag color={color}>{status}</Tag>
      },
    },
    {
      title: '耗时',
      dataIndex: 'duration',
      key: 'duration',
      width: 100,
      render: (duration: number) => (
        <span style={{ color: duration > 1000 ? '#ff4d4f' : duration > 500 ? '#faad14' : '#52c41a' }}>
          {duration}ms
        </span>
      ),
      sorter: (a: ApiRequestItem, b: ApiRequestItem) => a.duration - b.duration,
    },
    {
      title: 'IP',
      dataIndex: 'ip',
      key: 'ip',
      width: 140,
    },
    {
      title: 'User-Agent',
      dataIndex: 'userAgent',
      key: 'userAgent',
      ellipsis: true,
      render: (ua: string) => (
        <Tooltip title={ua}>
          <span style={{ fontSize: 12, color: '#8c8c8c' }}>
            {ua.length > 30 ? ua.substring(0, 30) + '...' : ua}
          </span>
        </Tooltip>
      ),
    },
  ]

  // ==================== 告警列 ====================
  const alertColumns = [
    {
      title: '时间',
      dataIndex: 'time',
      key: 'time',
      width: 170,
    },
    {
      title: '级别',
      dataIndex: 'level',
      key: 'level',
      width: 80,
      render: (level: string) => {
        const config: Record<string, { color: string; icon: React.ReactNode }> = {
          error: { color: 'red', icon: <CloseCircleOutlined /> },
          warning: { color: 'orange', icon: <ExclamationCircleOutlined /> },
          info: { color: 'blue', icon: <InfoCircleOutlined /> },
        }
        const c = config[level] ?? config['info']!
        return <Tag color={c.color} icon={c.icon}>{level === 'error' ? '错误' : level === 'warning' ? '警告' : '信息'}</Tag>
      },
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      width: 100,
      render: (type: string) => <Tag>{type}</Tag>,
    },
    {
      title: '模块',
      dataIndex: 'module',
      key: 'module',
      width: 100,
      render: (module: string) => <Tag color="blue">{module}</Tag>,
    },
    {
      title: '消息',
      dataIndex: 'message',
      key: 'message',
      ellipsis: true,
    },
    {
      title: '状态',
      dataIndex: 'resolved',
      key: 'resolved',
      width: 80,
      render: (resolved: boolean) => (
        <Badge
          status={resolved ? 'success' : 'error'}
          text={resolved ? '已处理' : '待处理'}
        />
      ),
    },
  ]

  // 未处理告警数
  const unresolvedCount = alerts.filter(a => !a.resolved).length

  return (
    <div>
      {/* 系统概览卡片 */}
      <Row gutter={[16, 16]}>
        {overviewCards.map((card, index) => (
          <Col xs={12} sm={8} md={6} key={index}>
            <Card style={{ borderRadius: 8, borderLeft: `3px solid ${card.color}` }} bodyStyle={{ padding: '16px 20px' }}>
              <Statistic
                title={
                  <span style={{ fontSize: 13, color: '#8c8c8c', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ color: card.color }}>{card.icon}</span>
                    {card.title}
                  </span>
                }
                value={card.value}
                valueStyle={{ color: card.color, fontWeight: 600, fontSize: card.title === '总数据量' || card.title === '存储使用' || card.title === '当前版本' ? 18 : 22 }}
              />
              {card.extra}
            </Card>
          </Col>
        ))}
      </Row>

      {/* 数据库表统计 */}
      <Card
        title={
          <span>
            <DatabaseOutlined style={{ marginRight: 8, color: '#1890ff' }} />
            数据库表统计
          </span>
        }
        style={{ borderRadius: 8, marginTop: 16 }}
      >
        <Table
          dataSource={dbTableStats}
          columns={dbTableColumns}
          rowKey="tableName"
          pagination={false}
          size="middle"
          summary={() => {
            const totalRows = dbTableStats.reduce((sum, item) => sum + item.rowCount, 0)
            return (
              <Table.Summary.Row>
                <Table.Summary.Cell index={0} />
                <Table.Summary.Cell index={1}><strong>合计</strong></Table.Summary.Cell>
                <Table.Summary.Cell index={2}><strong>{totalRows.toLocaleString()}</strong></Table.Summary.Cell>
                <Table.Summary.Cell index={3}><strong>{stats.totalDataSize}</strong></Table.Summary.Cell>
                <Table.Summary.Cell index={4} />
              </Table.Summary.Row>
            )
          }}
        />
      </Card>

      {/* 最近API请求 + 异常告警 */}
      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={14}>
          <Card
            title={
              <span>
                <ApiOutlined style={{ marginRight: 8, color: '#f759ab' }} />
                最近API请求
              </span>
            }
            extra={<Tag color="blue">最近50条</Tag>}
            style={{ borderRadius: 8 }}
          >
            <Table
              dataSource={apiRequests.slice(0, 20)}
              columns={apiColumns}
              rowKey="id"
              pagination={{ pageSize: 10, size: 'small', showTotal: (total) => `共 ${total} 条` }}
              size="small"
              scroll={{ x: 900 }}
            />
          </Card>
        </Col>
        <Col xs={24} lg={10}>
          <Card
            title={
              <span>
                <WarningOutlined style={{ marginRight: 8, color: unresolvedCount > 0 ? '#ff4d4f' : '#52c41a' }} />
                异常告警
                {unresolvedCount > 0 && (
                  <Badge count={unresolvedCount} style={{ marginLeft: 8 }} />
                )}
              </span>
            }
            extra={<Tag color={unresolvedCount > 0 ? 'red' : 'green'}>{unresolvedCount > 0 ? `${unresolvedCount} 条待处理` : '全部已处理'}</Tag>}
            style={{ borderRadius: 8 }}
          >
            <Table
              dataSource={alerts}
              columns={alertColumns}
              rowKey="id"
              pagination={false}
              size="small"
              scroll={{ y: 460 }}
            />
          </Card>
        </Col>
      </Row>
    </div>
  )
}

export default SystemMonitor
