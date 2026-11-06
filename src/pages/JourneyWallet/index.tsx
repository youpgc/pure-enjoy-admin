import React, { useCallback, useEffect, useState } from 'react'
import { Table, Alert, Card, Button, Select, Space, Tag, Tabs, Input, Tooltip, Row, Col, Statistic } from 'antd'
import { ReloadOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import type { DbJourneyMeritRecord, DbJourneyRun, DbJourneyProgress } from '../../types/database'
import { journeyMeritRecordService, journeyRunService, journeyProgressService } from '../../services/gameService'
import { userService } from '../../services/userService'
import { usePagination } from '../../hooks/usePagination'
import { useMounted } from '../../hooks/useMounted'
import { handleApiError } from '../../utils/apiClient'
import { useUsernames } from '../../hooks/useUsernames'
import { UserName } from '../../components/common/UserName'
import { formatDateTime } from '../../utils/format'
import DateRangeFilter, { rangeToParams } from '../../components/common/DateRangeFilter'
import { JOURNEY_MERIT_SOURCE_MAP } from '../../constants/game'
import type { Dayjs } from 'dayjs'
import common from '../../styles/common.module.css'

// ==================== 西行钱包（journey_merit_records / journey_runs / journey_progress） ====================
// 功德为西行独立货币：流水 append-only 只读，余额见 balance_after 快照列；
// 对局流水一场一条；进度快照一行=一个用户。表 DDL 尚未执行时查询报错属预期（提示条已说明）。
// 时间列（created_at/updated_at）统一经 utils/format 的 formatDateTime 展示
// （dayjs.tz('Asia/Shanghai') 固定 UTC+8 北京口径，不依赖浏览器时区）。

const PAGE_SIZE = 10

// 用户筛选输入为完整 UUID 时按 user_id 精确过滤，否则走用户名/昵称模糊解析
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const MERIT_SOURCE_OPTIONS = Object.entries(JOURNEY_MERIT_SOURCE_MAP).map(
  ([value, v]) => ({ value, label: v.label })
)

const CLEARED_OPTIONS = [
  { value: 'true', label: '通关' },
  { value: 'false', label: '失败' },
]

/// 单条流水变动展示（正绿负红，与宠物金币流水同口径）
const DeltaText: React.FC<{ value: number }> = ({ value }) => (
  <span style={{ color: value >= 0 ? '#52c41a' : '#ff4d4f', fontWeight: 500 }}>
    {value >= 0 ? '+' : ''}
    {value}
  </span>
)

/// 对局时长展示：不足 1 分钟显示秒（1 位小数），否则显示「X分XX秒」
const formatDuration = (ms: number | null | undefined): string => {
  if (ms === null || ms === undefined) return '-'
  const totalSec = ms / 1000
  if (totalSec < 60) return `${totalSec.toFixed(1)}s`
  const m = Math.floor(totalSec / 60)
  const s = Math.floor(totalSec % 60)
  return `${m}分${String(s).padStart(2, '0')}秒`
}

/// 用户筛选输入 → user_id 集合（UUID 直取；关键词经用户名/昵称解析）。
/// 返回 undefined = 不筛选；空数组 = 无匹配用户（调用方直接清空列表）。
const resolveUserIds = async (keyword: string): Promise<string[] | undefined | null> => {
  const kw = keyword.trim()
  if (!kw) return undefined
  if (UUID_RE.test(kw)) return [kw]
  const ids = await userService.findUserIdsByKeyword(kw)
  if (!ids.success) return null
  return ids.data ?? []
}

const MeritRecordsTab: React.FC = () => {
  const mountedRef = useMounted()
  const { pagination, setTotal, resetPage, tablePagination } = usePagination(PAGE_SIZE)
  const [rows, setRows] = useState<DbJourneyMeritRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [sourceFilter, setSourceFilter] = useState('')
  const [searchText, setSearchText] = useState('')
  // 时间范围（服务端 created_at gte/lte）
  const [createdRange, setCreatedRange] = useState<[Dayjs, Dayjs] | null>(null)

  const loadRows = useCallback(async () => {
    setLoading(true)
    try {
      const userIds = await resolveUserIds(searchText)
      if (userIds === null) return
      if (userIds && userIds.length === 0) {
        if (mountedRef.current) {
          setRows([])
          setTotal(0)
        }
        return
      }
      const res = await journeyMeritRecordService.paginateRecords(
        pagination.current,
        pagination.pageSize,
        {
          sourceType: sourceFilter || undefined,
          userIds: userIds ?? undefined,
          createdRange: rangeToParams(createdRange),
        }
      )
      if (!res.success || !res.data) {
        handleApiError(res.errorMessage, 'JourneyWallet-功德流水加载')
        return
      }
      if (!mountedRef.current) return
      setRows(res.data.data)
      setTotal(res.data.total)
    } catch (error) {
      handleApiError(error, 'JourneyWallet-功德流水加载')
    } finally {
      if (mountedRef.current) setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mountedRef, pagination.current, pagination.pageSize, sourceFilter, searchText, createdRange])

  useEffect(() => {
    loadRows()
  }, [loadRows])

  const ids = rows.map((r) => r.user_id)
  const userMap = useUsernames(ids)

  const columns: ColumnsType<DbJourneyMeritRecord> = [
    {
      title: '用户',
      dataIndex: 'user_id',
      width: 190,
      render: (v: string) => <UserName userId={v} userMap={userMap} />,
    },
    { title: '变动', dataIndex: 'delta', width: 100, render: (v: number) => <DeltaText value={v} /> },
    { title: '余额快照', dataIndex: 'balance_after', width: 110 },
    {
      title: '来源',
      dataIndex: 'source_type',
      width: 120,
      render: (v: string) => (
        <Tag color={JOURNEY_MERIT_SOURCE_MAP[v]?.color ?? 'default'}>
          {JOURNEY_MERIT_SOURCE_MAP[v]?.label ?? v}
        </Tag>
      ),
    },
    { title: '备注', dataIndex: 'remark', ellipsis: true },
    {
      title: '时间',
      dataIndex: 'created_at',
      width: 180,
      render: (v: string) => formatDateTime(v),
    },
  ]

  return (
    <>
      <Card className={common.mb16}>
        <div className={common.toolbar}>
          <Space wrap>
            <Select
              style={{ width: 160 }}
              value={sourceFilter}
              onChange={(v) => {
                setSourceFilter(v ?? '')
                resetPage()
              }}
              allowClear
              placeholder="全部来源"
              options={MERIT_SOURCE_OPTIONS}
            />
            <Input.Search
              placeholder="按用户 ID / 用户名筛选"
              allowClear
              style={{ width: 220 }}
              onSearch={(v) => {
                setSearchText(v)
                resetPage()
              }}
            />
            <DateRangeFilter
              value={createdRange}
              onChange={(d) => { setCreatedRange(d); resetPage() }}
            />
            <Button icon={<ReloadOutlined />} loading={loading} onClick={loadRows}>
              刷新
            </Button>
          </Space>
        </div>
      </Card>
      <Table
        rowKey="id"
        loading={loading}
        columns={columns}
        dataSource={rows}
        pagination={tablePagination}
        size="middle"
        scroll={{ x: 900 }}
      />
    </>
  )
}

const RunsTab: React.FC = () => {
  const mountedRef = useMounted()
  const { pagination, setTotal, resetPage, tablePagination } = usePagination(PAGE_SIZE)
  const [rows, setRows] = useState<DbJourneyRun[]>([])
  const [loading, setLoading] = useState(false)
  const [clearedFilter, setClearedFilter] = useState('')
  const [searchText, setSearchText] = useState('')

  const loadRows = useCallback(async () => {
    setLoading(true)
    try {
      const userIds = await resolveUserIds(searchText)
      if (userIds === null) return
      if (userIds && userIds.length === 0) {
        if (mountedRef.current) {
          setRows([])
          setTotal(0)
        }
        return
      }
      const res = await journeyRunService.paginateRuns(
        pagination.current,
        pagination.pageSize,
        {
          userIds: userIds ?? undefined,
          cleared: clearedFilter === '' ? undefined : clearedFilter === 'true',
        }
      )
      if (!res.success || !res.data) {
        handleApiError(res.errorMessage, 'JourneyWallet-对局记录加载')
        return
      }
      if (!mountedRef.current) return
      setRows(res.data.data)
      setTotal(res.data.total)
    } catch (error) {
      handleApiError(error, 'JourneyWallet-对局记录加载')
    } finally {
      if (mountedRef.current) setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mountedRef, pagination.current, pagination.pageSize, clearedFilter, searchText])

  useEffect(() => {
    loadRows()
  }, [loadRows])

  const ids = rows.map((r) => r.user_id)
  const userMap = useUsernames(ids)

  const columns: ColumnsType<DbJourneyRun> = [
    {
      title: '用户',
      dataIndex: 'user_id',
      width: 190,
      render: (v: string) => <UserName userId={v} userMap={userMap} />,
    },
    { title: '难数', dataIndex: 'level_no', width: 90, render: (v: number) => `第${v}难` },
    { title: '击杀', dataIndex: 'kills', width: 90 },
    { title: '功德', dataIndex: 'merit_gained', width: 100 },
    {
      title: '时长',
      dataIndex: 'duration_ms',
      width: 110,
      render: (v: number) => formatDuration(v),
    },
    {
      title: '结果',
      dataIndex: 'cleared',
      width: 100,
      render: (v: boolean) =>
        v ? <Tag color="green">✓ 通关</Tag> : <Tag color="red">✗ 失败</Tag>,
    },
    {
      title: '时间',
      dataIndex: 'created_at',
      width: 180,
      render: (v: string) => formatDateTime(v),
    },
  ]

  return (
    <>
      <Card className={common.mb16}>
        <div className={common.toolbar}>
          <Space wrap>
            <Select
              style={{ width: 140 }}
              value={clearedFilter}
              onChange={(v) => {
                setClearedFilter(v ?? '')
                resetPage()
              }}
              allowClear
              placeholder="全部结果"
              options={CLEARED_OPTIONS}
            />
            <Input.Search
              placeholder="按用户 ID / 用户名筛选"
              allowClear
              style={{ width: 220 }}
              onSearch={(v) => {
                setSearchText(v)
                resetPage()
              }}
            />
            <Button icon={<ReloadOutlined />} loading={loading} onClick={loadRows}>
              刷新
            </Button>
          </Space>
        </div>
      </Card>
      <Table
        rowKey="id"
        loading={loading}
        columns={columns}
        dataSource={rows}
        pagination={tablePagination}
        size="middle"
        scroll={{ x: 900 }}
      />
    </>
  )
}

/// 快照 sanity 校验：merit_balance>=0 且 farthest<=81（表有 CHECK 兜底，
/// 此处防数据漂移/双写回退类异常），违例行红标
const isProgressAnomaly = (r: DbJourneyProgress): boolean =>
  r.merit_balance < 0 || r.farthest_level_no > 81

const ProgressTab: React.FC = () => {
  const mountedRef = useMounted()
  const { pagination, setTotal, tablePagination } = usePagination(PAGE_SIZE)
  const [rows, setRows] = useState<DbJourneyProgress[]>([])
  const [loading, setLoading] = useState(false)
  // 汇总卡（全量口径：一行=一个用户，量级可控；表未建/查询失败时置 snapshotError 提示）
  const [summary, setSummary] = useState<{
    users: number
    meritTotal: number
    avgFarthest: number
  } | null>(null)
  const [snapshotError, setSnapshotError] = useState(false)

  const loadRows = useCallback(async () => {
    setLoading(true)
    try {
      const res = await journeyProgressService.listJourneyProgress({
        page: pagination.current,
        pageSize: pagination.pageSize,
      })
      if (!res.success || !res.data) return
      if (!mountedRef.current) return
      setRows(res.data.data)
      setTotal(res.data.total)
    } catch (error) {
      handleApiError(error, 'JourneyWallet-进度快照加载')
    } finally {
      if (mountedRef.current) setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mountedRef, pagination.current, pagination.pageSize])

  const loadSummary = useCallback(async () => {
    try {
      const res = await journeyProgressService.findAll()
      if (!mountedRef.current) return
      if (!res.success || !res.data) {
        setSnapshotError(true)
        setSummary(null)
        return
      }
      setSnapshotError(false)
      const list = res.data
      const users = list.length
      setSummary({
        users,
        meritTotal: list.reduce((s, r) => s + r.merit_balance, 0),
        avgFarthest: users > 0 ? list.reduce((s, r) => s + r.farthest_level_no, 0) / users : 0,
      })
    } catch (error) {
      handleApiError(error, 'JourneyWallet-进度汇总加载')
      if (mountedRef.current) {
        setSnapshotError(true)
        setSummary(null)
      }
    }
  }, [mountedRef])

  const loadAll = useCallback(() => {
    loadRows()
    loadSummary()
  }, [loadRows, loadSummary])

  useEffect(() => {
    loadRows()
  }, [loadRows])

  useEffect(() => {
    loadSummary()
  }, [loadSummary])

  const columns: ColumnsType<DbJourneyProgress> = [
    {
      title: '用户ID',
      dataIndex: 'user_id',
      width: 140,
      render: (v: string) => (
        <Tooltip title={v}>
          <span style={{ fontFamily: 'monospace' }}>{`${v.slice(0, 8)}…`}</span>
        </Tooltip>
      ),
    },
    { title: '功德余额', dataIndex: 'merit_balance', width: 110 },
    {
      title: '已行至难',
      dataIndex: 'farthest_level_no',
      width: 100,
      render: (v: number) => (v > 0 ? `第${v}难` : '—'),
    },
    { title: '总击杀', dataIndex: 'total_kills', width: 100 },
    { title: '剩余天赋点', dataIndex: 'talent_pool', width: 110 },
    { title: '出战角色', dataIndex: 'selected_character', width: 110 },
    {
      title: '更新时间',
      dataIndex: 'updated_at',
      width: 180,
      render: (v: string) => formatDateTime(v),
    },
    {
      title: '对账',
      key: 'sanity',
      width: 90,
      render: (_: unknown, r: DbJourneyProgress) =>
        isProgressAnomaly(r) ? <Tag color="red">异常</Tag> : <Tag color="green">正常</Tag>,
    },
  ]

  return (
    <>
      <Row gutter={[16, 16]} className={common.mb16}>
        <Col xs={12} lg={8}>
          <Card>
            <Statistic title="进度用户数" value={summary?.users ?? '-'} suffix="人" />
          </Card>
        </Col>
        <Col xs={12} lg={8}>
          <Card>
            <Statistic title="功德余额总和" value={summary?.meritTotal ?? '-'} suffix="点" />
          </Card>
        </Col>
        <Col xs={12} lg={8}>
          <Card>
            <Statistic
              title="平均最远难"
              value={summary ? summary.avgFarthest : '-'}
              precision={1}
              suffix="难"
            />
          </Card>
        </Col>
      </Row>
      {snapshotError && (
        <Alert
          type="warning"
          showIcon
          className={common.mb16}
          message="journey_progress 表暂不可用"
          description="进度快照建表 SQL（feature_journey_m3）尚未执行或查询失败，以下列表为空属预期；执行 SQL 后点击刷新即可。"
        />
      )}
      <Card className={common.mb16}>
        <div className={common.toolbar}>
          <Space wrap>
            <Button icon={<ReloadOutlined />} loading={loading} onClick={loadAll}>
              刷新
            </Button>
          </Space>
        </div>
      </Card>
      <Table
        rowKey="user_id"
        loading={loading}
        columns={columns}
        dataSource={rows}
        pagination={tablePagination}
        size="middle"
        scroll={{ x: 900 }}
      />
    </>
  )
}

const JourneyWallet: React.FC = () => (
  <div>
    <Alert
      type="info"
      showIcon
      className={common.mb16}
      message="西行钱包说明"
      description="功德为西行（journey）独立货币，与宠物金币/积分互不通用；流水 append-only 只读，变动后余额见「余额快照」列（balance_after）。来源四类：对局结算 / 天赋升级 / 角色解锁 / 还魂丹复活。「进度快照」读 journey_progress（一行=一个用户）。journey_merit_records、journey_runs、journey_progress 表 SQL 尚未执行时本页查询报错属预期，执行后即可正常查看。"
    />
    <Tabs
      defaultActiveKey="merit"
      destroyInactiveTabPane
      items={[
        { key: 'merit', label: '功德流水', children: <MeritRecordsTab /> },
        { key: 'runs', label: '对局记录', children: <RunsTab /> },
        { key: 'progress', label: '进度快照', children: <ProgressTab /> },
      ]}
    />
  </div>
)

export default JourneyWallet
