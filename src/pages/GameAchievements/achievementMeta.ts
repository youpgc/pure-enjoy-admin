/**
 * 成就管理 · 条件类型常量与摘要渲染
 * 条件类型口径与 App 端结算判定器（game_reward_picker.dart）一致：
 * first_clear / level(min_level_no) / score(dimension+gte) / cumulative(metric+value) /
 * mode_tier / all_modes_tier / all_games_tier / mode_score。
 */

/// 后台可编辑的条件类型（v2 徽章条件只读展示、保存原样保留）
export const COND_OPTIONS = [
  { value: 'first_clear', label: '任意通关（通关任意一关即达成）' },
  { value: 'score', label: '维度分数达到（通关时某维度值 ≥ 阈值）' },
  {
    value: 'level',
    label: '通关关卡号达到（全局关序 ≥ N，消消乐 = 前序模式实际关数之和 + 关内序）',
  },
  {
    value: 'cumulative',
    label: '终身累计达成（跨局累计某指标达到 N，如累计消除 8000 个方块）',
  },
]

/// 累计指标映射（condition.metric 为 App 端 GameCumulativeMetrics 编码）
export const CUMULATIVE_METRIC_OPTIONS = [
  { value: 'play', label: '累计游玩局数（每局完成结算 +1，含失败局）' },
  { value: 'clear', label: '累计通关次数（通关 +1）' },
  { value: 'merge', label: '累计合成次数（2048，当局引擎上报 merges 增量）' },
  {
    value: 'clear_blocks',
    label: '累计消除方块数（消消乐，当局引擎上报 cleared_blocks 增量）',
  },
]

export const CUMULATIVE_METRIC_LABELS: Record<string, string> = {
  play: '累计游玩局数',
  clear: '累计通关次数',
  merge: '累计合成次数',
  clear_blocks: '累计消除方块数',
}

/// 成绩维度中文名 + 单位（condition.dimension → 中文）。
///
/// 后台「达成条件」列**禁止直出英文维度码**（score / jelly_cleared / max_combo …）——
/// 管理员看的是业务语义，不是引擎词汇。覆盖参考文档 §7.1 词汇表全集；
/// `game_dimensions` 表有配置时以表值 `name` 优先（本表作兜底 + 补单位）。
export const DIMENSION_LABELS: Record<string, { name: string; unit: string }> = {
  score: { name: '单局得分', unit: '分' },
  duration_ms: { name: '用时', unit: '秒' },
  moves: { name: '步数', unit: '步' },
  max_combo: { name: '最高连锁', unit: '连' },
  max_single: { name: '单次最高分', unit: '分' },
  cleared_blocks: { name: '消除方块数', unit: '个' },
  jelly_cleared: { name: '单局清除果冻', unit: '格' },
  collect_done: { name: '单局收集/破冰', unit: '个' },
  layers: { name: '关卡层数', unit: '层' },
  mistakes: { name: '单局失误', unit: '次' },
  merges: { name: '合成次数', unit: '次' },
  streak_days: { name: '连续签到天数', unit: '天' },
  level: { name: '通关关卡', unit: '关' },
}

/// 分组键（group_key）中文标签。
///
/// `group_key` 是 `<域>:<游戏>:<主题>` / `<游戏>:<主题>` / `<域>:<游戏>` 形式的
/// 内部编码（如 `score:match3:max_combo`）——列表列**必须转中文**，否则管理员
/// 看到的是满屏英文码。规则拼接 + 词表，未收录主题回退原文（不隐藏信息）。
const GROUP_SCOPE_LABELS: Record<string, string> = {
  tier: '段位',
  score: '得分',
  first_clear: '首次通关',
}

const GROUP_TOPIC_LABELS: Record<string, string> = {
  score: '单局得分',
  duration_ms: '用时',
  moves: '步数',
  max_combo: '最高连锁',
  max_single: '单次最高分',
  cleared_blocks: '消除方块数',
  layers: '关卡层数',
  jelly_clear: '果冻清除',
  order_ice: '破冰格数',
  ice_progress: '破冰进阶',
  candy_rich: '消除累计',
  stack: '关卡阶梯',
  regular: '累计游玩',
  merge_master: '合成累计',
  all_modes: '全模式集齐',
  flawless: '无失误通关',
  streak: '连续签到',
  score_break: '分数突破',
}

/// `score:global:*` 的全局族有专属语义（跨游戏段位），单独列出避免被 generic 规则误读。
const GLOBAL_TOPIC_LABELS: Record<string, string> = {
  score: '跨游戏段位',
  streak: '连续签到',
}

export const GAME_LABELS: Record<string, string> = {
  match3: '消消乐',
  g2048: '2048',
  sheep: '羊了个羊',
  global: '全局',
  all: '全局',
}

/// 分组键 → 中文（如 `score:match3:max_combo` → 「消消乐 · 最高连锁」）
export function groupLabel(key?: string | null): string {
  if (!key) return '未分组'
  const parts = key.split(':')
  const gameOf = (s: string) => GAME_LABELS[s] ?? s
  if (parts[0] === 'tier' && parts.length >= 3) {
    return `${gameOf(parts[1])} · ${MODE_LABELS[parts[2]] ?? parts[2]} · 段位`
  }
  if (parts[0] === 'first_clear' && parts.length >= 2) {
    return `${gameOf(parts[1])} · 首次通关`
  }
  if (parts.length === 3) {
    if (parts[1] === 'global' || parts[1] === 'all') {
      return `全局 · ${GLOBAL_TOPIC_LABELS[parts[2]] ?? GROUP_TOPIC_LABELS[parts[2]] ?? parts[2]}`
    }
    const topic = MODE_LABELS[parts[2]] ?? GROUP_TOPIC_LABELS[parts[2]] ?? parts[2]
    return `${gameOf(parts[1])} · ${topic}`
  }
  if (parts.length === 2) {
    return `${gameOf(parts[0])} · ${GROUP_TOPIC_LABELS[parts[1]] ?? parts[1]}`
  }
  return key
}

/// 模式名映射（condition.mode 为引擎行为码；2026-09-07 正名口径）
export const MODE_LABELS: Record<string, string> = {
  match: '计分模式',
  jelly: '消除模式',
  ingredient: '收集模式',
  timed: '限时模式',
  order: '破冰模式',
  blended: 'Boss模式',
  classic: '经典模式',
  challenge: '挑战模式',
  endless: '无尽模式',
}

/// 段位名映射（condition.tier 1..7）
const TIER_LABELS: Record<number, string> = {
  1: '青铜', 2: '白银', 3: '黄金', 4: '铂金', 5: '钻石', 6: '大师', 7: '王者',
}

/// 判定是否为 v2 徽章条件（mode_tier 等）：后台暂不支持编辑，保存时原样保留
export function isV2ConditionOf(condition: unknown): boolean {
  const type = (condition as Record<string, any> | null | undefined)?.type
  return !!type && !COND_OPTIONS.some((o) => o.value === String(type))
}

/// 把 condition JSON 渲染成中文摘要（与 App 端解析口径一致）；
/// 段位类展示真实判定阈值，不再输出「段位徽章（timed · T3）」式模糊内容。
export function condSummary(cond: Record<string, any>): string {
  const type = cond?.type ?? 'first_clear'
  if (type === 'score') {
    const dim = String(cond?.dimension ?? 'score')
    const meta = DIMENSION_LABELS[dim]
    const label = meta?.name ?? dim
    // 方向按实际阈值键渲染：lte=用时/步数类（≤）、gte=得分/数量类（≥）、
    // 双键=区间——此前硬编码 ≥ 把 lte 型显示成「duration_ms ≥ ?」（误导）
    const gte = cond?.gte
    const lte = cond?.lte
    // 数值格式化：数字加千分位；duration_ms 内部单位是毫秒，展示统一换算为「秒」
    const fmt = (v: any): string => {
      const n = Number(v)
      if (!Number.isFinite(n)) return String(v)
      if (dim === 'duration_ms') {
        const s = n / 1000
        return `${Number.isInteger(s) ? s : s.toFixed(1)} 秒`
      }
      const num = n.toLocaleString('zh-CN')
      return meta?.unit ? `${num} ${meta.unit}` : num
    }
    // 限定模式：带 mode 的成就仅在该模式内判定，摘要必须显式标注，
    // 否则「破冰模式单局得分」看起来与全模式通用档没有区别（2026-09-15）
    const mode = cond?.mode
      ? `｜限${MODE_LABELS[String(cond.mode)] ?? cond.mode}`
      : ''
    if (gte != null && lte != null) return `${label} 在 ${fmt(gte)} ~ ${fmt(lte)}${mode}`
    if (lte != null) return `${label} ≤ ${fmt(lte)}${mode}`
    return `${label} ≥ ${fmt(gte ?? '?')}${mode}`
  }
  if (type === 'level') {
    return `通关第 ${cond?.min_level_no ?? '?'} 关及以上`
  }
  if (type === 'cumulative') {
    const metric = CUMULATIVE_METRIC_LABELS[cond?.metric] ?? cond?.metric ?? '?'
    return `${metric}达到 ${cond?.value ?? '?'}`
  }
  if (type === 'mode_score') {
    const mode = MODE_LABELS[cond?.mode] ?? cond?.mode ?? '?'
    return `${mode}单局得分 ≥ ${Number(cond?.value ?? 0).toLocaleString('zh-CN')} 分`
  }
  if (type === 'mode_tier') {
    const mode = MODE_LABELS[cond?.mode] ?? cond?.mode ?? '?'
    const threshold = cond?.threshold as Record<string, any> | undefined
    // 只输出判定语义本身：段位/模式信息由名称列承载，不加括号注释
    if (threshold?.level != null) {
      return `${mode}通关达到第 ${threshold.level} 关`
    }
    if (threshold?.score != null) {
      return `${mode}单局得分 ≥ ${Number(threshold.score).toLocaleString('zh-CN')} 分`
    }
    const tier = TIER_LABELS[Number(cond?.tier)] ?? `T${cond?.tier ?? '?'}`
    return `${mode}${tier}段位`
  }
  if (type === 'all_modes_tier') {
    return `集齐 ${GAME_LABELS[cond?.game] ?? cond?.game ?? '?'} 全部模式全部段位`
  }
  if (type === 'all_games_tier') {
    const minTier = Number(cond?.min_tier)
    return minTier > 0
      ? `三款游戏均达成${TIER_LABELS[minTier] ?? `T${minTier}`}段位及以上`
      : '三款游戏全部模式段位集齐'
  }
  if (type === 'daily_streak') {
    return `连续 ${cond?.value ?? '?'} 天游玩任意游戏`
  }
  return type === 'first_clear' ? '任意通关' : String(type)
}
