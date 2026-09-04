/**
 * 成就管理 · 条件类型常量与摘要渲染
 * 条件类型口径与 App 端结算判定器（game_reward_picker.dart）一致：
 * first_clear / level(min_level_no) / score(dimension+gte)。
 */

/// 后台可编辑的三种条件类型
export const COND_OPTIONS = [
  { value: 'first_clear', label: '任意通关（通关任意一关即达成）' },
  { value: 'score', label: '维度分数达到（通关时某维度值 ≥ 阈值）' },
  { value: 'level', label: '通关关卡号达到（通关第 N 关及以上）' },
]

/// 判定是否为 v2 徽章条件（mode_tier 等）：后台暂不支持编辑，保存时原样保留
export function isV2ConditionOf(condition: unknown): boolean {
  const type = (condition as Record<string, any> | null | undefined)?.type
  return !!type && !COND_OPTIONS.some((o) => o.value === String(type))
}

/// 把 condition JSON 渲染成中文摘要（与 App 端解析口径一致）
export function condSummary(cond: Record<string, any>): string {
  const type = cond?.type ?? 'first_clear'
  if (type === 'score') {
    return `${cond?.dimension ?? '?'} ≥ ${cond?.gte ?? '?'}`
  }
  if (type === 'level') {
    return `通关第 ${cond?.min_level_no ?? '?'} 关及以上`
  }
  if (type === 'mode_tier') {
    return `段位徽章（${cond?.mode ?? '?'} · T${cond?.tier ?? '?'}）`
  }
  return String(type ?? '任意通关')
}
