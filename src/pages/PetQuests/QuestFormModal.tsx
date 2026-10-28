import React from 'react'
import { Modal, Form, Input, InputNumber, Select, Switch, message } from 'antd'
import type { PetQuestRow } from '../../types/pet'
import {
  PET_CONDITION_TYPE_LABELS,
  PET_CONDITION_TYPE_OPTIONS,
  PET_QUEST_TIER_LABELS,
  PET_QUEST_TIER_OPTIONS,
  PET_QUEST_ELIGIBILITY_LABELS,
  PET_QUEST_ELIGIBILITY_COUNTER_LABELS,
  PET_QUEST_TYPE_TYPES,
  PET_QUEST_TYPE_OPTIONS,
  PET_QUEST_DIFFICULTY_TYPES,
  PET_QUEST_DIFFICULTY_OPTIONS,
} from '../../constants/pet'
import { RewardsEditor } from '../../components/form/pet/editors/QuestEditors'
import { asObject } from '../../components/form/pet/editors/shared'
import common from '../../styles/common.module.css'

// ==================== 任务编辑弹窗（pet_quests，任务池） ====================
//
// 结构与 RPC 消费同源：
// - condition：{type: 11 类条件键, target: int, tier?: short|medium|long}
//   （draw 取 target 为目标次数，bump 按事实表实况重算；tier 仅历险类，
//   服务端按 a.tier 过滤、App 标题前缀「短途/中途/长途历险」；缺省 target=1）；
// - eligibility：下发资格 jsonb（多键 OR，不满足不进抽取候选；缺省 = 无门槛）；
// - rewards：{gold?, points?, items:[{code,count}]}（claim 发放，与成就共用 schema）。

export interface QuestFormValues {
  code: string
  type: string
  difficulty: string
  condition: Record<string, unknown>
  rewards: Record<string, unknown>
  eligibility: Record<string, unknown> | null
  enabled: boolean
  sort_order: number
}

interface Props {
  open: boolean
  editing: PetQuestRow | null
  saving: boolean
  items: Array<{ item_code: string; name: string; category: string }>
  onOk: (values: QuestFormValues) => void
  onCancel: () => void
}

const QuestFormModal: React.FC<Props> = ({ open, editing, saving, items, onOk, onCancel }) => {
  const [form] = Form.useForm()
  // 资格键的过滤臂按任务类型分集：日抽只认 feature/item_any/counter，
  // 周抽才有 evo_ready/scene_available/points_enough/any_damaged 四臂
  // （fix_pet_quest_ecosystem/eligibility_align/evolve_levels 三批的插臂范围）
  const questType = Form.useWatch('type', form)
  const isWeekly = questType === PET_QUEST_TYPE_TYPES.WEEKLY
  const allowKeys = isWeekly
    ? Object.keys(PET_QUEST_ELIGIBILITY_LABELS)
    : ['feature', 'item_any', 'counter']

  const handleConditionChange = (key: string, v: unknown) => {
    const cur = asObject(form.getFieldValue('condition'))
    const next = { ...cur }
    if (v === null || v === undefined || v === '') delete next[key]
    else next[key] = v
    form.setFieldsValue({ condition: next })
  }

  // 切换条件类型：tier 仅历险类合法——切走历险时随 type 一并清除，避免脏键残留
  const handleTypeChange = (v: string | undefined) => {
    const cur = asObject(form.getFieldValue('condition'))
    const next: Record<string, unknown> = { ...cur, type: v }
    if (v !== 'adventure') delete next.tier
    form.setFieldsValue({ condition: next })
  }

  return (
    <Modal
      title={editing ? '编辑任务' : '新增任务'}
      open={open}
      onOk={async () => {
        const values = await form.validateFields()
        // 死任务防护一：条件类型缺失 → bump 永不计数（进度恒 0）
        const cond = asObject(values.condition)
        if (!cond.type) {
          message.error('请选择条件类型（缺失时任务进度永不增长）')
          return
        }
        // 死任务防护二：资格键超出本类型的过滤臂集 → 日抽/周抽都不可能抽到
        const elig = asObject(values.eligibility)
        const overKeys = Object.keys(elig).filter(
          (k) => k !== 'min' && !allowKeys.includes(k)
        )
        if (overKeys.length > 0) {
          message.error(
            `${questType === 'weekly' ? '每周' : '每日'}任务的过滤臂不含：${overKeys
              .map((k) => PET_QUEST_ELIGIBILITY_LABELS[k] ?? k)
              .join('、')}——请移除或改为每周任务`
          )
          return
        }
        // 死资格防护三：三种配置在过滤臂语义下「永不满足」，抽到率归零
        if (elig.counter && (typeof elig.min !== 'number' || (elig.min as number) < 1)) {
          message.error('已选「累计次数达标」资格，须填写 ≥1 的达标次数')
          return
        }
        if (elig.feature !== undefined && !(typeof elig.feature === 'string' && elig.feature)) {
          message.error('已选「功能已解锁」资格，须填写功能键（如 breeding）')
          return
        }
        if (Array.isArray(elig.item_any) && elig.item_any.length === 0) {
          message.error('已选「持有任一道具」资格，须至少选择一个道具')
          return
        }
        onOk({
          ...values,
          condition: asObject(values.condition),
          rewards: asObject(values.rewards),
          // 空对象规范化为 null：服务端判 `eligibility is null or (各臂)`，
          // {} 非 null 且无臂命中 = 永不可抽，与「无门槛」语义必须区分开
          eligibility: Object.keys(elig).length > 0 ? elig : null,
        })
      }}
      confirmLoading={saving}
      afterOpenChange={(o) => {
        if (o) {
          form.resetFields()
          form.setFieldsValue(
            editing
              ? {
                  ...editing,
                  condition: asObject(editing.condition),
                  rewards: asObject(editing.rewards),
                  eligibility: asObject(editing.eligibility),
                }
              : {
                  type: PET_QUEST_TYPE_TYPES.DAILY,
                  difficulty: PET_QUEST_DIFFICULTY_TYPES.NORMAL,
                  condition: {},
                  rewards: {},
                  eligibility: {},
                  enabled: false,
                  sort_order: 0,
                }
          )
        }
      }}
      onCancel={onCancel}
      destroyOnHidden
      width={620}
    >
      <Form form={form} layout="vertical" preserve={false}>
        <Form.Item name="code" label="任务编码" rules={[{ required: true, message: '请输入任务编码' }]}>
          <Input placeholder="如 daily_feed_3" />
        </Form.Item>
        <Form.Item name="type" label="类型" rules={[{ required: true, message: '请选择类型' }]}>
          <Select options={PET_QUEST_TYPE_OPTIONS} />
        </Form.Item>
        <Form.Item name="difficulty" label="难度" rules={[{ required: true, message: '请选择难度' }]}>
          <Select options={PET_QUEST_DIFFICULTY_OPTIONS} />
        </Form.Item>

        <Form.Item name="condition" label="达成条件" rules={[{ required: true, message: '请配置达成条件' }]}>
          <ConditionFields
            options={PET_CONDITION_TYPE_OPTIONS}
            labels={PET_CONDITION_TYPE_LABELS}
            tierLabels={PET_QUEST_TIER_LABELS}
            tierOptions={PET_QUEST_TIER_OPTIONS}
            onTypeChange={(v) => handleTypeChange(v)}
            onTargetChange={(v) => handleConditionChange('target', v)}
            onTierChange={(v) => handleConditionChange('tier', v)}
          />
        </Form.Item>

        <Form.Item
          name="eligibility"
          label="下发资格（多键之间满足其一即可被抽到；全部留空 = 无门槛）"
          tooltip="抽取过滤：资格不满足的任务不进候选——孵化/繁育/进化/治疗/装扮/兑换等有前置的动作类任务务必配置，避免抽到即死任务。注意：evo_ready/scene_available/points_enough/any_damaged 四臂仅在每周任务的抽取过滤中生效"
        >
          <EligibilityFields
            items={items}
            allowKeys={allowKeys}
            keyLabels={PET_QUEST_ELIGIBILITY_LABELS}
            counterLabels={PET_QUEST_ELIGIBILITY_COUNTER_LABELS}
          />
        </Form.Item>

        <Form.Item name="rewards" label="奖励包">
          <RewardsFields items={items} />
        </Form.Item>

        <Form.Item name="sort_order" label="排序号">
          <InputNumber min={0} className={common.fullWidth} />
        </Form.Item>
        <Form.Item name="enabled" label="启用" valuePropName="checked" tooltip="关闭后不会被抽入每日任务">
          <Switch checkedChildren="启用" unCheckedChildren="停用" />
        </Form.Item>
      </Form>
    </Modal>
  )
}

// ---------- condition 结构化字段 ----------
const ConditionFields: React.FC<{
  value?: unknown
  onChange?: (v: Record<string, unknown>) => void
  options: Array<{ value: string; label: string }>
  labels: Record<string, string>
  tierLabels: Record<string, string>
  tierOptions: Array<{ value: string; label: string }>
  onTypeChange: (v: string | undefined) => void
  onTargetChange: (v: number | null) => void
  onTierChange: (v: string | undefined) => void
}> = ({
  value,
  onChange,
  options,
  labels,
  tierLabels,
  tierOptions,
  onTypeChange,
  onTargetChange,
  onTierChange,
}) => {
  const obj = asObject(value)
  const isAdventure = obj.type === 'adventure'
  const extraKeysList = Object.keys(obj).filter((k) => !['type', 'target', 'tier'].includes(k))
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8, flexWrap: 'wrap', gap: 8 }}>
        <Select
          style={{ width: 200 }}
          value={typeof obj.type === 'string' ? obj.type : undefined}
          placeholder="条件类型（服务端进度键）"
          options={options}
          disabled={!onChange}
          onChange={(v) => onTypeChange(v)}
        />
        {/* 历险类时长维度：服务端历险重算按 a.tier 过滤（缺省不限），
            App 标题前缀「短途/中途/长途历险」——切走历险类型时随 type 变更清除 */}
        {isAdventure && (
          <Select
            style={{ width: 120 }}
            allowClear
            value={typeof obj.tier === 'string' && obj.tier ? obj.tier : undefined}
            placeholder="时长（不限）"
            options={tierOptions}
            disabled={!onChange}
            onChange={(v) => onTierChange(v)}
          />
        )}
        <InputNumber
          style={{ width: 140 }}
          min={1}
          placeholder="目标次数"
          value={typeof obj.target === 'number' ? obj.target : undefined}
          disabled={!onChange}
          onChange={(v) => onTargetChange(typeof v === 'number' ? v : null)}
        />
        {typeof obj.type === 'string' && labels[obj.type] && (
          <span style={{ fontSize: 12, color: '#999' }}>
            {isAdventure && typeof obj.tier === 'string' && obj.tier
              ? `${tierLabels[obj.tier] ?? obj.tier}${(labels[obj.type] ?? '').replace('游历次数', '游历')}`
              : labels[obj.type]}
          </span>
        )}
      </div>
      {extraKeysList.length > 0 && (
        <span style={{ fontSize: 12, color: '#999' }}>
          其余扩展键已保留：{extraKeysList.join('、')}
        </span>
      )}
    </div>
  )
}

// ---------- eligibility 结构化字段（下发资格，多键 OR） ----------
//
// 键集与服务端 draw 过滤臂一一对应且按任务类型分集（allowKeys）：
// 日抽仅 feature/item_any/counter 三臂；周抽全七键（evo_ready/scene_available/
// points_enough/any_damaged 四臂只在周抽过滤块，见 fix_pet_quest_ecosystem_
// 20261026 / fix_pet_quest_eligibility_align_20261026 / fix_pet_evolve_levels_3060）：
// - 布尔臂：evo_ready / scene_available / points_enough / any_damaged（存在即生效）
// - feature：功能解锁键（现网值 breeding）
// - item_any：持有任一所列道具（jsonb 字符串数组）
// - counter + min：累计计数达标（计数键枚举 hatch_total/evolve_total/breed_egg_total；
//   服务端 min 缺省按 2147483647 处理 = 永不满足，故选 counter 时 min 必填且缺省 1）
// 未知键原样保留展示，不丢失。
const ELIGIBILITY_BOOLEAN_KEYS = new Set(['evo_ready', 'scene_available', 'points_enough', 'any_damaged'])

const EligibilityFields: React.FC<{
  value?: unknown
  onChange?: (v: Record<string, unknown>) => void
  items: Array<{ item_code: string; name: string; category: string }>
  keyLabels: Record<string, string>
  counterLabels: Record<string, string>
  /** 本任务类型可用的资格键（日抽 3 键 / 周抽全 7 键，超集键由 onOk 拦截） */
  allowKeys: string[]
}> = ({ value, onChange, items, keyLabels, counterLabels, allowKeys }) => {
  const obj = asObject(value)
  const selected = Object.keys(obj).filter((k) => allowKeys.includes(k))
  const extraKeys = Object.keys(obj).filter((k) => !allowKeys.includes(k) && k !== 'min')

  const setNext = (next: Record<string, unknown>) => onChange?.(next)

  // 键集合变更统一走 onChange 重建：保留留存键的既有值，移除键连值清掉
  // （counter 连带 min）——单一数据源，规避 onSelect/onDeselect/onClear
  // 多事件分别 set 的闭包时序问题
  const changeKeys = (keys: string[]) => {
    const next: Record<string, unknown> = {}
    for (const k of keys) {
      if (ELIGIBILITY_BOOLEAN_KEYS.has(k)) {
        next[k] = true
      } else if (k === 'item_any') {
        next[k] = Array.isArray(obj[k]) ? obj[k] : []
      } else if (k === 'feature') {
        next[k] = typeof obj[k] === 'string' && obj[k] ? obj[k] : 'breeding'
      } else if (k === 'counter') {
        next[k] = typeof obj[k] === 'string' && obj[k] ? obj[k] : 'hatch_total'
        next.min = typeof obj.min === 'number' ? obj.min : 1
      }
    }
    setNext(next)
  }

  const counterValue = typeof obj.counter === 'string' ? obj.counter : undefined

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
        <Select
          mode="multiple"
          style={{ minWidth: 320 }}
          allowClear
          placeholder="选择资格类型（可多选，满足其一即可）"
          value={selected}
          options={allowKeys.map((k) => ({ value: k, label: keyLabels[k] ?? k }))}
          disabled={!onChange}
          onChange={(vals) => changeKeys(vals.map(String))}
        />
        {/* feature：功能解锁键 */}
        {selected.includes('feature') && (
          <Input
            style={{ width: 180 }}
            placeholder="功能键，如 breeding"
            value={typeof obj.feature === 'string' ? obj.feature : undefined}
            disabled={!onChange}
            onChange={(e) =>
              setNext({ ...obj, feature: e.target.value || '' })
            }
          />
        )}
        {/* item_any：持有任一所列道具（选项 = 道具目录） */}
        {selected.includes('item_any') && (
          <Select
            mode="multiple"
            style={{ minWidth: 280 }}
            allowClear
            placeholder="持有任一即满足"
            value={Array.isArray(obj.item_any) ? (obj.item_any as string[]) : []}
            options={items.map((i) => ({ value: i.item_code, label: `${i.item_code}·${i.name}` }))}
            disabled={!onChange}
            onChange={(arr) => setNext({ ...obj, item_any: arr })}
          />
        )}
        {/* counter + min：累计计数达标 */}
        {selected.includes('counter') && (
          <>
            <Select
              style={{ width: 160 }}
              placeholder="计数键"
              value={counterValue}
              options={Object.entries(counterLabels).map(([value, label]) => ({ value, label }))}
              disabled={!onChange}
              onChange={(v) => setNext({ ...obj, counter: v })}
            />
            <InputNumber
              style={{ width: 120 }}
              min={1}
              placeholder="达标次数"
              value={typeof obj.min === 'number' ? obj.min : undefined}
              disabled={!onChange}
              onChange={(v) => {
                const next = { ...obj }
                if (typeof v === 'number' && v >= 1) next.min = v
                else delete next.min
                setNext(next)
              }}
            />
          </>
        )}
      </div>
      {extraKeys.length > 0 && (
        <span style={{ fontSize: 12, color: '#999' }}>其余扩展键已保留：{extraKeys.join('、')}</span>
      )}
    </div>
  )
}

// ---------- rewards 结构化字段（透传 RewardsEditor） ----------
const RewardsFields: React.FC<{
  value?: unknown
  onChange?: (v: Record<string, unknown>) => void
  items: Array<{ item_code: string; name: string; category: string }>
}> = ({ value, onChange, items }) => (
  <RewardsEditor value={value} onChange={onChange} items={items} />
)

export default QuestFormModal
