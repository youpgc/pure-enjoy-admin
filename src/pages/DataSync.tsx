import React, { useEffect, useState, useMemo } from 'react'
import {
  Card, Table, Button, Tag, Space, Statistic, Row, Col, Modal, Tabs,
  message, Typography, Progress, Timeline, Select, Badge, Empty, Form,
} from 'antd'
import {
  SyncOutlined, CloudUploadOutlined, CloudDownloadOutlined,
  CheckCircleOutlined, CloseCircleOutlined, ClockCircleOutlined,
  ExclamationCircleOutlined, HistoryOutlined, AlertOutlined,
  ReloadOutlined, FileExcelOutlined, FileTextOutlined,
} from '@ant-design/icons'
import { usePermission } from '../hooks/usePermission'
import { mockSyncHistory } from '../utils/mockData'
import type { SyncHistory } from '../utils/mockData'
import dayjs from 'dayjs'

const { Text, Paragraph } = Typography

// 同步类型映射
const syncTypeMap: Record<string, { label: string; color: string }> = {
  full: { label: '全量同步', color: 'blue' },
  incremental: { label: '增量同步', color: 'green' },
  manual: { label: '手动同步', color: 'orange' },
}

// 同步状态映射
const syncStatusMap: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  success: { label: '成功', color: 'success', icon: <CheckCircleOutlined /> },
  failed: { label: '失败', color: 'error', icon: <CloseCircleOutlined /> },
  in_progress: { label: '进行中', color: 'processing', icon: <ClockCircleOutlined /> },
}

// 模拟冲突数据
interface ConflictRecord {
  id: string
  table: string
  record_id: string
  field: string
  local_value: string
  remote_value: string
  local_updated_at: string
  remote_updated_at: string
  resolved: boolean
}

const mockConflicts: ConflictRecord[] = [
  {
    id: 'conflict_001',
    table: 'expenses',
    record_id: 'expense_1024',
    field: 'amount',
    local_value: '128.50',
    remote_value: '138.50',
    local_updated_at: '2024-01-15 12:30:00',
    remote_updated_at: '2024-01-15 12:35:00',
    resolved: false,
  },
  {
    id: 'conflict_002',
    table: 'mood_diaries',
    record_id: 'mood_2056',
    field: 'content',
    local_value: '今天心情不错，工作顺利',
    remote_value: '今天心情不错，工作顺利，还吃了好吃的',
    local_updated_at: '2024-01-15 18:00:00',
    remote_updated_at: '2024-01-15 18:10:00',
    resolved: false,
  },
  {
    id: 'conflict_003',
    table: 'notes',
    record_id: 'note_008',
    field: 'title',
    local_value: 'React Hooks 学习笔记',
    remote_value: 'React Hooks 深入学习笔记',
    local_updated_at: '2024-01-14 20:00:00',
    remote_updated_at: '2024-01-14 20:15:00',
    resolved: true,
  },
]

const DataSync: React.FC = () => {
  const { isAdmin } = usePermission()
  const [loading, setLoading] = useState(true)
  const [syncHistory, setSyncHistory] = useState<SyncHistory[]>([])
  const [conflicts, setConflicts] = useState<ConflictRecord[]>(mockConflicts)
  const [syncing, setSyncing] = useState(false)
  const [filterType, setFilterType] = useState<string | undefined>(undefined)
  const [filterStatus, setFilterStatus] = useState<string | undefined>(undefined)
  const [importModalOpen, setImportModalOpen] = useState(false)
  const [exportModalOpen, setExportModalOpen] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => {
      setSyncHistory(mockSyncHistory)
      setLoading(false)
    }, 500)
    return () => clearTimeout(timer)
  }, [])

  // 同步状态概览
  const syncOverview = useMemo(() => {
    const lastSync = syncHistory.length > 0 ? syncHistory[0] : null
    const pendingCount = conflicts.filter(c => !c.resolved).length
    const successCount = syncHistory.filter(s => s.status === 'success').length
    const failedCount = syncHistory.filter(s => s.status === 'failed').length
    const totalRecords = syncHistory.reduce((sum, s) => sum + s.records_synced, 0)
    return {
      lastSyncTime: lastSync?.time || '-',
      lastSyncStatus: lastSync?.status || 'unknown',
      lastSyncType: lastSync?.type || '-',
      pendingConflicts: pendingCount,
      totalSynced: totalRecords,
      successRate: syncHistory.length > 0
        ? parseFloat(((successCount / syncHistory.length) * 100).toFixed(1))
        : 0,
      successCount,
      failedCount,
    }
  }, [syncHistory, conflicts])

  // 筛选后的同步历史
  const filteredHistory = useMemo(() => {
    return syncHistory.filter(item => {
      const matchType = !filterType || item.type === filterType
      const matchStatus = !filterStatus || item.status === filterStatus
      return matchType && matchStatus
    })
  }, [syncHistory, filterType, filterStatus])

  // 手动触发同步
  const handleSync = (type: 'full' | 'incremental') => {
    setSyncing(true)
    message.loading({ content: `${type === 'full' ? '全量' : '增量'}同步中，请稍候...`, key: 'sync', duration: 0 })

    setTimeout(() => {
      const newRecord: SyncHistory = {
        id: `sync_${String(syncHistory.length + 1).padStart(3, '0')}`,
        time: dayjs().format('YYYY-MM-DD HH:mm:ss'),
        type,
        status: 'success',
        records_synced: type === 'full' ? Math.floor(Math.random() * 5000) + 10000 : Math.floor(Math.random() * 100) + 10,
        duration: parseFloat((Math.random() * 30 + 2).toFixed(1)),
        detail: type === 'full'
          ? '手动全量同步完成'
          : `手动增量同步完成：同步 ${Math.floor(Math.random() * 50) + 10} 条记录`,
      }
      setSyncHistory([newRecord, ...syncHistory])
      setSyncing(false)
      message.success({ content: '同步完成', key: 'sync' })
    }, 2000)
  }

  // 解决冲突
  const handleResolveConflict = (id: string, useLocal: boolean) => {
    setConflicts(conflicts.map(c =>
      c.id === id ? { ...c, resolved: true } : c
    ))
    message.success(`已选择${useLocal ? '本地' : '远程'}数据，冲突已解决`)
  }

  // 导出数据
  const handleExport = (format: 'json' | 'csv') => {
    message.loading({ content: `正在导出 ${format.toUpperCase()} 数据...`, key: 'export', duration: 0 })
    setTimeout(() => {
      // 模拟导出
      const data = {
        users: 1258,
        expenses: 45680,
        mood_diaries: 34560,
        weight_records: 18920,
        notes: 8920,
        novels: 560,
      }
      const blob = format === 'json'
        ? new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
        : new Blob([
            Object.keys(data).join(',') + '\n' +
            Object.values(data).join(',') + '\n'
          ], { type: 'text/csv' })

      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `pure_enjoy_data_export_${dayjs().format('YYYYMMDD_HHmmss')}.${format}`
      a.click()
      URL.revokeObjectURL(url)

      message.success({ content: `数据已导出为 ${format.toUpperCase()} 格式`, key: 'export' })
      setExportModalOpen(false)
    }, 1500)
  }

  // 同步历史列
  const historyColumns = [
    {
      title: '同步时间',
      dataIndex: 'time',
      key: 'time',
      width: 170,
      sorter: (a: SyncHistory, b: SyncHistory) => a.time.localeCompare(b.time),
      defaultSortOrder: 'descend' as const,
    },
    {
      title: '同步类型',
      dataIndex: 'type',
      key: 'type',
      width: 110,
      render: (type: string) => {
        const config = syncTypeMap[type]
        return config ? <Tag color={config.color}>{config.label}</Tag> : type
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 90,
      render: (status: string) => {
        const config = syncStatusMap[status]
        return config ? (
          <Badge status={config.color as 'success' | 'error' | 'processing'} text={config.label} />
        ) : status
      },
    },
    {
      title: '同步记录数',
      dataIndex: 'records_synced',
      key: 'records_synced',
      width: 110,
      render: (count: number) => <Text strong>{count.toLocaleString()}</Text>,
    },
    {
      title: '耗时',
      dataIndex: 'duration',
      key: 'duration',
      width: 80,
      render: (duration: number) => `${duration}s`,
    },
    {
      title: '详情',
      dataIndex: 'detail',
      key: 'detail',
      ellipsis: true,
    },
  ]

  // 冲突记录列
  const conflictColumns = [
    {
      title: '数据表',
      dataIndex: 'table',
      key: 'table',
      width: 110,
      render: (table: string) => {
        const tableMap: Record<string, string> = {
          expenses: '消费记录',
          mood_diaries: '心情日记',
          notes: '笔记',
          weight_records: '体重记录',
          novels: '小说',
        }
        return <Tag>{tableMap[table] || table}</Tag>
      },
    },
    {
      title: '记录ID',
      dataIndex: 'record_id',
      key: 'record_id',
      width: 130,
      render: (id: string) => <Text code>{id}</Text>,
    },
    {
      title: '冲突字段',
      dataIndex: 'field',
      key: 'field',
      width: 90,
    },
    {
      title: '本地值',
      dataIndex: 'local_value',
      key: 'local_value',
      width: 200,
      ellipsis: true,
      render: (val: string) => <Text type="secondary">{val}</Text>,
    },
    {
      title: '远程值',
      dataIndex: 'remote_value',
      key: 'remote_value',
      width: 200,
      ellipsis: true,
      render: (val: string) => <Text>{val}</Text>,
    },
    {
      title: '本地更新时间',
      dataIndex: 'local_updated_at',
      key: 'local_updated_at',
      width: 170,
    },
    {
      title: '远程更新时间',
      dataIndex: 'remote_updated_at',
      key: 'remote_updated_at',
      width: 170,
    },
    {
      title: '操作',
      key: 'action',
      width: 160,
      render: (_: unknown, record: ConflictRecord) => record.resolved ? (
        <Tag icon={<CheckCircleOutlined />} color="success">已解决</Tag>
      ) : (
        <Space>
          <Button
            type="link"
            size="small"
            onClick={() => handleResolveConflict(record.id, true)}
          >
            使用本地
          </Button>
          <Button
            type="link"
            size="small"
            onClick={() => handleResolveConflict(record.id, false)}
          >
            使用远程
          </Button>
        </Space>
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
      key: 'overview',
      label: (
        <span><SyncOutlined /> 同步概览</span>
      ),
      children: (
        <div>
          {/* 同步状态卡片 */}
          <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
            <Col span={6}>
              <Card size="small">
                <Statistic
                  title="上次同步时间"
                  value={syncOverview.lastSyncTime}
                  valueStyle={{ fontSize: 16 }}
                  prefix={<ClockCircleOutlined />}
                />
                <div style={{ marginTop: 8 }}>
                  <Tag color={
                    syncOverview.lastSyncStatus === 'success' ? 'success' :
                    syncOverview.lastSyncStatus === 'failed' ? 'error' : 'processing'
                  }>
                    {syncStatusMap[syncOverview.lastSyncStatus]?.label || '未知'}
                  </Tag>
                  <Tag>{syncTypeMap[syncOverview.lastSyncType]?.label || '-'}</Tag>
                </div>
              </Card>
            </Col>
            <Col span={6}>
              <Card size="small">
                <Statistic
                  title="待解决冲突"
                  value={syncOverview.pendingConflicts}
                  suffix="条"
                  valueStyle={{
                    color: syncOverview.pendingConflicts > 0 ? '#ff4d4f' : '#52c41a',
                  }}
                  prefix={
                    syncOverview.pendingConflicts > 0
                      ? <AlertOutlined />
                      : <CheckCircleOutlined />
                  }
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card size="small">
                <Statistic
                  title="同步成功率"
                  value={syncOverview.successRate}
                  suffix="%"
                  precision={1}
                  valueStyle={{
                    color: syncOverview.successRate >= 90 ? '#52c41a' :
                      syncOverview.successRate >= 70 ? '#faad14' : '#ff4d4f',
                  }}
                />
                <Progress
                  percent={syncOverview.successRate}
                  size="small"
                  showInfo={false}
                  strokeColor={
                    syncOverview.successRate >= 90 ? '#52c41a' :
                    syncOverview.successRate >= 70 ? '#faad14' : '#ff4d4f'
                  }
                  style={{ marginTop: 8 }}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card size="small">
                <Statistic
                  title="累计同步记录"
                  value={syncOverview.totalSynced}
                  suffix="条"
                  valueStyle={{ fontSize: 20 }}
                />
                <div style={{ marginTop: 8 }}>
                  <Text type="secondary">
                    成功 {syncOverview.successCount} 次 / 失败 {syncOverview.failedCount} 次
                  </Text>
                </div>
              </Card>
            </Col>
          </Row>

          {/* 操作按钮 */}
          <Card size="small" title="同步操作" style={{ marginBottom: 24 }}>
            <Space size="large">
              <Button
                type="primary"
                icon={<SyncOutlined spin={syncing} />}
                onClick={() => handleSync('incremental')}
                loading={syncing}
              >
                增量同步
              </Button>
              <Button
                icon={<ReloadOutlined spin={syncing} />}
                onClick={() => handleSync('full')}
                loading={syncing}
              >
                全量同步
              </Button>
              <Button
                icon={<CloudDownloadOutlined />}
                onClick={() => setImportModalOpen(true)}
              >
                导入数据
              </Button>
              <Button
                icon={<CloudUploadOutlined />}
                onClick={() => setExportModalOpen(true)}
              >
                导出数据
              </Button>
            </Space>
            <Paragraph type="secondary" style={{ marginTop: 12, marginBottom: 0 }}>
              增量同步仅同步最近变更的数据，速度较快。全量同步会重新同步所有数据，耗时较长但更可靠。
            </Paragraph>
          </Card>

          {/* 最近同步时间线 */}
          <Card size="small" title="最近同步记录">
            <Timeline
              items={syncHistory.slice(0, 5).map(item => ({
                color: item.status === 'success' ? 'green' : item.status === 'failed' ? 'red' : 'blue',
                children: (
                  <div>
                    <Space>
                      <Text strong>{item.time}</Text>
                      <Tag color={syncTypeMap[item.type]?.color}>
                        {syncTypeMap[item.type]?.label}
                      </Tag>
                      <Tag color={
                        item.status === 'success' ? 'success' :
                        item.status === 'failed' ? 'error' : 'processing'
                      }>
                        {syncStatusMap[item.status]?.label}
                      </Tag>
                    </Space>
                    <br />
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {item.detail} | 耗时 {item.duration}s | 记录数 {item.records_synced}
                    </Text>
                  </div>
                ),
              }))}
            />
          </Card>
        </div>
      ),
    },
    {
      key: 'history',
      label: (
        <span><HistoryOutlined /> 同步历史</span>
      ),
      children: (
        <div>
          <Space style={{ marginBottom: 16 }} wrap>
            <Select
              placeholder="同步类型"
              value={filterType}
              onChange={setFilterType}
              style={{ width: 130 }}
              allowClear
              options={[
                { label: '全量同步', value: 'full' },
                { label: '增量同步', value: 'incremental' },
                { label: '手动同步', value: 'manual' },
              ]}
            />
            <Select
              placeholder="同步状态"
              value={filterStatus}
              onChange={setFilterStatus}
              style={{ width: 130 }}
              allowClear
              options={[
                { label: '成功', value: 'success' },
                { label: '失败', value: 'failed' },
                { label: '进行中', value: 'in_progress' },
              ]}
            />
            <Text type="secondary">
              共 {filteredHistory.length} 条记录
            </Text>
          </Space>
          <Table
            columns={historyColumns}
            dataSource={filteredHistory}
            rowKey="id"
            loading={loading}
            size="middle"
            pagination={{
              pageSize: 10,
              showTotal: (total) => `共 ${total} 条`,
            }}
          />
        </div>
      ),
    },
    {
      key: 'conflicts',
      label: (
        <span>
          <AlertOutlined />
          冲突解决
          {syncOverview.pendingConflicts > 0 && (
            <Badge
              count={syncOverview.pendingConflicts}
              size="small"
              style={{ marginLeft: 4 }}
            />
          )}
        </span>
      ),
      children: (
        <div>
          {conflicts.filter(c => !c.resolved).length === 0 ? (
            <Empty
              description="暂无待解决的冲突"
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            >
              <Text type="secondary">所有数据冲突已解决</Text>
            </Empty>
          ) : (
            <>
              <Card size="small" style={{ marginBottom: 16, background: '#fff7e6', borderColor: '#ffd591' }}>
                <Space>
                  <AlertOutlined style={{ color: '#fa8c16', fontSize: 16 }} />
                  <Text>
                    有 <Text strong>{conflicts.filter(c => !c.resolved).length}</Text> 条数据冲突待解决。
                    冲突通常发生在本地和远程同时修改了同一条记录的情况下。
                  </Text>
                </Space>
              </Card>
              <Table
                columns={conflictColumns}
                dataSource={conflicts}
                rowKey="id"
                size="small"
                pagination={false}
                expandable={{
                  expandedRowRender: (record) => (
                    <div style={{ padding: '8px 0' }}>
                      <Row gutter={16}>
                        <Col span={12}>
                          <Text strong>本地值：</Text>
                          <Paragraph
                            code
                            style={{ marginTop: 4, background: '#f5f5f5' }}
                          >
                            {record.local_value}
                          </Paragraph>
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            更新于 {record.local_updated_at}
                          </Text>
                        </Col>
                        <Col span={12}>
                          <Text strong>远程值：</Text>
                          <Paragraph
                            code
                            style={{ marginTop: 4, background: '#f5f5f5' }}
                          >
                            {record.remote_value}
                          </Paragraph>
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            更新于 {record.remote_updated_at}
                          </Text>
                        </Col>
                      </Row>
                    </div>
                  ),
                }}
              />
            </>
          )}
        </div>
      ),
    },
    {
      key: 'import_export',
      label: (
        <span><CloudUploadOutlined /> 数据导入/导出</span>
      ),
      children: (
        <Row gutter={[24, 24]}>
          <Col span={12}>
            <Card size="small" title={
              <Space>
                <CloudDownloadOutlined />
                <span>数据导入</span>
              </Space>
            }>
              <Paragraph type="secondary">
                支持导入 JSON 和 CSV 格式的数据文件。导入的数据将与现有数据进行合并。
              </Paragraph>
              <div style={{ marginBottom: 16 }}>
                <Text strong>支持的模块：</Text>
                <div style={{ marginTop: 8 }}>
                  <Space wrap>
                    <Tag>用户数据</Tag>
                    <Tag>消费记录</Tag>
                    <Tag>心情日记</Tag>
                    <Tag>体重记录</Tag>
                    <Tag>笔记</Tag>
                    <Tag>小说</Tag>
                  </Space>
                </div>
              </div>
              <div style={{ marginBottom: 16 }}>
                <Text strong>注意事项：</Text>
                <ul style={{ paddingLeft: 20, color: '#666', fontSize: 13 }}>
                  <li>JSON 文件需符合系统定义的数据格式</li>
                  <li>CSV 文件第一行为表头，需与系统字段对应</li>
                  <li>导入过程中如遇冲突，将自动进入冲突解决流程</li>
                  <li>单次导入文件大小不超过 50MB</li>
                </ul>
              </div>
              <Button
                type="primary"
                icon={<CloudDownloadOutlined />}
                onClick={() => setImportModalOpen(true)}
              >
                选择文件导入
              </Button>
            </Card>
          </Col>
          <Col span={12}>
            <Card size="small" title={
              <Space>
                <CloudUploadOutlined />
                <span>数据导出</span>
              </Space>
            }>
              <Paragraph type="secondary">
                将系统数据导出为 JSON 或 CSV 格式文件，可用于数据备份或迁移。
              </Paragraph>
              <div style={{ marginBottom: 16 }}>
                <Text strong>可导出的数据：</Text>
                <div style={{ marginTop: 8 }}>
                  <Space wrap>
                    <Tag color="blue">用户 (1,258)</Tag>
                    <Tag color="orange">消费记录 (45,680)</Tag>
                    <Tag color="green">心情日记 (34,560)</Tag>
                    <Tag color="cyan">体重记录 (18,920)</Tag>
                    <Tag color="purple">笔记 (8,920)</Tag>
                    <Tag color="geekblue">小说 (560)</Tag>
                  </Space>
                </div>
              </div>
              <div style={{ marginBottom: 16 }}>
                <Text strong>导出格式说明：</Text>
                <ul style={{ paddingLeft: 20, color: '#666', fontSize: 13 }}>
                  <li><Text strong>JSON</Text> - 完整数据结构，适合数据迁移和备份恢复</li>
                  <li><Text strong>CSV</Text> - 表格格式，适合在 Excel 中查看和分析</li>
                </ul>
              </div>
              <Space>
                <Button
                  icon={<FileTextOutlined />}
                  onClick={() => handleExport('json')}
                >
                  导出 JSON
                </Button>
                <Button
                  icon={<FileExcelOutlined />}
                  onClick={() => handleExport('csv')}
                >
                  导出 CSV
                </Button>
              </Space>
            </Card>
          </Col>
        </Row>
      ),
    },
  ]

  return (
    <div>
      <Tabs
        defaultActiveKey="overview"
        items={tabItems}
        size="large"
      />

      {/* 导入数据弹窗 */}
      <Modal
        title="导入数据"
        open={importModalOpen}
        onCancel={() => setImportModalOpen(false)}
        footer={null}
        width={520}
      >
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <CloudDownloadOutlined style={{ fontSize: 48, color: '#1890ff', marginBottom: 16 }} />
          <Paragraph>
            将数据文件拖拽到此处，或点击选择文件
          </Paragraph>
          <Paragraph type="secondary">
            支持 .json / .csv 格式，文件大小不超过 50MB
          </Paragraph>
          <Button type="primary" style={{ marginTop: 16 }}>
            选择文件
          </Button>
        </div>
        <div style={{ background: '#f5f5f5', borderRadius: 8, padding: 16 }}>
          <Text strong>导入预览</Text>
          <Paragraph type="secondary" style={{ fontSize: 13 }}>
            选择文件后将显示数据预览，确认无误后点击导入。
          </Paragraph>
          <Empty
            description="请先选择要导入的文件"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        </div>
      </Modal>

      {/* 导出数据弹窗 */}
      <Modal
        title="导出数据"
        open={exportModalOpen}
        onCancel={() => setExportModalOpen(false)}
        onOk={() => {
          handleExport('json')
        }}
        okText="确认导出"
        cancelText="取消"
      >
        <Form layout="vertical">
          <Form.Item label="导出格式">
            <Select defaultValue="json" style={{ width: '100%' }}>
              <Select.Option value="json">JSON (完整数据结构)</Select.Option>
              <Select.Option value="csv">CSV (表格格式)</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item label="导出模块">
            <Select
              mode="multiple"
              defaultValue={['users', 'expenses', 'mood_diaries', 'weight_records', 'notes', 'novels']}
              style={{ width: '100%' }}
              options={[
                { label: '用户数据', value: 'users' },
                { label: '消费记录', value: 'expenses' },
                { label: '心情日记', value: 'mood_diaries' },
                { label: '体重记录', value: 'weight_records' },
                { label: '笔记', value: 'notes' },
                { label: '小说', value: 'novels' },
              ]}
            />
          </Form.Item>
          <Form.Item label="时间范围">
            <Select defaultValue="all" style={{ width: '100%' }}>
              <Select.Option value="all">全部数据</Select.Option>
              <Select.Option value="today">今日</Select.Option>
              <Select.Option value="week">最近一周</Select.Option>
              <Select.Option value="month">最近一月</Select.Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default DataSync
