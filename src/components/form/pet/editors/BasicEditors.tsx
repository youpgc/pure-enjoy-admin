import React from 'react'
import { Button, Input, InputNumber, Space, Typography } from 'antd'
import { MinusCircleOutlined, PlusOutlined } from '@ant-design/icons'
import { asObject, extraKeys, numOf } from './shared'
import common from '../../../../styles/common.module.css'

// ==================== 基础结构化编辑器（数字映射 / 行列表） ====================
//
// 全部为受控组件（value/onChange），未知键保留。

// ---------- NumberMapEditor：扁平「键 → 数字」对象 ----------
// 适用：result_weights（四类结果权重）、rescue_params（self_window_minutes）、
//       base_attributes（初始四维）、rewards 数字部分等。
export interface NumberMapField {
  key: string
  label: string
  placeholder?: string
  min?: number
  max?: number
  step?: number
}

interface NumberMapEditorProps {
  value?: unknown
  onChange?: (v: Record<string, unknown>) => void
  fields: NumberMapField[]
  disabled?: boolean
  /** 权重和提示文案（仅展示，不强校验——服务端按累计权重判定） */
  sumHint?: string
}

export const NumberMapEditor: React.FC<NumberMapEditorProps> = ({
  value,
  onChange,
  fields,
  disabled,
  sumHint,
}) => {
  const known = fields.map((f) => f.key)
  const obj = asObject(value)
  const extra = extraKeys(value, known)

  const setField = (key: string, num: number | null) => {
    const next = asObject(value)
    if (num === null) delete next[key]
    else next[key] = num
    onChange?.(next)
  }

  const sum = fields.reduce((acc, f) => acc + (numOf(obj[f.key], 0) ?? 0), 0)

  return (
    <div>
      {fields.map((f) => (
        <div key={f.key} style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
          <Typography.Text style={{ width: 150, flexShrink: 0 }}>{f.label}</Typography.Text>
          <InputNumber
            style={{ width: 160 }}
            value={numOf(obj[f.key], undefined) ?? undefined}
            min={f.min}
            max={f.max}
            step={f.step}
            placeholder={f.placeholder}
            disabled={disabled}
            onChange={(v) => setField(f.key, typeof v === 'number' ? v : null)}
          />
        </div>
      ))}
      {sumHint && (
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          {sumHint}（当前合计：{sum}）
        </Typography.Text>
      )}
      {Object.keys(extra).length > 0 && (
        <Typography.Text type="secondary" style={{ fontSize: 12, display: 'block' }}>
          其余扩展键已保留：{Object.keys(extra).join('、')}
        </Typography.Text>
      )}
    </div>
  )
}

// ---------- TierListEditor：历险三档（[{tier,minutes,label}]） ----------
interface TierListEditorProps {
  value?: unknown
  onChange?: (v: Array<Record<string, unknown>>) => void
  disabled?: boolean
}

export const TierListEditor: React.FC<TierListEditorProps> = ({ value, onChange, disabled }) => {
  const rows = Array.isArray(value)
    ? value.filter((v): v is Record<string, unknown> => !!v && typeof v === 'object')
    : []

  const emit = (next: Record<string, unknown>[]) => onChange?.(next)

  return (
    <div>
      {rows.map((row, idx) => (
        <Space.Compact key={idx} style={{ display: 'flex', marginBottom: 8 }} block>
          <Input
            style={{ width: 140 }}
            placeholder="tier 编码"
            value={typeof row.tier === 'string' ? row.tier : ''}
            disabled={disabled}
            onChange={(e) => {
              const next = rows.map((r, i) => (i === idx ? { ...r, tier: e.target.value } : r))
              emit(next)
            }}
          />
          <InputNumber
            style={{ width: 130 }}
            placeholder="分钟"
            min={1}
            value={numOf(row.minutes, undefined) ?? undefined}
            disabled={disabled}
            onChange={(v) => {
              const next = rows.map((r, i) =>
                i === idx ? { ...r, minutes: typeof v === 'number' ? v : null } : r
              )
              emit(next)
            }}
          />
          <Input
            placeholder="展示名（如 短途）"
            value={typeof row.label === 'string' ? row.label : ''}
            disabled={disabled}
            onChange={(e) => {
              const next = rows.map((r, i) => (i === idx ? { ...r, label: e.target.value } : r))
              emit(next)
            }}
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
        onClick={() => emit([...rows, { tier: '', minutes: 30, label: '' }])}
      >
        新增档位
      </Button>
    </div>
  )
}

// ---------- UnlockListEditor：解锁条件（[{type,value}]） ----------
interface UnlockListEditorProps {
  value?: unknown
  onChange?: (v: Array<Record<string, unknown>>) => void
  disabled?: boolean
}

export const UnlockListEditor: React.FC<UnlockListEditorProps> = ({ value, onChange, disabled }) => {
  const rows = Array.isArray(value)
    ? value.filter((v): v is Record<string, unknown> => !!v && typeof v === 'object')
    : []

  const emit = (next: Record<string, unknown>[]) => onChange?.(next)

  return (
    <div className={common.mb8}>
      {rows.map((row, idx) => (
        <Space.Compact key={idx} style={{ display: 'flex', marginBottom: 8 }} block>
          <Input
            style={{ width: 160 }}
            placeholder="条件类型（如 level）"
            value={typeof row.type === 'string' ? row.type : ''}
            disabled={disabled}
            onChange={(e) => {
              const next = rows.map((r, i) => (i === idx ? { ...r, type: e.target.value } : r))
              emit(next)
            }}
          />
          <InputNumber
            placeholder="阈值"
            value={numOf(row.value, undefined) ?? undefined}
            disabled={disabled}
            onChange={(v) => {
              const next = rows.map((r, i) =>
                i === idx ? { ...r, value: typeof v === 'number' ? v : null } : r
              )
              emit(next)
            }}
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
        onClick={() => emit([...rows, { type: 'level', value: 1 }])}
      >
        新增条件
      </Button>
    </div>
  )
}
