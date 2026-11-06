// ==================== 游戏中心（games 模块）枚举/字典单一源 ====================
// ⚠️ 本文件是游戏相关枚举/展示映射的权威来源，页面与 service 一律从此导入，禁止硬编码。
//   取值必须与 D:/workspace/sql/feature_create_games.sql 的 CHECK 约束、种子数据保持一致。
//   三端（App / Admin / Supabase）新增或修改枚举时须同步修改。

// 渲染引擎（games.engine）：纯 Widget / Flame
export const GAME_ENGINE_MAP: Record<string, { color: string; label: string }> = {
  widget: { color: 'blue', label: '纯 Widget' },
  flame: { color: 'volcano', label: 'Flame' },
}

// 成绩状态（game_scores.status）；未通关区分语义：放弃=灰 / 挑战失败=红（2026-09-10）
export const GAME_STATUS_MAP: Record<string, { color: string; label: string }> = {
  cleared: { color: 'green', label: '通关' },
  failed: { color: 'red', label: '挑战失败' },
  aborted: { color: 'default', label: '放弃' },
}

// 维度值类型（game_dimensions.value_type）
export const GAME_DIMENSION_VALUE_TYPE_MAP: Record<string, { color: string; label: string }> = {
  int: { color: 'blue', label: '整数' },
  duration_ms: { color: 'cyan', label: '毫秒' },
}

// 最佳成绩聚合方式（game_dimensions.aggregate）：决定「越大越好 / 越小越好」等口径
export const GAME_DIMENSION_AGGREGATE_MAP: Record<string, { color: string; label: string }> = {
  max: { color: 'green', label: '越大越好' },
  min: { color: 'orange', label: '越小越好' },
  sum: { color: 'blue', label: '累计' },
  latest: { color: 'purple', label: '最近一次' },
}

// 消消乐玩法模式（game_levels.config.mode / game_items.mode）
//   与 App 端 lib/features/games/models/match3_mode.dart 的 Match3Mode 枚举严格对齐。
//   ⚠️ v2 统一模型（配置驱动，非硬编码）：game_levels 以 mode_id + level_no(1..N) 存储，
//      关卡数由后台 game_levels 实际行数决定（每模式默认 100 关，共 12 模式 / 1200 关，
//      见 unify_game_module_modes.sql / feature_reseed_*）。App 端全局关序由
//      game_reward_service._match3GlobalLevelIndex 按 modes/levels 实际关数累加推导，
//      不再依赖「level_no = 模式序号×100 + 关序」旧编码。新增关卡只需填正确 mode_id + level_no。
export const MATCH3_MODE_MAP: Record<string, { color: string; label: string; order: number }> = {
  score: { color: 'orange', label: '计分模式', order: 1 },
  clear: { color: 'purple', label: '消除模式', order: 2 },
  collect: { color: 'green', label: '收集模式', order: 3 },
  obstacle: { color: 'blue', label: '破冰模式', order: 4 },
  timed: { color: 'red', label: '限时模式', order: 5 },
  // antd 无棕色预设（App 端 Boss 为 0xFF8D6E63 棕色），取视觉最接近的 volcano，
  // 避免写 'brown' 被当成自定义 CSS 色渲染出实心底、与其余浅底标签样式不一致。
  boss: { color: 'volcano', label: 'Boss 模式', order: 6 },
}

// 每个 match3 模式的默认关卡容量（v2 = 100，由后台 game_levels 实际行数驱动；
// 仅作文档/兜底常量，代码不再硬编码此值）。
export const MATCH3_LEVELS_PER_MODE = 100

// 下拉选项：首项「通用」表示适用于该游戏全部模式（game_items.mode 留空）
export const MATCH3_MODE_OPTIONS_WITH_ANY = [
  { value: '', label: '通用（该游戏全部模式）' },
  ...Object.entries(MATCH3_MODE_MAP).map(([value, v]) => ({ value, label: v.label })),
]

// 积分奖励规则类型（game_reward_rules.rule_type）
//   daily_first_clear = 每日首次通关（单日 1 次，跨游戏共享）
//   achievement       = 成就达成（分值以 game_achievements.reward_points 为准）
//   score_range       = 成绩区间首次达成
//   daily_limit       = 单日游戏奖励上限（全局唯一）
export const GAME_REWARD_RULE_TYPE_MAP: Record<string, { color: string; label: string }> = {
  daily_first_clear: { color: 'green', label: '每日首次通关' },
  first_clear: { color: 'cyan', label: '首次通关奖励' },
  achievement: { color: 'gold', label: '成就达成' },
  score_range: { color: 'blue', label: '成绩区间' },
  level_clear: { color: 'purple', label: '通关奖励' },
  daily_limit: { color: 'red', label: '单日上限' },
}

// 下拉选项（供 Form.Select 使用）
export const GAME_ENGINE_OPTIONS = Object.entries(GAME_ENGINE_MAP).map(([value, v]) => ({
  value,
  label: v.label,
}))
export const GAME_DIMENSION_VALUE_TYPE_OPTIONS = Object.entries(GAME_DIMENSION_VALUE_TYPE_MAP).map(
  ([value, v]) => ({ value, label: v.label })
)
export const GAME_DIMENSION_AGGREGATE_OPTIONS = Object.entries(GAME_DIMENSION_AGGREGATE_MAP).map(
  ([value, v]) => ({ value, label: v.label })
)
// 下拉选项（供 Form.Select 使用）。
// ⚠️ 已移除 `achievement`（成就达成）：成就走 game_achievements 表、由「游戏成就配置」页独立维护，
//   与积分奖励规则解耦；此处仅保留 MAP 中的 achievement 用于兼容展示历史数据，禁止在表单中新增。
export const GAME_REWARD_RULE_TYPE_OPTIONS = Object.entries(GAME_REWARD_RULE_TYPE_MAP)
  .filter(([value]) => value !== 'achievement' && value !== 'first_clear')
  .map(([value, v]) => ({ value, label: v.label }))

// 共享图标资产（App 端 assets/games/icons 与管理后台 public/game-icons 同一套文件）
// 风格：100×100 viewBox、#5D4037 粗描边、白色高光、圆角卡通。
// 文件名即取值；后台通过 /game-icons/<name>.svg 引用，App 通过 assets/games/icons/<name>.svg 引用。
// 后期整体替换只需覆盖两端同名文件，调用方无需改动。
// ⚠️ 必须带 import.meta.env.BASE_URL 前缀：本工程 vite base 为 /pure-enjoy-admin/，
//    硬编码根路径 /game-icons 在 dev 与构建产物下都会 404（public 文件实际挂在 base 路径下）。
export const GAME_SHARED_ICON_BASE = import.meta.env.BASE_URL + 'game-icons'
export const GAME_SHARED_ICON_OPTIONS: { label: string; value: string; group: string }[] = [
  // 游戏封面（games.icon，与 App 端 assets/games/icons 同文件名）
  { group: '游戏封面', label: '2048', value: 'g2048' },
  { group: '游戏封面', label: '羊了个羊', value: 'sheep' },
  { group: '游戏封面', label: '消消乐', value: 'match3' },
  // 模式图标（game_modes.icon，与 App 端同文件名）
  { group: '模式', label: '经典模式', value: 'mode_classic' },
  { group: '模式', label: '限时模式', value: 'mode_timed' },
  { group: '模式', label: '挑战模式', value: 'mode_challenge' },
  { group: '模式', label: '无尽模式', value: 'mode_endless' },
  { group: '模式', label: '消除模式', value: 'mode_match' },
  { group: '模式', label: '果冻模式', value: 'mode_jelly' },
  { group: '模式', label: '食材模式', value: 'mode_ingredient' },
  { group: '模式', label: '订单模式', value: 'mode_order' },
  { group: '模式', label: '混合模式', value: 'mode_blended' },
  { group: '模式', label: '自由模式', value: 'mode_free' },
  { group: '模式', label: '乱斗模式', value: 'mode_brawl' },
  // 牧场主题（羊了个羊图块）
  { group: '牧场', label: '小羊', value: 'sheep_01_lamb' },
  { group: '牧场', label: '小鸡', value: 'sheep_02_chick' },
  { group: '牧场', label: '奶牛', value: 'sheep_03_cow' },
  { group: '牧场', label: '小猪', value: 'sheep_04_pig' },
  { group: '牧场', label: '鸡蛋', value: 'sheep_05_egg' },
  { group: '牧场', label: '牛奶', value: 'sheep_06_milk' },
  { group: '牧场', label: '胡萝卜', value: 'sheep_07_carrot' },
  { group: '牧场', label: '玉米', value: 'sheep_08_corn' },
  { group: '牧场', label: '干草', value: 'sheep_09_hay' },
  { group: '牧场', label: '苹果', value: 'sheep_10_apple' },
  // 糖果主题（消消乐图块）
  { group: '糖果', label: '樱桃', value: 'candy_01_cherry' },
  { group: '糖果', label: '橙子', value: 'candy_02_orange' },
  { group: '糖果', label: '柠檬', value: 'candy_03_lemon' },
  { group: '糖果', label: '青苹果', value: 'candy_04_apple' },
  { group: '糖果', label: '蓝莓', value: 'candy_05_blueberry' },
  { group: '糖果', label: '葡萄', value: 'candy_06_grape' },
]

// 道具图标（game_items.icon，2026-09-09 定版动物/道具风格）
// App 端 assets/games/items、管理后台 public/game-icons 同一套文件
export const PROP_ICON_OPTIONS: { label: string; value: string; group: string }[] = [
  { group: '消消乐道具', label: '洗牌卡', value: 'prop_shuffle' },
  { group: '消消乐道具', label: '破坏锤', value: 'prop_hammer' },
  { group: '消消乐道具', label: '提示卡', value: 'prop_hint' },
  { group: '消消乐道具', label: '强制交换', value: 'prop_force_swap' },
  { group: '消消乐道具', label: '魔法棒', value: 'prop_magic_wand' },
  { group: '消消乐道具', label: '加步卡', value: 'prop_add_steps' },
  { group: '消消乐道具', label: '加时卡', value: 'prop_add_time' },
  { group: '羊了个羊道具', label: '移出卡', value: 'prop_remove' },
  { group: '羊了个羊道具', label: '撤回卡', value: 'prop_undo' },
  { group: '羊了个羊道具', label: '洗牌卡(羊)', value: 'prop_shuffle_sheep' },
]

// 成就图标资产（独立目录，与游戏图标分离）
// 风格：100×100 viewBox、无边框、径向渐变+柔光、颜色随等级递增。
// App 端 assets/games/achievements、管理后台 public/game-achievements 同一套文件。
// ⚠️ 同上，必须带 import.meta.env.BASE_URL 前缀，否则 /game-achievements 在 base 下 404。
export const ACHIEVEMENT_SHARED_ICON_BASE = import.meta.env.BASE_URL + 'game-achievements'
export const ACHIEVEMENT_ICON_OPTIONS: { label: string; value: string }[] = [
  { label: '初出茅庐', value: 'ach_first_clear_all' },
  { label: '羊·初次通关', value: 'ach_first_clear_sheep' },
  { label: '羊·第5关', value: 'ach_level_sheep_5' },
  { label: '羊·第10关', value: 'ach_level_sheep_10' },
  { label: '羊·第20关', value: 'ach_level_sheep_20' },
  { label: '羊·第30关', value: 'ach_level_sheep_30' },
  { label: '羊·第50关', value: 'ach_level_sheep_50' },
  { label: '羊·第70关', value: 'ach_level_sheep_70' },
  { label: '羊·第100关', value: 'ach_level_sheep_100' },
  { label: '羊·第150关', value: 'ach_level_sheep_150' },
  { label: '羊·第200关', value: 'ach_level_sheep_200' },
  { label: '羊·第300关', value: 'ach_level_sheep_300' },
  { label: '2048·初次通关', value: 'ach_first_clear_g2048' },
  { label: '2048·第5关', value: 'ach_level_g2048_5' },
  { label: '2048·第10关', value: 'ach_level_g2048_10' },
  { label: '2048·第20关', value: 'ach_level_g2048_20' },
  { label: '2048·第30关', value: 'ach_level_g2048_30' },
  { label: '2048·第50关', value: 'ach_level_g2048_50' },
  { label: '2048·第70关', value: 'ach_level_g2048_70' },
  { label: '2048·第100关', value: 'ach_level_g2048_100' },
  { label: '2048·第150关', value: 'ach_level_g2048_150' },
  { label: '2048·第200关', value: 'ach_level_g2048_200' },
  { label: '2048·第300关', value: 'ach_level_g2048_300' },
  { label: '2048·得分256', value: 'ach_score_g2048_256' },
  { label: '2048·得分512', value: 'ach_score_g2048_512' },
  { label: '2048·得分1024', value: 'ach_score_g2048_1024' },
  { label: '2048·得分2048', value: 'ach_score_g2048_2048' },
  { label: '2048·得分4096', value: 'ach_score_g2048_4096' },
  { label: '2048·得分8192', value: 'ach_score_g2048_8192' },
  { label: '2048·得分16384', value: 'ach_score_g2048_16384' },
  { label: '2048·得分32768', value: 'ach_score_g2048_32768' },
  { label: '消消乐·初次通关', value: 'ach_first_clear_match3' },
  { label: '消消乐·第5关', value: 'ach_level_match3_5' },
  { label: '消消乐·第10关', value: 'ach_level_match3_10' },
  { label: '消消乐·第20关', value: 'ach_level_match3_20' },
  { label: '消消乐·第30关', value: 'ach_level_match3_30' },
  { label: '消消乐·第50关', value: 'ach_level_match3_50' },
  { label: '消消乐·第70关', value: 'ach_level_match3_70' },
  { label: '消消乐·第100关', value: 'ach_level_match3_100' },
  { label: '消消乐·第150关', value: 'ach_level_match3_150' },
  { label: '消消乐·第200关', value: 'ach_level_match3_200' },
  { label: '消消乐·第300关', value: 'ach_level_match3_300' },
  { label: '消消乐·得分1000', value: 'ach_score_match3_1000' },
  { label: '消消乐·得分2000', value: 'ach_score_match3_2000' },
  { label: '消消乐·得分3000', value: 'ach_score_match3_3000' },
  { label: '消消乐·得分4000', value: 'ach_score_match3_4000' },
  { label: '消消乐·得分5000', value: 'ach_score_match3_5000' },
  { label: '消消乐·得分6000', value: 'ach_score_match3_6000' },
  { label: '消消乐·得分8000', value: 'ach_score_match3_8000' },
  { label: '消消乐·得分10000', value: 'ach_score_match3_10000' },
]

// ==================== 西行（journey）枚举 ====================
// 取值须与 /workspace/sql journey DDL 的 CHECK 约束一致；App 端 journey_seed 同步维护。

// 关卡类型（journey_levels.level_kind）
export const JOURNEY_LEVEL_KIND_MAP: Record<string, { color: string; label: string }> = {
  story: { color: 'blue', label: '叙事' },
  battle: { color: 'green', label: '战斗' },
  trial: { color: 'orange', label: '试炼' },
  race: { color: 'cyan', label: '竞速' },
  node: { color: 'purple', label: '节点' },
  boss: { color: 'red', label: '妖王战' },
  final: { color: 'gold', label: '终章' },
}

// 怪物 AI 档（journey_monsters.ai_tier）
export const JOURNEY_AI_TIER_MAP: Record<string, { color: string; label: string }> = {
  normal: { color: 'default', label: '普通' },
  elite: { color: 'orange', label: '精英' },
  boss: { color: 'red', label: '妖王' },
}

// 法宝分类（journey_weapons.category）
export const JOURNEY_WEAPON_CATEGORY_MAP: Record<string, { color: string; label: string }> = {
  active: { color: 'red', label: '主动法宝' },
  passive: { color: 'blue', label: '被动加持' },
  effect: { color: 'purple', label: '特效触发' },
}

// 法宝攻击形态（journey_weapons.attack_kind）
export const JOURNEY_ATTACK_KIND_MAP: Record<string, { color: string; label: string }> = {
  orbit: { color: 'volcano', label: '环绕收割' },
  melee_arc: { color: 'orange', label: '近战横扫' },
  projectile: { color: 'blue', label: '弹体' },
  aura: { color: 'green', label: '光环' },
  boomerang: { color: 'cyan', label: '回旋' },
  beam: { color: 'purple', label: '射线' },
  magnet: { color: 'gold', label: '磁吸' },
}

// 五行（journey_talents.element）：相生顺序 金→水→木→火→土→金
export const JOURNEY_ELEMENT_MAP: Record<string, { color: string; label: string }> = {
  metal: { color: 'gold', label: '金' },
  water: { color: 'blue', label: '水' },
  wood: { color: 'green', label: '木' },
  fire: { color: 'red', label: '火' },
  earth: { color: 'orange', label: '土' },
}

// 地图参照物类型（journey_map_objects.kind）
export const JOURNEY_MAP_OBJECT_KIND_MAP: Record<string, { color: string; label: string }> = {
  breakable: { color: 'orange', label: '可破坏' },
  unbreakable: { color: 'default', label: '不可破坏' },
  chest_point: { color: 'gold', label: '宝箱点' },
  milestone: { color: 'purple', label: '里程碑' },
  waypoint: { color: 'blue', label: '路径点' },
}

// 密度热区类型（journey_heat_zones.kind）
export const JOURNEY_HEAT_KIND_MAP: Record<string, { color: string; label: string }> = {
  demon_den: { color: 'red', label: '妖穴' },
  safe_valley: { color: 'green', label: '安全谷' },
}

// 拾取物效果（journey_pickups.effect）
export const JOURNEY_PICKUP_EFFECT_MAP: Record<string, { color: string; label: string }> = {
  exp: { color: 'blue', label: '香火(经验)' },
  merit: { color: 'gold', label: '功德' },
  heal: { color: 'green', label: '治疗' },
  chest: { color: 'purple', label: '宝箱' },
}

// 掉落来源（journey_drops.source_kind）
export const JOURNEY_DROP_SOURCE_MAP: Record<string, { color: string; label: string }> = {
  monster: { color: 'red', label: '怪物' },
  breakable: { color: 'orange', label: '可破坏物' },
}

// 维度槽编码（journey_weapon_slots.code，主动法宝初始特效槽取值同源）
export const JOURNEY_SLOT_CODE_MAP: Record<string, { color: string; label: string }> = {
  radius: { color: 'blue', label: '臂展' },
  speed: { color: 'cyan', label: '转速' },
  damage: { color: 'red', label: '伤害' },
  knockback: { color: 'orange', label: '击退' },
  lifesteal: { color: 'green', label: '吸血' },
  pierce: { color: 'purple', label: '穿刺' },
  magnet: { color: 'gold', label: '磁吸' },
  burn: { color: 'volcano', label: '灼烧' },
  clone: { color: 'geekblue', label: '分身' },
  crit_rate: { color: 'gold', label: '暴击' },
  crit_damage: { color: 'magenta', label: '暴伤' },
  armor: { color: 'purple', label: '护甲' },
}

// 妖王能力（journey_monsters.ability_key，西游记背景扩展；空=无特殊能力）
export const JOURNEY_BOSS_ABILITY_MAP: Record<string, { color: string; label: string }> = {
  unmovable: { color: 'orange', label: '不动如山·抗击退高护甲' },
  swift_wind: { color: 'cyan', label: '三昧神风·高移速阵风' },
  roc_speed: { color: 'geekblue', label: '金翅迅影·极速冲撞' },
  samadhi_fire: { color: 'volcano', label: '三昧真火·火圈AOE' },
  bone_split: { color: 'purple', label: '分魂化形·分裂妖卫' },
  gourd_pull: { color: 'magenta', label: '紫金摄魂·拉拽玩家' },
  iron_horn: { color: 'gold', label: '金刚琢护体·受击减伤' },
  spider_web: { color: 'blue', label: '金光缚身·定身玩家' },
  blood_frenzy: { color: 'red', label: '血怒狂暴·低血增伤' },
  poison_mist: { color: 'green', label: '倒马毒桩·禁疗' },
}

// 妖王能力参数键（journey_monster_params.code，引擎逻辑判断用；展示映射）
export const JOURNEY_MONSTER_PARAM_KEY_MAP: Record<string, { color: string; label: string }> = {
  knock_resist: { color: 'orange', label: '抗击退比例' },
  armor: { color: 'gold', label: '附加护甲' },
  move_mult: { color: 'cyan', label: '移速倍率' },
  charge_cd: { color: 'geekblue', label: '冲撞冷却(秒)' },
  wind_period: { color: 'blue', label: '阵风周期(秒)' },
  wind_push: { color: 'blue', label: '吹离距离' },
  fire_period: { color: 'volcano', label: '火圈周期(秒)' },
  fire_range: { color: 'volcano', label: '火圈半径' },
  fire_ratio: { color: 'red', label: '火圈伤害比例' },
  pull_period: { color: 'magenta', label: '摄魂周期(秒)' },
  pull_dist: { color: 'magenta', label: '拉拽距离' },
  frenzy_mult: { color: 'red', label: '狂暴增幅' },
  frenzy_hp: { color: 'red', label: '狂暴触发线' },
  web_root: { color: 'purple', label: '定身秒数' },
  poison_block: { color: 'green', label: '禁疗秒数' },
}

// 法宝数值参数键（journey_weapon_params.code，引擎逻辑判断用；展示映射）
export const JOURNEY_WEAPON_PARAM_KEY_MAP: Record<string, { color: string; label: string }> = {
  move: { color: 'blue', label: '移速加成' },
  hp: { color: 'green', label: '生命上限' },
  regen: { color: 'green', label: '回复/秒' },
  exp: { color: 'gold', label: '经验加成' },
  spin: { color: 'cyan', label: '转速加成' },
  radius: { color: 'blue', label: '臂长+' },
  damage: { color: 'red', label: '伤害加成' },
  magnet: { color: 'gold', label: '磁吸范围' },
  heal: { color: 'green', label: '回血比例' },
  invuln: { color: 'purple', label: '无敌秒数' },
  period: { color: 'geekblue', label: '触发周期(秒)' },
  elite: { color: 'volcano', label: '精英增伤倍率' },
  chance: { color: 'purple', label: '触发概率' },
  root: { color: 'magenta', label: '定身秒数' },
  thorns: { color: 'orange', label: '反伤比例' },
  chain: { color: 'cyan', label: '链伤比例' },
  range: { color: 'blue', label: '作用范围' },
  targets: { color: 'geekblue', label: '目标数' },
  hits: { color: 'volcano', label: '触发次数' },
  weak: { color: 'orange', label: '虚弱秒数' },
  burn: { color: 'red', label: '灼烧比例' },
}

// 功德流水来源（journey_merit_records.source_type，append-only 四类）
export const JOURNEY_MERIT_SOURCE_MAP: Record<string, { color: string; label: string }> = {
  run_settle: { color: 'green', label: '对局结算' },
  talent_spend: { color: 'orange', label: '天赋升级' },
  character_unlock: { color: 'purple', label: '角色解锁' },
  revive_spend: { color: 'red', label: '还魂丹复活' },
}
