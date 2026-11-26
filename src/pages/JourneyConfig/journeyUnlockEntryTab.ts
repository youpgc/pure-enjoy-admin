import {
  JOURNEY_UNLOCK_TARGET_KIND_MAP,
  JOURNEY_UNLOCK_CONDITION_TYPE_MAP,
} from '../../constants/game'
import { journeyUnlockEntryService } from '../../services/gameService'
import type { JourneyFieldDef, JourneyTabSchema } from './journeyTabSchema'

// 西行统一解锁规则 Tab：一处配置、三处复用（维度槽/法宝/被动/能力）。
// 字段名与 journey_unlock_entries DDL 列对应；枚举选项与 constants/game.ts 同源。

const opts = (
  map: Record<string, { color: string; label: string }>
): { value: string; label: string }[] =>
  Object.entries(map).map(([value, v]) => ({ value, label: v.label }))

const mapOf = (
  map: Record<string, { color: string; label: string }>
) => map

// ---- 统一解锁规则：condition_value 按条件类型填编码或数值 ----
const unlockEntryFields: JourneyFieldDef[] = [
  { name: 'code', label: '规则编码', type: 'text', required: true, width: 170, placeholder: '如 slot:execute' },
  {
    name: 'target_kind', label: '目标类型', type: 'select', required: true, width: 120,
    options: opts(JOURNEY_UNLOCK_TARGET_KIND_MAP), enumMap: mapOf(JOURNEY_UNLOCK_TARGET_KIND_MAP),
  },
  { name: 'target_code', label: '目标编码', type: 'text', required: true, width: 150, placeholder: '与维度槽/法宝 code 一致' },
  {
    name: 'condition_type', label: '条件类型', type: 'select', required: true, width: 130,
    options: opts(JOURNEY_UNLOCK_CONDITION_TYPE_MAP), enumMap: mapOf(JOURNEY_UNLOCK_CONDITION_TYPE_MAP),
  },
  { name: 'condition_value', label: '条件值', type: 'text', width: 190, placeholder: '成就码/妖王码/数值；纯直购留空' },
  { name: 'merit_cost', label: '功德定价', type: 'number', required: true, min: 0, width: 100 },
  { name: 'enabled', label: '启用', type: 'switch', width: 80, defaultValue: true },
  { name: 'remark', label: '备注', type: 'text', width: 180 },
]

export const unlockEntryTabs: JourneyTabSchema[] = [
  {
    key: 'unlock_entries', label: '解锁规则', service: journeyUnlockEntryService, fields: unlockEntryFields,
    filters: [
      { field: 'target_kind', kind: 'static', options: opts(JOURNEY_UNLOCK_TARGET_KIND_MAP), placeholder: '按目标类型筛选' },
      { field: 'target_code', kind: 'text', placeholder: '按目标编码筛选' },
    ],
    intro: '一处配置、三处复用：维度槽/法宝/被动的目标编码 + 前置条件 + 功德定价。condition_value 在成就类填 game_achievements.code、伏诛妖王类填 monster code、数值类填正整数，纯直购留空；数值配错时条件不成立，功德定价不可为负。无规则的目标不设门控；妖王能力只登记不参与玩家门控。本页规则优先于「基础数据 → 图鉴解锁」的旧口径，同一目标两处都配时以本页为准。扣功德与流水由 App 侧统一服务完成。',
  },
]
