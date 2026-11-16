import React, { useCallback, useEffect, useState } from 'react'
import { Table, Card, Button, Select, Space, Tag, Input } from 'antd'
import { ReloadOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import type { DbJourneyMeritRecord } from '../../types/database'
import { journeyMeritRecordService } from '../../services/gameService'
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
import { PAGE_SIZE, MERIT_SOURCE_OPTIONS, DeltaText, resolveUserIds } from './helpers'

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

export { MeritRecordsTab }
