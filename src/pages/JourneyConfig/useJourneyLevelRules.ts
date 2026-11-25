import { useCallback, useMemo } from 'react'
import { JOURNEY_BATTLE_PARAM_INDEX } from '../../constants/journeyBattleParams'
import type { DbJourneyBattleParam } from '../../services/journeyConfigService'

/// 区域编码 → 本段妖王编码：关卡未指定时 App 实际生效的妖王。
export type RegionBossMap = Map<string, string>

/// 关卡妖王与通关口径的最小行结构，避免 hook 依赖整页行类型。
export interface BossRuleRow {
  region_code: string | null
  boss_code: string | null
  duration_target_sec: number | null
}

/// 妖王解析结果：level=本关指定 / region=沿用本段 / none=显式无妖或本段无妖。
export type ResolvedBoss = {
  kind: 'level' | 'region' | 'none'
  explicit: boolean
  code: string | null
}

/// 内置移动基准：仅当参数索引异常（键变更或定义缺失）时兜底，与 App 内置值一致。
const MOVE_BASELINE = { baseSpeed: 240, unitsPerLi: 25 }

/// 西行关卡的妖王解析与里程换算法则，与 App resolveBossCode / travelTargetLi 同口径。
export function useJourneyLevelRules(
  regionBossByCode: RegionBossMap,
  playerParams: DbJourneyBattleParam[],
) {
  /// 本关覆盖优先，空串=本关显式无妖，NULL 沿用本段妖王。
  const resolveBoss = useCallback(
    (row: BossRuleRow): ResolvedBoss => {
      if (row.boss_code !== null && row.boss_code !== undefined) {
        return row.boss_code === ''
          ? { kind: 'none', explicit: true, code: null }
          : { kind: 'level', explicit: true, code: row.boss_code }
      }
      const inherited = regionBossByCode.get(row.region_code ?? '')
      return inherited
        ? { kind: 'region', explicit: false, code: inherited }
        : { kind: 'none', explicit: false, code: null }
    },
    [regionBossByCode],
  )

  /// 移动参数取后台配置值，停用/缺行回落到参数定义默认值。
  const moveParams = useMemo(() => {
    const of = (code: string, baseline: number) => {
      const row = playerParams.find((p) => p.param_code === code)
      return row && row.enabled !== false && row.value_num != null ? row.value_num : baseline
    }
    return {
      baseSpeed: of(
        'base_speed',
        JOURNEY_BATTLE_PARAM_INDEX['player.base_speed']?.default ?? MOVE_BASELINE.baseSpeed,
      ),
      unitsPerLi: of(
        'units_per_li',
        JOURNEY_BATTLE_PARAM_INDEX['player.units_per_li']?.default ?? MOVE_BASELINE.unitsPerLi,
      ),
    }
  }, [playerParams])

  /// 与 App 同式：锚点 NULL=600 秒，显式 0=引擎兜底 300 秒。
  const travelTargetLi = useCallback(
    (row: BossRuleRow) => {
      const raw = row.duration_target_sec
      const sec = raw === null ? 600 : raw > 0 ? raw : 300
      return Math.round(moveParams.baseSpeed * sec / moveParams.unitsPerLi)
    },
    [moveParams],
  )

  return { resolveBoss, travelTargetLi }
}
