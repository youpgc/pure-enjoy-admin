// 妖王能力→参数键映射聚合入口：按能力分组展示与整包编辑，缺省值供对照（行缺失即回落）。
// 数据按 A/B 两半拆分存放，特性定义见 journeyBossAbilityTypes。
import type { BossAbilityParams } from './journeyBossAbilityTypes'
import { BOSS_ABILITY_PARAMS_A } from './journeyBossAbilityParamsA'
import { BOSS_ABILITY_PARAMS_B } from './journeyBossAbilityParamsB'

export type { BossAbilityParams }

export const JOURNEY_BOSS_ABILITY_PARAMS: Record<string, BossAbilityParams> = {
  ...BOSS_ABILITY_PARAMS_A,
  ...BOSS_ABILITY_PARAMS_B,
}

/// 能力是否含周期技（<ability>_period 已计入 keys，供总览标注）。
export function bossAbilityParamCount(key: string): number {
  return JOURNEY_BOSS_ABILITY_PARAMS[key]?.keys.length ?? 0
}
