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

// 积分奖励规则类型（game_reward_rules.rule_type）
//   daily_first_clear = 每日首次通关（单日 1 次，跨游戏共享）
//   achievement       = 成就达成（分值以 game_achievements.reward_points 为准）
//   score_range       = 成绩区间首次达成
//   daily_limit       = 单日游戏奖励上限（全局唯一）
export const GAME_REWARD_RULE_TYPE_MAP: Record<string, { color: string; label: string }> = {
  daily_first_clear: { color: 'green', label: '每日首次通关' },
  achievement: { color: 'gold', label: '成就达成' },
  score_range: { color: 'blue', label: '成绩区间' },
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
export const GAME_REWARD_RULE_TYPE_OPTIONS = Object.entries(GAME_REWARD_RULE_TYPE_MAP).map(
  ([value, v]) => ({ value, label: v.label })
)

// 共享图标资产（App 端 assets/games/icons 与管理后台 public/game-icons 同一套文件）
// 风格：100×100 viewBox、#5D4037 粗描边、白色高光、圆角卡通。
// 文件名即取值；后台通过 /game-icons/<name>.svg 引用，App 通过 assets/games/icons/<name>.svg 引用。
// 后期整体替换只需覆盖两端同名文件，调用方无需改动。
export const GAME_SHARED_ICON_BASE = '/game-icons'
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
