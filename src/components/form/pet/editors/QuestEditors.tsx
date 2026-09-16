import React from 'react'
import { Button, InputNumber, Select, Space, Typography } from 'antd'
import { MinusCircleOutlined, PlusOutlined } from '@ant-design/icons'
import { asObject, asArray, extraKeys, numOf } from './shared'
import type { ItemOption } from './ItemEditors'

// ==================== 任务奖励包编辑器 ====================
//
// rewards 结构实证（rpc_pet_daily_quests_claim）：
//   {gold?: int, points?: int, items?: [{code, count}]}
// 成就奖励包与任务共用 schema（蓝图 §9）。

interface RewardsEditorProps {
  value?: unknown
  onChange?: (v: Record<string, unknown>) => void
  items: ItemOption[]
  disabled?: boolean
}

export const RewardsEditor: React.FC<RewardsEditorProps> = ({ value, onChange, items, disabled }) => {
  const known = ['gold', 'points', 'items']
  const obj = asObject(value)
  const extra = extraKeys(value, known)
  const itemRows = asArray(obj.items)

  const itemOptions = items.map((i) => ({ value: i.item_code, label: `${i.name}（${i.item_code}）` }))

  const setField = (key: string, v: number | null) => {
    const next = { ...obj }
    if (v === null) delete next[key]
    else next[key] = v
    onChange?.(next)
  }
  const setItems = (next: Record<string, unknown>[]) => onChange?.({ ...obj, items: next })

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
        <Typography.Text style={{ width: 110, flexShrink: 0 }}>金币</Typography.Text>
        <InputNumber
          style={{ width: 160 }}
          min={0}
          value={numOf(obj.gold, undefined) ?? undefined}
          placeholder="留空 = 不奖励金币"
          disabled={disabled}
          onChange={(v) => setField('gold', typeof v === 'number' ? v : null)}
        />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
        <Typography.Text style={{ width: 110, flexShrink: 0 }}>积分</Typography.Text>
        <InputNumber
          style={{ width: 160 }}
          min={0}
          value={numOf(obj.points, undefined) ?? undefined}
          placeholder="留空 = 不奖励积分"
          disabled={disabled}
          onChange={(v) => setField('points', typeof v === 'number' ? v : null)}
        />
      </div>
      <Typography.Text style={{ display: 'block', marginBottom: 4 }}>道具奖励</Typography.Text>
      {itemRows.map((row, idx) => (
        <Space.Compact key={idx} style={{ display: 'flex', marginBottom: 8 }} block>
          <Select
            style={{ width: 260 }}
            value={typeof row.code === 'string' ? row.code : undefined}
            placeholder="选择道具"
            options={itemOptions}
            showSearch
            optionFilterProp="label"
            disabled={disabled}
            onChange={(v) => setItems(itemRows.map((r, i) => (i === idx ? { ...r, code: v } : r)))}
          />
          <InputNumber
            style={{ width: 120 }}
            min={1}
            placeholder="数量"
            value={numOf(row.count, undefined) ?? undefined}
            disabled={disabled}
            onChange={(v) =>
              setItems(
                itemRows.map((r, i) => (i === idx ? { ...r, count: typeof v === 'number' ? v : null } : r))
              )
            }
          />
          <Button
            type="text"
            danger
            icon={<MinusCircleOutlined />}
            disabled={disabled}
            onClick={() => setItems(itemRows.filter((_, i) => i !== idx))}
          />
        </Space.Compact>
      ))}
      <Button
        size="small"
        icon={<PlusOutlined />}
        disabled={disabled}
        onClick={() => setItems([...itemRows, { code: '', count: 1 }])}
      >
        新增道具
      </Button>
      {Object.keys(extra).length > 0 && (
        <Typography.Text type="secondary" style={{ fontSize: 12, display: 'block' }}>
          其余扩展键已保留：{Object.keys(extra).join('、')}
        </Typography.Text>
      )}
    </div>
  )
}
