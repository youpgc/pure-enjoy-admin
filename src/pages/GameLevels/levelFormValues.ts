import type { JourneyLevelRow } from './columns'

/// 西行关卡专属属性字段名（journey_levels 子表列；关卡主体仍在 game_levels）。
/// 列表行由子表属性合并到顶层，表单直接读写这些顶层字段，保存时分离出子表载荷。
export const JOURNEY_LEVEL_ATTR_KEYS = [
  'region_code',
  'level_kind',
  'boss_code',
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
  }
}

export interface LevelSaveResult {
  /// 写 game_levels 主表的载荷（不含西行属性字段）
  levelPayload: Record<string, any>
  /// 【已退役 · 保留字段避免改动调用方】原写 journey_levels 子表的载荷。
  /// 西行子表属性已迁至「西行管理 → 关卡编排 → 关卡属性」维护，
  /// 本函数产出的 journeyAttrs 已无消费者，实际写入由 JourneyLevelAttrsTab 承担。
  journeyAttrs: Record<string, any> | null
}

/// 保存载荷拆分：config/target/propUnlock 解析为对象；西行关卡的 6 个属性
/// 从主表载荷中剔除（它们不属于 game_levels 列，误写会被 PostgREST 拒绝）。
/// 原分离到 journeyAttrs 写子表的逻辑已退役，原因见 LevelSaveResult.journeyAttrs。
/// JSON 非法时抛错，由调用方统一提示。
export function buildLevelSavePayload(
  values: Record<string, any>,
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

  // 【已退役 · 源码保留便于恢复】原在此构造 journeyAttrs 写 journey_levels 子表：
  // if (gameCode === 'journey') {
  //   const journeyAttrs: Record<string, any> = {}
  //   for (const key of JOURNEY_LEVEL_ATTR_KEYS) {
  //     const value = values[key]
  //     if (value !== undefined && value !== null && value !== '') {
  //       journeyAttrs[key] = value
  //     } else if (key === 'boss_code') {
  //       journeyAttrs[key] = null
  //     }
  //     delete payload[key]
  //   }
  //   return { levelPayload: payload, journeyAttrs }
  // }
  // 西行属性现由「关卡属性」Tab 单独维护，这里只剔除不属于主表的列。
  for (const key of JOURNEY_LEVEL_ATTR_KEYS) delete payload[key]
  return { levelPayload: payload, journeyAttrs: null }
}
