import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Alert, Button, Card, Input, Select, Space, Table, Tabs, message } from 'antd'
import { PlusOutlined, ReloadOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import type {
  PetRandomEventRow,
  PetEventChoiceLogRow,
  PetLotteryRecordRow,
} from '../../types/pet'
import { usePermission } from '../../hooks/usePermission'
import { useUsernames } from '../../hooks/useUsernames'
import { UserName } from '../../components/common/UserName'
import {
  petRandomEventService,
  petEventChoiceLogService,
  petEventLotteryService,
} from '../../services/petService'
import { PET_TABLE_PAGE_SIZE, PET_EVENT_CONTEXT_LABELS } from '../../constants/pet'
import { buildEventColumns } from './columns'
import EventFormModal, { type EventFormValues } from './EventFormModal'
import common from '../../styles/common.module.css'

// ==================== 随机事件管理（pet_random_events + 选择流水审计） ====================
//
// 2026-10-08 随机事件已实装（feature_pet_random_events_20261008.sql）：
// - Tab1 事件配置：单表模型，选项与奖惩包内嵌 content.options（定版 schema）；
// - Tab2 选择记录：pet_event_choice_logs 只读审计（RLS is_admin 全量），
//   客诉「我选了没到账」按用户/事件编码排查。

const fmtRewards = (v: unknown): string => {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return '-'
  const r = v as Record<string, unknown>
  const parts: string[] = []
  const n = (k: string, unit: string) => {
    const val = r[k]
    if (typeof val === 'number' && val !== 0) parts.push(`${val > 0 ? '+' : ''}${val}${unit}`)
  }
  n('gold', '金币')
  n('points', '积分')
  n('exp', '经验')
  n('mood', '心情')
  n('intimacy', '亲密')
  n('hunger', '饱食')
  if (r.item_code) parts.push(`${r.item_code}×${typeof r.item_count === 'number' ? r.item_count : 1}`)
  return parts.length ? parts.join('，') : '-'
}

const buildChoiceLogColumns = (): ColumnsType<PetEventChoiceLogRow> => [
  {
    title: '时间',
    dataIndex: 'created_at',
    width: 170,
    render: (v: string) => new Date(v).toLocaleString('zh-CN', { hour12: false }),
  },
  { title: '用户', dataIndex: 'user_id', width: 200, ellipsis: true },
  {
    title: '事件',
    key: 'event',
    width: 220,
    ellipsis: true,
    render: (_, r) => (r.event ? `${r.event.code} · ${r.event.title}` : r.event_id),
  },
  {
    title: '上下文',
    key: 'context',
    width: 130,
    render: (_, r) => PET_EVENT_CONTEXT_LABELS[r.event?.context ?? ''] ?? r.event?.context ?? '-',
  },
  { title: '选项序', dataIndex: 'option_index', width: 80 },
  {
    title: '奖惩（公示包）',
    dataIndex: 'rewards',
    render: (v: unknown) => fmtRewards(v),
  },
]

const PetEvents: React.FC = () => {
  const { hasPermission } = usePermission()
  const canWrite = hasPermission('pets:write')
  const canDelete = hasPermission('pets:delete')

  const [rows, setRows] = useState<PetRandomEventRow[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<PetRandomEventRow | null>(null)
  const [keyword, setKeyword] = useState('')
  const [enabledFilter, setEnabledFilter] = useState('')

  // —— 选择记录（Tab2）——
  const [logs, setLogs] = useState<PetEventChoiceLogRow[]>([])
  const [logLoading, setLogLoading] = useState(false)
  const [logKeyword, setLogKeyword] = useState('')
  const [rolls, setRolls] = useState<PetLotteryRecordRow[]>([])
  const [rollLoading, setRollLoading] = useState(false)
  const [rollKeyword, setRollKeyword] = useState('')

  const loadRows = useCallback(async () => {
    setLoading(true)
    const res = await petRandomEventService.findAll()
    setLoading(false)
    if (!res.success) return
    setRows(res.data ?? [])
  }, [])

  const loadLogs = useCallback(async () => {
    setLogLoading(true)
    const res = await petEventChoiceLogService.recentLogs()
    setLogLoading(false)
    if (!res.success) return
    setLogs(res.data ?? [])
  }, [])

  const loadRolls = useCallback(async () => {
    setRollLoading(true)
    const res = await petEventLotteryService.recentEventRolls()
    setRollLoading(false)
    if (!res.success) return
    setRolls(res.data ?? [])
  }, [])

  useEffect(() => {
    loadRows()
    loadLogs()
    loadRolls()
  }, [loadRows, loadLogs, loadRolls])

  const filtered = rows.filter((r) => {
    const kw = keyword.trim().toLowerCase()
    const hitKeyword = !kw || `${r.code} ${r.context}`.toLowerCase().includes(kw)
    const hitEnabled = !enabledFilter || (enabledFilter === 'on' ? r.enabled : !r.enabled)
    return hitKeyword && hitEnabled
  })

  const logKeywordTrim = logKeyword.trim().toLowerCase()
  const filteredLogs = useMemo(
    () =>
      logs.filter((l) => {
        if (!logKeywordTrim) return true
        return `${l.user_id} ${l.event?.code ?? ''} ${l.event?.title ?? ''}`
          .toLowerCase()
          .includes(logKeywordTrim)
      }),
    [logs, logKeywordTrim]
  )

  const logUserIds = useMemo(() => filteredLogs.slice(0, 50).map((l) => l.user_id), [filteredLogs])
  const logUserMap = useUsernames(logUserIds)

  const handleSave = async (values: EventFormValues) => {
    setSaving(true)
    try {
      const payload = {
        code: values.code.trim(),
        context: values.context.trim(),
        weight: Number(values.weight) || 0,
        content: values.content as never,
        enabled: !!values.enabled,
      }
      const res = editing
        ? await petRandomEventService.update(editing.id, payload as never)
        : await petRandomEventService.create(payload as never)
      if (!res.success) return
      message.success(editing ? '已更新' : '已新增')
      setModalOpen(false)
      await loadRows()
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (record: PetRandomEventRow) => {
    const res = await petRandomEventService.delete(record.id)
    if (!res.success) return
    message.success('已删除')
    await loadRows()
  }

  const columns = buildEventColumns({
    canWrite,
    canDelete,
    onEdit: (record) => {
      setEditing(record)
      setModalOpen(true)
    },
    onDelete: handleDelete,
  })

  const configTab = (
    <>
      <Card className={common.mb16}>
        <div className={common.toolbar}>
          <Space wrap>
            <Input
              style={{ width: 220 }}
              allowClear
              placeholder="搜索编码 / 上下文"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
            />
            <Select
              style={{ width: 130 }}
              value={enabledFilter}
              onChange={setEnabledFilter}
              options={[
                { value: '', label: '全部状态' },
                { value: 'on', label: '已启用' },
                { value: 'off', label: '已停用' },
              ]}
            />
            <Button icon={<ReloadOutlined />} loading={loading} onClick={loadRows}>
              刷新
            </Button>
          </Space>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            disabled={!canWrite}
            onClick={() => {
              setEditing(null)
              setModalOpen(true)
            }}
          >
            新增事件
          </Button>
        </div>
      </Card>
      <Table
        rowKey="id"
        loading={loading}
        columns={columns}
        dataSource={filtered}
        pagination={{ pageSize: PET_TABLE_PAGE_SIZE, showSizeChanger: false }}
        size="middle"
      />
    </>
  )

  const logColumns = buildChoiceLogColumns().map((c) =>
    c.title === '用户'
      ? {
          ...c,
          render: (v: string) => <UserName userId={v} userMap={logUserMap} />,
        }
      : c
  )

  const logsTab = (
    <>
      <Card className={common.mb16}>
        <div className={common.toolbar}>
          <Space wrap>
            <Input
              style={{ width: 260 }}
              allowClear
              placeholder="搜索用户 / 事件编码 / 标题"
              value={logKeyword}
              onChange={(e) => setLogKeyword(e.target.value)}
            />
            <Button icon={<ReloadOutlined />} loading={logLoading} onClick={loadLogs}>
              刷新
            </Button>
          </Space>
        </div>
      </Card>
      <Table
        rowKey="id"
        loading={logLoading}
        columns={logColumns}
        dataSource={filteredLogs}
        pagination={{ pageSize: PET_TABLE_PAGE_SIZE, showSizeChanger: false }}
        size="middle"
      />
    </>
  )

  const rollKeywordTrim = rollKeyword.trim().toLowerCase()
  const filteredRolls = useMemo(
    () =>
      rolls.filter((r) => {
        if (!rollKeywordTrim) return true
        const evt = (r.result as Record<string, unknown> | null)?.event_code ?? ''
        const hay = [r.user_id, r.pool_code ?? '', String(evt)].join(' ').toLowerCase()
        return hay.includes(rollKeywordTrim)
      }),
    [rolls, rollKeywordTrim]
  )

  const rollUserIds = useMemo(() => filteredRolls.slice(0, 50).map((r) => r.user_id), [filteredRolls])
  const rollUserMap = useUsernames(rollUserIds)

  const rollColumns: ColumnsType<PetLotteryRecordRow> = [
    {
      title: '时间',
      dataIndex: 'created_at',
      width: 170,
      render: (v: string) => new Date(v).toLocaleString('zh-CN', { hour12: false }),
    },
    {
      title: '用户',
      dataIndex: 'user_id',
      width: 160,
      render: (v: string) => <UserName userId={v} userMap={rollUserMap} />,
    },
    {
      title: '触发时机',
      dataIndex: 'pool_code',
      width: 130,
      render: (v: string | null) => PET_EVENT_CONTEXT_LABELS[v ?? ''] ?? v ?? '-',
    },
    {
      title: '触发率',
      key: 'rate',
      width: 90,
      render: (_, r) => {
        const rate = (r.input as Record<string, unknown> | null)?.rate
        return typeof rate === 'number' ? Math.round(rate * 100) + '%' : '-'
      },
    },
    {
      title: '掷中事件',
      key: 'event',
      width: 180,
      ellipsis: true,
      render: (_, r) => String((r.result as Record<string, unknown> | null)?.event_code ?? '-'),
    },
    {
      title: '配置版本',
      dataIndex: 'config_version',
      width: 90,
    },
  ]

  const rollsTab = (
    <>
      <Card className={common.mb16}>
        <div className={common.toolbar}>
          <Space wrap>
            <Input
              style={{ width: 260 }}
              allowClear
              placeholder="搜索用户 / 触发时机 / 事件编码"
              value={rollKeyword}
              onChange={(e) => setRollKeyword(e.target.value)}
            />
            <Button icon={<ReloadOutlined />} loading={rollLoading} onClick={loadRolls}>
              刷新
            </Button>
          </Space>
        </div>
      </Card>
      <Table
        rowKey="id"
        loading={rollLoading}
        columns={rollColumns}
        dataSource={filteredRolls}
        pagination={{ pageSize: PET_TABLE_PAGE_SIZE, showSizeChanger: false }}
        size="middle"
      />
    </>
  )

  return (
    <div>
      <Alert
        type="info"
        showIcon
        className={common.mb16}
        message="随机事件说明"
        description="事件为单表模型：文案、2~3 个选项与各选项奖惩包存在「事件内容」里（定版 schema：content.options）。App 在打开宠物页 / 照料动作成功后按概率触发（触发率与每日上限在「全局参数 → 随机事件」卡调整）；奖惩在触发时原样公示、选择时按同包结算。「选择记录」页签为流水审计（只读）。"
      />
      <Tabs
        defaultActiveKey="config"
        items={[
          { key: 'config', label: '事件配置', children: configTab },
          { key: 'logs', label: '选择记录', children: logsTab },
          { key: 'rolls', label: '触发记录', children: rollsTab },
        ]}
      />
      <EventFormModal
        open={modalOpen}
        editing={editing}
        saving={saving}
        onOk={handleSave}
        onCancel={() => setModalOpen(false)}
      />
    </div>
  )
}

export default PetEvents
