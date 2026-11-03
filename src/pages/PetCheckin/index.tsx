import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Alert, Button, Card, InputNumber, Modal, Select, Space, Switch, Table, Tag, message } from 'antd'
import { ReloadOutlined, SaveOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import {
  petCheckinService,
  type PetCheckinDayRow,
  type PetCheckinRecordRow,
  type PetCheckinSnapshotRow,
} from '../../services/petCheckinService'
import { petItemService } from '../../services/petService'
import { UserName } from '../../components/common/UserName'
import { useUsernames } from '../../hooks/useUsernames'
import { formatDateTime } from '../../utils/format'
import DateRangeFilter, { rangeToParams } from '../../components/common/DateRangeFilter'
import type { Dayjs } from 'dayjs'
import common from '../../styles/common.module.css'

// ==================== 签到配置（宠物模块独享签到体系） ====================
//
// 生效语义：奖励随上月配置继承、修改下月生效——
// 本页编辑的是「模板」（31 槽常驻）；保存成功后立即预固化次月快照，
// 当月与更早月份的生效值固化在各自月度快照中，不再受模板修改影响。
//
// 值域约束：每日奖励 = 金币或道具穿插编排、每次仅限一项（金币区间为默认
// 配置值可调整，非硬性限制）。每格前置类型 Switch（金币/道具）：两侧草稿
// 值都保留不置空，开关决定启用侧，保存时按开关只写一侧（另一侧落空值）。
// 道具仅限常规消耗品/工具（不发稀有道具），补签卡不可配进奖励格。

interface ItemEntry {
  code: string
  count: number
}

type RewardDraft = { gold: number; items: ItemEntry[] }

// 月模板分组：每 12 天一组横向排列（组标题留空，共 3 组），每格 = 日期 +
// 类型开关 + 金币列 + 道具列（日期列显示第 N 天）；25-31 日组不足 12 天补空
const DAY_GROUPS: Array<{ days: Array<number | undefined> }> = [
  { days: Array.from({ length: 12 }, (_, i) => i + 1) },
  { days: Array.from({ length: 12 }, (_, i) => i + 13) },
  { days: [...Array.from({ length: 7 }, (_, i) => i + 25), ...Array<undefined>(5).fill(undefined)] },
]

const PetCheckin: React.FC = () => {
  const [days, setDays] = useState<Map<number, RewardDraft>>(new Map())
  const [snapshots, setSnapshots] = useState<PetCheckinSnapshotRow[]>([])
  const [records, setRecords] = useState<PetCheckinRecordRow[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  // 脏行集合（day 集合 / threshold 集合）
  const [dirtyDays, setDirtyDays] = useState<Set<number>>(new Set())
  // 道具目录（**全量**，nameOf 中文名映射用——奖励格/流水会出现加速剂等
  // 非可用效果道具，映射集若过滤会落回原码）；下拉选项另存常规消耗品子集
  const [catalog, setCatalog] = useState<Array<{ item_code: string; name: string }>>([])
  // 道具编辑下拉（常规消耗品子集：effect.type ∈ feed/clean/toy/heal/refine_point，
  // 与 App 端可用消耗品同一口径；稀有/蛋/扩容/补签卡天然不在集内）
  const [catalogOptions, setCatalogOptions] = useState<Array<{ item_code: string; name: string }>>([])
  // 道具编辑弹窗
  const [editing, setEditing] = useState<{ day: number; items: ItemEntry[] } | null>(null)
  // 流水日期范围（服务端 created_at gte/lte）
  const [recordRange, setRecordRange] = useState<[Dayjs, Dayjs] | null>(null)
  // 每格奖励类型开关（金币/道具）：两侧草稿值都保留不置空，开关决定保存
  // 与启用侧；保存时按开关只写一侧（另一侧落空值），满足「仅限一项」约束
  const [rewardType, setRewardType] = useState<Map<number, 'gold' | 'items'>>(new Map())
  // 载入时基线快照（类型+值）：脏标记按「当前 vs 基线」实时判定——
  // 切走再切回、数值改回原样都会自动摘掉「改」标，不再只增不减
  const originRef = useRef<Map<number, { type: 'gold' | 'items'; gold: number; items: ItemEntry[] }>>(new Map())

  const typeOf = (day: number): 'gold' | 'items' => rewardType.get(day) ?? 'gold'

  const applyDirty = (day: number, draft: RewardDraft, type: 'gold' | 'items') => {
    const o = originRef.current.get(day)
    const same =
      !!o && o.type === type && o.gold === draft.gold && JSON.stringify(o.items) === JSON.stringify(draft.items)
    setDirtyDays((prev) => {
      const next = new Set(prev)
      if (same) next.delete(day)
      else next.add(day)
      return next
    })
  }

  const toggleType = (day: number, checked: boolean) => {
    const type: 'gold' | 'items' = checked ? 'items' : 'gold'
    setRewardType(new Map(rewardType).set(day, type))
    const draft = days.get(day)
    if (draft) applyDirty(day, draft, type)
  }

  const load = useCallback(async () => {
    setLoading(true)
    const [d, s, r] = await Promise.all([
      petCheckinService.listDays(),
      petCheckinService.listSnapshots(),
      petCheckinService.listRecords(50, rangeToParams(recordRange)),
    ])
    const map = new Map<number, RewardDraft>()
    const types = new Map<number, 'gold' | 'items'>()
    if (d.success && d.data) {
      for (const row of d.data as PetCheckinDayRow[]) {
        map.set(row.day, { gold: row.reward?.gold ?? 0, items: row.reward?.items ?? [] })
        types.set(row.day, (row.reward?.items?.length ?? 0) > 0 ? 'items' : 'gold')
      }
    }
    // 模板缺槽补 31 天全量（31 格常驻语义；新增槽按模板种子金币曲线的末档值兜底 0）
    for (let i = 1; i <= 31; i++) {
      if (!map.has(i)) map.set(i, { gold: 0, items: [] })
      if (!types.has(i)) types.set(i, 'gold')
    }
    setDays(map)
    setRewardType(types)
    // 重建基线快照并清空脏标记（保存后 load 复位；失败的格由 saveDays 重标）
    originRef.current = new Map(
      [...map].map(([day, draft]) => [day, { type: types.get(day) ?? 'gold', gold: draft.gold, items: draft.items }])
    )
    setDirtyDays(new Set())
    setSnapshots(s.success && s.data ? (s.data as PetCheckinSnapshotRow[]) : [])
    setRecords(r.success && r.data ? (r.data as PetCheckinRecordRow[]) : [])
    setLoading(false)
  }, [recordRange])

  useEffect(() => {
    load()
    petItemService.findAll().then((res) => {
      if (res.success && res.data) {
        const USABLE = new Set(['feed', 'clean', 'toy', 'heal', 'refine_point'])
        const rows = res.data as Array<{ item_code: string; name: string; effect?: { type?: string } | null }>
        setCatalog(rows.map((i) => ({ item_code: i.item_code, name: i.name })))
        setCatalogOptions(
          rows
            .filter((i) => USABLE.has(i.effect?.type ?? ''))
            .map((i) => ({ item_code: i.item_code, name: i.name }))
        )
      }
    })
  }, [load])

  const nameOf = useCallback(
    (code: string) => catalog.find((i) => i.item_code === code)?.name ?? code,
    [catalog]
  )

  const currentMonthKey = useMemo(() => {
    const now = new Date()
    const beijing = new Date(now.getTime() + 8 * 3600_000)
    return `${beijing.getUTCFullYear()}-${String(beijing.getUTCMonth() + 1).padStart(2, '0')}`
  }, [])

  const saveDays = async () => {
    if (dirtyDays.size === 0) return message.info('模板无改动')
    setSaving(true)
    const failed: number[] = []
    for (const day of dirtyDays) {
      const draft = days.get(day)!
      // 仅限一项由开关保证：按类型只写一侧，另一侧落空值
      const reward =
        typeOf(day) === 'gold'
          ? { gold: draft.gold, items: [] as ItemEntry[] }
          : { gold: 0, items: draft.items }
      const res = await petCheckinService.upsertDay(day, reward)
      if (!res.success) failed.push(day)
    }
    setSaving(false)
    if (failed.length === 0) {
      const pre = await petCheckinService.prefetchNext()
      message.success(pre.success ? `已保存 ${dirtyDays.size} 格（次月已预固化生效）` : `已保存 ${dirtyDays.size} 格（次月预固化失败，将在次月首次访问时生效）`)
    } else {
      message.error(`第 ${failed.join('、')} 天保存失败，已保留改动标记，请重试`)
    }
    // 重载重建基线快照并清脏（load 内统一处理），失败格在其后重标
    await load()
    if (failed.length > 0) setDirtyDays(new Set(failed))
  }


  const openItemEditor = (day: number) => {
    const items = days.get(day)?.items ?? []
    setEditing({ day, items: items.map((i) => ({ ...i })) })
  }

  const commitItemEditor = () => {
    if (!editing) return
    // 两侧草稿都保留：道具写回不净土币，由开关决定保存哪侧
    const next = { ...days.get(editing.day)!, items: editing.items }
    setDays(new Map(days).set(editing.day, next))
    applyDirty(editing.day, next, typeOf(editing.day))
    setEditing(null)
  }

  const itemColumns: ColumnsType<ItemEntry> = [
    {
      title: '道具',
      dataIndex: 'code',
      render: (v: string) => nameOf(v),
    },
    {
      title: '数量',
      dataIndex: 'count',
      width: 96,
      render: (v: number, __, idx) => (
        <InputNumber
          size="small"
          min={1}
          max={99}
          value={v}
          style={{ width: '100%' }}
          onChange={(n) =>
            setEditing((e) =>
              e
                ? { ...e, items: e.items.map((it, i) => (i === idx ? { ...it, count: n ?? 1 } : it)) }
                : e
            )
          }
        />
      ),
    },
    {
      title: '操作',
      width: 70,
      render: (_, __, idx) => (
        <Button
          size="small"
          type="link"
          danger
          onClick={() => setEditing((e) => (e ? { ...e, items: e.items.filter((_, i) => i !== idx) } : e))}
        >
          移除
        </Button>
      ),
    },
  ]

  // 月模板：8 列分组布局（每 10 天一组，行 = 组内第几天）。每格前置「类型」
  // Switch（金币/道具）：两侧草稿值都保留不置空，开关决定启用侧与保存内容，
  // 随时可切换；非启用侧输入禁用但仍展示已存值
  const goldCell = (d: number) => {
    const draft = days.get(d)
    if (!draft) return null // 模板未加载完成时的占位
    return (
      <InputNumber
        size="small"
        min={0}
        max={99999}
        value={draft.gold}
        disabled={typeOf(d) !== 'gold'}
        status={dirtyDays.has(d) ? 'warning' : undefined}
        style={{ width: '100%' }}
        onChange={(v) => {
          const next = { ...draft, gold: v ?? 0 }
          setDays(new Map(days).set(d, next))
          applyDirty(d, next, typeOf(d))
        }}
      />
    )
  }
  const itemsCell = (d: number) => {
    const draft = days.get(d)
    if (!draft) return null // 模板未加载完成时的占位
    const off = typeOf(d) !== 'items'
    return (
      <Space wrap size={2}>
        {draft.items.length === 0 ? (
          <Tag style={{ marginInlineEnd: 0, opacity: off ? 0.55 : 1 }}>无</Tag>
        ) : (
          draft.items.map((it) => (
            <Tag
              key={it.code}
              style={{ marginInlineEnd: 0, fontSize: 11, opacity: off ? 0.55 : 1 }}
            >
              {nameOf(it.code)}×{it.count}
            </Tag>
          ))
        )}
        <Button
          size="small"
          type="link"
          style={{ paddingInline: 2 }}
          disabled={off}
          onClick={() => openItemEditor(d)}
        >
          编辑
        </Button>
        {dirtyDays.has(d) && <Tag color="orange" style={{ marginInlineEnd: 0 }}>改</Tag>}
      </Space>
    )
  }
  const typeSwitch = (d: number) => (
    <Switch
      size="small"
      checked={typeOf(d) === 'items'}
      checkedChildren="道具"
      unCheckedChildren="金币"
      onChange={(checked) => toggleType(d, checked)}
    />
  )
  const templateColumns: ColumnsType<{ idx: number }> = DAY_GROUPS.map((g) => ({
    key: `group-${g.days[0]}`,
    title: ' ',
    children: [
      {
        key: `day-${g.days[0]}`,
        title: '日期',
        width: 64,
        render: (_: unknown, row: { idx: number }) => {
          const day = g.days[row.idx - 1]
          return day === undefined ? (
            <Tag style={{ marginInlineEnd: 0 }}>—</Tag>
          ) : (
            <span style={{ fontSize: 12, fontWeight: 600 }}>第{day}天</span>
          )
        },
      },
      {
        key: `type-${g.days[0]}`,
        title: '类型',
        width: 76,
        render: (_: unknown, row: { idx: number }) => {
          const day = g.days[row.idx - 1]
          return day === undefined ? <Tag style={{ marginInlineEnd: 0 }}>—</Tag> : typeSwitch(day)
        },
      },
      {
        key: `gold-${g.days[0]}`,
        title: '金币',
        width: 92,
        render: (_: unknown, row: { idx: number }) => {
          const day = g.days[row.idx - 1]
          return day === undefined ? <Tag style={{ marginInlineEnd: 0 }}>—</Tag> : goldCell(day)
        },
      },
      {
        key: `items-${g.days[0]}`,
        title: '道具',
        width: 168,
        render: (_: unknown, row: { idx: number }) => {
          const day = g.days[row.idx - 1]
          return day === undefined ? <Tag style={{ marginInlineEnd: 0 }}>—</Tag> : itemsCell(day)
        },
      },
    ],
  }))


  const recordColumns: ColumnsType<PetCheckinRecordRow> = [
    {
      title: '时间',
      dataIndex: 'created_at',
      width: 160,
      render: (v: string) => formatDateTime(v),
    },
    {
      title: '用户', dataIndex: 'user_id', width: 160,
      render: (v: string) => <UserName userId={v} userMap={userMap} />,
    },
    { title: '日期', dataIndex: 'checkin_date', width: 100 },
    {
      title: '类型',
      dataIndex: 'makeup',
      width: 70,
      render: (v: boolean) => (v ? <Tag color="orange">补签</Tag> : <Tag>签到</Tag>),
    },
    {
      title: '奖励',
      render: (r: PetCheckinRecordRow) => {
        const slot = r.reward?.slot
        const parts = [slot ? `第${slot}次` : '']
        if (r.reward?.gold) parts.push(`${r.reward.gold} 金币`)
        for (const it of r.reward?.items ?? []) parts.push(`${nameOf(it.code)}×${it.count}`)
        return parts.filter(Boolean).join('，') || '-'
      },
    },
  ]

  const currentSnapshot = snapshots.find((s) => s.month_key === currentMonthKey)
  const userIds = useMemo(() => records.map((r) => r.user_id), [records])
  const userMap = useUsernames(userIds)

  return (
    <div className={common.pageContainer}>
      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 12 }}
        message="生效规则：奖励随上月配置继承，修改下月生效"
        description={`当前编辑的是奖励模板（31 槽，第 N 天 = 用户当月第 N 次签到所得，含补签）。每日奖励为金币或道具穿插编排、每次仅限一项：每格用「类型」开关切换（金币/道具），两侧已配值都保留、随切随用，保存时只写启用侧。${currentMonthKey} 月的生效值已固化在月度快照中，本页修改不影响当月；保存成功后立即预固化次月快照，次月 1 号 0 点起对全员统一生效。奖励格仅常规消耗品/工具（不发稀有道具、不可配补签卡），补签上限固定每月 4 次。`}
      />

      <Card
        title="月历奖励模板"
        extra={
          <Space>
            <Button icon={<ReloadOutlined />} onClick={load}>
              刷新
            </Button>
            <Button
              type="primary"
              icon={<SaveOutlined />}
              loading={saving}
              disabled={dirtyDays.size === 0}
              onClick={saveDays}
            >
              保存模板（{dirtyDays.size} 格改动）
            </Button>
          </Space>
        }
        style={{ marginBottom: 12 }}
      >
        <Table
          rowKey="idx"
          size="small"
          loading={loading}
          columns={templateColumns}
          dataSource={loading
            ? []
            : (Array.from({ length: 12 }, (_, i) => ({ idx: i + 1 })) as Array<{ idx: number }>)}
          scroll={{ x: (64 + 76 + 92 + 168) * 3 }}
          pagination={false}
        />
      </Card>


      <Card
        title={`签到流水（最近 50 条；${currentMonthKey} 快照${currentSnapshot ? '已生成' : '未生成'}）`}
        extra={<DateRangeFilter value={recordRange} onChange={setRecordRange} />}
      >
        <Table rowKey="id" size="small" columns={recordColumns} dataSource={records} pagination={{ pageSize: 10 }} />
      </Card>

      <Modal
        open={!!editing}
        title="道具奖励"
        onCancel={() => setEditing(null)}
        onOk={commitItemEditor}
        width={420}
      >
        <Table
          rowKey={(r) => r.code}
          size="small"
          columns={itemColumns}
          dataSource={editing?.items ?? []}
          pagination={false}
        />
        <Space.Compact style={{ marginTop: 12, width: '100%' }}>
          <Select
            style={{ flex: 1 }}
            showSearch
            optionFilterProp="label"
            placeholder="选择道具（仅常规消耗品/工具）"
            options={catalogOptions.map((i) => ({ value: i.item_code, label: `${i.name}（${i.item_code}）` }))}
            onSelect={(v: string | null) => {
              if (!editing || !v) return
              if (editing.items.some((i) => i.code === v)) return message.warning('该道具已在本格')
              setEditing({ ...editing, items: [...editing.items, { code: v, count: 1 }] })
            }}
            value={null}
          />
        </Space.Compact>
      </Modal>
    </div>
  )
}

export default PetCheckin
