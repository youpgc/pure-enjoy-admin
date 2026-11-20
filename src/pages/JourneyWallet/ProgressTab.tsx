import React, { useCallback, useEffect, useState } from 'react'
import { Table, Alert, Card, Button, Tag, Row, Col, Statistic, Space } from 'antd'
import { ReloadOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import type { DbJourneyProgress } from '../../types/database'
import { journeyProgressService, journeyCharacterService } from '../../services/gameService'
import { usePagination } from '../../hooks/usePagination'
import { useMounted } from '../../hooks/useMounted'
import { handleApiError } from '../../utils/apiClient'
import { useUsernames } from '../../hooks/useUsernames'
import { UserName } from '../../components/common/UserName'
import { formatDateTime } from '../../utils/format'
import common from '../../styles/common.module.css'
import { PAGE_SIZE, isProgressAnomaly } from './helpers'

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
  // 出战角色列展示角色名：selected_character 存的是角色 code，按 journey_characters 字典翻译
  const [charNames, setCharNames] = useState<Map<string, string>>(() => new Map())

  useEffect(() => {
    let cancelled = false
    journeyCharacterService.findAll().then((res) => {
      if (cancelled || !res.success || !res.data) return
      setCharNames(new Map(res.data.map((c) => [c.code, c.name])))
    })
    return () => {
      cancelled = true
    }
  }, [])

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

  const ids = rows.map((r) => r.user_id)
  const userMap = useUsernames(ids)

  const columns: ColumnsType<DbJourneyProgress> = [
    {
      title: '用户',
      dataIndex: 'user_id',
      width: 140,
      render: (v: string) => <UserName userId={v} userMap={userMap} />,
    },
    { title: '功德余额', dataIndex: 'merit_balance', width: 110 },
    {
      title: '已行至难',
      dataIndex: 'farthest_level_no',
      width: 100,
      render: (v: number) => (v > 0 ? `第${v}难` : '—'),
    },
    { title: '总击杀', dataIndex: 'total_kills', width: 100 },
    {
      title: '累计功德',
      dataIndex: 'total_merit_earned',
      width: 100,
      render: (v: number | undefined) => v ?? '—',
    },
    {
      // 每日游历当日 BJ 日期键（yyyy-MM-dd），非时间戳，不套 formatDateTime
      title: '每日游历',
      dataIndex: 'last_daily_date',
      width: 110,
      render: (v: string | null | undefined) => v || '—',
    },
    { title: '剩余天赋点', dataIndex: 'talent_pool', width: 110 },
    {
      title: '出战角色',
      dataIndex: 'selected_character',
      width: 110,
      render: (v: string) => charNames.get(v) ?? v,
    },
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
        scroll={{ x: 1120 }}
      />
    </>
  )
}

export { ProgressTab }
