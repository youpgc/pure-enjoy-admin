import { Tag } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import type { BaseService } from '../../utils/apiClient'

// 西行配置页：字段 schema 定义（按表类型一对一，结构化表单、无 JSON 编辑器）。
// 每个 Tab = 一张 journey_* 表的 schema，由 JourneyCrudTab 统一渲染表格与表单。

/// 表单/表格字段定义
export interface JourneyFieldDef {
  /// 列名（与 journey_* 表 DDL 一致）
  name: string
  label: string
  type: 'text' | 'number' | 'select' | 'switch' | 'textarea'
  /// type=select：固定枚举选项（与 constants/game.ts 的 JOURNEY_*_MAP 同源取值）
  options?: { value: string; label: string }[]
  /// type=select：外键下拉（从 index.tsx 预载的查找表取选项）
  optionsFrom?: keyof JourneyLookups
  required?: boolean
  min?: number
  max?: number
  step?: number
  placeholder?: string
  /// 表格中隐藏（仅表单可见，如超长描述）
  hideInTable?: boolean
  /// 表单中隐藏（只读展示列）
  hideInForm?: boolean
  /// 表格列宽
  width?: number
  /// 表格枚举列渲染为 Tag（映射与 select options 同一常量）
  enumMap?: Record<string, { color: string; label: string }>
}

/// 外键查找表（index.tsx 预载后下发）
export interface JourneyLookups {
  regions: { value: string; label: string }[]
  levels: { value: string; label: string }[]
  monsters: { value: string; label: string }[]
  weapons: { value: string; label: string }[]
  passiveWeapons: { value: string; label: string }[]
  pickups: { value: string; label: string }[]
}

/// 列表过滤：按外键（如 level_id）、静态枚举（如 element）或文本前缀（如 table_code）
export interface JourneyFilterDef {
  field: string
  kind: 'lookup' | 'text' | 'static'
  /// kind=lookup 时的查找表
  lookup?: keyof JourneyLookups
  /// kind=static 时的固定选项
  options?: { value: string; label: string }[]
  placeholder?: string
}

/// 一个 Tab = 一张表的完整配置
export interface JourneyTabSchema {
  key: string
  label: string
  service: BaseService<Record<string, any>>
  fields: JourneyFieldDef[]
  rowKey?: string
  filter?: JourneyFilterDef
  /// 新增时把当前过滤值预填进该字段（level-scoped 表新增免选）
  prefillFromFilter?: boolean
  /// Tab 顶部说明
  intro?: string
}

/// 由 schema 生成表格列（enumMap → Tag / lookup → label / switch → 启停 Tag）
export function columnsFromSchema(
  fields: JourneyFieldDef[],
  lookups: JourneyLookups,
): ColumnsType<Record<string, any>> {
  return fields
    .filter((f) => !f.hideInTable)
    .map((f) => ({
      title: f.label,
      dataIndex: f.name,
      key: f.name,
      width: f.width,
      render: (v: any) => {
        if (v === null || v === undefined || v === '') return '-'
        if (f.type === 'switch') {
          return v ? '✅' : '—'
        }
        if (f.enumMap) {
          const info = f.enumMap[String(v)] ?? { color: 'default', label: String(v) }
          return <Tag key={f.name} color={info.color}>{info.label}</Tag>
        }
        if (f.optionsFrom) {
          const hit = lookups[f.optionsFrom].find((o) => o.value === v)
          return hit?.label ?? String(v)
        }
        return String(v)
      },
    }))
}
