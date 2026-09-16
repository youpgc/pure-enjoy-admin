import React from 'react'
import { Button, Collapse, InputNumber, Select, Space, Typography } from 'antd'
import { MinusCircleOutlined, PlusOutlined } from '@ant-design/icons'
import { asObject, asArray, extraKeys, numOf } from './shared'
import { PET_ADVENTURE_RESULT_LABELS } from '../../../../constants/pet'
import type { ItemOption } from './ItemEditors'

// ==================== 历险掉落包编辑器 ====================
//
// drop_table 结构实证（rpc_pet_adventure_claim）：
//   { <result>: {gold?: [min,max], exp?: [min,max], items?: [{code,min,max,p}]} }
//   - gold/exp 为闭区间，服务端区间随机（含端点）；
//   - items.p 为掉落概率 0~1（缺省 1），min/max 数量区间；
//   - 结果键缺省（空对象）→ 该结果无掉落。

const ITEM_ITEM_KEYS = ['play', 'danger', 'help', 'memory']

interface DropTableEditorProps {
  value?: unknown
  onChange?: (v: Record<string, unknown>) => void
  items: ItemOption[]
  disabled?: boolean
}

/// 单个结果的掉落段
const ResultDropSection: React.FC<{
  data: Record<string, unknown>
  items: ItemOption[]
  disabled?: boolean
  onChange: (next: Record<string, unknown>) => void
}> = ({ data, items, disabled, onChange }) => {
  const known = ['gold', 'exp', 'items']
  const extra = extraKeys(data, known)
  const itemRows = asArray(data.items)
  const itemOptions = items.map((i) => ({ value: i.item_code, label: `${i.name}（${i.item_code}）` }))

  const numAt = (key: string, idx: number): number | null => {
    const arr = data[key]
    return Array.isArray(arr) ? numOf(arr[idx]) : null
  }
  const setRange = (key: string, idx: number, v: number | null) => {
    const next = { ...data }
    const arr = Array.isArray(next[key]) ? [...(next[key] as unknown[])] : [null, null]
    arr[idx] = v
    if (arr[0] === null && arr[1] === null) delete next[key]
    else next[key] = arr
    onChange(next)
  }

  return (
    <div>
      <Space style={{ marginBottom: 8 }} wrap>
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          金币区间
        </Typography.Text>
        <InputNumber
          size="small"
          min={0}
          placeholder="min"
          value={numAt('gold', 0) ?? undefined}
          disabled={disabled}
          onChange={(v) => setRange('gold', 0, typeof v === 'number' ? v : null)}
        />
        <Typography.Text type="secondary">~</Typography.Text>
        <InputNumber
          size="small"
          min={0}
          placeholder="max"
          value={numAt('gold', 1) ?? undefined}
          disabled={disabled}
          onChange={(v) => setRange('gold', 1, typeof v === 'number' ? v : null)}
        />
        <Typography.Text type="secondary" style={{ fontSize: 12, marginLeft: 12 }}>
          经验区间
        </Typography.Text>
        <InputNumber
          size="small"
          min={0}
          placeholder="min"
          value={numAt('exp', 0) ?? undefined}
          disabled={disabled}
          onChange={(v) => setRange('exp', 0, typeof v === 'number' ? v : null)}
        />
        <Typography.Text type="secondary">~</Typography.Text>
        <InputNumber
          size="small"
          min={0}
          placeholder="max"
          value={numAt('exp', 1) ?? undefined}
          disabled={disabled}
          onChange={(v) => setRange('exp', 1, typeof v === 'number' ? v : null)}
        />
      </Space>
      {itemRows.map((row, idx) => (
        <Space.Compact key={idx} style={{ display: 'flex', marginBottom: 8 }} block>
          <Select
            style={{ width: 200 }}
            size="small"
            value={typeof row.code === 'string' ? row.code : undefined}
            placeholder="道具"
            options={itemOptions}
            showSearch
            optionFilterProp="label"
            disabled={disabled}
            onChange={(v) => onChange({ ...data, items: itemRows.map((r, i) => (i === idx ? { ...r, code: v } : r)) })}
          />
          <InputNumber size="small" style={{ width: 90 }} min={1} placeholder="min"
            value={numOf(row.min, undefined) ?? undefined}
            disabled={disabled}
            onChange={(v) => onChange({ ...data, items: itemRows.map((r, i) => (i === idx ? { ...r, min: typeof v === 'number' ? v : null } : r)) })}
          />
          <InputNumber size="small" style={{ width: 90 }} min={1} placeholder="max"
            value={numOf(row.max, undefined) ?? undefined}
            disabled={disabled}
            onChange={(v) => onChange({ ...data, items: itemRows.map((r, i) => (i === idx ? { ...r, max: typeof v === 'number' ? v : null } : r)) })}
          />
          <InputNumber size="small" style={{ width: 110 }} min={0} max={1} step={0.05} placeholder="概率 p"
            value={numOf(row.p, undefined) ?? undefined}
            disabled={disabled}
            onChange={(v) => onChange({ ...data, items: itemRows.map((r, i) => (i === idx ? { ...r, p: typeof v === 'number' ? v : null } : r)) })}
          />
          <Button
            type="text"
            size="small"
            danger
            icon={<MinusCircleOutlined />}
            disabled={disabled}
            onClick={() => onChange({ ...data, items: itemRows.filter((_, i) => i !== idx) })}
          />
        </Space.Compact>
      ))}
      <Button
        size="small"
        icon={<PlusOutlined />}
        disabled={disabled}
        onClick={() => onChange({ ...data, items: [...itemRows, { code: '', min: 1, max: 1, p: 0.5 }] })}
      >
        新增掉落道具
      </Button>
      {Object.keys(extra).length > 0 && (
        <Typography.Text type="secondary" style={{ fontSize: 12, display: 'block' }}>
          其余扩展键已保留：{Object.keys(extra).join('、')}
        </Typography.Text>
      )}
    </div>
  )
}

export const DropTableEditor: React.FC<DropTableEditorProps> = ({ value, onChange, items, disabled }) => {
  const obj = asObject(value)
  const extra = extraKeys(value, ITEM_ITEM_KEYS)

  const items2 = (
    <>
      {ITEM_ITEM_KEYS.map((rk) => (
        <Collapse.Panel
          key={rk}
          header={`${PET_ADVENTURE_RESULT_LABELS[rk] ?? rk}（${rk}）`}
          extra={
            obj[rk] ? (
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                已配置
              </Typography.Text>
            ) : (
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                空
              </Typography.Text>
            )
          }
        >
          <ResultDropSection
            data={asObject(obj[rk])}
            items={items}
            disabled={disabled}
            onChange={(next) => {
              const out = { ...obj }
              if (Object.keys(next).length === 0) delete out[rk]
              else out[rk] = next
              onChange?.(out)
            }}
          />
        </Collapse.Panel>
      ))}
    </>
  )

  return (
    <div>
      <Collapse size="small">{items2}</Collapse>
      {Object.keys(extra).length > 0 && (
        <Typography.Text type="secondary" style={{ fontSize: 12, display: 'block' }}>
          其余结果键已保留：{Object.keys(extra).join('、')}
        </Typography.Text>
      )}
      <Typography.Text type="secondary" style={{ fontSize: 12, display: 'block' }}>
        四类结果（游玩/遇险/帮助/纪念）由服务端按累计权重 roll 判定
      </Typography.Text>
    </div>
  )
}
