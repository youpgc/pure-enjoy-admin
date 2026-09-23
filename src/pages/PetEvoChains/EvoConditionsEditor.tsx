import { Button, InputNumber, Select, Space } from 'antd'
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons'
import { PET_EVO_COND_TYPE_OPTIONS } from '../../constants/pet'
import { asArray, numOf } from '../../components/form/pet/editors/shared'

// ==================== 进化条件编辑器（pet_evo_stages.conditions） ====================
//
// 结构实证（feature_pet_p2_rpcs_20260923 §4 rpc_pet_evolve）：数组内每条 = 一个条件，全部满足才放行。
//   {type: level|intimacy|gold, value:int}
//   {type: item, item:'<item_code>', cost:int}   // cost 缺省 1；也支持 item_id=uuid，后台统一写 item
// 未知 type 服务端抛 PET_EVOLVE_COND_INVALID，故这里只允许白名单四选一。
// 行的其余未知键原样保留（不覆写运营/种子写入的扩展字段）。

interface Props {
  value?: unknown
  onChange?: (v: Record<string, unknown>[]) => void
  items: Array<{ item_code: string; name: string }>
  disabled?: boolean
}

export const EvoConditionsEditor: React.FC<Props> = ({ value, onChange, items, disabled }) => {
  const rows = asArray(value)
  const itemOptions = items.map((i) => ({
    value: i.item_code,
    label: `${i.name}（${i.item_code}）`,
  }))

  const emit = (next: Record<string, unknown>[]) => onChange?.(next)

  const patch = (index: number, changes: Record<string, unknown>) => {
    const next = rows.map((r, i) => (i === index ? { ...r, ...changes } : r))
    emit(next)
  }

  const removeAt = (index: number) => emit(rows.filter((_, i) => i !== index))

  const addRow = () => emit([...rows, { type: 'level', value: 10 }])

  return (
    <div>
      {rows.map((row, index) => {
        const type = typeof row.type === 'string' ? row.type : ''
        const isItem = type === 'item'
        return (
          <Space key={index} style={{ display: 'flex', marginBottom: 8 }} align="start">
            <Select
              style={{ width: 130 }}
              value={type || undefined}
              placeholder="条件类型"
              disabled={disabled}
              options={PET_EVO_COND_TYPE_OPTIONS}
              onChange={(v) => {
                // 换类型时清掉上一类型的互斥键，避免留下无效 value/item（服务端忽略但会误导运营）
                if (isItem && v !== 'item') patch(index, { type: v, item: undefined, cost: undefined })
                else if (!isItem && v === 'item') patch(index, { type: v, value: undefined })
                else patch(index, { type: v })
              }}
            />
            {isItem ? (
              <>
                <Select
                  style={{ width: 220 }}
                  showSearch
                  optionFilterProp="label"
                  value={typeof row.item === 'string' ? row.item : undefined}
                  placeholder="选择道具（item_code）"
                  disabled={disabled}
                  options={itemOptions}
                  onChange={(v) => patch(index, { item: v })}
                />
                <InputNumber
                  style={{ width: 100 }}
                  min={1}
                  placeholder="消耗数量"
                  value={numOf(row.cost)}
                  disabled={disabled}
                  onChange={(v) => patch(index, { cost: v })}
                />
              </>
            ) : (
              <InputNumber
                style={{ width: 160 }}
                min={0}
                placeholder="目标值"
                value={numOf(row.value)}
                disabled={disabled}
                onChange={(v) => patch(index, { value: v })}
              />
            )}
            {!disabled && (
              <Button
                type="text"
                size="small"
                danger
                icon={<DeleteOutlined />}
                onClick={() => removeAt(index)}
              />
            )}
          </Space>
        )
      })}
      {!disabled && (
        <Button type="dashed" size="small" icon={<PlusOutlined />} onClick={addRow}>
          添加条件
        </Button>
      )}
      {rows.length === 0 && (
        <div style={{ color: '#999', fontSize: 12, marginTop: 4 }}>
          无条件 = 满足阶段等级门槛即可进化
        </div>
      )}
    </div>
  )
}
