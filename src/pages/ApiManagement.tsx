import React, { useEffect, useState, useMemo } from 'react'
import {
  Card, Table, Input, Select, Button, Tag, Space, Tabs, Statistic, Row, Col,
  Modal, Form, message, Tooltip, Typography, Descriptions, Badge, Popconfirm,
  Progress,
} from 'antd'
import {
  SearchOutlined, PlusOutlined, CopyOutlined, DeleteOutlined,
  KeyOutlined, ApiOutlined, BarChartOutlined, FileTextOutlined,
  CheckCircleOutlined, ExclamationCircleOutlined,
} from '@ant-design/icons'
import { usePermission } from '../hooks/usePermission'
import {
  mockApiEndpoints, mockApiKeys, mockApiLogs,
} from '../utils/mockData'
import type { ApiEndpoint, ApiKey, ApiLog } from '../utils/mockData'
import { exportToCSV } from '../utils/export'

const { Text, Paragraph } = Typography

// HTTP 方法颜色映射
const METHOD_COLOR_MAP: Record<string, { color: string; bg: string }> = {
  GET: { color: '#52c41a', bg: '#f6ffed' },
  POST: { color: '#1890ff', bg: '#e6f7ff' },
  PUT: { color: '#faad14', bg: '#fffbe6' },
  DELETE: { color: '#ff4d4f', bg: '#fff2f0' },
}

// 状态码颜色
const getStatusColor = (status: number): string => {
  if (status >= 200 && status < 300) return 'success'
  if (status >= 300 && status < 400) return 'warning'
  if (status >= 400 && status < 500) return 'warning'
  return 'error'
}

// 模块颜色
const MODULE_COLOR_MAP: Record<string, string> = {
  '用户认证': 'blue',
  '消费记录': 'orange',
  '心情日记': 'green',
  '体重记录': 'cyan',
  '笔记': 'purple',
  '小说': 'geekblue',
  '版本管理': 'magenta',
}

const ApiManagement: React.FC = () => {
  const { isAdmin } = usePermission()
  const [loading, setLoading] = useState(true)
  const [endpoints, setEndpoints] = useState<ApiEndpoint[]>([])
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([])
  const [apiLogs, setApiLogs] = useState<ApiLog[]>([])
  const [searchText, setSearchText] = useState('')
  const [filterModule, setFilterModule] = useState<string | undefined>(undefined)
  const [filterMethod, setFilterMethod] = useState<string | undefined>(undefined)
  const [filterStatus, setFilterStatus] = useState<string | undefined>(undefined)
  const [createKeyModalOpen, setCreateKeyModalOpen] = useState(false)
  const [detailModalOpen, setDetailModalOpen] = useState(false)
  const [selectedEndpoint, setSelectedEndpoint] = useState<ApiEndpoint | null>(null)
  const [logPage, setLogPage] = useState(1)
  const [logPageSize, setLogPageSize] = useState(20)
  const [form] = Form.useForm()

  useEffect(() => {
    const timer = setTimeout(() => {
      setEndpoints(mockApiEndpoints)
      setApiKeys(mockApiKeys)
      setApiLogs(mockApiLogs)
      setLoading(false)
    }, 500)
    return () => clearTimeout(timer)
  }, [])

  // API 文档筛选
  const filteredEndpoints = useMemo(() => {
    return endpoints.filter(ep => {
      const matchSearch = !searchText ||
        ep.path.toLowerCase().includes(searchText.toLowerCase()) ||
        ep.description.toLowerCase().includes(searchText.toLowerCase())
      const matchModule = !filterModule || ep.module === filterModule
      const matchMethod = !filterMethod || ep.method === filterMethod
      return matchSearch && matchModule && matchMethod
    })
  }, [endpoints, searchText, filterModule, filterMethod])

  // API 日志筛选
  const filteredLogs = useMemo(() => {
    return apiLogs.filter(log => {
      const matchPath = !searchText || log.path.toLowerCase().includes(searchText.toLowerCase())
      const matchStatus = !filterStatus ||
        (filterStatus === '2xx' && log.status >= 200 && log.status < 300) ||
        (filterStatus === '4xx' && log.status >= 400 && log.status < 500) ||
        (filterStatus === '5xx' && log.status >= 500)
      return matchPath && matchStatus
    })
  }, [apiLogs, searchText, filterStatus])

  // 统计数据
  const stats = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayLogs = apiLogs.filter(l => new Date(l.time) >= today)
    const weekAgo = new Date(today)
    weekAgo.setDate(weekAgo.getDate() - 7)
    const weekLogs = apiLogs.filter(l => new Date(l.time) >= weekAgo)
    const monthAgo = new Date(today)
    monthAgo.setDate(monthAgo.getDate() - 30)
    const monthLogs = apiLogs.filter(l => new Date(l.time) >= monthAgo)
    const errorLogs = apiLogs.filter(l => l.status >= 400)
    const avgDuration = apiLogs.length > 0
      ? Math.round(apiLogs.reduce((sum, l) => sum + l.duration, 0) / apiLogs.length)
      : 0

    return {
      todayCount: todayLogs.length * 120, // 模拟放大
      weekCount: weekLogs.length * 120,
      monthCount: monthLogs.length * 120,
      errorRate: apiLogs.length > 0 ? parseFloat(((errorLogs.length / apiLogs.length) * 100).toFixed(2)) : 0,
      avgDuration,
      totalCalls: 1256800,
    }
  }, [apiLogs])

  // 按接口分组的调用统计
  const endpointStats = useMemo(() => {
    const map = new Map<string, { path: string; count: number; avgDuration: number; errorCount: number }>()
    apiLogs.forEach(log => {
      const existing = map.get(log.path)
      if (existing) {
        existing.count++
        existing.avgDuration = Math.round((existing.avgDuration + log.duration) / 2)
        if (log.status >= 400) existing.errorCount++
      } else {
        map.set(log.path, {
          path: log.path,
          count: 1,
          avgDuration: log.duration,
          errorCount: log.status >= 400 ? 1 : 0,
        })
      }
    })
    return Array.from(map.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
  }, [apiLogs])

  // 响应时间分布
  const responseTimeDistribution = useMemo(() => {
    const ranges = [
      { label: '< 50ms', min: 0, max: 50, count: 0 },
      { label: '50-100ms', min: 50, max: 100, count: 0 },
      { label: '100-200ms', min: 100, max: 200, count: 0 },
      { label: '200-500ms', min: 200, max: 500, count: 0 },
      { label: '500ms-1s', min: 500, max: 1000, count: 0 },
      { label: '> 1s', min: 1000, max: Infinity, count: 0 },
    ]
    apiLogs.forEach(log => {
      const range = ranges.find(r => log.duration >= r.min && log.duration < r.max)
      if (range) range.count++
    })
    const total = apiLogs.length || 1
    return ranges.map(r => ({ ...r, percent: parseFloat(((r.count / total) * 100).toFixed(1)) }))
  }, [apiLogs])

  // 生成密钥
  const handleCreateKey = (values: { name: string }) => {
    const newKey: ApiKey = {
      id: `ak_${String(apiKeys.length + 1).padStart(3, '0')}`,
      name: values.name,
      key: `pe_sk_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 10)}`,
      created_at: new Date().toISOString().replace('T', ' ').substring(0, 19),
      last_used_at: null,
      status: 'active',
      request_count: 0,
    }
    setApiKeys([newKey, ...apiKeys])
    setCreateKeyModalOpen(false)
    form.resetFields()
    message.success('API 密钥已生成')

    // 显示密钥
    Modal.info({
      title: '密钥已生成，请妥善保存',
      content: (
        <div>
          <Text type="warning" style={{ display: 'block', marginBottom: 8 }}>
            此密钥仅显示一次，请立即复制保存！
          </Text>
          <Input.Password
            value={newKey.key}
            readOnly
            addonAfter={
              <CopyOutlined
                style={{ cursor: 'pointer' }}
                onClick={() => {
                  navigator.clipboard.writeText(newKey.key)
                  message.success('已复制到剪贴板')
                }}
              />
            }
          />
        </div>
      ),
      width: 520,
    })
  }

  // 撤销密钥
  const handleRevokeKey = (id: string) => {
    setApiKeys(apiKeys.map(k => k.id === id ? { ...k, status: 'revoked' as const } : k))
    message.success('密钥已撤销')
  }

  // 复制密钥
  const handleCopyKey = (key: string) => {
    navigator.clipboard.writeText(key)
    message.success('已复制到剪贴板')
  }

  // 导出日志
  const handleExportLogs = () => {
    const columns = [
      { title: '时间', dataIndex: 'time' },
      { title: '方法', dataIndex: 'method' },
      { title: '路径', dataIndex: 'path' },
      { title: '状态码', dataIndex: 'status' },
      { title: '耗时ms', dataIndex: 'duration' },
      { title: 'IP', dataIndex: 'ip' },
      { title: '密钥名称', dataIndex: 'api_key_name' },
      { title: 'UserAgent', dataIndex: 'user_agent' },
    ]
    exportToCSV(filteredLogs, columns, 'api_logs')
    message.success('导出成功')
  }

  // API 文档列
  const docColumns = [
    {
      title: '方法',
      dataIndex: 'method',
      key: 'method',
      width: 90,
      render: (method: string) => {
        const style = METHOD_COLOR_MAP[method] || { color: '#999', bg: '#f5f5f5' }
        return (
          <Tag style={{
            color: style.color,
            background: style.bg,
            border: `1px solid ${style.color}`,
            fontWeight: 600,
            minWidth: 60,
            textAlign: 'center',
          }}>
            {method}
          </Tag>
        )
      },
    },
    {
      title: '路径',
      dataIndex: 'path',
      key: 'path',
      render: (path: string) => (
        <Text code style={{ fontSize: 13 }}>{path}</Text>
      ),
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      width: 160,
    },
    {
      title: '模块',
      dataIndex: 'module',
      key: 'module',
      width: 100,
      render: (module: string) => (
        <Tag color={MODULE_COLOR_MAP[module]}>{module}</Tag>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 80,
      render: (_: unknown, record: ApiEndpoint) => (
        <Button
          type="link"
          size="small"
          onClick={() => {
            setSelectedEndpoint(record)
            setDetailModalOpen(true)
          }}
        >
          详情
        </Button>
      ),
    },
  ]

  // API 密钥列
  const keyColumns = [
    {
      title: '名称',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: ApiKey) => (
        <Space>
          <KeyOutlined style={{ color: record.status === 'active' ? '#1890ff' : '#d9d9d9' }} />
          <Text strong>{name}</Text>
        </Space>
      ),
    },
    {
      title: '密钥',
      dataIndex: 'key',
      key: 'key',
      render: (key: string) => (
        <Space>
          <Text code style={{ fontSize: 12 }}>
            {key.substring(0, 20)}...{key.substring(key.length - 8)}
          </Text>
          <Tooltip title="复制密钥">
            <Button
              type="text"
              size="small"
              icon={<CopyOutlined />}
              onClick={() => handleCopyKey(key)}
            />
          </Tooltip>
        </Space>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 80,
      render: (status: string) => (
        <Badge
          status={status === 'active' ? 'success' : 'default'}
          text={status === 'active' ? '启用' : '已撤销'}
        />
      ),
    },
    {
      title: '调用次数',
      dataIndex: 'request_count',
      key: 'request_count',
      width: 100,
      render: (count: number) => <Text>{count.toLocaleString()}</Text>,
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 170,
    },
    {
      title: '最后使用',
      dataIndex: 'last_used_at',
      key: 'last_used_at',
      width: 170,
      render: (time: string | null) => time || <Text type="secondary">未使用</Text>,
    },
    {
      title: '操作',
      key: 'action',
      width: 80,
      render: (_: unknown, record: ApiKey) => (
        record.status === 'active' ? (
          <Popconfirm
            title="确定要撤销此密钥吗？"
            onConfirm={() => handleRevokeKey(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button type="link" danger size="small" icon={<DeleteOutlined />}>
              撤销
            </Button>
          </Popconfirm>
        ) : (
          <Text type="secondary">-</Text>
        )
      ),
    },
  ]

  // API 日志列
  const logColumns = [
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
        const style = METHOD_COLOR_MAP[method] || { color: '#999', bg: '#f5f5f5' }
        return (
          <Tag style={{
            color: style.color,
            background: style.bg,
            border: `1px solid ${style.color}`,
            fontWeight: 600,
          }}>
            {method}
          </Tag>
        )
      },
    },
    {
      title: '路径',
      dataIndex: 'path',
      key: 'path',
      render: (path: string) => <Text code style={{ fontSize: 12 }}>{path}</Text>,
    },
    {
      title: '状态码',
      dataIndex: 'status',
      key: 'status',
      width: 90,
      render: (status: number) => (
        <Tag color={getStatusColor(status)}>{status}</Tag>
      ),
    },
    {
      title: '耗时',
      dataIndex: 'duration',
      key: 'duration',
      width: 90,
      render: (duration: number) => (
        <Text type={duration > 500 ? 'danger' : duration > 200 ? 'warning' : undefined}>
          {duration}ms
        </Text>
      ),
    },
    {
      title: 'IP',
      dataIndex: 'ip',
      key: 'ip',
      width: 130,
    },
    {
      title: '密钥',
      dataIndex: 'api_key_name',
      key: 'api_key_name',
      width: 140,
      ellipsis: true,
    },
  ]

  // 按接口统计列
  const endpointStatColumns = [
    {
      title: '接口路径',
      dataIndex: 'path',
      key: 'path',
      render: (path: string) => <Text code style={{ fontSize: 12 }}>{path}</Text>,
    },
    {
      title: '调用次数',
      dataIndex: 'count',
      key: 'count',
      width: 100,
      sorter: (a: { count: number }, b: { count: number }) => a.count - b.count,
      render: (count: number) => <Text strong>{count.toLocaleString()}</Text>,
    },
    {
      title: '平均耗时',
      dataIndex: 'avgDuration',
      key: 'avgDuration',
      width: 100,
      render: (duration: number) => (
        <Text type={duration > 500 ? 'danger' : duration > 200 ? 'warning' : undefined}>
          {duration}ms
        </Text>
      ),
    },
    {
      title: '错误次数',
      dataIndex: 'errorCount',
      key: 'errorCount',
      width: 90,
      render: (count: number) => (
        <Text type={count > 0 ? 'danger' : undefined}>{count}</Text>
      ),
    },
  ]

  if (!isAdmin) {
    return (
      <div style={{ textAlign: 'center', padding: 100 }}>
        <ExclamationCircleOutlined style={{ fontSize: 48, color: '#faad14' }} />
        <p style={{ marginTop: 16, fontSize: 16, color: '#666' }}>
          您没有权限访问此页面，请联系管理员
        </p>
      </div>
    )
  }

  const tabItems = [
    {
      key: 'docs',
      label: (
        <span><ApiOutlined /> API 文档</span>
      ),
      children: (
        <div>
          <Space style={{ marginBottom: 16 }} wrap>
            <Input
              placeholder="搜索 API 路径或描述..."
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={e => setSearchText(e.target.value)}
              style={{ width: 280 }}
              allowClear
            />
            <Select
              placeholder="按模块筛选"
              value={filterModule}
              onChange={setFilterModule}
              style={{ width: 140 }}
              allowClear
              options={[
                { label: '用户认证', value: '用户认证' },
                { label: '消费记录', value: '消费记录' },
                { label: '心情日记', value: '心情日记' },
                { label: '体重记录', value: '体重记录' },
                { label: '笔记', value: '笔记' },
                { label: '小说', value: '小说' },
                { label: '版本管理', value: '版本管理' },
              ]}
            />
            <Select
              placeholder="按方法筛选"
              value={filterMethod}
              onChange={setFilterMethod}
              style={{ width: 120 }}
              allowClear
              options={[
                { label: 'GET', value: 'GET' },
                { label: 'POST', value: 'POST' },
                { label: 'PUT', value: 'PUT' },
                { label: 'DELETE', value: 'DELETE' },
              ]}
            />
            <Text type="secondary">
              共 {filteredEndpoints.length} 个接口
            </Text>
          </Space>
          <Table
            columns={docColumns}
            dataSource={filteredEndpoints}
            rowKey="id"
            loading={loading}
            pagination={false}
            size="middle"
            expandable={{
              expandedRowRender: (record) => (
                <div style={{ padding: '8px 0' }}>
                  <Row gutter={16}>
                    <Col span={12}>
                      <Text strong>请求参数：</Text>
                      <Paragraph
                        code
                        style={{ marginTop: 4, background: '#f5f5f5', fontSize: 12 }}
                      >
                        {record.params}
                      </Paragraph>
                    </Col>
                    <Col span={12}>
                      <Text strong>返回示例：</Text>
                      <Paragraph
                        code
                        style={{ marginTop: 4, background: '#f5f5f5', fontSize: 12 }}
                      >
                        {record.responseExample}
                      </Paragraph>
                    </Col>
                  </Row>
                </div>
              ),
            }}
          />
        </div>
      ),
    },
    {
      key: 'keys',
      label: (
        <span><KeyOutlined /> API 密钥</span>
      ),
      children: (
        <div>
          <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text type="secondary">
              共 {apiKeys.length} 个密钥，{apiKeys.filter(k => k.status === 'active').length} 个启用中
            </Text>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setCreateKeyModalOpen(true)}
            >
              生成新密钥
            </Button>
          </div>
          <Table
            columns={keyColumns}
            dataSource={apiKeys}
            rowKey="id"
            loading={loading}
            pagination={false}
            size="middle"
          />
        </div>
      ),
    },
    {
      key: 'stats',
      label: (
        <span><BarChartOutlined /> 调用统计</span>
      ),
      children: (
        <div>
          <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
            <Col span={6}>
              <Card size="small">
                <Statistic
                  title="今日调用"
                  value={stats.todayCount}
                  suffix="次"
                  valueStyle={{ color: '#1890ff' }}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card size="small">
                <Statistic
                  title="本周调用"
                  value={stats.weekCount}
                  suffix="次"
                  valueStyle={{ color: '#52c41a' }}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card size="small">
                <Statistic
                  title="本月调用"
                  value={stats.monthCount}
                  suffix="次"
                  valueStyle={{ color: '#722ed1' }}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card size="small">
                <Statistic
                  title="累计调用"
                  value={stats.totalCalls}
                  suffix="次"
                />
              </Card>
            </Col>
          </Row>
          <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
            <Col span={8}>
              <Card size="small" title="平均响应时间">
                <Statistic
                  value={stats.avgDuration}
                  suffix="ms"
                  valueStyle={{ color: stats.avgDuration > 300 ? '#ff4d4f' : '#52c41a' }}
                />
              </Card>
            </Col>
            <Col span={8}>
              <Card size="small" title="错误率">
                <Statistic
                  value={stats.errorRate}
                  suffix="%"
                  precision={2}
                  valueStyle={{ color: stats.errorRate > 5 ? '#ff4d4f' : '#52c41a' }}
                  prefix={
                    stats.errorRate > 5
                      ? <ExclamationCircleOutlined />
                      : <CheckCircleOutlined />
                  }
                />
              </Card>
            </Col>
            <Col span={8}>
              <Card size="small" title="活跃密钥">
                <Statistic
                  value={apiKeys.filter(k => k.status === 'active').length}
                  suffix={`/ ${apiKeys.length}`}
                />
              </Card>
            </Col>
          </Row>

          <Card
            size="small"
            title="响应时间分布"
            style={{ marginBottom: 24 }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {responseTimeDistribution.map(item => (
                <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <Text style={{ width: 80, textAlign: 'right', flexShrink: 0 }}>{item.label}</Text>
                  <Progress
                    percent={item.percent}
                    strokeColor={
                      item.label.includes('>') ? '#ff4d4f' :
                      item.label.includes('500') ? '#faad14' :
                      item.label.includes('200') ? '#1890ff' : '#52c41a'
                    }
                    size="small"
                    format={() => `${item.count} 次`}
                  />
                </div>
              ))}
            </div>
          </Card>

          <Card size="small" title="按接口调用统计 (Top 10)">
            <Table
              columns={endpointStatColumns}
              dataSource={endpointStats}
              rowKey="path"
              pagination={false}
              size="small"
            />
          </Card>
        </div>
      ),
    },
    {
      key: 'logs',
      label: (
        <span><FileTextOutlined /> API 日志</span>
      ),
      children: (
        <div>
          <Space style={{ marginBottom: 16 }} wrap>
            <Input
              placeholder="搜索接口路径..."
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={e => setSearchText(e.target.value)}
              style={{ width: 240 }}
              allowClear
            />
            <Select
              placeholder="状态码筛选"
              value={filterStatus}
              onChange={setFilterStatus}
              style={{ width: 120 }}
              allowClear
              options={[
                { label: '2xx 成功', value: '2xx' },
                { label: '4xx 客户端错误', value: '4xx' },
                { label: '5xx 服务端错误', value: '5xx' },
              ]}
            />
            <Button
              icon={<SearchOutlined />}
              onClick={() => {
                setLogPage(1)
              }}
            >
              查询
            </Button>
            <Button
              icon={<FileTextOutlined />}
              onClick={handleExportLogs}
            >
              导出 CSV
            </Button>
          </Space>
          <Table
            columns={logColumns}
            dataSource={filteredLogs}
            rowKey="id"
            loading={loading}
            size="small"
            pagination={{
              current: logPage,
              pageSize: logPageSize,
              total: filteredLogs.length,
              showSizeChanger: true,
              showTotal: (total) => `共 ${total} 条`,
              onChange: (page, pageSize) => {
                setLogPage(page)
                setLogPageSize(pageSize)
              },
            }}
          />
        </div>
      ),
    },
  ]

  return (
    <div>
      <Tabs
        defaultActiveKey="docs"
        items={tabItems}
        size="large"
      />

      {/* 生成密钥弹窗 */}
      <Modal
        title="生成新 API 密钥"
        open={createKeyModalOpen}
        onCancel={() => {
          setCreateKeyModalOpen(false)
          form.resetFields()
        }}
        onOk={() => form.submit()}
        okText="生成"
        cancelText="取消"
      >
        <Form form={form} layout="vertical" onFinish={handleCreateKey}>
          <Form.Item
            label="密钥名称"
            name="name"
            rules={[
              { required: true, message: '请输入密钥名称' },
              { max: 50, message: '名称不超过50个字符' },
            ]}
          >
            <Input placeholder="例如：生产环境主密钥" />
          </Form.Item>
          <Form.Item>
            <Text type="secondary">
              生成后请立即保存密钥，系统不会再次显示完整密钥内容。
            </Text>
          </Form.Item>
        </Form>
      </Modal>

      {/* API 详情弹窗 */}
      <Modal
        title="API 接口详情"
        open={detailModalOpen}
        onCancel={() => setDetailModalOpen(false)}
        footer={null}
        width={640}
      >
        {selectedEndpoint && (
          <Descriptions column={1} bordered size="small">
            <Descriptions.Item label="接口路径">
              <Space>
                <Tag style={{
                  color: METHOD_COLOR_MAP[selectedEndpoint.method]?.color,
                  background: METHOD_COLOR_MAP[selectedEndpoint.method]?.bg,
                  border: `1px solid ${METHOD_COLOR_MAP[selectedEndpoint.method]?.color}`,
                  fontWeight: 600,
                }}>
                  {selectedEndpoint.method}
                </Tag>
                <Text code>{selectedEndpoint.path}</Text>
              </Space>
            </Descriptions.Item>
            <Descriptions.Item label="描述">{selectedEndpoint.description}</Descriptions.Item>
            <Descriptions.Item label="所属模块">
              <Tag color={MODULE_COLOR_MAP[selectedEndpoint.module]}>
                {selectedEndpoint.module}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="请求参数">
              <Paragraph code style={{ margin: 0, background: '#f5f5f5' }}>
                {selectedEndpoint.params}
              </Paragraph>
            </Descriptions.Item>
            <Descriptions.Item label="返回示例">
              <Paragraph code style={{ margin: 0, background: '#f5f5f5' }}>
                {selectedEndpoint.responseExample}
              </Paragraph>
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </div>
  )
}

export default ApiManagement
