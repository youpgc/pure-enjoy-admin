import type { JourneyLevelRow } from './columns'

/// 西行关卡专属属性字段名（journey_levels 子表列；关卡主体仍在 game_levels）。
/// 列表行由子表属性合并到顶层，表单直接读写这些顶层字段，保存时分离出子表载荷。
export const JOURNEY_LEVEL_ATTR_KEYS = [
  'region_code',
  'level_kind',
  'boss_fights',
  'first_clear_merit',
  'duration_target_sec',
] as const

/// 关卡表单初值：西行属性已由列表合并到行顶层；非西行的 config/target/
/// propUnlock 仍以 JSON 文本框维护。弹窗按 key 重挂载后取本函数结果。
export function levelFormInitialValues(
  editing: JourneyLevelRow | null,
  selectedGameId: string,
): Record<string, any> {
  if (editing) {
    return {
      ...editing,
      config: JSON.stringify(editing.config ?? {}),
      target: JSON.stringify(editing.target ?? {}),
      propUnlock:
        editing.config && typeof editing.config === 'object' && (editing.config as Record<string, any>).propUnlock
          ? JSON.stringify((editing.config as Record<string, any>).propUnlock)
          : '',
      boss_fights: editing.boss_fights ?? 0,
      first_clear_merit: editing.first_clear_merit ?? 0,
    }
  }
  return {
    game_id: selectedGameId || undefined,
    enabled: true,
    count_for_daily_clear: false,
    reward_points: 0,
    reward_repeatable: false,
    sort_order: 0,
    config: '{}',
    target: '{}',
    boss_fights: 0,
    first_clear_merit: 0,
  }
}

export interface LevelSaveResult {
  /// 写 game_levels 主表的载荷（不含西行属性字段）
  levelPayload: Record<string, any>
  /// 写 journey_levels 子表的载荷（西行关卡才有；非西行为 null）
  journeyAttrs: Record<string, any> | null
}

/// 保存载荷拆分：config/target/propUnlock 解析为对象；西行关卡的 5 个属性
/// 从顶层分离到 journeyAttrs（写子表），主表载荷不再携带这些字段。
/// JSON 非法时抛错，由调用方统一提示。
export function buildLevelSavePayload(
  values: Record<string, any>,
  gameCode: string | undefined,
): LevelSaveResult {
  const payload: Record<string, any> = { ...values }
  payload.mode_id = values.mode_id || null
  payload.config = values.config ? JSON.parse(values.config) : {}
  payload.target = values.target ? JSON.parse(values.target) : {}
  if (values.propUnlock && String(values.propUnlock).trim()) {
    const pu = JSON.parse(values.propUnlock)
    if (pu == null || typeof pu !== 'object' || Array.isArray(pu)) throw new Error('propUnlock')
    payload.config.propUnlock = pu
  } else {
    delete payload.config.propUnlock
  }
  delete payload.propUnlock

  if (gameCode === 'journey') {
    const journeyAttrs: Record<string, any> = {}
    for (const key of JOURNEY_LEVEL_ATTR_KEYS) {
      const value = values[key]
      if (value !== undefined && value !== null && value !== '') {
        journeyAttrs[key] = value
      }
      delete payload[key]
    }
    return { levelPayload: payload, journeyAttrs }
  }

  for (const key of JOURNEY_LEVEL_ATTR_KEYS) delete payload[key]
  return { levelPayload: payload, journeyAttrs: null }
}
