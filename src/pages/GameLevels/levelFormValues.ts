import type { DbGameLevel } from '../../types/database'

/// 西行关卡条件字段名：保存时并入 config jsonb，顶层不落列。
export const JOURNEY_LEVEL_CONFIG_KEYS = ['region_code', 'level_kind', 'boss_fights', 'first_clear_merit', 'duration_target_sec'] as const

/// 关卡表单初值：编辑态把 config jsonb 内的西行条件字段解出回显，
/// 新增态给出可写库的最小默认值。弹窗按 key 重挂载后取本函数结果。
export function levelFormInitialValues(
  editing: DbGameLevel | null,
  selectedGameId: string,
): Record<string, any> {
  if (editing) {
    const cfg = (editing.config && typeof editing.config === 'object'
      ? (editing.config as Record<string, any>)
      : {}) as Record<string, any>
    return {
      ...editing,
      config: JSON.stringify(editing.config ?? {}),
      // 西行条件字段从 config jsonb 解出回显（保存时并回）
      region_code: cfg.region_code,
      level_kind: cfg.level_kind,
      boss_fights: cfg.boss_fights ?? 0,
      first_clear_merit: cfg.first_clear_merit ?? 0,
      duration_target_sec: cfg.duration_target_sec,
      propUnlock:
        editing.config && typeof editing.config === 'object' && (editing.config as Record<string, any>).propUnlock
          ? JSON.stringify((editing.config as Record<string, any>).propUnlock)
          : '',
      target: JSON.stringify(editing.target ?? {}),
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

/// 保存载荷：解析表单里的 config / target / propUnlock JSON，
/// 把西行条件字段并入 config jsonb 并从顶层删除（顶层不落列，防 42703）。
/// JSON 非法时抛错，由调用方统一提示。
export function buildLevelSavePayload(
  values: Record<string, any>,
  gameCode: string | undefined,
): Record<string, any> {
  const payload: Record<string, any> = { ...values }
  // 模式为空（未选 / 清空）时存 NULL，避免写入空串触发 FK 类型问题
  payload.mode_id = values.mode_id || null
  payload.config = values.config ? JSON.parse(values.config) : {}
  payload.target = values.target ? JSON.parse(values.target) : {}
  // 道具解锁配置：独立表单项，保存合并回 config.propUnlock（空则删除键）
  if (values.propUnlock && String(values.propUnlock).trim()) {
    const pu = JSON.parse(values.propUnlock)
    if (pu == null || typeof pu !== 'object' || Array.isArray(pu)) throw new Error('propUnlock')
    payload.config.propUnlock = pu
  } else {
    delete payload.config.propUnlock
  }
  // propUnlock 属 config 内嵌键，顶层残留会触发 42703（列不存在）
  delete payload.propUnlock
  if (gameCode === 'journey') {
    for (const key of JOURNEY_LEVEL_CONFIG_KEYS) {
      if (values[key] !== undefined && values[key] !== null && values[key] !== '') {
        payload.config[key] = values[key]
      }
      delete payload[key]
    }
  } else {
    for (const key of JOURNEY_LEVEL_CONFIG_KEYS) delete payload[key]
  }
  return payload
}
