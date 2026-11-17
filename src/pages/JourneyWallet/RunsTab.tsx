import React, { useCallback, useEffect, useState } from 'react'
import { Table, Card, Button, Select, Space, Tag, Input } from 'antd'
import { ReloadOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import type { DbJourneyRun } from '../../types/database'
import { journeyRunService } from '../../services/gameService'
import { usePagination } from '../../hooks/usePagination'
import { useMounted } from '../../hooks/useMounted'
import { handleApiError } from '../../utils/apiClient'
import { useUsernames } from '../../hooks/useUsernames'
import { useGameMeta } from '../../utils/gameMetaCache'
import { UserName } from '../../components/common/UserName'
import { formatDateTime } from '../../utils/format'
import common from '../../styles/common.module.css'
import { PAGE_SIZE, CLEARED_OPTIONS, resolveUserIds, formatDuration } from './helpers'

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
        handleApiError(res.errorMessage, 'JourneyWallet-西行记录加载')
        return
      }
      if (!mountedRef.current) return
      setRows(res.data.data)
      setTotal(res.data.total)
    } catch (error) {
      handleApiError(error, 'JourneyWallet-西行记录加载')
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
  const meta = useGameMeta()
  const journeyGameId = meta?.gameMapByCode['journey']?.id
  const modeNameByCode: Record<string, string> = {}
  ;(journeyGameId ? meta?.modesByGameId[journeyGameId] ?? [] : []).forEach((m) => {
    modeNameByCode[m.code] = m.name
  })

  const columns: ColumnsType<DbJourneyRun> = [
    {
      title: '用户',
      dataIndex: 'user_id',
      width: 190,
      render: (v: string) => <UserName userId={v} userMap={userMap} />,
    },
    {
      title: '关卡',
      dataIndex: 'level_no',
      width: 110,
      render: (v: number, record) => {
        const modeCode = record.run_detail?.['mode']
        if (typeof modeCode === 'string' && modeNameByCode[modeCode]) {
          return modeNameByCode[modeCode]
        }
        // 旧数据未存模式码：主线仍按关卡序号展示，虚拟关无法还原模式留空
        return v > 0 ? `第${v}难` : '-'
      },
    },
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

export { RunsTab }
