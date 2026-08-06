import React, { useState, useEffect, useCallback } from 'react'
import {
  Card,
  Row,
  Col,
  Statistic,
  Table,
  Button,
  Typography,
  Tag,
  Progress,
  Segmented,
  Alert,
  Empty,
  Space,
} from 'antd'
import {
  DatabaseOutlined,
  ReloadOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  SafetyOutlined,
  ThunderboltOutlined,
  ApiOutlined,
  WarningOutlined,
} from '@ant-design/icons'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { useMounted } from '../hooks/useMounted'
import { usePermission } from '../hooks/usePermission'
import { systemMonitorService, type TableStat, type DbHealth, type RlsCoverage, type SeqScanHotspot, type LogTrendPoint } from '../services/systemMonitorService'
import { TABLE_NAME_MAP } from '../constants/operationLog'

const { Text } = Typography

// ==================== 格式化辅助 ====================

function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB']
  const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)))
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`
}

function formatNumber(n: number | null | undefined): string {
  return (n ?? 0).toLocaleString()
}

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
}

// ==================== 子组件 ====================

/** 分区1：健康概览 */
const HealthOverview: React.FC<{ health: DbHealth | null; latencyMs: number | null; loading: boolean }> = ({ health, latencyMs, loading }) => {
  const utilPct = health?.conn_util_pct ?? 0
  const connColor = utilPct >= 80 ? '#ff4d4f' : utilPct >= 60 ? '#faad14' : '#52c41a'
  const errUp = (health?.err_last_24h ?? 0) > (health?.err_prev_24h ?? 0)
  return (
    <Card title="健康概览" style={{ marginBottom: 16 }}>
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Statistic
            title="数据库状态"
            value={health ? '已连接' : '—'}
            prefix={health ? <CheckCircleOutlined style={{ color: '#52c41a' }} /> : <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />}
            valueStyle={{ color: health ? '#52c41a' : '#999' }}
          />
          <Text type="secondary" style={{ fontSize: 12 }}>
            查询延迟 {latencyMs != null ? `${latencyMs} ms` : '—'}
          </Text>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Statistic title="数据库总大小" value={health ? formatBytes(health.db_size_bytes) : '—'} prefix={<DatabaseOutlined />} />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Statistic
            title="连接数水位"
            value={health ? `${health.active_conns} / ${health.max_conns}` : '—'}
            valueStyle={{ color: connColor }}
            prefix={<ApiOutlined />}
          />
          <Text type="secondary" style={{ fontSize: 12 }}>利用率 {utilPct}%</Text>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Statistic
            title="近24h错误数"
            value={health ? formatNumber(health.err_last_24h) : '—'}
            valueStyle={{ color: errUp ? '#ff4d4f' : '#52c41a' }}
            prefix={errUp ? <WarningOutlined style={{ color: '#ff4d4f' }} /> : <CheckCircleOutlined style={{ color: '#52c41a' }} />}
          />
          <Text type="secondary" style={{ fontSize: 12 }}>
            前24h {formatNumber(health?.err_prev_24h)} {errUp ? '（↑ 环比上升）' : '（持平/下降）'}
          </Text>
        </Col>
      </Row>
      {loading && <Text type="secondary">加载中…</Text>}
    </Card>
  )
}

/** 分区2：数据规模 */
const TableScaleTable: React.FC<{ data: TableStat[]; loading: boolean }> = ({ data, loading }) => {
  const columns = [
    { title: '表名', dataIndex: 'table_name', key: 'table_name', render: (v: string) => {
        const cn = TABLE_NAME_MAP[v]
        return cn ? (
          <span><Tag color="blue">{cn}</Tag> <Text type="secondary" style={{ fontSize: 12 }}>{v}</Text></span>
        ) : <Text type="secondary" strong>{v}</Text>
      }, sorter: (a: TableStat, b: TableStat) => (TABLE_NAME_MAP[a.table_name] ?? a.table_name).localeCompare(TABLE_NAME_MAP[b.table_name] ?? b.table_name) },
    { title: '行数(估计)', dataIndex: 'row_estimate', key: 'row_estimate', align: 'right' as const, render: (v: number) => formatNumber(v), sorter: (a: TableStat, b: TableStat) => a.row_estimate - b.row_estimate, defaultSortOrder: 'descend' as const },
    { title: '表大小', dataIndex: 'table_size_bytes', key: 'table_size_bytes', align: 'right' as const, render: (v: number) => formatBytes(v), sorter: (a: TableStat, b: TableStat) => a.table_size_bytes - b.table_size_bytes },
    { title: '索引大小', dataIndex: 'index_size_bytes', key: 'index_size_bytes', align: 'right' as const, render: (v: number) => formatBytes(v), sorter: (a: TableStat, b: TableStat) => a.index_size_bytes - b.index_size_bytes },
    { title: '总大小', dataIndex: 'total_size_bytes', key: 'total_size_bytes', align: 'right' as const, render: (v: number) => <Text strong>{formatBytes(v)}</Text>, sorter: (a: TableStat, b: TableStat) => a.total_size_bytes - b.total_size_bytes },
    { title: '最后 Vacuum', dataIndex: 'last_vacuum', key: 'last_vacuum', render: (v: string | null) => <Text type="secondary">{formatDate(v)}</Text> },
  ]
  return (
    <Card title="数据规模（public 各表，自动发现）" style={{ marginBottom: 16 }}>
      <Table
        dataSource={data}
        columns={columns}
        rowKey="table_name"
        loading={loading}
        pagination={{ pageSize: 10, showSizeChanger: true }}
        size="middle"
        scroll={{ x: 900 }}
      />
    </Card>
  )
}

/** 分区3：操作/错误趋势 */
const LogTrendChart: React.FC<{ data: LogTrendPoint[]; loading: boolean; days: number; onDaysChange: (d: number) => void }> = ({ data, loading, days, onDaysChange }) => {
  const chartData = data.map(d => ({ ...d, label: d.day.slice(5) }))
  return (
    <Card
      title="操作与错误趋势"
      style={{ marginBottom: 16 }}
      extra={
        <Segmented
          value={days}
          onChange={(v) => onDaysChange(v as number)}
          options={[{ label: '近7天', value: 7 }, { label: '近30天', value: 30 }]}
        />
      }
    >
      {loading ? (
        <Empty description="加载中…" />
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData} margin={{ top: 8, right: 24, left: 0, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="label" tick={{ fontSize: 12 }} />
            <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="op_count" name="操作量" stroke="#1677ff" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="err_count" name="错误量" stroke="#ff4d4f" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      )}
    </Card>
  )
}

/** 分区4：安全与性能姿态 */
const SecurityPosture: React.FC<{ rls: RlsCoverage | null; hotspots: SeqScanHotspot[]; loading: boolean }> = ({ rls, hotspots, loading }) => {
  const rlsPct = rls && rls.total_tables > 0 ? Math.round((rls.rls_enabled / rls.total_tables) * 100) : 0
  const hotspotColumns = [
    { title: '表名', dataIndex: 'table_name', key: 'table_name', render: (v: string) => {
        const cn = TABLE_NAME_MAP[v]
        return cn ? (
          <span><Tag color="blue">{cn}</Tag> <Text type="secondary" style={{ fontSize: 12 }}>{v}</Text></span>
        ) : <Text type="secondary" strong>{v}</Text>
      } },
    { title: '行数(估计)', dataIndex: 'row_estimate', key: 'row_estimate', align: 'right' as const, render: (v: number) => formatNumber(v), sorter: (a: SeqScanHotspot, b: SeqScanHotspot) => a.row_estimate - b.row_estimate },
    { title: '顺序扫描', dataIndex: 'seq_scan', key: 'seq_scan', align: 'right' as const, render: (v: number) => <Text type="danger">{formatNumber(v)}</Text>, sorter: (a: SeqScanHotspot, b: SeqScanHotspot) => a.seq_scan - b.seq_scan, defaultSortOrder: 'descend' as const },
    { title: '索引扫描', dataIndex: 'idx_scan', key: 'idx_scan', align: 'right' as const, render: (v: number) => formatNumber(v), sorter: (a: SeqScanHotspot, b: SeqScanHotspot) => a.idx_scan - b.idx_scan },
  ]
  return (
    <Card title="安全与性能姿态" style={{ marginBottom: 16 }} loading={loading}>
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={10}>
          <Space direction="vertical" style={{ width: '100%' }} size="middle">
            <Text strong><SafetyOutlined /> RLS 覆盖率（public 表启用行级安全的比例）</Text>
            <Progress
              percent={rlsPct}
              status={rlsPct === 100 ? 'success' : 'exception'}
              strokeColor={rlsPct === 100 ? '#52c41a' : '#faad14'}
            />
            <Text type="secondary">
              {rls ? `${rls.rls_enabled} / ${rls.total_tables} 张表已开启 RLS` : '—'}
            </Text>
            {rls && rls.unprotected.length > 0 && (
              <div>
                <Text type="danger">未开启 RLS 的表（安全红线）：</Text>
                <div style={{ marginTop: 8 }}>
                  {rls.unprotected.map(t => (
                    <Tag key={t} color="error" style={{ marginBottom: 4 }}>{t}</Tag>
                  ))}
                </div>
              </div>
            )}
            {rls && rls.unprotected.length === 0 && (
              <Text type="success">所有 public 表均已开启 RLS ✓</Text>
            )}
          </Space>
        </Col>
        <Col xs={24} lg={14}>
          <Space direction="vertical" style={{ width: '100%' }} size="small">
            <Text strong><ThunderboltOutlined /> 全表扫描热点（seq_scan &gt; idx_scan，提示缺索引）</Text>
            {hotspots.length === 0 ? (
              <Text type="success">未发现明显全表扫描热点 ✓</Text>
            ) : (
              <Table
                dataSource={hotspots}
                columns={hotspotColumns}
                rowKey="table_name"
                pagination={false}
                size="small"
              />
            )}
          </Space>
        </Col>
      </Row>
    </Card>
  )
}

// ==================== 主组件 ====================

const SystemMonitor: React.FC = () => {
  const mountedRef = useMounted()
  const { isAdmin } = usePermission()
  const [refreshing, setRefreshing] = useState(false)

  // 各分区独立状态（单 RPC 失败不影响其余）
  const [health, setHealth] = useState<DbHealth | null>(null)
  const [latencyMs, setLatencyMs] = useState<number | null>(null)
  const [healthLoading, setHealthLoading] = useState(true)
  const [tables, setTables] = useState<TableStat[]>([])
  const [tablesLoading, setTablesLoading] = useState(true)
  const [trendDays, setTrendDays] = useState<number>(7)
  const [trends, setTrends] = useState<LogTrendPoint[]>([])
  const [trendsLoading, setTrendsLoading] = useState(true)
  const [rls, setRls] = useState<RlsCoverage | null>(null)
  const [hotspots, setHotspots] = useState<SeqScanHotspot[]>([])
  const [secLoading, setSecLoading] = useState(true)

  const loadHealth = useCallback(async () => {
    setHealthLoading(true)
    const t0 = performance.now()
    const res = await systemMonitorService.getDbHealth()
    const t1 = performance.now()
    if (!mountedRef.current) return
    if (res.success && res.data && res.data.length > 0) {
      setHealth(res.data[0] ?? null)
      setLatencyMs(Math.round(t1 - t0))
    }
    setHealthLoading(false)
  }, [mountedRef])

  const loadTables = useCallback(async () => {
    setTablesLoading(true)
    const res = await systemMonitorService.getTableStats()
    if (!mountedRef.current) return
    if (res.success) setTables(res.data || [])
    setTablesLoading(false)
  }, [mountedRef])

  const loadTrends = useCallback(async (days: number) => {
    setTrendsLoading(true)
    const res = await systemMonitorService.getLogTrends(days)
    if (!mountedRef.current) return
    if (res.success) setTrends(res.data || [])
    setTrendsLoading(false)
  }, [mountedRef])

  const loadSecurity = useCallback(async () => {
    setSecLoading(true)
    const [rlsRes, hotRes] = await Promise.all([
      systemMonitorService.getRlsCoverage(),
      systemMonitorService.getSeqScanHotspots(10000),
    ])
    if (!mountedRef.current) return
    if (rlsRes.success && rlsRes.data && rlsRes.data.length > 0) setRls(rlsRes.data[0] ?? null)
    if (hotRes.success) setHotspots(hotRes.data || [])
    setSecLoading(false)
  }, [mountedRef])

  const loadAll = useCallback(async () => {
    if (!isAdmin()) return
    setRefreshing(true)
    await Promise.all([loadHealth(), loadTables(), loadTrends(trendDays), loadSecurity()])
    setRefreshing(false)
  }, [isAdmin, loadHealth, loadTables, loadTrends, loadSecurity, trendDays, mountedRef])

  useEffect(() => {
    if (isAdmin()) {
      loadHealth()
      loadTables()
      loadTrends(trendDays)
      loadSecurity()
    }
  }, [isAdmin, loadHealth, loadTables, loadTrends, loadSecurity, trendDays])

  if (!isAdmin()) {
    return (
      <div style={{ padding: 24 }}>
        <Alert type="warning" message="需要管理员权限" description="系统监控页仅对管理员/超级管理员开放。" showIcon />
      </div>
    )
  }

  return (
    <div style={{ padding: 24 }}>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>系统监控</h2>
        <Button icon={<ReloadOutlined />} onClick={loadAll} loading={refreshing}>刷新全部</Button>
      </div>

      <HealthOverview health={health} latencyMs={latencyMs} loading={healthLoading} />
      <TableScaleTable data={tables} loading={tablesLoading} />
      <LogTrendChart data={trends} loading={trendsLoading} days={trendDays} onDaysChange={(d) => { setTrendDays(d); loadTrends(d) }} />
      <SecurityPosture rls={rls} hotspots={hotspots} loading={secLoading} />
    </div>
  )
}

export default SystemMonitor
