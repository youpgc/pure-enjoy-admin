// 宠物全局参数展示列（从 PetConfig/index.tsx 抽离，审查 P2-16 单文件超 500 行）
// 列与拆行均为纯函数：配置行由页面注入，展示逻辑不碰组件状态。
import type { ColumnsType } from 'antd/es/table'
import { Typography } from 'antd'
import type { PetConfigRow } from '../../types/pet'
import { fmtNum } from './constants'
import type { FieldMeta, ModuleMeta, ValueRow } from './types'

const rawValue = (row: PetConfigRow | null, field: string): unknown => {
  if (!row) return undefined
  if (!field.includes('.')) return (row as unknown as Record<string, unknown>)[field]
  // dotted path：reserved 卡的 jsonb 嵌套键（审查报告 宠物 P2 reserved 编辑入口）
  return field.split('.').reduce<unknown>((acc, k) => {
    if (acc && typeof acc === 'object') return (acc as Record<string, unknown>)[k]
    return undefined
  }, row as unknown as Record<string, unknown>)
}

const DescCell = (v: string | undefined) =>
  v ? <Typography.Text type="secondary">{v}</Typography.Text> : '—'

/** 通用参数表列（fields 驱动，当前值取自配置行） */
export const buildValueColumns = (row: PetConfigRow | null): ColumnsType<FieldMeta> => [
  { title: '参数', dataIndex: 'label', width: 260 },
  {
    title: '当前值',
    dataIndex: 'field',
    width: 300,
    render: (_: unknown, record: FieldMeta) => {
      const text = record.format ? record.format(rawValue(row, record.field)) : fmtNum(rawValue(row, record.field))
      return (
        <Typography.Text style={{ fontSize: 13 }} ellipsis>
          {text}
        </Typography.Text>
      )
    },
  },
  { title: '说明', dataIndex: 'desc', render: DescCell },
]

/** 自定义行表列（历险档位 / 初始资源包） */
export const ROW_COLUMNS: ColumnsType<ValueRow> = [
  { title: '内容', dataIndex: 'label', width: 260 },
  {
    title: '当前值',
    dataIndex: 'value',
    width: 300,
    render: (v: string) => (
      <Typography.Text style={{ fontSize: 13 }} ellipsis>
        {v}
      </Typography.Text>
    ),
  },
  { title: '说明', dataIndex: 'desc', render: DescCell },
]

/** 历险档位逐档成行（adventure_tiers：tier 编码 / minutes 时长 / label 展示名） */
export const buildTierRows = (row: PetConfigRow | null): ValueRow[] => {
  const raw = rawValue(row, 'adventure_tiers') as Array<Record<string, unknown>> | null | undefined
  if (!Array.isArray(raw)) return []
  return raw.map((t, i) => {
    const tier = t.tier != null ? String(t.tier) : `tier-${i + 1}`
    const minutes = t.minutes != null ? String(t.minutes) : '—'
    const label = t.label != null ? String(t.label) : tier
    return {
      key: tier,
      label: `档位 ${i + 1}`,
      value: `${label} · ${minutes} 分钟`,
      desc: `tier 编码：${tier}`,
    }
  })
}

/** 初始资源包按内容拆行（蛋 / 每种食物 / 金币各一行） */
export const buildNewbieRows = (
  row: PetConfigRow | null,
  itemName: (code: unknown) => string
): ValueRow[] => {
  const pkg = (rawValue(row, 'newbie_package') ?? {}) as Record<string, unknown>
  const rows: ValueRow[] = []
  if (pkg.egg_item_code) {
    rows.push({ key: 'egg', label: '初始蛋', value: `${itemName(pkg.egg_item_code)} × 1` })
  }
  const foods = Array.isArray(pkg.foods) ? (pkg.foods as Record<string, unknown>[]) : []
  foods.forEach((f, i) => {
    const count = f.count != null ? String(f.count) : '—'
    rows.push({
      key: `food-${i}`,
      label: foods.length > 1 ? `初始食物 ${i + 1}` : '初始食物',
      value: `${itemName(f.item_code)} × ${count}`,
    })
  })
  rows.push({
    key: 'gold',
    label: '初始金币',
    value: `${pkg.gold != null ? String(pkg.gold) : '0'} 金币`,
    desc: '发放进宠物金币钱包',
  })
  return rows
}

/** 模块字段转展示行；档位与初始包有专属拆行表，此处剔除避免重复 */
export const buildFieldRows = (row: PetConfigRow | null, mod: ModuleMeta): ValueRow[] =>
  mod.fields
    .filter((f) => f.field !== 'adventure_tiers' && f.field !== 'newbie_package')
    .map((f) => {
      const raw = rawValue(row, f.field)
      return {
        key: f.field,
        label: f.label,
        value: f.format ? f.format(raw) : fmtNum(raw),
        desc: f.desc,
      }
    })
