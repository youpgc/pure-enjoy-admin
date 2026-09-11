/**
 * 成就管理 · 条件类型常量与摘要渲染
 * 条件类型口径与 App 端结算判定器（game_reward_picker.dart）一致：
 * first_clear / level(min_level_no) / score(dimension+gte) / mode_tier /
 * all_modes_tier / all_games_tier / mode_score。
 */

/// 后台可编辑的条件类型（v2 徽章条件只读展示、保存原样保留）
export const COND_OPTIONS = [
  { value: 'first_clear', label: '任意通关（通关任意一关即达成）' },
  { value: 'score', label: '维度分数达到（通关时某维度值 ≥ 阈值）' },
  { value: 'level', label: '通关关卡号达到（通关第 N 关及以上）' },
]

/// 游戏名映射（condition.game 为引擎编码）
export const GAME_LABELS: Record<string, string> = {
  match3: '消消乐',
  g2048: '2048',
  sheep: '羊了个羊',
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
    return `${cond?.dimension ?? '?'} ≥ ${cond?.gte ?? '?'}`
  }
  if (type === 'level') {
    return `通关第 ${cond?.min_level_no ?? '?'} 关及以上`
  }
  if (type === 'mode_score') {
    const mode = MODE_LABELS[cond?.mode] ?? cond?.mode ?? '?'
    return `${mode}单局得分 ≥ ${cond?.value ?? '?'}`
  }
  if (type === 'mode_tier') {
    const mode = MODE_LABELS[cond?.mode] ?? cond?.mode ?? '?'
    const threshold = cond?.threshold as Record<string, any> | undefined
    // 只输出判定语义本身：段位/模式信息由名称列承载，不加括号注释
    if (threshold?.level != null) {
      return `${mode}通关达到第 ${threshold.level} 关`
    }
    if (threshold?.score != null) {
      return `${mode}单局得分 ≥ ${threshold.score}`
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
