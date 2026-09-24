import React from 'react'
import { Button, InputNumber, Select, Space, Typography } from 'antd'
import { MinusCircleOutlined, PlusOutlined } from '@ant-design/icons'
import { asObject, asArray, extraKeys, numOf } from './shared'
import {
  PET_EGG_MODE_OPTIONS,
  PET_EFFECT_TYPE_OPTIONS,
} from '../../../../constants/pet'

// ==================== 道具相关结构化编辑器（effect / newbie_package） ====================
//
// effect 结构实证（以已执行 SQL 的服务端取数口径为准）：
// - 蛋类（category=egg）：{pool: 蛋池编码, mode: instant|wait, wait_hours?: 小时}
//   （rpc_pet_hatch_instant；wait_hours 仅 mode=wait 生效，留空回落 pet_config.ssr_hatch_wait_hours）；
// - 消耗品：{type: feed|clean|toy|heal|refine_point, hunger?, mood?, exp?, value?}
//   （rpc_pet_use_item 白名单；value = heal 恢复健康量 / refine_point 获得洗练点数）；
// - 工具/其他：开放结构（ladder/rescue 等）→ 保留 JSON 高级编辑。

export interface ItemOption {
  item_code: string
  name: string
  category: string
}

interface EffectEditorProps {
  value?: unknown
  onChange?: (v: Record<string, unknown>) => void
  category: string
  poolOptions: Array<{ value: string; label: string }>
  disabled?: boolean
}

export const EffectEditor: React.FC<EffectEditorProps> = ({
  value,
  onChange,
  category,
  poolOptions,
  disabled,
}) => {
  const obj = asObject(value)

  // —— 蛋类：pool + mode（wait 时另有 wait_hours） ——
  if (category === 'egg') {
    const known = ['pool', 'mode', 'wait_hours']
    const extra = extraKeys(value, known)
    const mode = typeof obj.mode === 'string' ? obj.mode : 'instant'
    const setField = (key: string, v: unknown) => {
      const next = { ...obj }
      if (v === null || v === undefined || v === '') delete next[key]
      else next[key] = v
      onChange?.(next)
    }
    return (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
          <Typography.Text style={{ width: 110, flexShrink: 0 }}>关联蛋池</Typography.Text>
          <Select
            style={{ width: 220 }}
            value={typeof obj.pool === 'string' ? obj.pool : undefined}
            placeholder="选择蛋池（判定同源键）"
            options={poolOptions}
            allowClear
            disabled={disabled}
            onChange={(v) => onChange?.({ ...obj, pool: v ?? null })}
          />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
          <Typography.Text style={{ width: 110, flexShrink: 0 }}>孵化方式</Typography.Text>
          <Select
            style={{ width: 220 }}
            value={mode}
            options={PET_EGG_MODE_OPTIONS}
            disabled={disabled}
            onChange={(v) => setField('mode', v)}
          />
        </div>
        {(mode === 'wait' || obj.wait_hours !== undefined) && (
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
            <Typography.Text style={{ width: 110, flexShrink: 0 }}>等待时长</Typography.Text>
            <InputNumber
              style={{ width: 160 }}
              min={1}
              addonAfter="小时"
              value={numOf(obj.wait_hours, undefined) ?? undefined}
              placeholder="留空用全局时长"
              disabled={disabled}
              onChange={(v) => setField('wait_hours', typeof v === 'number' ? v : null)}
            />
          </div>
        )}
        {Object.keys(extra).length > 0 && (
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            其余扩展键已保留：{Object.keys(extra).join('、')}
          </Typography.Text>
        )}
      </div>
    )
  }

  // —— 消耗品：type + hunger/mood/exp + value ——
  if (category === 'consumable') {
    const known = ['type', 'hunger', 'mood', 'exp', 'value']
    const extra = extraKeys(value, known)
    const type = typeof obj.type === 'string' ? obj.type : ''
    const setField = (key: string, v: unknown) => {
      const next = { ...obj }
      if (v === null || v === undefined || v === '') delete next[key]
      else next[key] = v
      onChange?.(next)
    }
    return (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
          <Typography.Text style={{ width: 110, flexShrink: 0 }}>效果类型</Typography.Text>
          <Select
            style={{ width: 220 }}
            value={type || undefined}
            placeholder="选择效果类型（服务端白名单）"
            options={PET_EFFECT_TYPE_OPTIONS}
            disabled={disabled}
            onChange={(v) => setField('type', v)}
          />
        </div>
        {(['hunger', 'mood', 'exp'] as const).map((key) => (
          <div key={key} style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
            <Typography.Text style={{ width: 110, flexShrink: 0 }}>
              {key === 'hunger' ? '饱食恢复' : key === 'mood' ? '心情恢复' : '经验获得'}
            </Typography.Text>
            <InputNumber
              style={{ width: 160 }}
              min={0}
              value={numOf(obj[key], undefined) ?? undefined}
              placeholder="留空 = 不恢复"
              disabled={disabled}
              onChange={(v) => setField(key, typeof v === 'number' ? v : null)}
            />
          </div>
        ))}
        {(type === 'heal' || type === 'refine_point' || obj.value !== undefined) && (
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
            <Typography.Text style={{ width: 110, flexShrink: 0 }}>
              {type === 'refine_point' ? '洗练点数' : '健康恢复'}
            </Typography.Text>
            <InputNumber
              style={{ width: 160 }}
              min={0}
              value={numOf(obj.value, undefined) ?? undefined}
              placeholder={type === 'refine_point' ? '留空 = 1 点' : '留空 = 不恢复'}
              disabled={disabled}
              onChange={(v) => setField('value', typeof v === 'number' ? v : null)}
            />
          </div>
        )}
        {Object.keys(extra).length > 0 && (
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            其余扩展键已保留：{Object.keys(extra).join('、')}
          </Typography.Text>
        )}
      </div>
    )
  }

  // —— 工具/装备等开放结构：不提供结构化编辑，走 JSON 高级编辑（由调用方渲染 JsonFormItem）——
  return null
}

// ---------- NewbiePackageEditor：初始资源包 ----------
// 结构实证（rpc_pet_summary 初始包发放）：{egg_item_code, foods:[{item_code,count}], gold}
interface NewbiePackageEditorProps {
  value?: unknown
  onChange?: (v: Record<string, unknown>) => void
  items: ItemOption[]
  disabled?: boolean
}

export const NewbiePackageEditor: React.FC<NewbiePackageEditorProps> = ({
  value,
  onChange,
  items,
  disabled,
}) => {
  const known = ['egg_item_code', 'foods', 'gold']
  const obj = asObject(value)
  const extra = extraKeys(value, known)
  const foods = asArray(obj.foods)

  const itemOptions = items.map((i) => ({ value: i.item_code, label: `${i.name}（${i.item_code}）` }))
  const eggOptions = items
    .filter((i) => i.category === 'egg')
    .map((i) => ({ value: i.item_code, label: `${i.name}（${i.item_code}）` }))

  const setFoods = (next: Record<string, unknown>[]) => onChange?.({ ...obj, foods: next })

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
        <Typography.Text style={{ width: 110, flexShrink: 0 }}>初始蛋</Typography.Text>
        <Select
          style={{ width: 260 }}
          value={typeof obj.egg_item_code === 'string' ? obj.egg_item_code : undefined}
          placeholder="选择蛋类道具（可空 = 不发蛋）"
          options={eggOptions}
          allowClear
          showSearch
          optionFilterProp="label"
          disabled={disabled}
          onChange={(v) => onChange?.({ ...obj, egg_item_code: v ?? null })}
        />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
        <Typography.Text style={{ width: 110, flexShrink: 0 }}>初始金币</Typography.Text>
        <InputNumber
          style={{ width: 160 }}
          min={0}
          value={numOf(obj.gold, undefined) ?? undefined}
          placeholder="0 = 不发金币"
          disabled={disabled}
          onChange={(v) => onChange?.({ ...obj, gold: typeof v === 'number' ? v : null })}
        />
      </div>
      <Typography.Text style={{ display: 'block', marginBottom: 4 }}>初始食物</Typography.Text>
      {foods.map((row, idx) => (
        <Space.Compact key={idx} style={{ display: 'flex', marginBottom: 8 }} block>
          <Select
            style={{ width: 260 }}
            value={typeof row.item_code === 'string' ? row.item_code : undefined}
            placeholder="选择道具"
            options={itemOptions}
            showSearch
            optionFilterProp="label"
            disabled={disabled}
            onChange={(v) => setFoods(foods.map((r, i) => (i === idx ? { ...r, item_code: v } : r)))}
          />
          <InputNumber
            style={{ width: 120 }}
            min={1}
            placeholder="数量"
            value={numOf(row.count, undefined) ?? undefined}
            disabled={disabled}
            onChange={(v) =>
              setFoods(
                foods.map((r, i) => (i === idx ? { ...r, count: typeof v === 'number' ? v : null } : r))
              )
            }
          />
          <Button
            type="text"
            danger
            icon={<MinusCircleOutlined />}
            disabled={disabled}
            onClick={() => setFoods(foods.filter((_, i) => i !== idx))}
          />
        </Space.Compact>
      ))}
      <Button
        size="small"
        icon={<PlusOutlined />}
        disabled={disabled}
        onClick={() => setFoods([...foods, { item_code: '', count: 1 }])}
      >
        新增食物
      </Button>
      {Object.keys(extra).length > 0 && (
        <Typography.Text type="secondary" style={{ fontSize: 12, display: 'block' }}>
          其余扩展键已保留：{Object.keys(extra).join('、')}
        </Typography.Text>
      )}
    </div>
  )
}
