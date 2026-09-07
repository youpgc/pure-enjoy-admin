/**
 * 游戏模式管理 · 玩法语义与配置模板常量
 *
 * play_kind = 模式 ↔ 引擎行为的唯一链接（见《游戏模块配置参考文档》§3.2）；
 * 本文件同时约束「play_kind 按所属游戏过滤」与「config 推荐参数模板」，
 * 防止跨游戏错配（历史 match3 配置键错配事故的防再犯措施）。
 */

export interface PlayKindOption {
  value: string
  label: string
}

/** 全量 play_kind（引擎行为码） */
export const PLAY_KIND_OPTIONS: PlayKindOption[] = [
  { value: '2048', label: '2048 · 经典/挑战/限时' },
  { value: '2048_timed', label: '2048 · 限时' },
  { value: '2048_challenge', label: '2048 · 挑战' },
  { value: '2048_endless', label: '2048 · 无尽' },
  { value: 'score', label: '消消乐 · 计分' },
  { value: 'clear', label: '消消乐 · 消除' },
  { value: 'collect', label: '消消乐 · 收集' },
  { value: 'obstacle', label: '消消乐 · 破冰' },
  { value: 'timed', label: '消消乐 · 限时' },
  { value: 'boss', label: '消消乐 · Boss' },
  { value: 'merge', label: '羊了个羊 · 合成' },
]

/** 各游戏允许的 play_kind（与 App 引擎分支一一对应，跨游戏不可混用） */
export const PLAY_KINDS_BY_GAME: Record<string, string[]> = {
  g2048: ['2048', '2048_timed', '2048_challenge', '2048_endless'],
  match3: ['score', 'clear', 'collect', 'obstacle', 'timed', 'boss'],
  sheep: ['merge'],
}

/** 按游戏编码过滤 play_kind 选项；gameCode 未知（未选游戏）时返回全量 */
export function playKindOptionsFor(gameCode: string | undefined): PlayKindOption[] {
  if (!gameCode) return PLAY_KIND_OPTIONS
  const allowed = PLAY_KINDS_BY_GAME[gameCode]
  if (!allowed) return PLAY_KIND_OPTIONS
  return PLAY_KIND_OPTIONS.filter((o) => allowed.includes(o.value))
}

/**
 * config 推荐参数模板（键名 = App 引擎读取键，见参考文档 §3.3 与 §9 D 表）。
 *
 * 消消乐「方块类型 types」（2026-09-07）：关键难度维度，阈值 4..6
 * （仅 6 种糖果图标）；4 时其他目标指数向上补偿。全模板必带 types。
 * 收集目标 collect 支持 1..N 种类型：[{"type":T,"count":N},...]（type < types）。
 * 破冰附加颜色目标用 iceCollect（同结构）。
 */
export const CONFIG_TEMPLATES: Record<string, Record<string, unknown>> = {
  '2048': { size: 4, target: 2048 },
  '2048_timed': { size: 4, target: 300, time_limit: 90 },
  '2048_challenge': { size: 4, target: 300, max_moves: 100 },
  '2048_endless': { size: 4, target: 2000, noClear: true },
  merge: { types: 6, layers: 2, perType: 3, overlap: 0.7 },
  score: { types: 4, steps: 25, goal: 6484 },
  clear: { types: 4, steps: 30, jelly: 2 },
  collect: {
    types: 4,
    steps: 30,
    collect: [
      { type: 0, count: 15 },
    ],
  },
  obstacle: { types: 4, steps: 40, ice: 6, iceCollect: [] },
  timed: { types: 4, goal: 8753, time_limit: 90 },
  boss: { types: 4, steps: 30, bossHp: 140 },
}
