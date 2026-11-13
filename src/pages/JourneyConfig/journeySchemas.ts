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
  journeyDailyMapService,
  journeyWeaponParamService,
  journeyMonsterParamService,
  journeyTalentBranchService,
  journeyGlobalsService,
  journeyWeaponSlotService,
} from '../../services/gameService'
import type { JourneyFieldDef, JourneyTabSchema } from './journeyTabSchema'

// 西行（journey）扩展配置表 Tab schema。
// 关卡不在本页：81 难统一走 GameLevels（game_levels.config jsonb 存西行属性）；
// 扩展配置表按类型分 Tab 维护（关卡级三表：波次/热区/参照物在 GameLevels
// 关卡配置抽屉；无尽妖潮波次与游历地图在 GameLevels「模式关卡」区编辑）。
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
  { name: 'heal_fixed', label: '固定回血', type: 'number', min: 0, width: 95 },
  { name: 'attr_key', label: '属性键(被动)', type: 'text', width: 110 },
  { name: 'attr_value', label: '属性值(被动)', type: 'number', step: 0.01, hideInTable: true },
  { name: 'sprite_key', label: '资源键', type: 'text', hideInTable: true },
]

// ---- 每日游历地图 ----
const dailyMapFields: JourneyFieldDef[] = [
  { name: 'code', label: '地图编码', type: 'text', required: true, placeholder: '如 huaguoshan' },
  { name: 'name', label: '地图名称', type: 'text', required: true, placeholder: '如 花果山' },
  { name: 'theme_color', label: '主题色', type: 'text', placeholder: '#6FBF9A' },
  { name: 'milestone_li', label: '里程碑里数', type: 'number', min: 0, width: 110 },
  { name: 'duration_target_sec', label: '功成时长(秒)', type: 'number', min: 0, width: 120 },
  { name: 'description', label: '描述', type: 'textarea', hideInTable: true },
  { name: 'monster_pool', label: '怪物池', type: 'text', hideInTable: true, placeholder: '怪 code 逗号分隔；空=全怪池兜底（关卡列表「游历」行可用多选编辑）' },
  { name: 'sort', label: '排序', type: 'number', min: 0, width: 80 },
  { name: 'enabled', label: '启用', type: 'switch', width: 80 },
]

// ---- 妖王能力参数（妖王数值后台化：monster_id+code 一行一键）----
const monsterParamFields: JourneyFieldDef[] = [
  // monster_id 为 uuid 外键列：下拉必须用 id 值查找表（monsters 表 value=code）
  { name: 'monster_id', label: '妖王', type: 'select', optionsFrom: 'monstersById', required: true, width: 180 },
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
  { name: 'value_num', label: '数值', type: 'number', required: true, step: 0.01, width: 100 },
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
  { name: 'aura_name', label: '光环名', type: 'text', width: 110 },
  { name: 'aura_key', label: '光环键', type: 'text', width: 110 },
  { name: 'aura_value', label: '光环数值', type: 'number', step: 0.01, width: 100 },
  { name: 'aura_desc', label: '光环说明', type: 'textarea', hideInTable: true },
  { name: 'weapon_code', label: '特性法宝', type: 'select', optionsFrom: 'weapons', width: 150 },
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

// ---- 全局参数（单行表）----
export const globalsFields: JourneyFieldDef[] = [
  { name: 'code', label: '参数编码', type: 'text', required: true, width: 130, placeholder: 'globals' },
  { name: 'monster_cap', label: '同屏怪上限', type: 'number', required: true, min: 10, max: 500, width: 110 },
  { name: 'talent_drop_rate', label: '妖王天赋点掉率', type: 'number', step: 0.01, min: 0, max: 1, width: 130 },
  { name: 'char_level_cap', label: '角色等级上限', type: 'number', min: 10, max: 999, width: 115 },
  { name: 'revive_merit_base', label: '还魂功德基准', type: 'number', min: 0, width: 140 },
  { name: 'merit_cap', label: '每日游历功德局内上限', type: 'number', min: 0, max: 999999, width: 150 },
  { name: 'initial_pack_size', label: '开局铺场怪物数', type: 'number', min: 0, max: 200, width: 150 },
  { name: 'spawn_den_ratio', label: '妖穴集中刷怪概率', type: 'number', step: 0.01, min: 0, max: 1, width: 150 },
  { name: 'upgrade_move', label: '成长卡·移速加成', type: 'number', step: 0.01, min: 0, width: 150 },
  { name: 'upgrade_hp', label: '成长卡·生命上限', type: 'number', min: 0, width: 150 },
  { name: 'upgrade_regen', label: '成长卡·回复/秒', type: 'number', step: 0.1, min: 0, width: 140 },
  { name: 'upgrade_pickup', label: '成长卡·拾取范围', type: 'number', min: 0, width: 150 },
  { name: 'exp_base', label: '经验曲线基数', type: 'number', min: 0, width: 120 },
  { name: 'exp_per_lv', label: '经验曲线每级增量', type: 'number', min: 0, width: 150 },
  { name: 'boss_spawn_delay_sec', label: '妖王降临延迟（秒）', type: 'number', min: 0, max: 3600, width: 160 },
  { name: 'early_game_protect_sec', label: '前期发育保护（秒）', type: 'number', min: 0, max: 3600, width: 160 },
  { name: 'elite_rate_per_min', label: '精英率每分钟增量', type: 'number', step: 0.01, min: 0, max: 1, width: 160 },
  { name: 'buff_time_slope', label: '强度每分钟增长斜率', type: 'number', step: 0.01, min: 0, max: 5, width: 160 },
  { name: 'buff_level_mult', label: '每点难度乘区增量', type: 'number', step: 0.01, min: 0, max: 1, width: 160 },
  { name: 'buff_mult_cap', label: '强度乘区上限', type: 'number', step: 0.1, min: 1, max: 100, width: 140 },
  { name: 'monster_speed_cap', label: '怪物移速上限（px/s）', type: 'number', step: 1, min: 0, max: 1000, width: 175 },
  { name: 'level_attack_per_lv', label: '等级成长·基础攻击', type: 'number', step: 1, min: 0, max: 500, width: 175 },
  { name: 'level_hp_per_lv', label: '等级成长·生命上限', type: 'number', step: 1, min: 0, max: 500, width: 175 },
  { name: 'upgrade_attack', label: '成长卡·攻击力提升', type: 'number', step: 1, min: 0, max: 1000, width: 175 },
  { name: 'attack_upgrade_cap', label: '攻击卡累计上限', type: 'number', step: 10, min: 0, max: 10000, width: 175 },
  { name: 'boss_hp_time_k', label: '妖王血量时间系数', type: 'number', step: 0.01, min: 0, max: 2, width: 175 },
  { name: 'boss_damage_lv_k', label: '妖王伤害等级系数', type: 'number', step: 0.01, min: 0, max: 2, width: 160 },
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
  { name: 'max_level', label: '等级上限', type: 'number', required: true, min: 1, max: 9, width: 100 },
  { name: 'sort_order', label: '排序', type: 'number', min: 0, width: 80 },
]

// ---- 关卡级配置 schema（波次/密度热区/地图参照物：挂在 GameLevels
//      关卡配置抽屉按 level_id 编辑，西行配置页只做基础数据）----
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

// 无尽妖潮波次不再走本页 schema：入口收编进 GameLevels「模式关卡」区
// ——「无尽妖潮」关卡行 → 配置弹窗（JourneyEndlessModal 逐波折叠、
// 行内控件即时保存）；游历地图同口径（JourneyDailyMapModal）。

export const JOURNEY_TAB_SCHEMAS: JourneyTabSchema[] = [
  {
    key: 'regions', label: '区域', service: journeyRegionService, fields: regionFields,
    intro: '区域=关卡分组（五行山→…→灵山），主题色用于地图覆层与 UI 色调；排序即西行顺序。关卡的区域归属在 GameLevels 关卡表单选择（存 game_levels.config.region_code）。',
  },
  {
    key: 'monsters', label: '怪物', service: journeyMonsterService, fields: monsterFields,
    iconPrefix: 'monster',
    intro: '怪物静态属性；难度主轴=单怪增强（血/伤/体型/技能），同屏量级收敛在 ~200。机制行为如 charge=精英冲撞；掉落表编码匹配掉落表页签的 table_code（如 monster_normal_late）。',
  },
  {
    key: 'weapons', label: '法宝', service: journeyWeaponService, fields: weaponFields,
    iconPrefix: 'weapon',
    intro: '三分类合一表：主动法宝填攻击形态与伤害；被动加持填 attr_key/attr_value；特效触发类只走三选一。base_damage 与初始环绕参数（转速/内缘/臂长/臂宽/特效槽）在「法宝分级」页签未配置该法宝分级时生效，分级表优先。',
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
    iconPrefix: 'pickup',
    // code 与资源名映射（金币/蟠桃/宝箱资源名与 code 不一致）
    iconNameMap: { gongde_tongqian: 'coin', pantao_pickup: 'peach', baoxiang: 'chest' },
    intro: '香火=经验；功德铜钱计入日阀；蟠桃=治疗；宝箱触发炼化/额外三选一。',
  },
  {
    key: 'drops', label: '掉落表', service: journeyDropService, fields: dropFields,
    filter: { field: 'table_code', kind: 'text', placeholder: '按掉落表编码筛选' },
    intro: '按 table_code 聚组：同组内按权重概率掉落，数量在 qty_min~qty_max 间取值。',
  },
  {
    key: 'daily_maps', label: '游历地图', service: journeyDailyMapService, fields: dailyMapFields,
    intro: '每日游历地图列表（运营可增删）：App 端每日任选一图进入，进入即计次（主动放弃同样占次）；主题色驱动地图渲染，功成时长为坚持目标（秒）。',
  },
  {
    key: 'characters', label: '角色', service: journeyCharacterService, fields: characterFields,
    iconPrefix: 'char',
    intro: '解锁=通关对应出场关卡（unlock_level_no）+功德门槛（unlock_merit_cost）；唐僧为初始角色（unlock_level_no=1、功德 0）。非取经扩展角色（哪吒/红孩儿/铁扇公主/太上老君/金角大王）同链路可解锁可游玩，特性法宝跟随角色解锁自动入池；「开放」开关禁用后 App 端角色组/天赋页/出战舞台全部隐藏。',
  },
  {
    key: 'talent_branches', label: '五行天赋', service: journeyTalentBranchService, fields: talentBranchFields,
    filter: { field: 'character_code', kind: 'lookup', lookup: 'characters', placeholder: '按角色筛选' },
    prefillFromFilter: true,
    intro: 'v4 分支树制：每角色一棵五行树（5 系 × 3 分支，character_code+element+branch_type 唯一）——本源枝 8 层（核心属性）/ 生息枝 5 层（第二属性）/ 化形枝 3 层（标志强化），共 80 层 + 第 81 点加强点（五系修满后点亮解锁角色特殊能力，效果走 App 端常量）；点亮双消耗 = 1 天赋点 + cost_base×层号 功德；相生 1:1 循环锁（每系第 2 层起需「生我者」系 ≥ 本系点亮后层数）与相克制衡（化形枝需「克我者」系 ≥4 层）在 App 端判定；天赋点全账号共享点池（关卡首通 +1、击败妖王/无尽妖潮妖王波按全局参数 talent_drop_rate 概率掉落）。',
  },
  {
    key: 'relic_unlocks', label: '图鉴解锁', service: journeyRelicUnlockService, fields: relicFields,
    intro: '强法宝图鉴=对局成就资格（achievement_code，关联 game_achievements.code）+功德定价；未解锁法宝不进三选一候选池。',
  },
  {
    key: 'globals', label: '全局参数', service: journeyGlobalsService, fields: globalsFields,
    intro: '单行参数表（id 恒为 1）：按分组信息卡只读展示，每组独立弹窗编辑，不提供新增与删除；列未填值时 App 回落内置兜底。',
  },
  {
    key: 'weapon_slots', label: '武器维度槽', service: journeyWeaponSlotService, fields: weaponSlotFields,
    iconPrefix: 'icon_slot',
    intro: '6 主动槽=维度槽口径：初始武器占 1 特效槽，空槽由三选一「习得」卡填入新维度；每级效果与等级上限（max_level）后台可调。',
  },
  {
    key: 'weapon_params', label: '法宝参数', service: journeyWeaponParamService, fields: weaponParamFields,
    filter: { field: 'weapon_id', kind: 'lookup', lookup: 'weapons', placeholder: '按法宝筛选' },
    prefillFromFilter: true,
    intro: '被动加持/特效法宝的数值参数（一行一键，code=参数语义键）：App 引擎按法宝+参数键读取，行缺失回落内置默认值。常用键：移速 move/生命 hp/回复 regen/经验 exp/转速 spin/臂长 radius/伤害 damage/磁吸 magnet/回血比例 heal/无敌秒数 invuln/触发周期 period/精英增伤 elite/触发概率 chance/定身秒数 root/反伤比例 thorns/链伤比例 chain/作用范围 range/目标数 targets/触发次数 hits/虚弱秒数 weak/灼烧比例 burn。',
  },
  {
    key: 'monster_params', label: '妖王参数', service: journeyMonsterParamService, fields: monsterParamFields,
    filter: { field: 'monster_id', kind: 'lookup', lookup: 'monstersById', placeholder: '按怪物筛选' },
    prefillFromFilter: true,
    intro: '妖王能力数值参数（一行一键，code=参数语义键）：App 引擎按怪物+参数键读取，行缺失回落内置默认值。常用键：抗击退 knock_resist/附加护甲 armor/移速倍率 move_mult/冲撞冷却 charge_cd/阵风周期 wind_period/吹离距离 wind_push/火圈周期 fire_period/火圈半径 fire_range/火圈伤害比例 fire_ratio/摄魂周期 pull_period/拉拽距离 pull_dist/狂暴增幅 frenzy_mult/狂暴触发线 frenzy_hp/定身秒数 web_root/禁疗秒数 poison_block。',
  },
]
