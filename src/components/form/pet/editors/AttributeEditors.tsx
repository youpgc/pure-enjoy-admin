import React from 'react'
import { Button, InputNumber, Select, Space, Typography } from 'antd'
import { MinusCircleOutlined, PlusOutlined } from '@ant-design/icons'
import { asObject, extraKeys, numOf } from './shared'
import { NumberMapEditor } from './BasicEditors'
import { PET_ATTR_OPTIONS, PET_ATTR_LABELS } from '../../../../constants/pet'

// ==================== 属性系统结构化编辑器（2026-09-17 属性系统） ====================
//
// 结构全部与 RPC 真实消费同源（feature_pet_attributes_20260917.sql 实证）：
// - 种属 base_attributes：{ total 总点数守恒, variance 每维浮动, base:{四维基准} }
//   （rpc_pet_hatch_instant：每维 [base±variance] roll → 差值随机分摊守恒到 total）
// - hatch_config：{ inherit_ratio 0~1, potential_min, potential_max }
// - refine_config：{ base 每级洗练点, potential_bonus:[{min,max,bonus}] 潜力加成档 }
// - 历险 attr_requirements：[{attr, value}]（结算判据，claim 判 failed）
// - 历险 penalty：{health, mood, gold（负值扣减）, lose_item:{p 概率}}
// 未知键一律保留（防覆写清空服务端写入的扩展键）。

const ATTR_KEYS = ['intellect', 'stamina', 'strength', 'agility']

const labelWidth = 150

// ---------- 种属初始属性 { total, variance, base } ----------
export const SpeciesAttrEditor: React.FC<{
  value?: unknown
  onChange?: (v: Record<string, unknown>) => void
  disabled?: boolean
}> = ({ value, onChange, disabled }) => {
  const obj = asObject(value)
  const base = asObject(obj.base)

  const setTop = (key: string, v: number | null) => {
    const next = { ...obj }
    if (v === null) delete next[key]
    else next[key] = v
    onChange?.(next)
  }
  const sum = ATTR_KEYS.reduce((acc, k) => acc + (numOf(base[k], 0) ?? 0), 0)

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
        <Typography.Text style={{ width: labelWidth, flexShrink: 0 }}>属性总点数</Typography.Text>
        <InputNumber
          style={{ width: 160 }}
          min={0}
          value={numOf(obj.total, undefined) ?? undefined}
          disabled={disabled}
          onChange={(v) => setTop('total', typeof v === 'number' ? v : null)}
        />
        <Typography.Text type="secondary" style={{ fontSize: 12, marginLeft: 12 }}>
          孵化 roll 后随机分摊守恒到该总数；0 = 不启用属性
        </Typography.Text>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
        <Typography.Text style={{ width: labelWidth, flexShrink: 0 }}>每维浮动 variance</Typography.Text>
        <InputNumber
          style={{ width: 160 }}
          min={0}
          value={numOf(obj.variance, undefined) ?? undefined}
          disabled={disabled}
          onChange={(v) => setTop('variance', typeof v === 'number' ? v : null)}
        />
        <Typography.Text type="secondary" style={{ fontSize: 12, marginLeft: 12 }}>
          每维在 [基准-variance, 基准+variance] 内随机，同种属不同宠不一致
        </Typography.Text>
      </div>
      <NumberMapEditor
        value={base}
        onChange={(next) => onChange?.({ ...obj, base: next })}
        fields={ATTR_KEYS.map((k) => ({ key: k, label: `${PET_ATTR_LABELS[k]}（${k}）`, min: 0 }))}
        disabled={disabled}
        sumHint="四维基准合计"
      />
      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
        当前四维基准合计：{sum}
      </Typography.Text>
    </div>
  )
}

// ---------- 孵化配置 hatch_config ----------
export const HatchConfigEditor: React.FC<{
  value?: unknown
  onChange?: (v: Record<string, unknown>) => void
  disabled?: boolean
}> = ({ value, onChange, disabled }) => {
  const obj = asObject(value)
  const set = (key: string, v: number | null) => {
    const next = { ...obj }
    if (v === null) delete next[key]
    else next[key] = v
    onChange?.(next)
  }
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
        <Typography.Text style={{ width: labelWidth, flexShrink: 0 }}>繁育继承比</Typography.Text>
        <InputNumber
          style={{ width: 160 }}
          min={0}
          max={1}
          step={0.05}
          value={numOf(obj.inherit_ratio, undefined) ?? undefined}
          placeholder="0.5"
          disabled={disabled}
          onChange={(v) => set('inherit_ratio', typeof v === 'number' ? v : null)}
        />
        <Typography.Text type="secondary" style={{ fontSize: 12, marginLeft: 12 }}>
          繁育蛋属性 = 父母均值 × 继承比 + roll × (1-继承比)；缺省 0.5
        </Typography.Text>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
        <Typography.Text style={{ width: labelWidth, flexShrink: 0 }}>潜力下限</Typography.Text>
        <InputNumber
          style={{ width: 160 }}
          min={0}
          max={100}
          value={numOf(obj.potential_min, undefined) ?? undefined}
          placeholder="60"
          disabled={disabled}
          onChange={(v) => set('potential_min', typeof v === 'number' ? v : null)}
        />
        <Typography.Text type="secondary" style={{ fontSize: 12, marginLeft: 12 }}>
          潜力 roll 区间，缺省 60
        </Typography.Text>
      </div>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <Typography.Text style={{ width: labelWidth, flexShrink: 0 }}>潜力上限</Typography.Text>
        <InputNumber
          style={{ width: 160 }}
          min={0}
          max={100}
          value={numOf(obj.potential_max, undefined) ?? undefined}
          placeholder="100"
          disabled={disabled}
          onChange={(v) => set('potential_max', typeof v === 'number' ? v : null)}
        />
        <Typography.Text type="secondary" style={{ fontSize: 12, marginLeft: 12 }}>
          缺省 100；潜力隐藏不下发，仅影响洗练点加成
        </Typography.Text>
      </div>
    </div>
  )
}

// ---------- 洗练配置 refine_config { base, potential_bonus } ----------
export const RefineConfigEditor: React.FC<{
  value?: unknown
  onChange?: (v: Record<string, unknown>) => void
  disabled?: boolean
}> = ({ value, onChange, disabled }) => {
  const obj = asObject(value)
  const bonus = Array.isArray(obj.potential_bonus)
    ? (obj.potential_bonus as Record<string, unknown>[]).filter(
        (r): r is Record<string, unknown> => !!r && typeof r === 'object'
      )
    : []
  const extra = extraKeys(obj, ['base', 'potential_bonus'])

  const emit = (next: Record<string, unknown>) => onChange?.(next)

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
        <Typography.Text style={{ width: labelWidth, flexShrink: 0 }}>每级洗练点</Typography.Text>
        <InputNumber
          style={{ width: 160 }}
          min={0}
          value={numOf(obj.base, undefined) ?? undefined}
          disabled={disabled}
          onChange={(v) => {
            const next = { ...obj }
            if (typeof v === 'number') next.base = v
            else delete next.base
            emit(next)
          }}
        />
        <Typography.Text type="secondary" style={{ fontSize: 12, marginLeft: 12 }}>
          升级发放；实际 = 种属 base + 评级 refine_base + 潜力加成
        </Typography.Text>
      </div>
      <Typography.Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>
        潜力加成档（潜力落在 [min,max] 时每级追加 bonus 分洗练点）
      </Typography.Text>
      {bonus.map((row, idx) => (
        <Space.Compact key={idx} style={{ display: 'flex', marginBottom: 8 }} block>
          <InputNumber
            style={{ width: 110 }}
            size="small"
            min={0}
            max={100}
            placeholder="min"
            value={numOf(row.min, undefined) ?? undefined}
            disabled={disabled}
            onChange={(v) =>
              emit({
                ...obj,
                potential_bonus: bonus.map((r, i) =>
                  i === idx ? { ...r, min: typeof v === 'number' ? v : null } : r
                ),
              })
            }
          />
          <InputNumber
            style={{ width: 110 }}
            size="small"
            min={0}
            max={100}
            placeholder="max"
            value={numOf(row.max, undefined) ?? undefined}
            disabled={disabled}
            onChange={(v) =>
              emit({
                ...obj,
                potential_bonus: bonus.map((r, i) =>
                  i === idx ? { ...r, max: typeof v === 'number' ? v : null } : r
                ),
              })
            }
          />
          <InputNumber
            style={{ width: 130 }}
            size="small"
            min={0}
            placeholder="加成 bonus"
            value={numOf(row.bonus, undefined) ?? undefined}
            disabled={disabled}
            onChange={(v) =>
              emit({
                ...obj,
                potential_bonus: bonus.map((r, i) =>
                  i === idx ? { ...r, bonus: typeof v === 'number' ? v : null } : r
                ),
              })
            }
          />
          <Button
            type="text"
            size="small"
            danger
            icon={<MinusCircleOutlined />}
            disabled={disabled}
            onClick={() =>
              emit({ ...obj, potential_bonus: bonus.filter((_, i) => i !== idx) })
            }
          />
        </Space.Compact>
      ))}
      <Button
        size="small"
        icon={<PlusOutlined />}
        disabled={disabled}
        onClick={() => emit({ ...obj, potential_bonus: [...bonus, { min: 80, max: 100, bonus: 1 }] })}
      >
        新增加成档
      </Button>
      {Object.keys(extra).length > 0 && (
        <Typography.Text type="secondary" style={{ fontSize: 12, display: 'block' }}>
          其余扩展键已保留：{Object.keys(extra).join('、')}
        </Typography.Text>
      )}
    </div>
  )
}

// ---------- 历险属性要求 [{attr, value}] ----------
export const AttrRequirementsEditor: React.FC<{
  value?: unknown
  onChange?: (v: Array<Record<string, unknown>>) => void
  disabled?: boolean
}> = ({ value, onChange, disabled }) => {
  const rows = Array.isArray(value)
    ? value.filter((v): v is Record<string, unknown> => !!v && typeof v === 'object')
    : []
  const emit = (next: Record<string, unknown>[]) => onChange?.(next)

  return (
    <div>
      <Typography.Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>
        结算判据（非硬门槛）：不达标仍可出发，结算时判为失败并触发惩罚
      </Typography.Text>
      {rows.map((row, idx) => (
        <Space.Compact key={idx} style={{ display: 'flex', marginBottom: 8 }} block>
          <Select
            style={{ width: 180 }}
            value={typeof row.attr === 'string' ? row.attr : undefined}
            placeholder="属性维度"
            options={PET_ATTR_OPTIONS}
            disabled={disabled}
            onChange={(v) => emit(rows.map((r, i) => (i === idx ? { ...r, attr: v } : r)))}
          />
          <InputNumber
            placeholder="要求 ≥"
            min={0}
            value={numOf(row.value, undefined) ?? undefined}
            disabled={disabled}
            onChange={(v) =>
              emit(
                rows.map((r, i) =>
                  i === idx ? { ...r, value: typeof v === 'number' ? v : null } : r
                )
              )
            }
          />
          <Button
            type="text"
            danger
            icon={<MinusCircleOutlined />}
            disabled={disabled}
            onClick={() => emit(rows.filter((_, i) => i !== idx))}
          />
        </Space.Compact>
      ))}
      <Button
        size="small"
        icon={<PlusOutlined />}
        disabled={disabled}
        onClick={() => emit([...rows, { attr: 'strength', value: 20 }])}
      >
        新增要求
      </Button>
    </div>
  )
}

// ---------- 历险失败惩罚 { health, mood, gold, lose_item:{p} } ----------
export const PenaltyEditor: React.FC<{
  value?: unknown
  onChange?: (v: Record<string, unknown>) => void
  disabled?: boolean
}> = ({ value, onChange, disabled }) => {
  const obj = asObject(value)
  const lose = asObject(obj.lose_item)
  const extra = extraKeys(obj, ['health', 'mood', 'gold', 'lose_item'])

  const setNum = (key: string, v: number | null) => {
    const next = { ...obj }
    if (v === null) delete next[key]
    else next[key] = v
    onChange?.(next)
  }

  const penaltyRow = (key: 'health' | 'mood' | 'gold', label: string) => (
    <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
      <Typography.Text style={{ width: labelWidth, flexShrink: 0 }}>{label}</Typography.Text>
      <InputNumber
        style={{ width: 160 }}
        value={numOf(obj[key], undefined) ?? undefined}
        placeholder="负值扣减，如 -20"
        disabled={disabled}
        onChange={(v) => setNum(key, typeof v === 'number' ? v : null)}
      />
    </div>
  )

  return (
    <div>
      {penaltyRow('health', '健康扣减')}
      {penaltyRow('mood', '心情扣减')}
      {penaltyRow('gold', '金币扣减')}
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <Typography.Text style={{ width: labelWidth, flexShrink: 0 }}>丢失道具概率</Typography.Text>
        <InputNumber
          style={{ width: 160 }}
          min={0}
          max={1}
          step={0.05}
          value={numOf(lose.p, undefined) ?? undefined}
          placeholder="0~1，如 0.3"
          disabled={disabled}
          onChange={(v) => {
            const next = { ...obj }
            if (typeof v === 'number') next.lose_item = { ...lose, p: v }
            else delete next.lose_item
            onChange?.(next)
          }}
        />
        <Typography.Text type="secondary" style={{ fontSize: 12, marginLeft: 12 }}>
          随机丢失一件非蛋道具（跳过不中断）；不填 = 不启用
        </Typography.Text>
      </div>
      {Object.keys(extra).length > 0 && (
        <Typography.Text type="secondary" style={{ fontSize: 12, display: 'block' }}>
          其余扩展键已保留：{Object.keys(extra).join('、')}
        </Typography.Text>
      )}
    </div>
  )
}
