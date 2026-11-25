import {
  JOURNEY_AI_TIER_MAP,
  JOURNEY_WEAPON_CATEGORY_MAP,
  JOURNEY_ATTACK_KIND_MAP,
  JOURNEY_ELEMENT_MAP,
  JOURNEY_MAP_OBJECT_KIND_MAP,
  JOURNEY_HEAT_KIND_MAP,
  JOURNEY_PICKUP_EFFECT_MAP,
  JOURNEY_DROP_SOURCE_MAP,
  JOURNEY_SLOT_CODE_MAP,
  JOURNEY_BOSS_ABILITY_MAP,
  JOURNEY_MONSTER_PARAM_KEY_MAP,
  JOURNEY_WEAPON_PARAM_KEY_MAP,
} from '../../constants/game'
import {
  journeyRegionService,
  journeyMapObjectService,
  journeyHeatZoneService,
  journeyWaveService,
  journeyMonsterService,
  journeyWeaponService,
  journeyWeaponLevelService,
  journeyEvoRecipeService,
  journeyPickupService,
  journeyDropService,
  journeyCharacterService,
  journeyRelicUnlockService,
  // journeyDailyMapService 已不用：游历地图由 JourneyDailyMapTab 以多选怪物池表单维护
  journeyWeaponParamService,
  journeyMonsterParamService,
  journeyTalentBranchService,
  journeyGlobalsService,
  journeyWeaponSlotService,
  journeyUpgradeCardService,
} from '../../services/gameService'
import type { JourneyFieldDef, JourneyTabSchema } from './journeyTabSchema'
import { characterAuxTabs } from './journeyCharacterAuxTabs'
import { globalsFields } from './journeyGlobalFields'
export { globalsFields }

// 西行（journey）扩展配置表 Tab schema。
// 关卡主体在 GameLevels 创建（game_levels），西行属性在 journey_levels 子表；
// 两者的查看与编辑统一收归「西行管理 → 关卡编排」。
// 角色光环参数与境界名号已拆为独立 Tab（一行一键 / 一行一档）。
// 关卡级三表（波次/热区/参照物）、游历地图与无尽妖潮的入口均在「关卡编排」。
// 字段名与 /workspace/sql journey DDL 列一一对应；枚举选项与 constants/game.ts 同源。
// 分页 Tab 通过 filters 配置筛选项：text 包含匹配、lookup 外键精确、static 枚举精确。

const opts = (
  map: Record<string, { color: string; label: string }>
): { value: string; label: string }[] =>
  Object.entries(map).map(([value, v]) => ({ value, label: v.label }))

const mapOf = (
  map: Record<string, { color: string; label: string }>
) => map

// ---- 区域 ----
const regionFields: JourneyFieldDef[] = [
  { name: 'code', label: '区域编码', type: 'text', required: true, placeholder: '如 wuxingshan' },
  { name: 'name', label: '区域名称', type: 'text', required: true, placeholder: '如 五行山' },
  { name: 'seq', label: '排序', type: 'number', required: true, min: 0 },
  { name: 'theme_color', label: '主题色', type: 'text', placeholder: '#E8C470' },
  { name: 'decoration_key', label: '装饰键', type: 'text', placeholder: '对应装饰资源 key' },
  {
    name: 'boss_code', label: '本段妖王', type: 'select', optionsFrom: 'monsters', width: 180,
    placeholder: '选妖王（App 据此驱动本段妖王战）',
  },
]

// ---- 关卡：已退役（走 GameLevels / journey_levels 子表），见文件头说明 ----

// ---- 地图参照物 ----
const mapObjectFields: JourneyFieldDef[] = [
  { name: 'level_id', label: '所属关卡', type: 'select', optionsFrom: 'levels', required: true, width: 200 },
  {
    name: 'kind', label: '类型', type: 'select', required: true, width: 110,
    options: opts(JOURNEY_MAP_OBJECT_KIND_MAP), enumMap: mapOf(JOURNEY_MAP_OBJECT_KIND_MAP),
  },
  { name: 'x', label: 'X', type: 'number', required: true, width: 80 },
  { name: 'y', label: 'Y', type: 'number', required: true, width: 80 },
  { name: 'radius', label: '半径', type: 'number', required: true, min: 1, width: 90 },
  { name: 'hp', label: '耐久(可破坏)', type: 'number', min: 0, width: 110 },
  { name: 'drop_table_code', label: '掉落表', type: 'text', placeholder: '如 dt_weeds', width: 120 },
]

// ---- 密度热区 ----
const heatZoneFields: JourneyFieldDef[] = [
  { name: 'level_id', label: '所属关卡', type: 'select', optionsFrom: 'levels', required: true, width: 200 },
  {
    name: 'kind', label: '类型', type: 'select', required: true, width: 110,
    options: opts(JOURNEY_HEAT_KIND_MAP), enumMap: mapOf(JOURNEY_HEAT_KIND_MAP),
  },
  { name: 'x', label: 'X', type: 'number', required: true, width: 80 },
  { name: 'y', label: 'Y', type: 'number', required: true, width: 80 },
  { name: 'radius', label: '半径', type: 'number', required: true, min: 1, width: 90 },
  { name: 'density_mult', label: '密度倍数', type: 'number', required: true, step: 0.1, min: 0, width: 100 },
]

// ---- 波次 ----
const waveFields: JourneyFieldDef[] = [
  { name: 'level_id', label: '所属关卡', type: 'select', optionsFrom: 'levels', required: true, width: 200 },
  { name: 'seq', label: '波序', type: 'number', required: true, min: 1, width: 80 },
  { name: 'start_sec', label: '起始(s)', type: 'number', required: true, min: 0, width: 90 },
  { name: 'monster_code', label: '怪种', type: 'select', optionsFrom: 'monsters', width: 160 },
  { name: 'count', label: '数量', type: 'number', required: true, min: 1, width: 80 },
  { name: 'spawn_interval_ms', label: '刷怪间隔(ms)', type: 'number', required: true, min: 50, width: 120 },
  { name: 'buff_mult', label: '增强倍数', type: 'number', step: 0.1, min: 0, width: 100 },
  { name: 'loop', label: '循环层', type: 'switch', width: 90 },
]

// ---- 怪物 ----
const monsterFields: JourneyFieldDef[] = [
  { name: 'code', label: '编码', type: 'text', required: true, width: 140 },
  { name: 'name', label: '名称', type: 'text', required: true, width: 120 },
  {
    name: 'ai_tier', label: 'AI 档', type: 'select', required: true, width: 90,
    options: opts(JOURNEY_AI_TIER_MAP), enumMap: mapOf(JOURNEY_AI_TIER_MAP),
  },
  { name: 'base_hp', label: '基础血量', type: 'number', required: true, min: 1, width: 100 },
  { name: 'base_speed', label: '基础移速', type: 'number', required: true, step: 0.1, min: 0, width: 100 },
  { name: 'contact_damage', label: '接触伤害', type: 'number', required: true, min: 0, width: 100 },
  { name: 'size_scale', label: '体型缩放', type: 'number', step: 0.1, min: 0.1, width: 100 },
  { name: 'exp_drop', label: '经验掉落', type: 'number', min: 0, width: 100 },
  { name: 'merit_drop', label: '功德掉落', type: 'number', min: 0, width: 100 },
  { name: 'drop_table_code', label: '掉落表', type: 'text', width: 150, placeholder: '匹配掉落表 table_code（如 monster_normal_late）' },
  { name: 'behavior', label: '机制行为', type: 'text', placeholder: '如 charge 冲撞', width: 110 },
  {
    name: 'ability_key', label: '妖王能力', type: 'select', width: 200,
    options: opts(JOURNEY_BOSS_ABILITY_MAP), enumMap: mapOf(JOURNEY_BOSS_ABILITY_MAP),
    placeholder: '空=无特殊能力（仅妖王生效）',
  },
  { name: 'sprite_key', label: '资源键', type: 'text', hideInTable: true },
]

// ---- 法宝 ----
const weaponFields: JourneyFieldDef[] = [
  { name: 'code', label: '编码', type: 'text', required: true, width: 130 },
  { name: 'name', label: '名称', type: 'text', required: true, width: 110 },
  {
    name: 'category', label: '分类', type: 'select', required: true, width: 100,
    options: opts(JOURNEY_WEAPON_CATEGORY_MAP), enumMap: mapOf(JOURNEY_WEAPON_CATEGORY_MAP),
  },
  {
    name: 'attack_kind', label: '攻击形态', type: 'select', width: 110,
    options: opts(JOURNEY_ATTACK_KIND_MAP), enumMap: mapOf(JOURNEY_ATTACK_KIND_MAP),
  },
  { name: 'description', label: '描述', type: 'textarea', hideInTable: true },
  { name: 'base_damage', label: '基础伤害', type: 'number', min: 0, width: 95 },
  { name: 'base_interval_ms', label: '攻击间隔(ms)', type: 'number', min: 0, width: 115 },
  { name: 'orbit_speed', label: '环绕转速(rad/s)', type: 'number', step: 0.1, min: 0, width: 140 },
  { name: 'inner_radius', label: '环带内缘(px)', type: 'number', min: 0, width: 125 },
  { name: 'outer_radius', label: '武器臂长(px)', type: 'number', min: 0, width: 125 },
  { name: 'blade_width', label: '扇叶臂宽(px)', type: 'number', min: 0, width: 125 },
  {
    name: 'starter_effect', label: '初始特效槽', type: 'select', width: 120,
    options: opts(JOURNEY_SLOT_CODE_MAP), enumMap: mapOf(JOURNEY_SLOT_CODE_MAP),
  },
  {
    name: 'character_code', label: '归属角色', type: 'select', width: 120,
    optionsFrom: 'characters',
    placeholder: '空=通用；非空=跟随该角色解锁（角色解锁自动入池）',
  },
  { name: 'owner_name', label: '出处', type: 'text', width: 110, placeholder: '非取经角色法宝来源，如 哪吒/太上老君' },
  { name: 'range_px', label: '射程(px)', type: 'number', min: 0, hideInTable: true },
  { name: 'projectile_speed', label: '弹速', type: 'number', min: 0, hideInTable: true },
  { name: 'pierce', label: '穿透数', type: 'number', min: 0, hideInTable: true },
  { name: 'aoe_radius', label: 'AOE 半径', type: 'number', min: 0, hideInTable: true },
  { name: 'heal_fixed', label: '固定回血(已停用)', type: 'number', min: 0, width: 95, hideInTable: true },
  { name: 'attr_key', label: '属性键(被动)', type: 'text', width: 110 },
  { name: 'attr_value', label: '属性值(被动)', type: 'number', step: 0.01, hideInTable: true },
  { name: 'sprite_key', label: '资源键', type: 'text', hideInTable: true },
]

// ---- 每日游历地图（通用 CRUD schema 已不用，保留源码便于恢复）----
// 游历地图由「西行管理 → 关卡编排 → 游历地图」的 JourneyDailyMapTab 维护：
// monster_pool 以多选呈现，字段口径与下表一致。
// const dailyMapFields: JourneyFieldDef[] = [
//   { name: 'code', label: '地图编码', type: 'text', required: true, placeholder: '如 huaguoshan' },
//   { name: 'name', label: '地图名称', type: 'text', required: true, placeholder: '如 花果山' },
//   { name: 'theme_color', label: '主题色', type: 'text', placeholder: '#6FBF9A' },
//   { name: 'milestone_li', label: '里程碑里数', type: 'number', min: 0, width: 110 },
//   { name: 'description', label: '描述', type: 'textarea', hideInTable: true },
//   { name: 'monster_pool', label: '怪物池', type: 'text', hideInTable: true, placeholder: '怪 code 逗号分隔；空=全怪池兜底' },
//   { name: 'sort', label: '排序', type: 'number', min: 0, width: 80 },
//   { name: 'enabled', label: '启用', type: 'switch', width: 80 },
// ]

// ---- 逐怪数值参数（monster_id+code 一行一键，覆盖全部 AI 档位）----
/// 档位筛选项由统一 AI 档映射派生，避免与怪物页档位标签漂移。
const MONSTER_TIER_FILTER_OPTIONS = Object.entries(JOURNEY_AI_TIER_MAP).map(
  ([value, info]) => ({ value, label: info.label }),
)

const monsterParamFields: JourneyFieldDef[] = [
  // monster_id 为 uuid 外键列：下拉必须用 id 值查找表（monsters 表 value=code）
  { name: 'monster_id', label: '怪物', type: 'select', optionsFrom: 'monstersById', required: true, width: 180 },
  {
    name: 'code', label: '参数键', type: 'select', required: true, width: 150,
    options: opts(JOURNEY_MONSTER_PARAM_KEY_MAP), enumMap: mapOf(JOURNEY_MONSTER_PARAM_KEY_MAP),
  },
  { name: 'value_num', label: '数值', type: 'number', required: true, step: 0.01, width: 100 },
]

// ---- 法宝数值参数（被动加持/特效法宝数值后台化：weapon_id+code 一行一键）----
const weaponParamFields: JourneyFieldDef[] = [
  { name: 'weapon_id', label: '法宝', type: 'select', optionsFrom: 'weapons', required: true, width: 180 },
  {
    name: 'code', label: '参数键', type: 'select', required: true, width: 140,
    options: opts(JOURNEY_WEAPON_PARAM_KEY_MAP), enumMap: mapOf(JOURNEY_WEAPON_PARAM_KEY_MAP),
  },
  { name: 'value_num', label: '数值', type: 'number', required: true, min: 0, step: 0.01, width: 100 },
]

// ---- 法宝分级 ----
const weaponLevelFields: JourneyFieldDef[] = [
  { name: 'weapon_id', label: '法宝', type: 'select', optionsFrom: 'weapons', required: true, width: 180 },
  { name: 'lv', label: '等级', type: 'number', required: true, min: 1, max: 8, width: 80 },
  { name: 'damage', label: '伤害', type: 'number', min: 0, width: 90 },
  { name: 'interval_ms', label: '间隔(ms)', type: 'number', min: 0, width: 100 },
  { name: 'proj_count', label: '弹体数', type: 'number', min: 0, width: 90 },
  { name: 'heal_amount', label: '回血量(已停用)', type: 'number', min: 0, width: 90, hideInTable: true },
  { name: 'value_num', label: '数值参数', type: 'number', step: 0.01, hideInTable: true },
]

// ---- 炼化配方 ----
const evoRecipeFields: JourneyFieldDef[] = [
  { name: 'seq', label: '优先级', type: 'number', required: true, min: 1, width: 80 },
  { name: 'weapon_id', label: '主法宝', type: 'select', optionsFrom: 'weapons', required: true, width: 180 },
  { name: 'required_passive_id', label: '前置被动', type: 'select', optionsFrom: 'passiveWeapons', width: 180 },
  { name: 'required_passive_lv', label: '前置被动等级', type: 'number', required: true, min: 1, width: 120 },
  { name: 'result_code', label: '进化编码', type: 'text', required: true, width: 140 },
  { name: 'result_name', label: '进化名称', type: 'text', required: true, width: 140 },
  { name: 'evo_mult', label: '炼化倍率', type: 'number', step: 0.1, min: 0, width: 105, placeholder: '0=内置 1.6' },
]

// ---- 拾取物 ----
const pickupFields: JourneyFieldDef[] = [
  { name: 'code', label: '编码', type: 'text', required: true, width: 130 },
  { name: 'name', label: '名称', type: 'text', required: true, width: 110 },
  {
    name: 'effect', label: '效果', type: 'select', required: true, width: 120,
    options: opts(JOURNEY_PICKUP_EFFECT_MAP), enumMap: mapOf(JOURNEY_PICKUP_EFFECT_MAP),
  },
  { name: 'value', label: '数值', type: 'number', required: true, min: 0, width: 80 },
  { name: 'radius', label: '半径', type: 'number', required: true, min: 1, width: 80 },
  { name: 'magnet_range', label: '磁吸范围', type: 'number', min: 0, width: 100 },
]

// ---- 掉落表 ----
const dropFields: JourneyFieldDef[] = [
  { name: 'table_code', label: '掉落表编码', type: 'text', required: true, width: 150 },
  {
    name: 'source_kind', label: '来源', type: 'select', required: true, width: 110,
    options: opts(JOURNEY_DROP_SOURCE_MAP), enumMap: mapOf(JOURNEY_DROP_SOURCE_MAP),
  },
  { name: 'pickup_code', label: '拾取物', type: 'select', optionsFrom: 'pickups', width: 150 },
  { name: 'weight', label: '权重', type: 'number', required: true, min: 0, width: 80 },
  { name: 'qty_min', label: '最小数量', type: 'number', required: true, min: 0, width: 95 },
  { name: 'qty_max', label: '最大数量', type: 'number', required: true, min: 0, width: 95 },
]

// ---- 角色 ----
const characterFields: JourneyFieldDef[] = [
  { name: 'code', label: '编码', type: 'text', required: true, width: 110 },
  { name: 'name', label: '名称', type: 'text', required: true, width: 100 },
  { name: 'base_hp', label: '基础血量', type: 'number', required: true, min: 1, width: 100 },
  { name: 'base_attack', label: '基础攻击', type: 'number', min: 0, width: 100 },
  { name: 'armor', label: '初始护甲', type: 'number', min: 0, width: 100 },
  { name: 'aura_name', label: '光环名', type: 'text', width: 110 },
  { name: 'aura_desc', label: '光环说明', type: 'textarea', hideInTable: true },
  { name: 'weapon_code', label: '特性法宝', type: 'select', optionsFrom: 'weaponsByCode', width: 150 },
  { name: 'unlock_level_no', label: '解锁关卡号', type: 'number', required: true, min: 1, max: 81, width: 110 },
  { name: 'unlock_merit_cost', label: '解锁功德', type: 'number', required: true, min: 0, width: 100 },
  { name: 'enabled', label: '开放', type: 'switch', width: 80 },
  { name: 'sprite_key', label: '资源键', type: 'text', hideInTable: true },
]

// ---- 五行天赋分支（Admin 可编辑静态配置；v4 分支树制）----
const talentBranchFields: JourneyFieldDef[] = [
  {
    name: 'character_code', label: '归属角色', type: 'select', optionsFrom: 'characters', required: true, width: 110,
    placeholder: '属性树仅对出战角色生效',
  },
  {
    name: 'element', label: '五行', type: 'select', required: true, width: 80,
    options: opts(JOURNEY_ELEMENT_MAP), enumMap: mapOf(JOURNEY_ELEMENT_MAP),
  },
  {
    name: 'branch_type', label: '分支', type: 'select', required: true, width: 90,
    options: [
      { value: 'core', label: '本源枝' },
      { value: 'growth', label: '生息枝' },
      { value: 'sig', label: '化形枝' },
    ],
  },
  { name: 'branch_code', label: '分支编码', type: 'text', required: true, width: 170, placeholder: '如 tang_wood_core' },
  { name: 'seq', label: '排序', type: 'number', required: true, min: 1, width: 80 },
  { name: 'name', label: '名称', type: 'text', required: true, width: 160 },
  { name: 'attr_key', label: '属性键', type: 'text', required: true, width: 120 },
  { name: 'value_per_level', label: '每层数值', type: 'number', required: true, step: 0.01, width: 100 },
  { name: 'max_lv', label: '层数上限', type: 'number', required: true, min: 1, width: 95 },
  { name: 'cost_base', label: '基础功德价', type: 'number', required: true, min: 0, width: 105 },
  { name: 'effect_desc', label: '每层效果说明', type: 'textarea', hideInTable: true },
]

// ---- 图鉴解锁 ----
const relicFields: JourneyFieldDef[] = [
  { name: 'seq', label: '排序', type: 'number', required: true, min: 1, width: 80 },
  { name: 'weapon_id', label: '法宝', type: 'select', optionsFrom: 'weapons', required: true, width: 180 },
  { name: 'achievement_code', label: '前置成就编码', type: 'text', width: 180 },
  { name: 'merit_cost', label: '功德定价', type: 'number', required: true, min: 0, width: 100 },
]


// ---- 武器维度槽 ----
const weaponSlotFields: JourneyFieldDef[] = [
  { name: 'code', label: '维度编码', type: 'text', required: true, width: 130, placeholder: '如 knockback' },
  { name: 'name', label: '维度名称', type: 'text', required: true, width: 100 },
  {
    name: 'kind', label: '类型', type: 'select', required: true, width: 100,
    options: [
      { value: 'attribute', label: '属性' },
      { value: 'effect', label: '特效' },
    ],
  },
  { name: 'effect_per_level', label: '每级效果', type: 'text', required: true, width: 260, placeholder: '如 命中击退距离 +16' },
  { name: 'value_per_level', label: '每级数值', type: 'number', step: 0.01, min: 0, width: 105, placeholder: '0=App 内置兜底' },
  { name: 'period_sec', label: '触发周期(秒)', type: 'number', step: 0.5, min: 0, width: 110, placeholder: '回元/护体等周期槽填；0=回落战斗参数' },
  { name: 'max_level', label: '等级上限', type: 'number', required: true, min: 1, max: 9, width: 100 },
  { name: 'sort_order', label: '排序', type: 'number', min: 0, width: 80 },
]

// ---- 基础值成长卡（三选一五张常驻成长项）----
const upgradeCardFields: JourneyFieldDef[] = [
  {
    name: 'code', label: '卡片编码', type: 'select', required: true, width: 130,
    options: [
      { value: 'attack', label: 'attack（伏魔真力·攻击）' },
      { value: 'move_speed', label: 'move_speed（筋斗云气·移速）' },
      { value: 'max_hp', label: 'max_hp（蟠桃益气·生命）' },
      { value: 'regen', label: 'regen（木灵回春·回复）' },
      { value: 'pickup_range', label: 'pickup_range（紫金磁引·拾取）' },
    ],
  },
  { name: 'name', label: '卡片名称', type: 'text', required: true, width: 120, placeholder: '如 伏魔真力' },
  { name: 'value', label: '每级数值', type: 'number', required: true, step: 0.01, min: 0, width: 105, placeholder: '攻击/生命/拾取填整数点；移速0.09=9%；回复为每秒' },
  { name: 'enabled', label: '入池', type: 'switch', width: 80 },
  { name: 'sort_order', label: '排序', type: 'number', min: 0, width: 80 },
]

// ---- 关卡级配置 schema（波次/密度热区/地图参照物：挂在 GameLevels
//      在西行管理 → 关卡编排 → 关卡细节按 level_id 编辑）----
export const JOURNEY_LEVEL_SCOPED_SCHEMAS: JourneyTabSchema[] = [
  {
    key: 'waves', label: '波次', service: journeyWaveService, fields: waveFields,
    iconPrefix: 'monster', iconField: 'monster_code',
    intro: '按时间轴刷怪：start_sec 起每 spawn_interval_ms 刷 count 只；loop=循环层（持续刷至怪量上限，不消费 count）。增强倍数乘在怪物血/伤/速上。',
  },
  {
    key: 'heat_zones', label: '密度热区', service: journeyHeatZoneService, fields: heatZoneFields,
    intro: '妖穴=高密度高风险高收益，安全谷=低密度；密度倍数作用于该圆域内的波次刷怪密度。',
  },
  {
    key: 'map_objects', label: '地图参照物', service: journeyMapObjectService, fields: mapObjectFields,
    intro: '可破坏物破坏后才可通行并概率掉落；不可破坏物永久阻挡；坐标为关卡世界坐标，碰撞全圆形。',
  },
]

// 无尽妖潮波次不走本页 schema：入口在「西行管理 → 关卡编排 → 无尽妖潮」，
// 复用 JourneyEndlessEditor；游历地图同在「关卡编排 → 游历地图」。
// 原 GameLevels「模式关卡」入口已退役。

export const JOURNEY_TAB_SCHEMAS: JourneyTabSchema[] = [
  {
    key: 'regions', label: '区域', service: journeyRegionService, fields: regionFields,
    filters: [{ field: 'name', kind: 'text', placeholder: '按区域名称筛选' }, { field: 'code', kind: 'text', placeholder: '按区域编码筛选' }],
    intro: '区域=关卡分组（五行山→…→灵山），主题色用于地图覆层与 UI 色调；排序即西行顺序。关卡的区域归属在「西行管理 → 关卡编排 → 关卡属性」维护（存 journey_levels.region_code）。',
  },
  {
    key: 'monsters', label: '怪物', service: journeyMonsterService, fields: monsterFields,
    iconPrefix: 'monster',
    filters: [{ field: 'name', kind: 'text', placeholder: '按怪物名称筛选' }, { field: 'ai_tier', kind: 'static', options: opts(JOURNEY_AI_TIER_MAP), placeholder: '全部 AI 档' }],
    intro: '怪物静态属性；难度主轴=单怪增强（血/伤/体型/技能），同屏量级收敛在 ~200。charge_* 冲撞参数只在妖王路径读取，普通/精英不生效；掉落表编码匹配掉落表页签的 table_code（如 monster_normal_late）。',
  },
  {
    key: 'weapons', label: '法宝', service: journeyWeaponService, fields: weaponFields,
    iconPrefix: 'weapon',
    filters: [{ field: 'name', kind: 'text', placeholder: '按法宝名称筛选' }, { field: 'category', kind: 'static', options: opts(JOURNEY_WEAPON_CATEGORY_MAP), placeholder: '全部分类' }],
    intro: '三分类合一表：主动法宝填攻击形态与伤害；被动加持填 attr_key/attr_value；特效触发类只走三选一。base_damage 与初始环绕参数（转速/内缘/臂长/臂宽/特效槽）在「法宝分级」页签未配置该法宝分级时生效，分级表优先。',
  },
  {
    key: 'weapon_levels', label: '法宝分级', service: journeyWeaponLevelService, fields: weaponLevelFields,
    filter: { field: 'weapon_id', kind: 'lookup', lookup: 'weapons', placeholder: '按法宝筛选' },
    prefillFromFilter: true,
    intro: '法宝 1~8 级数值：damage=环绕/各形态伤害；interval_ms=穿透弹/回旋/光束周期；proj_count=单次弹数；value_num=领域每秒伤害基准。heal_amount/heal_fixed 已停用：紫金葫芦剥离回血，引擎不再消费这两列（保留列、不再生效）。领域脉冲周期/扩散半径、驻留倍率上限在「战斗参数 → 武器与吸血穿刺 → 并行法宝攻击」配置。',
  },
  {
    key: 'evo_recipes', label: '炼化配方', service: journeyEvoRecipeService, fields: evoRecipeFields,
    filters: [{ field: 'result_name', kind: 'text', placeholder: '按进化名称筛选' }, { field: 'result_code', kind: 'text', placeholder: '按进化编码筛选' }],
    intro: '主动法宝满级+指定被动达标→宝箱触发炼化；表顺序=宝箱同时满足多配方时的优先级。',
  },
  {
    key: 'pickups', label: '拾取物', service: journeyPickupService, fields: pickupFields,
    iconPrefix: 'pickup',
    filters: [{ field: 'name', kind: 'text', placeholder: '按拾取物名称筛选' }, { field: 'effect', kind: 'static', options: opts(JOURNEY_PICKUP_EFFECT_MAP), placeholder: '全部效果' }],
    // code 与资源名映射（金币/蟠桃/宝箱资源名与 code 不一致）
    iconNameMap: { gongde_tongqian: 'coin', pantao_pickup: 'peach', baoxiang: 'chest', huxin_dan: 'huxin' },
    intro: '香火=经验；功德铜钱计入日阀；蟠桃=治疗；宝箱触发炼化/额外三选一；护心丹抵扣伤害。',
  },
  {
    key: 'drops', label: '掉落表', service: journeyDropService, fields: dropFields,
    filters: [{ field: 'table_code', kind: 'text', placeholder: '按掉落表编码筛选' }, { field: 'source_kind', kind: 'static', options: opts(JOURNEY_DROP_SOURCE_MAP), placeholder: '全部来源' }],
    intro: '按 table_code 聚组：同组内按权重概率掉落，数量在 qty_min~qty_max 间取值。',
  },
  // 游历地图的入口在「西行管理 → 关卡编排 → 游历地图」，保留本条 schema 便于恢复。
  // {
  //   key: 'daily_maps', label: '游历地图', service: journeyDailyMapService, fields: dailyMapFields,
  //   filters: [{ field: 'name', kind: 'text', placeholder: '按地图名称筛选' }, { field: 'code', kind: 'text', placeholder: '按地图编码筛选' }],
  //   intro: '每日游历地图列表（运营可增删）：App 端每日任选一图进入，进入即计次（主动放弃同样占次）；主题色驱动地图渲染。',
  // },
  {
    key: 'characters', label: '角色', service: journeyCharacterService, fields: characterFields,
    iconPrefix: 'char',
    filters: [{ field: 'name', kind: 'text', placeholder: '按角色名称筛选' }, { field: 'code', kind: 'text', placeholder: '按角色编码筛选' }],
    intro: '解锁=通关对应出场关卡（unlock_level_no）+功德门槛（unlock_merit_cost）；唐僧为初始角色（unlock_level_no=1、功德 0）。非取经扩展角色（哪吒/红孩儿/铁扇公主/太上老君/金角大王）同链路可解锁可游玩，特性法宝跟随角色解锁自动入池；「开放」开关禁用后 App 端角色组/天赋页/出战舞台全部隐藏。',
  },
  // 光环参数 / 境界名号两个 Tab 已抽到 journeyCharacterAuxTabs.ts，在此展开。
  ...characterAuxTabs,
  {
    key: 'talent_branches', label: '五行天赋', service: journeyTalentBranchService, fields: talentBranchFields,
    filter: { field: 'character_code', kind: 'lookup', lookup: 'characters', placeholder: '按角色筛选' },
    prefillFromFilter: true,
    intro: 'v4 分支树制：每角色一棵五行树（5 系 × 3 分支，character_code+element+branch_type 唯一）——本源枝 8 层（核心属性）/ 生息枝 5 层（第二属性）/ 化形枝 3 层（标志强化），共 80 层 + 第 81 点加强点（五系修满后点亮解锁角色特殊能力，效果走 App 端常量）；点亮双消耗 = 1 天赋点 + cost_base×层号 功德；相生 1:1 循环锁（每系第 2 层起需「生我者」系 ≥ 本系点亮后层数）与相克制衡（化形枝需「克我者」系 ≥4 层）在 App 端判定；天赋点全账号共享点池（关卡首通 +1、击败妖王/无尽妖潮妖王波按全局参数 talent_drop_rate 概率掉落）。',
  },
  {
    key: 'relic_unlocks', label: '图鉴解锁', service: journeyRelicUnlockService, fields: relicFields,
    filters: [{ field: 'weapon_id', kind: 'lookup', lookup: 'weapons', placeholder: '按法宝筛选' }, { field: 'achievement_code', kind: 'text', placeholder: '按成就编码筛选' }],
    intro: '强法宝图鉴=对局成就资格（achievement_code，关联 game_achievements.code）+功德定价；未解锁法宝不进三选一候选池。',
  },
  {
    key: 'globals', label: '全局参数', service: journeyGlobalsService, fields: globalsFields,
    intro: '单行参数表（id 恒为 1）：按分组信息卡只读展示，每组独立弹窗编辑，不提供新增与删除；列未填值时 App 回落内置兜底。',
  },
  {
    key: 'weapon_slots', label: '武器维度槽', service: journeyWeaponSlotService, fields: weaponSlotFields,
    iconPrefix: 'icon_slot',
    filters: [{ field: 'name', kind: 'text', placeholder: '按维度名称筛选' }, { field: 'code', kind: 'text', placeholder: '按维度编码筛选' }],
    intro: '6 主动槽=维度槽口径：初始武器占 1 特效槽，空槽由三选一「习得」卡填入新维度；每级效果与等级上限（max_level）后台可调；触发周期(period_sec)仅回元/护体等周期槽填写，0=回落「武器与吸血穿刺」战斗参数。',
  },
  {
    key: 'upgrade_cards', label: '基础值成长卡', service: journeyUpgradeCardService, fields: upgradeCardFields,
    filters: [{ field: 'name', kind: 'text', placeholder: '按卡片名称筛选' }, { field: 'code', kind: 'text', placeholder: '按卡片编码筛选' }],
    intro: '三选一五张常驻基础值成长卡的后台管理：名称/每级数值/是否入池均可配。攻击/生命/拾取填整数点，移速填小数（0.09=9%），回复填每秒值；展示文案由 App 按编码+数值生成，改数值即改文案。入池关闭的卡不进候选；每级数值≤0 视为未配置，回落 App 内置兜底值。抽卡权重只在「三选一·类别权重」配置，本类内均匀随机。',
  },
  {
    key: 'weapon_params', label: '法宝参数', service: journeyWeaponParamService, fields: weaponParamFields,
    filter: { field: 'weapon_id', kind: 'lookup', lookup: 'weapons', placeholder: '按法宝筛选' },
    prefillFromFilter: true,
    intro: '被动加持(passive)/特效(effect)法宝的数值参数（一行一键，code=参数语义键）：App 引擎按法宝+参数键读取，行缺失回落内置默认值。主动法宝(category=active)不读本表——其初始环绕参数在「法宝」页的 orbit_speed/inner_radius/outer_radius/blade_width/base_damage 列，1~8 级成长在「法宝分级」页，升级效果在「武器维度槽」页；本表对其无效，无需补空行。常用键：移速 move/生命 hp/回复 regen/经验 exp/转速 spin/臂长 radius/伤害 damage/磁吸 magnet/回血比例 heal/无敌秒数 invuln/冷却秒数 cooldown（>0 进入冷却制，=0 本局仅一次）/触发周期 period/精英增伤 elite/触发概率 chance/定身秒数 root/反伤比例 thorns/链伤比例 chain/作用范围 range/目标数 targets/触发次数 hits/虚弱秒数 weak/灼烧比例 burn/盾抵反震倍率 reflect_ratio(1.0=100%，与金钟罩维度叠加后钳到 reflect_cap，默认上限 3.0=300%，实际以参数值为准)/盾破震荡半径 burst_radius 与比例 burst_ratio/震荡无视护甲 burst_armor_ignore(1=是)。',
  },
  {
    key: 'monster_params', label: '怪物参数', service: journeyMonsterParamService, fields: monsterParamFields,
    filter: {
      field: 'monster_tier', kind: 'monsterTier', targetField: 'monster_id',
      options: MONSTER_TIER_FILTER_OPTIONS, placeholder: '按怪物档位筛选',
      cascadeField: 'monster_id',
    },
    filters: [{
      field: 'monster_id', kind: 'lookup', lookup: 'monstersById', placeholder: '按怪物筛选',
      tierField: 'monster_tier',
    }],
    prefillFromFilter: true,
    intro: '逐怪数值参数（一行一键，code=参数语义键）：表本身不限定 AI 档位，App 按怪物+参数键读取，行缺失回落内置默认值。armor/move_mult/knock_resist 对普通、精英、妖王均生效；charge_*、skill_gcd 及各能力键只在妖王路径读取，普通/精英行是历史全怪种子、当前不生效。只管理妖王能力数值请用右侧「妖王能力」页。',
  },
]
