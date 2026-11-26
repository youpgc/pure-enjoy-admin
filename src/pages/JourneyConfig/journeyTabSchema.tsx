import { Tag } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import type { BaseService } from '../../utils/apiClient'

// 西行管理页：字段 schema 定义（按表类型一对一，结构化表单、无 JSON 编辑器）。
// 每个 Tab = 一张 journey_* 表的 schema，由 JourneyCrudTab 统一渲染表格与表单。

/// 表单/表格字段定义
export interface JourneyFieldDef {
  /// 列名（与 journey_* 表 DDL 一致）
  name: string
  label: string
  type: 'text' | 'number' | 'select' | 'switch' | 'textarea'
  /// type=select：固定枚举选项（与 constants/game.ts 的 JOURNEY_*_MAP 同源取值）。
  /// value 支持数字：integer 列（如境界档位 tier）用数字 value 避免写库类型不匹配与回显错位。
  options?: { value: string | number; label: string }[]
  /// type=select：外键下拉（从 index.tsx 预载的查找表取选项）
  optionsFrom?: keyof JourneyLookups
  required?: boolean
  /// 新增行的默认值（switch 默认 false；DDL 默认启用的列在此显式声明）。
  defaultValue?: boolean
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

/// 下拉选项：tier 仅怪物查找表使用，供逐怪参数按 AI 档位筛选。
export interface JourneyLookupOption {
  value: string
  label: string
  tier?: string
}

/// 外键查找表（index.tsx 预载后下发）
export interface JourneyLookups {
  regions: JourneyLookupOption[]
  levels: JourneyLookupOption[]
  monsters: JourneyLookupOption[]
  /// 以怪物 id（uuid）为 value 的查找表：monster_params.monster_id 等
  /// uuid 外键列专用（monsters 表 value=code 仅用于 code 语义列）
  monstersById: JourneyLookupOption[]
  weapons: JourneyLookupOption[]
  /// 以法宝 code 为 value 的查找表：character_fields.weapon_code 等 code 语义列
  weaponsByCode: JourneyLookupOption[]
  passiveWeapons: JourneyLookupOption[]
  pickups: JourneyLookupOption[]
  characters: JourneyLookupOption[]
}

/// 列表过滤：按外键（如 level_id）、静态枚举（如 element）或文本前缀（如 table_code）
export interface JourneyFilterDef {
  field: string
  kind: 'lookup' | 'text' | 'static' | 'monsterTier'
  /// kind=lookup 时的查找表
  lookup?: keyof JourneyLookups
  /// kind=static / monsterTier 时的固定选项
  options?: { value: string; label: string }[]
  /// 过滤值写入查询时使用的真实列（档位筛选为虚拟字段，映射到 monster_id）
  targetField?: string
  /// kind=monsterTier：档位变化时需清理的关联筛选字段（选中项不属于新档位时清空）
  cascadeField?: string
  /// kind=lookup 且选项带 tier：选项按该档位筛选字段过滤，选中项自动回填档位
  tierField?: string
  placeholder?: string
}

/// 一个 Tab = 一张表的完整配置
export interface JourneyTabSchema {
  key: string
  label: string
  service: BaseService<Record<string, any>>
  fields: JourneyFieldDef[]
  rowKey?: string
  /// 单筛选项（兼容旧配置；与 filters 并存时两者一起渲染）
  filter?: JourneyFilterDef
  /// 多筛选项：按声明顺序渲染，查询时逐项叠加（text 包含匹配 / lookup 精确匹配）
  filters?: JourneyFilterDef[]
  /// 新增时把当前过滤值预填进该字段（level-scoped 表新增免选）
  prefillFromFilter?: boolean
  /// Tab 顶部说明
  intro?: string
  /// 精灵图列前缀（App 端 SVG 资源镜像 public/journey-assets/{prefix}_{code}.svg）；
  /// 非空时表格首列展示图标（资源缺失自动隐藏）
  iconPrefix?: string
  /// 图标取值字段（默认 code；怪物波次类传 monster_code）
  iconField?: string
  /// 取值→资源名映射（code 与资源名不一致时，如 baoxiang→chest）
  iconNameMap?: Record<string, string>
}

/// 西行精灵图 URL（与 App assets/games/journey/ 文件一一对应）；
/// ⚠️ 必须带 import.meta.env.BASE_URL 前缀：vite base 为 /pure-enjoy-admin/，
/// 硬编码根路径在 dev 与构建产物下都会 404（同 game-icons 教训）
export function journeySpriteUrl(prefix: string, name: string): string {
  return `${import.meta.env.BASE_URL}journey-assets/${prefix}_${name}.svg`
}

/// 表格首列精灵图列（iconPrefix 为空返回 null，调用方按需展开）
export function journeyIconColumn(
  schema: JourneyTabSchema,
): ColumnsType<Record<string, any>>[number] | null {
  if (!schema.iconPrefix) return null
  const field = schema.iconField ?? 'code'
  return {
    title: '图',
    key: '_sprite',
    width: 64,
    render: (_: any, record: Record<string, any>) => {
      const raw = String(record[field] ?? '')
      const name = schema.iconNameMap?.[raw] ?? raw
      if (!name) return '-'
      return (
        <img
          src={journeySpriteUrl(schema.iconPrefix!, name)}
          alt={name}
          loading="lazy"
          onError={(e) => {
            // 资源缺失（code 无对应 SVG）时隐藏图片位，不显破图
            e.currentTarget.style.visibility = 'hidden'
          }}
          onLoad={(e) => {
            // src 换成有效资源后自愈恢复（onError 的隐藏是命令式样式，
            // React 重渲染不会重置）
            e.currentTarget.style.visibility = 'visible'
          }}
          style={{ width: 34, height: 34, objectFit: 'contain' }}
        />
      )
    },
  }
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
