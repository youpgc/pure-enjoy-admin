import { JOURNEY_AURA_PARAM_KEY_MAP, JOURNEY_REALM_TIER_LABELS } from '../../constants/game'
import {
  journeyCharacterAuraParamService,
  journeyRealmTitleService,
} from '../../services/gameService'
import type { JourneyFieldDef, JourneyTabSchema } from './journeyTabSchema'

// 西行角色辅助配置 Tab：光环参数（一行一键）与境界名号（一行一档）。
// 字段名与 journey_character_aura_params / journey_realm_titles DDL 列对应。

const opts = (
  map: Record<string, { color: string; label: string }>
): { value: string; label: string }[] =>
  Object.entries(map).map(([value, v]) => ({ value, label: v.label }))

/// integer 列下拉：value 用数字，保证写库类型正确与编辑回显严格匹配
const numOpts = (
  map: Record<string, { color: string; label: string }>
): { value: number; label: string }[] =>
  Object.entries(map).map(([value, v]) => ({ value: Number(value), label: v.label }))

const mapOf = (
  map: Record<string, { color: string; label: string }>
) => map

// ---- 角色光环参数（journey_character_aura_params，一行一键）----
const characterAuraParamFields: JourneyFieldDef[] = [
  {
    name: 'character_code', label: '角色', type: 'select', optionsFrom: 'characters',
    required: true, width: 130,
  },
  {
    name: 'code', label: '参数键', type: 'select', required: true, width: 160,
    options: opts(JOURNEY_AURA_PARAM_KEY_MAP), enumMap: mapOf(JOURNEY_AURA_PARAM_KEY_MAP),
  },
  { name: 'value_num', label: '数值', type: 'number', required: true, step: 0.01, width: 110 },
]

// ---- 角色境界名号（journey_realm_titles，一行一档 tier 0~8）----
const realmTitleFields: JourneyFieldDef[] = [
  {
    name: 'character_code', label: '角色', type: 'select', optionsFrom: 'characters',
    required: true, width: 130,
  },
  // tier 在 DDL 为 integer：下拉 value 用数字（0~8），label 显示「第1档~第9档」，
  // 与表格 enumMap 的展示口径统一；数字 value 保证写库类型正确与回显严格匹配。
  {
    name: 'tier', label: '档位', type: 'select', required: true, width: 130,
    options: numOpts(JOURNEY_REALM_TIER_LABELS),
    enumMap: mapOf(JOURNEY_REALM_TIER_LABELS),
  },
  { name: 'title', label: '名号', type: 'text', required: true, width: 180, placeholder: '如 灵明石猴 / 斗战胜佛' },
]

export const characterAuxTabs: JourneyTabSchema[] = [
  {
    key: 'character_aura_params', label: '光环参数', service: journeyCharacterAuraParamService,
    fields: characterAuraParamFields,
    filter: { field: 'character_code', kind: 'lookup', lookup: 'characters', placeholder: '按角色筛选' },
    prefillFromFilter: true,
    intro: '角色光环数值（一行一键，code=参数语义键）：每角色按需配置，行缺失由 App 回落内置兜底。常用键：生命回复 regen/触发击杀数 kill_count/增益持续 duration/触发概率 proc_rate/增益秒数 buff_sec/转速 spin_amp/拾取 pickup/经验 exp_amp/护甲 armor/伤害 damage_amp/暴击伤害 crit_damage/移速 move_amp。',
  },
  {
    key: 'realm_titles', label: '境界名号', service: journeyRealmTitleService,
    fields: realmTitleFields,
    filter: { field: 'character_code', kind: 'lookup', lookup: 'characters', placeholder: '按角色筛选' },
    prefillFromFilter: true,
    intro: '角色境界名号（一行一档，tier 0~8 索引=档位）：每角色 9 档修行路径，第 9 档为原著正果名号；按角色+档位唯一，缺档由 App 回落内置按角色名号表。',
  },
]
