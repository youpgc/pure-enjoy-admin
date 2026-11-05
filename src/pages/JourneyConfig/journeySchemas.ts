import {
  JOURNEY_AI_TIER_MAP,
  JOURNEY_WEAPON_CATEGORY_MAP,
  JOURNEY_ATTACK_KIND_MAP,
  JOURNEY_ELEMENT_MAP,
  JOURNEY_MAP_OBJECT_KIND_MAP,
  JOURNEY_HEAT_KIND_MAP,
  JOURNEY_PICKUP_EFFECT_MAP,
  JOURNEY_DROP_SOURCE_MAP,
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
  journeyTalentService,
  journeyRelicUnlockService,
  journeyGlobalsService,
  journeyWeaponSlotService,
} from '../../services/gameService'
import type { JourneyFieldDef, JourneyTabSchema } from './journeyTabSchema'

// 西行（journey）扩展配置表 Tab schema。
// 关卡不在本页：81 难统一走 GameLevels（game_levels.config jsonb 存西行属性）；
// 区域/怪物/法宝/天赋等 14 张扩展表在此维护。
// 字段名与 /workspace/sql journey DDL 列一一对应；枚举选项与 constants/game.ts 同源。

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

// ---- 关卡：已退役（走 GameLevels / game_levels.config jsonb），见文件头说明 ----

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
  { name: 'drop_table_code', label: '掉落表', type: 'text', width: 120 },
  { name: 'behavior', label: '机制行为', type: 'text', placeholder: '如 charge 冲撞', width: 110 },
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
  { name: 'range_px', label: '射程(px)', type: 'number', min: 0, hideInTable: true },
  { name: 'projectile_speed', label: '弹速', type: 'number', min: 0, hideInTable: true },
  { name: 'pierce', label: '穿透数', type: 'number', min: 0, hideInTable: true },
  { name: 'aoe_radius', label: 'AOE 半径', type: 'number', min: 0, hideInTable: true },
  { name: 'heal_fixed', label: '固定回血', type: 'number', min: 0, width: 95 },
  { name: 'attr_key', label: '属性键(被动)', type: 'text', width: 110 },
  { name: 'attr_value', label: '属性值(被动)', type: 'number', step: 0.01, hideInTable: true },
  { name: 'sprite_key', label: '资源键', type: 'text', hideInTable: true },
]

// ---- 法宝分级 ----
const weaponLevelFields: JourneyFieldDef[] = [
  { name: 'weapon_id', label: '法宝', type: 'select', optionsFrom: 'weapons', required: true, width: 180 },
  { name: 'lv', label: '等级', type: 'number', required: true, min: 1, max: 8, width: 80 },
  { name: 'damage', label: '伤害', type: 'number', min: 0, width: 90 },
  { name: 'interval_ms', label: '间隔(ms)', type: 'number', min: 0, width: 100 },
  { name: 'proj_count', label: '弹体数', type: 'number', min: 0, width: 90 },
  { name: 'heal_amount', label: '回血量', type: 'number', min: 0, width: 90 },
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
  { name: 'aura_name', label: '光环名', type: 'text', width: 110 },
  { name: 'aura_key', label: '光环键', type: 'text', width: 110 },
  { name: 'aura_value', label: '光环数值', type: 'number', step: 0.01, width: 100 },
  { name: 'aura_desc', label: '光环说明', type: 'textarea', hideInTable: true },
  { name: 'weapon_code', label: '特性法宝', type: 'select', optionsFrom: 'weapons', width: 150 },
  { name: 'unlock_level_no', label: '解锁关卡号', type: 'number', required: true, min: 1, max: 81, width: 110 },
  { name: 'unlock_merit_cost', label: '解锁功德', type: 'number', required: true, min: 0, width: 100 },
  { name: 'sprite_key', label: '资源键', type: 'text', hideInTable: true },
]

// ---- 天赋 ----
const talentFields: JourneyFieldDef[] = [
  { name: 'seq', label: '层号(1~17)', type: 'number', required: true, min: 1, max: 17, width: 100 },
  {
    name: 'element', label: '五行', type: 'select', required: true, width: 80,
    options: opts(JOURNEY_ELEMENT_MAP), enumMap: mapOf(JOURNEY_ELEMENT_MAP),
  },
  { name: 'name', label: '名称', type: 'text', required: true, width: 160 },
  { name: 'attr_key', label: '属性键', type: 'text', required: true, width: 120 },
  { name: 'value_per_level', label: '每级数值', type: 'number', required: true, step: 0.01, width: 100 },
  { name: 'is_signature', label: '标志层', type: 'switch', width: 90 },
  { name: 'signature_desc', label: '标志特征说明', type: 'textarea', hideInTable: true },
]

// ---- 图鉴解锁 ----
const relicFields: JourneyFieldDef[] = [
  { name: 'seq', label: '排序', type: 'number', required: true, min: 1, width: 80 },
  { name: 'weapon_id', label: '法宝', type: 'select', optionsFrom: 'weapons', required: true, width: 180 },
  { name: 'achievement_code', label: '前置成就编码', type: 'text', width: 180 },
  { name: 'merit_cost', label: '功德定价', type: 'number', required: true, min: 0, width: 100 },
]

// ---- 全局参数（单行表）----
const globalsFields: JourneyFieldDef[] = [
  { name: 'code', label: '参数编码', type: 'text', required: true, width: 130, placeholder: 'globals' },
  { name: 'monster_cap', label: '同屏怪上限', type: 'number', required: true, min: 10, max: 500, width: 110 },
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
  { name: 'max_level', label: '等级上限', type: 'number', required: true, min: 1, max: 9, width: 100 },
  { name: 'sort_order', label: '排序', type: 'number', min: 0, width: 80 },
]

export const JOURNEY_TAB_SCHEMAS: JourneyTabSchema[] = [
  {
    key: 'regions', label: '区域', service: journeyRegionService, fields: regionFields,
    intro: '区域=关卡分组（五行山→…→灵山），主题色用于地图覆层与 UI 色调；排序即西行顺序。关卡的区域归属在 GameLevels 关卡表单选择（存 game_levels.config.region_code）。',
  },
  {
    key: 'map_objects', label: '地图参照物', service: journeyMapObjectService, fields: mapObjectFields,
    filter: { field: 'level_id', kind: 'lookup', lookup: 'levels', placeholder: '按关卡筛选' },
    prefillFromFilter: true,
    intro: '可破坏物破坏后才可通行并概率掉落；不可破坏物永久阻挡；坐标为关卡世界坐标，碰撞全圆形。',
  },
  {
    key: 'heat_zones', label: '密度热区', service: journeyHeatZoneService, fields: heatZoneFields,
    filter: { field: 'level_id', kind: 'lookup', lookup: 'levels', placeholder: '按关卡筛选' },
    prefillFromFilter: true,
    intro: '妖穴=高密度高风险高收益，安全谷=低密度；密度倍数作用于该圆域内的波次刷怪密度。',
  },
  {
    key: 'waves', label: '波次', service: journeyWaveService, fields: waveFields,
    filter: { field: 'level_id', kind: 'lookup', lookup: 'levels', placeholder: '按关卡筛选' },
    prefillFromFilter: true,
    intro: '按时间轴刷怪：start_sec 起每 spawn_interval_ms 刷 count 只；增强倍数乘在怪物血/伤/速上。',
  },
  {
    key: 'monsters', label: '怪物', service: journeyMonsterService, fields: monsterFields,
    intro: '怪物静态属性；难度主轴=单怪增强（血/伤/体型/技能），同屏量级收敛在 ~200。机制行为如 charge=精英冲撞。',
  },
  {
    key: 'weapons', label: '法宝', service: journeyWeaponService, fields: weaponFields,
    intro: '三分类合一表：主动法宝填攻击形态与伤害；被动加持填 attr_key/attr_value；特效触发类只走三选一。',
  },
  {
    key: 'weapon_levels', label: '法宝分级', service: journeyWeaponLevelService, fields: weaponLevelFields,
    filter: { field: 'weapon_id', kind: 'lookup', lookup: 'weapons', placeholder: '按法宝筛选' },
    prefillFromFilter: true,
    intro: '法宝 1~8 级数值；佛光弹 heal_amount 随级增长（命中固定回血）。',
  },
  {
    key: 'evo_recipes', label: '炼化配方', service: journeyEvoRecipeService, fields: evoRecipeFields,
    intro: '主动法宝满级+指定被动达标→宝箱触发炼化；表顺序=宝箱同时满足多配方时的优先级。',
  },
  {
    key: 'pickups', label: '拾取物', service: journeyPickupService, fields: pickupFields,
    intro: '香火=经验；功德铜钱计入日阀；蟠桃=治疗；宝箱触发炼化/额外三选一。',
  },
  {
    key: 'drops', label: '掉落表', service: journeyDropService, fields: dropFields,
    filter: { field: 'table_code', kind: 'text', placeholder: '按掉落表编码筛选' },
    intro: '按 table_code 聚组：同组内按权重概率掉落，数量在 qty_min~qty_max 间取值。',
  },
  {
    key: 'characters', label: '角色', service: journeyCharacterService, fields: characterFields,
    intro: '解锁=通关对应出场关卡（unlock_level_no）+功德门槛（unlock_merit_cost）；唐僧为初始角色（unlock_level_no=1、功德 0）。',
  },
  {
    key: 'talents', label: '五行天赋', service: journeyTalentService, fields: talentFields,
    filter: {
      field: 'element', kind: 'static', placeholder: '按五行筛选',
      options: opts(JOURNEY_ELEMENT_MAP),
    },
    intro: '5 系×(16 常规+1 标志层)=85 行；天赋点总量 81（每难首通+1）强制取舍；相生前置在 App 端判定。',
  },
  {
    key: 'relic_unlocks', label: '图鉴解锁', service: journeyRelicUnlockService, fields: relicFields,
    intro: '强法宝图鉴=对局成就资格（achievement_code，关联 game_achievements.code）+功德定价；未解锁法宝不进三选一候选池。',
  },
  {
    key: 'globals', label: '全局参数', service: journeyGlobalsService, fields: globalsFields,
    intro: '单行参数表（id 恒为 1）：同屏怪上限等运营参数，App 端拉取兜底 120。勿删除该行、勿新增第二行（id 唯一约束）。',
  },
  {
    key: 'weapon_slots', label: '武器维度槽', service: journeyWeaponSlotService, fields: weaponSlotFields,
    intro: '6 主动槽=维度槽口径：初始武器占 1 特效槽，空槽由三选一「习得」卡填入新维度；每级效果与等级上限（max_level）后台可调。',
  },
]
