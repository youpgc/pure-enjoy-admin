import React, { useCallback, useEffect, useRef, useState } from 'react'
import {
  Table,
  Alert,
  Card,
  Button,
  Space,
  Tag,
  message,
  Select,
  InputNumber,
  Input,
  Form,
  Typography,
} from 'antd'
import { ReloadOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import type { PetItemFlowRow } from '../../types/pet'
import { usePermission } from '../../hooks/usePermission'
import { petItemFlowService, adminAdjustWallet, petWalletService } from '../../services/petService'
import { userService } from '../../services/userService'
import { useUsernames } from '../../hooks/useUsernames'
import { UserName } from '../../components/common/UserName'
import { PET_FLOW_BIZ_LABELS, PET_FLOW_BIZ_OPTIONS } from '../../constants/pet'
import { formatDateTime } from '../../utils/format'
import common from '../../styles/common.module.css'

// ==================== 宠物运营（客服金币调整 + 道具流水/丢弃审计） ====================
//
// - 客服金币调整：走服务端 RPC rpc_pet_admin_wallet_adjust（行锁 + pet_admin_grant
//   流水同事务双写），前端不直写钱包表；
// - 丢弃流水：pet_item_flow_logs（append-only）按 biz_type 前缀 discard 筛选，
//   是「误删申诉」的对账依据；道具增减本身可恢复与否以流水为准（丢弃不可恢复）。
// 页面定位：宠物运营操作台（资金调整 + 流水审计）；金币流水查询在「金币流水」页。

const PAGE_SIZE = 20

interface UserOption {
  value: string
  label: string
}

const AdjustCard: React.FC<{ onAdjusted: () => void }> = ({ onAdjusted }) => {
  const { hasPermission } = usePermission()
  const canWrite = hasPermission('pets:write')
  const [form] = Form.useForm()
  const [userOptions, setUserOptions] = useState<UserOption[]>([])
  const [searching, setSearching] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [selectedUser, setSelectedUser] = useState<string | null>(null)
  const [selectedBalance, setSelectedBalance] = useState<number | null>(null)
  const searchSeq = useRef(0)

  // 远端用户搜索（username/nickname ilike，两步查询先定位用户）
  const handleSearch = useCallback(async (keyword: string) => {
    const kw = keyword.trim()
    if (!kw) return
    const seq = ++searchSeq.current
    setSearching(true)
    const res = await userService.paginateUsers(1, 20, { searchText: kw })
    if (seq !== searchSeq.current) return
    if (res.success && res.data) {
      setUserOptions(
        res.data.data.map((u) => ({
          value: u.id,
          label: `${u.nickname || u.username || u.email || u.id}${u.username ? `（${u.username}）` : ''}`,
        }))
      )
    }
    setSearching(false)
  }, [])

  // 选中用户后即时显示当前余额（重复调整前可见核对）
  const handleUserChange = useCallback(async (userId: string) => {
    setSelectedUser(userId)
    setSelectedBalance(null)
    if (!userId) return
    const res = await petWalletService.findAll(
      (q) => (q as unknown as { eq: (c: string, v: string) => unknown }).eq('user_id', userId)
    )
    if (res.success && res.data && res.data.length > 0) {
      setSelectedBalance(res.data[0]?.gold_balance ?? 0)
    } else {
      setSelectedBalance(0)
    }
  }, [])

  const handleSubmit = async () => {
    const values = await form.validateFields()
    if (!selectedUser) return void message.error('请先选择目标用户')
    if (Number(values.gold) === 0) return void message.error('调整金币数不能为 0')
    setSubmitting(true)
    try {
      const res = await adminAdjustWallet(selectedUser, Number(values.gold), values.remark)
      if (!res.success) return // service 已统一弹窗 + 记日志
      message.success('调整成功（已写入 pet_admin_grant 流水）')
      form.resetFields(['gold', 'remark'])
      await handleUserChange(selectedUser)
      onAdjusted()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Card title="客服金币调整" className={common.mb16}>
      <Alert
        type="warning"
        showIcon
        className={common.mb16}
        message="资金敏感操作"
        description="调整经服务端 RPC 原子完成：钱包行锁 + pet_admin_grant 流水同事务写入；负向调整不得使余额为负。备注为必填（审计要求），调整人自动留痕。"
      />
      <Form form={form} layout="vertical" style={{ maxWidth: 520 }}>
        <Form.Item label="目标用户" required>
          <Space.Compact style={{ width: '100%' }}>
            <Select
              showSearch
              value={selectedUser ?? undefined}
              placeholder="输入用户名/昵称搜索后选择"
              filterOption={false}
              loading={searching}
              onSearch={handleSearch}
              onChange={(v) => handleUserChange(v as string)}
              notFoundContent={searching ? '搜索中…' : '输入关键字搜索'}
              style={{ width: '100%' }}
              options={userOptions}
            />
          </Space.Compact>
        </Form.Item>
        {selectedUser && selectedBalance !== null && (
          <Typography.Text type="secondary" className={common.mb16}>
            当前金币余额：{selectedBalance}
          </Typography.Text>
        )}
        <Form.Item
          name="gold"
          label="调整金币（正=发放 / 负=扣回）"
          rules={[{ required: true, message: '请输入调整金币数' }]}
        >
          <InputNumber className={common.fullWidth} addonAfter="金币" disabled={!canWrite} />
        </Form.Item>
        <Form.Item
          name="remark"
          label="调整备注"
          rules={[{ required: true, message: '备注必填（审计要求）' }]}
        >
          <Input.TextArea rows={2} placeholder="如：活动补偿 / 误操作回滚 #工单号" disabled={!canWrite} />
        </Form.Item>
        <Button type="primary" loading={submitting} disabled={!canWrite} onClick={handleSubmit}>
          执行调整
        </Button>
      </Form>
    </Card>
  )
}

const DiscardFlowsTab: React.FC<{ refreshKey: number }> = ({ refreshKey }) => {
  const [rows, setRows] = useState<PetItemFlowRow[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [bizFilter, setBizFilter] = useState('')
  const [searchText, setSearchText] = useState('')
  const [itemNames, setItemNames] = useState<Record<string, string>>({})

  // 道具名转译映射（一次拉取道具目录，量级 ≤ 数百行）
  const loadItemNames = useCallback(async () => {
    const map = await petItemFlowService.fetchItemNameMap()
    setItemNames(map)
  }, [])

  const loadRows = useCallback(
    async (targetPage: number, bizType: string, keyword: string) => {
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
      // 默认聚焦丢弃审计：biz_type in (discard, discard_batch)；选「全部」则不限
      const bizTypes = bizType ? [bizType] : ['discard', 'discard_batch']
      const res = await petItemFlowService.paginateFlows(targetPage, PAGE_SIZE, {
        bizTypes,
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
    loadRows(page, bizFilter, searchText)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, bizFilter, refreshKey])

  useEffect(() => {
    loadItemNames()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const ids = rows.map((r) => r.user_id)
  const userMap = useUsernames(ids)

  const columns: ColumnsType<PetItemFlowRow> = [
    {
      title: '用户',
      dataIndex: 'user_id',
      width: 160,
      render: (v: string) => <UserName userId={v} userMap={userMap} />,
    },
    {
      title: '道具',
      dataIndex: 'item_id',
      width: 160,
      render: (v: string) => itemNames[v] ?? v,
    },
    {
      title: '变动',
      dataIndex: 'delta',
      width: 90,
      render: (v: number) => (
        <span style={{ color: v >= 0 ? '#52c41a' : '#ff4d4f', fontWeight: 500 }}>
          {v >= 0 ? '+' : ''}
          {v}
        </span>
      ),
    },
    {
      title: '类型',
      dataIndex: 'biz_type',
      width: 110,
      render: (v: string) => (
        <Tag color={v.startsWith('discard') ? 'red' : 'default'}>
          {PET_FLOW_BIZ_LABELS[v] ?? v}
        </Tag>
      ),
    },
    { title: '余量', dataIndex: 'quantity_after', width: 80, render: (v: number | null) => v ?? '-' },
    { title: '备注/单据', dataIndex: 'ref_id', ellipsis: true, render: (v: string | null) => v ?? '-' },
    { title: '时间', dataIndex: 'created_at', width: 180, render: (v: string) => formatDateTime(v) },
  ]

  return (
    <>
      <Card className={common.mb16}>
        <div className={common.toolbar}>
          <Space wrap>
            <Select
              style={{ width: 180 }}
              value={bizFilter}
              onChange={(v) => {
                setBizFilter(v ?? '')
                setPage(1)
              }}
              allowClear
              placeholder="丢弃（默认）"
              options={[
                { value: '', label: '丢弃类（默认）' },
                { value: 'all', label: '全部道具流水' },
                ...PET_FLOW_BIZ_OPTIONS,
              ]}
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
            <Button
              icon={<ReloadOutlined />}
              loading={loading}
              onClick={() => loadRows(page, bizFilter, searchText)}
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
        scroll={{ x: 900 }}
      />
    </>
  )
}

const PetBagAdjust: React.FC = () => {
  // 调整成功 → 递增 refreshKey 联动刷新丢弃/道具流水
  const [refreshKey, setRefreshKey] = useState(0)
  return (
    <div>
      <AdjustCard onAdjusted={() => setRefreshKey((k) => k + 1)} />
      <Card title="道具流水 / 丢弃审计" className={common.mb16}>
        <Alert
          type="info"
          showIcon
          className={common.mb16}
          message="丢弃不可恢复"
          description="丢弃扩容道具不回退已购容量；本流水是「误删申诉」的对账依据，只能追加不可修改。"
        />
        <DiscardFlowsTab refreshKey={refreshKey} />
      </Card>
    </div>
  )
}

export default PetBagAdjust
