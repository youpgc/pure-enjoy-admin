import React, { useCallback, useEffect, useState } from 'react'
import { Table, Alert, Card, Button, Select, Space, Tag, Tabs, Input } from 'antd'
import { ReloadOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import type { PetWalletRow, PetWalletRecordRow } from '../../types/pet'
import { usePermission } from '../../hooks/usePermission'
import { petWalletService, petWalletRecordService } from '../../services/petService'
import { userService } from '../../services/userService'
import {
  PET_SOURCE_TYPE_LABELS,
  PET_SOURCE_TYPE_COLORS,
  PET_SOURCE_TYPE_OPTIONS,
} from '../../constants/pet'
import { useUsernames } from '../../hooks/useUsernames'
import { UserName } from '../../components/common/UserName'
import { formatDateTime } from '../../utils/format'
import common from '../../styles/common.module.css'

// ==================== 金币钱包与流水（pet_wallets / pet_wallet_records） ====================
// 流水按来源筛选（source_type 五枚举，蓝图 §六.2）；append-only 只读，不做增删改。

const PAGE_SIZE = 20

/// 单条流水变动展示（正绿负红，与积分流水同口径）
const DeltaText: React.FC<{ value: number }> = ({ value }) => (
  <span style={{ color: value >= 0 ? '#52c41a' : '#ff4d4f', fontWeight: 500 }}>
    {value >= 0 ? '+' : ''}
    {value}
  </span>
)

const WalletsTab: React.FC<{ refreshKey: number }> = ({ refreshKey }) => {
  const [rows, setRows] = useState<PetWalletRow[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [searchText, setSearchText] = useState('')

  const loadRows = useCallback(
    async (targetPage: number, keyword: string) => {
      setLoading(true)
      let userIds: string[] | undefined
      if (keyword.trim()) {
        const ids = await userService.findUserIdsByKeyword(keyword.trim())
        if (!ids.success) return setLoading(false)
        userIds = ids.data ?? []
        if (userIds.length === 0) {
          setRows([])
          setTotal(0)
          setLoading(false)
          return
        }
      }
      const res = await petWalletService.paginateWallets(targetPage, PAGE_SIZE, userIds)
      if (!res.success || !res.data) return setLoading(false)
      setRows(res.data.data)
      setTotal(res.data.total)
      setLoading(false)
    },
    []
  )

  useEffect(() => {
    loadRows(page, searchText)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, refreshKey])

  const ids = rows.map((r) => r.user_id)
  const userMap = useUsernames(ids)

  const columns: ColumnsType<PetWalletRow> = [
    {
      title: '用户',
      dataIndex: 'user_id',
      width: 200,
      render: (v: string) => <UserName userId={v} userMap={userMap} />,
    },
    { title: '金币余额', dataIndex: 'gold_balance', width: 120, render: (v: number) => `${v}` },
    { title: '累计获得', dataIndex: 'total_earned', width: 120, render: (v: number) => `${v}` },
    { title: '累计消费', dataIndex: 'total_spent', width: 120, render: (v: number) => `${v}` },
    { title: '更新时间', dataIndex: 'updated_at', width: 180, render: (v: string) => formatDateTime(v) },
  ]

  return (
    <>
      <Card className={common.mb16}>
        <div className={common.toolbar}>
          <Space wrap>
            <Input.Search
              placeholder="按用户名/昵称筛选"
              allowClear
              style={{ width: 220 }}
              onSearch={(v) => {
                setSearchText(v)
                setPage(1)
              }}
            />
            <Button
              icon={<ReloadOutlined />}
              loading={loading}
              onClick={() => loadRows(page, searchText)}
            >
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
        pagination={{
          current: page,
          pageSize: PAGE_SIZE,
          total,
          showSizeChanger: false,
          onChange: (p) => setPage(p),
        }}
        size="middle"
      />
    </>
  )
}

const RecordsTab: React.FC<{ refreshKey: number }> = ({ refreshKey }) => {
  const { hasPermission } = usePermission()
  const canRead = hasPermission('pets:read')

  const [rows, setRows] = useState<PetWalletRecordRow[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [sourceFilter, setSourceFilter] = useState('')
  const [searchText, setSearchText] = useState('')

  const loadRows = useCallback(
    async (targetPage: number, sourceType: string, keyword: string) => {
      setLoading(true)
      let userIds: string[] | undefined
      if (keyword.trim()) {
        const ids = await userService.findUserIdsByKeyword(keyword.trim())
        if (!ids.success) return setLoading(false)
        userIds = ids.data ?? []
        if (userIds.length === 0) {
          setRows([])
          setTotal(0)
          setLoading(false)
          return
        }
      }
      const res = await petWalletRecordService.paginateRecords(targetPage, PAGE_SIZE, {
        sourceType: sourceType || undefined,
        userIds,
      })
      if (!res.success || !res.data) return setLoading(false)
      setRows(res.data.data)
      setTotal(res.data.total)
      setLoading(false)
    },
    []
  )

  useEffect(() => {
    loadRows(page, sourceFilter, searchText)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, sourceFilter, refreshKey])

  const ids = rows.map((r) => r.user_id)
  const userMap = useUsernames(ids)

  const columns: ColumnsType<PetWalletRecordRow> = [
    {
      title: '用户',
      dataIndex: 'user_id',
      width: 170,
      render: (v: string) => <UserName userId={v} userMap={userMap} />,
    },
    { title: '变动', dataIndex: 'delta', width: 100, render: (v: number) => <DeltaText value={v} /> },
    { title: '变动后余额', dataIndex: 'balance_after', width: 110 },
    {
      title: '来源',
      dataIndex: 'source_type',
      width: 120,
      render: (v: string) => (
        <Tag color={PET_SOURCE_TYPE_COLORS[v] ?? 'default'}>
          {PET_SOURCE_TYPE_LABELS[v] ?? v}
        </Tag>
      ),
    },
    { title: '备注', dataIndex: 'remark', ellipsis: true },
    { title: '时间', dataIndex: 'created_at', width: 180, render: (v: string) => formatDateTime(v) },
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
                setPage(1)
              }}
              allowClear
              placeholder="全部来源"
              disabled={!canRead}
              options={PET_SOURCE_TYPE_OPTIONS}
            />
            <Input.Search
              placeholder="按用户名/昵称筛选"
              allowClear
              style={{ width: 200 }}
              onSearch={(v) => {
                setSearchText(v)
                setPage(1)
              }}
            />
            <Button icon={<ReloadOutlined />} loading={loading} onClick={() => loadRows(page, sourceFilter, searchText)}>
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
        pagination={{
          current: page,
          pageSize: PAGE_SIZE,
          total,
          showSizeChanger: false,
          onChange: (p) => setPage(p),
        }}
        size="middle"
        scroll={{ x: 900 }}
      />
    </>
  )
}

const PetWallets: React.FC = () => {
  const [refreshKey, setRefreshKey] = useState(0)
  return (
    <div>
      <Alert
        type="info"
        showIcon
        className={common.mb16}
        message="金币钱包说明"
        description="金币为宠物体系内货币（1 金币 = 10 积分，仅积分→金币单向兑换）；流水 append-only，来源五类：商城消费 / 系统发放 / 成就发放 / 积分兑换 / 客服调整。本页只读，客服调整在「宠物运营」页操作。"
      />
      <Tabs
        defaultActiveKey="records"
        items={[
          { key: 'records', label: '金币流水', children: <RecordsTab refreshKey={refreshKey} /> },
          { key: 'wallets', label: '钱包余额', children: <WalletsTab refreshKey={refreshKey} /> },
        ]}
        onChange={() => setRefreshKey((k) => k + 1)}
      />
    </div>
  )
}

export default PetWallets
