import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Alert,
  Button,
  Card,
  Form,
  InputNumber,
  Modal,
  Select,
  Spin,
  Table,
  message,
} from 'antd'
import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons'
import { usePermission } from '../../hooks/usePermission'
import { petConfigService, petItemService } from '../../services/petService'
import type { PetConfigRow } from '../../types/pet'
import type { Json } from '../../types/database'
import { MODULES } from './constants'
import {
  ROW_COLUMNS,
  buildFieldRows,
  buildNewbieRows,
  buildTierRows,
  buildValueColumns,
} from './columns'
import { renderModuleControls } from './ModuleControls'
import type { ExchangeRecipe, ItemOption, ModuleKey } from './types'

/** reserved.collection_exchange 取数净化：非数组/项残缺时落空表（编辑器重建，不崩） */
function readExchangeRecipes(reserved: unknown): ExchangeRecipe[] {
  const raw = (reserved as Record<string, unknown> | null | undefined)?.['collection_exchange']
  if (!Array.isArray(raw)) return []
  return raw
    .map((r) => r as Partial<ExchangeRecipe>)
    .filter((r) => typeof r?.from === 'string' && typeof r?.to === 'string')
    .map((r) => ({
      from: r.from as string,
      from_count: Number(r.from_count) || 1,
      to: r.to as string,
      to_count: Number(r.to_count) || 1,
    }))
}

/** reserved 卡表单的嵌套路径（与 ModuleControls 的数组名一一对应） */
const RESERVED_NAME_PATHS: (string | (string | number)[])[] = [
  ['reserved', 'trait', 'chance'],
  ['reserved', 'trait', 'wash_chance'],
  ['reserved', 'hatch', 'accel_minutes'],
  ['reserved', 'hatch', 'accel_gold'],
  ['reserved', 'breeding', 'intimacy_min'],
  ['reserved', 'breeding', 'gestation_hours'],
  ['reserved', 'breeding', 'fee_gold'],
  ['reserved', 'weekly', 'draw_count'],
  ['reserved', 'breeding', 'egg_pool', 'N'],
  ['reserved', 'breeding', 'egg_pool', 'R'],
  ['reserved', 'breeding', 'egg_pool', 'SR'],
  ['reserved', 'breeding', 'egg_pool', 'SSR'],
  // 历险时长收益系数 + 长途稀有保底(20261015 批;四层嵌套同 egg_pool)
  ['reserved', 'adventure_tier_mult', 'exp', 'short'],
  ['reserved', 'adventure_tier_mult', 'exp', 'medium'],
  ['reserved', 'adventure_tier_mult', 'exp', 'long'],
  ['reserved', 'adventure_tier_mult', 'gold', 'short'],
  ['reserved', 'adventure_tier_mult', 'gold', 'medium'],
  ['reserved', 'adventure_tier_mult', 'gold', 'long'],
  ['reserved', 'long_drop_pity', 'evo_stone_n'],
  ['reserved', 'long_drop_pity', 'evo_stone_r'],
  ['reserved', 'long_drop_pity', 'relic_compass'],
  // 幸运抽奖双限购（fix_pet_lottery_20261023）+ 进化任务窗口 + 低状态掉血
  ['reserved', 'lottery', 'price'],
  ['reserved', 'lottery', 'limit_total'],
  ['reserved', 'lottery', 'limit_window_hours'],
  ['reserved', 'lottery', 'limit_per_window'],
  ['reserved', 'evo_quest_window_exp'],
  ['reserved', 'low_status_health_decay'],
]

/** 深合并：表单 patch 覆盖既有 reserved，未在表单内的键（运营手写/后续新增）原样保留 */
const deepMergeReserved = (
  base: unknown,
  patch: Record<string, unknown>,
): Record<string, unknown> => {
  const out: Record<string, unknown> =
    base && typeof base === 'object' ? { ...(base as Record<string, unknown>) } : {}
  for (const [k, v] of Object.entries(patch)) {
    if (v === undefined) continue
    out[k] =
      v !== null && typeof v === 'object' && !Array.isArray(v)
        ? deepMergeReserved(out[k], v as Record<string, unknown>)
        : v
  }
  return out
}
import common from '../../styles/common.module.css'

// ==================== 宠物全局参数（pet_config 单行表） ====================
//
// 交互形态（2026-09-17 调整）：每模块一张参数表（参数 / 当前值 / 说明），整卡只读；
// 仅模块卡片右上角「编辑」进入弹窗表单修改（取消表格行点击），保存只提交本模块字段
// （PATCH 语义，互不干扰、失败可单独重试）。
// 回显：Form 挂 initialValues + Modal destroyOnHidden——每次打开重新挂载即回显，
// 不再依赖 setFieldsValue 时序（Modal 内容异步挂载会丢值）。
// 历险/任务拆分为两张卡片；历险档位按 adventure_tiers 逐档成行；初始资源包按内容拆行。
//
// 文件拆分（2026-09-22，审查 P2-16 单文件超 500 行）：
//   types.ts           —— ModuleKey / FieldMeta / ModuleMeta / ValueRow / ItemOption
//   constants.tsx      —— MODULES 九张卡的字段元数据与格式化器
//   columns.tsx        —— 只读展示列 + 档位/初始包拆行纯函数
//   ModuleControls.tsx —— 弹窗表单控件（与 RPC 消费结构同源）
//   index.tsx          —— 状态装载、PATCH 保存、卡片与弹窗编排

const PetConfig: React.FC = () => {
  const { hasPermission } = usePermission()
  const canWrite = hasPermission('pets:write')

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [row, setRow] = useState<PetConfigRow | null>(null)
  const [itemOptions, setItemOptions] = useState<ItemOption[]>([])
  const [editModule, setEditModule] = useState<ModuleKey | null>(null)
  const [editForm] = Form.useForm()
  // 收藏兑换配方编辑态（数组体不走 FieldMeta 表单，独立受控行编辑）
  const [exRows, setExRows] = useState<ExchangeRecipe[]>([])

  const loadConfig = useCallback(async () => {
    setLoading(true)
    const res = await petConfigService.loadConfig()
    if (res.success && res.data) setRow(res.data)
    setLoading(false)
  }, [])

  const loadItems = useCallback(async () => {
    const res = await petItemService.findAll()
    if (res.success && res.data) {
      setItemOptions(
        res.data.map((i) => ({ item_code: i.item_code, name: i.name, category: i.category }))
      )
    }
  }, [])

  useEffect(() => {
    loadConfig()
    loadItems()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const openEdit = (key: ModuleKey) => {
    if (!row) return
    if (key === 'collection_exchange') setExRows(readExchangeRecipes(row.reserved))
    setEditModule(key)
  }

  // 弹窗保存：只校验并提交本模块字段
  const handleSave = async () => {
    if (!row || !editModule) return
    const mod = MODULES.find((m) => m.key === editModule)
    if (!mod) return
    const fields = mod.fields.map((f) => f.field)

    // —— reserved 卡：数组名取嵌套值，深合并保留既有键（审查 P2 reserved 编辑入口）——
    if (editModule === 'collection_exchange') {
      // 整组替换 reserved.collection_exchange（数组语义：deepMerge 对数组整体覆盖）
      for (const [i, r] of exRows.entries()) {
        if (!r.from || !r.to) return void message.error(`第 ${i + 1} 行的材料/目标未选道具`)
        if (!Number.isInteger(r.from_count) || r.from_count < 1 ||
            !Number.isInteger(r.to_count) || r.to_count < 1)
          return void message.error(`第 ${i + 1} 行数量须为 ≥1 的整数`)
      }
      const seen = new Set<string>()
      for (const r of exRows) {
        const k = `${r.from}->${r.to}`
        if (seen.has(k)) return void message.error(`重复配方 ${k}（同一材料→目标仅保留一条）`)
        seen.add(k)
      }
      const merged = deepMergeReserved(row.reserved, { collection_exchange: exRows })
      setSaving(true)
      try {
        const res = await petConfigService.update(row.id, { reserved: merged } as never)
        if (!res.success) return
        message.success('「收藏兑换配方（reserved）」已保存')
        setEditModule(null)
        setRow((prev) => (prev ? { ...prev, reserved: merged as Json } : prev))
      } finally {
        setSaving(false)
      }
      return
    }

    if (editModule === 'reserved_p2') {
      const values = await editForm.validateFields(RESERVED_NAME_PATHS)
      const patch = (values as { reserved?: Record<string, unknown> }).reserved ?? {}
      const merged = deepMergeReserved(row.reserved, patch)
      const trait = (merged.trait ?? {}) as Record<string, unknown>
      for (const k of ['chance', 'wash_chance']) {
        const v = Number(trait[k])
        if (trait[k] !== null && trait[k] !== undefined && (Number.isNaN(v) || v <= 0 || v > 1)) {
          return void message.error(`特性概率 ${k} 需在 0~1 之间`)
        }
      }
      setSaving(true)
      try {
        const res = await petConfigService.update(row.id, { reserved: merged } as never)
        if (!res.success) return
        message.success('「P2 参数（reserved）」已保存')
        setEditModule(null)
        setRow((prev) => (prev ? { ...prev, reserved: merged as Json } : prev))
      } finally {
        setSaving(false)
      }
      return
    }

    const values = await editForm.validateFields(fields)
    if (editModule === 'economy') {
      const pairs: Array<[string, number, number]> = [
        ['背包', values.backpack_capacity_init, values.backpack_capacity_max],
        ['养育格', values.rearing_capacity_init, values.rearing_capacity_max],
        ['寄养格', values.foster_capacity_init, values.foster_capacity_max],
      ]
      for (const [label, init, max] of pairs) {
        if (init > max) return void message.error(`${label}初始容量不能大于上限`)
      }
    }
    setSaving(true)
    try {
      const res = await petConfigService.update(row.id, values as never)
      if (!res.success) return
      message.success(`「${mod.title}」已保存`)
      setEditModule(null)
      // 局部刷新：仅合并本模块字段到本地行，不整页重拉（其他模块不闪动、不受影响）
      setRow((prev) => (prev ? { ...prev, ...(values as Partial<PetConfigRow>) } : prev))
    } finally {
      setSaving(false)
    }
  }

  // ---------- 拆行展示（历险档位逐档 / 初始资源包按内容） ----------
  const tierRows = useMemo(() => buildTierRows(row), [row])

  /** item_code → 展示名：初始包拆行与道具目录同源 */
  const itemName = useCallback(
    (code: unknown) => {
      const c = code != null ? String(code) : ''
      const found = itemOptions.find((i) => i.item_code === c)
      return found ? `${found.name}（${c}）` : c || '—'
    },
    [itemOptions]
  )

  const newbieRows = useMemo(() => buildNewbieRows(row, itemName), [row, itemName])

  const valueColumns = useMemo(() => buildValueColumns(row), [row])

  if (loading)
    return (
      <div className={common.mt16} style={{ textAlign: 'center', padding: 80 }}>
        <Spin size="large" />
      </div>
    )
  if (!row) {
    return (
      <Alert
        type="warning"
        showIcon
        message="未找到全局参数行（pet_config id=1）"
        description="请确认宠物系统建表与种子 SQL 已执行（种子应插入 id=1 的默认参数行）。"
      />
    )
  }

  const editMod = MODULES.find((m) => m.key === editModule)

  return (
    <div>
      <Alert
        type="info"
        showIcon
        className={common.mb16}
        message="全局参数说明"
        description="按模块查看参数表，点击模块卡片右上角「编辑」打开弹窗修改；保存只提交本模块字段。概率/审计版本锚点 config_version 只读（递增在蛋池页操作）。"
      />
      {MODULES.map((mod) => (
        <Card
          key={mod.key}
          title={mod.title}
          className={common.mb16}
          extra={
            <Button
              size="small"
              icon={<EditOutlined />}
              disabled={!canWrite}
              onClick={() => openEdit(mod.key)}
            >
              编辑
            </Button>
          }
        >
          {mod.key === 'adventure' ? (
            <>
              <Table
                rowKey="key"
                size="small"
                columns={ROW_COLUMNS}
                dataSource={tierRows}
                pagination={false}
              />
              <Table
                rowKey="key"
                size="small"
                className={common.mt16}
                columns={ROW_COLUMNS}
                dataSource={buildFieldRows(row, mod)}
                pagination={false}
              />
            </>
          ) : mod.key === 'newbie' ? (
            <Table
              rowKey="key"
              size="small"
              columns={ROW_COLUMNS}
              dataSource={newbieRows}
              pagination={false}
            />
          ) : mod.key === 'collection_exchange' ? (
            <Table
              rowKey={(r) => `${r.from}->${r.to}`}
              size="small"
              pagination={false}
              locale={{ emptyText: '暂无配方（收藏兑换不可用）' }}
              columns={[
                { title: '材料', dataIndex: 'from', render: itemName },
                { title: '数量', dataIndex: 'from_count', width: 70 },
                { title: '兑换目标', dataIndex: 'to', render: itemName },
                { title: '数量', dataIndex: 'to_count', width: 70 },
              ]}
              dataSource={readExchangeRecipes(row.reserved)}
            />
          ) : (
            <Table
              rowKey="field"
              size="small"
              columns={valueColumns}
              dataSource={mod.fields}
              pagination={false}
            />
          )}
        </Card>
      ))}

      <Card title="审计锚点" className={common.mb16}>
        <Table
          rowKey="field"
          size="small"
          columns={[
            { title: '参数', dataIndex: 'label', width: 260 },
            {
              title: '当前值',
              dataIndex: 'field',
              render: () => `v${row.config_version}`,
            },
            {
              title: '说明',
              dataIndex: 'desc',
              render: () => 'config_version 在「蛋池与概率」修改概率时递增，App 公示与 RPC 判定同源锚点',
            },
          ]}
          dataSource={[{ field: 'config_version', label: 'config_version（概率/审计版本）' }]}
          pagination={false}
        />
      </Card>

      <Modal
        title={`编辑 · ${editMod?.title ?? ''}`}
        open={editModule !== null}
        onOk={handleSave}
        confirmLoading={saving}
        onCancel={() => setEditModule(null)}
        destroyOnHidden
        width={editModule === 'collection_exchange' ? 780 : 620}
      >
        {editModule === 'collection_exchange' ? (
          // 配方行编辑（受控数组，保存时整组校验替换；不走 FieldMeta 表单）
          <div>
            {exRows.map((r, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <span style={{ width: 20, textAlign: 'right', color: '#999', fontSize: 12 }}>{i + 1}</span>
                <Select
                  showSearch
                  optionFilterProp="label"
                  style={{ flex: 3 }}
                  placeholder="材料（收藏品）"
                  value={r.from || undefined}
                  options={itemOptions.map((o) => ({ value: o.item_code, label: `${o.item_code}·${o.name}` }))}
                  onChange={(v) => setExRows((rs) => rs.map((x, j) => (j === i ? { ...x, from: String(v) } : x)))}
                />
                <InputNumber
                  min={1}
                  precision={0}
                  style={{ flex: 1 }}
                  value={r.from_count}
                  onChange={(v) => setExRows((rs) => rs.map((x, j) => (j === i ? { ...x, from_count: Number(v) || 1 } : x)))}
                />
                <span style={{ color: '#999' }}>→</span>
                <Select
                  showSearch
                  optionFilterProp="label"
                  style={{ flex: 3 }}
                  placeholder="兑换目标（道具）"
                  value={r.to || undefined}
                  options={itemOptions.map((o) => ({ value: o.item_code, label: `${o.item_code}·${o.name}` }))}
                  onChange={(v) => setExRows((rs) => rs.map((x, j) => (j === i ? { ...x, to: String(v) } : x)))}
                />
                <InputNumber
                  min={1}
                  precision={0}
                  style={{ flex: 1 }}
                  value={r.to_count}
                  onChange={(v) => setExRows((rs) => rs.map((x, j) => (j === i ? { ...x, to_count: Number(v) || 1 } : x)))}
                />
                <Button
                  type="text"
                  danger
                  icon={<DeleteOutlined />}
                  onClick={() => setExRows((rs) => rs.filter((_, j) => j !== i))}
                />
              </div>
            ))}
            <Button
              type="dashed"
              block
              icon={<PlusOutlined />}
              onClick={() => setExRows((rs) => [...rs, { from: '', from_count: 4, to: '', to_count: 1 }])}
            >
              添加配方
            </Button>
          </div>
        ) : (
          /* 回显方案：destroyOnHidden 每次打开重新挂载 → initialValues 挂载即生效，
              规避「Modal 内容异步挂载导致 setFieldsValue 丢值」问题 */
          <Form
            form={editForm}
            layout="vertical"
            preserve={false}
            initialValues={(row ?? {}) as unknown as Record<string, unknown>}
          >
            {editModule ? renderModuleControls(editModule, { canWrite, itemOptions }) : null}
          </Form>
        )}
      </Modal>
    </div>
  )
}

export default PetConfig
