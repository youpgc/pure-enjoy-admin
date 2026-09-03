// ==================== 游戏中心（games 模块）枚举/字典单一源 ====================
// ⚠️ 本文件是游戏相关枚举/展示映射的权威来源，页面与 service 一律从此导入，禁止硬编码。
//   取值必须与 D:/workspace/sql/feature_create_games.sql 的 CHECK 约束、种子数据保持一致。
//   三端（App / Admin / Supabase）新增或修改枚举时须同步修改。

// 渲染引擎（games.engine）：纯 Widget / Flame
export const GAME_ENGINE_MAP: Record<string, { color: string; label: string }> = {
  widget: { color: 'blue', label: '纯 Widget' },
  flame: { color: 'volcano', label: 'Flame' },
}

// 成绩状态（game_scores.status）
export const GAME_STATUS_MAP: Record<string, { color: string; label: string }> = {
  cleared: { color: 'green', label: '通关' },
  failed: { color: 'red', label: '失败' },
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
//   ⚠️ level_no 编码规则：模式序号 × 100 + 模式内关序(1~50)，即
//      101~150=计分、201~250=消除、301~350=收集、401~450=破冰、501~550=限时、601~650=Boss，
//      共 300 关（见 /d/workspace/sql/feature_reseed_match3_levels_300.sql）。
//      新增关卡务必按此编码填 level_no，否则 App 端模式归类与成就关序判定都会错。
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

// 每个 match3 模式的关卡容量（level_no 编码的个/十位段）
export const MATCH3_LEVELS_PER_MODE = 50

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
  .filter(([value]) => value !== 'achievement')
  .map(([value, v]) => ({ value, label: v.label }))

// 共享图标资产（App 端 assets/games/icons 与管理后台 public/game-icons 同一套文件）
// 风格：100×100 viewBox、#5D4037 粗描边、白色高光、圆角卡通。
// 文件名即取值；后台通过 /game-icons/<name>.svg 引用，App 通过 assets/games/icons/<name>.svg 引用。
// 后期整体替换只需覆盖两端同名文件，调用方无需改动。
// ⚠️ 必须带 import.meta.env.BASE_URL 前缀：本工程 vite base 为 /pure-enjoy-admin/，
//    硬编码根路径 /game-icons 在 dev 与构建产物下都会 404（public 文件实际挂在 base 路径下）。
export const GAME_SHARED_ICON_BASE = import.meta.env.BASE_URL + 'game-icons'
export const GAME_SHARED_ICON_OPTIONS: { label: string; value: string; group: string }[] = [
  // 牧场主题（羊了个羊）
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
  // 糖果主题（消消乐）
  { group: '糖果', label: '樱桃', value: 'candy_01_cherry' },
  { group: '糖果', label: '橙子', value: 'candy_02_orange' },
  { group: '糖果', label: '柠檬', value: 'candy_03_lemon' },
  { group: '糖果', label: '青苹果', value: 'candy_04_apple' },
  { group: '糖果', label: '蓝莓', value: 'candy_05_blueberry' },
  { group: '糖果', label: '葡萄', value: 'candy_06_grape' },
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
