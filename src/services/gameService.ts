import { BaseService, apiQuery } from '../utils/apiClient'
import { supabase } from '../utils/supabase'
import { GAME_FLOW_TYPES } from '../constants/points'
import type {
  DbGame,
  DbGameDimension,
  DbGameLevel,
  DbGameAchievement,
  DbGameRewardRule,
  DbGameScore,
  DbGameScoreValue,
  DbUserGameAchievement,
  DbGameRewardClaim,
  DbGameBestScore,
  DbGameEndlessRound,
  DbGameMode,
  DbGameItem,
  DbPointRecord,
  DbJourneyRegion,
  DbJourneyMapObject,
  DbJourneyHeatZone,
  DbJourneyWave,
  DbJourneyMonster,
  DbJourneyWeapon,
  DbJourneyWeaponLevel,
  DbJourneyEvoRecipe,
  DbJourneyPickup,
  DbJourneyDrop,
  DbJourneyCharacter,
  DbJourneyTalent,
  DbJourneyRelicUnlock,
  DbJourneyGlobals,
  DbJourneyWeaponSlot,
} from '../types/database'

/// 游戏中心数据服务（9 表各继承 BaseService 八法，非标聚合走 RPC/专用方法）
/// 所有写操作经 BaseService（统一 audit/error），页面禁止裸 supabase.from。

// 49. 游戏配置（全局）
class GameService extends BaseService<DbGame> {
  constructor() {
    super('games', {
      defaultOrder: { column: 'sort_order', ascending: true },
      // 必须含 level_selectable / level_select_mode：否则列表永远显示「不可/—」，
      // 且编辑回显拿不到原值 → 保存把 level_selectable 覆写成 false、level_select_mode
      // 缺失触发 check 约束报错（选关/选关模式「修改未生效 + 报错」根因）。
      // intro/rules：游戏介绍与规则（说明配置化，缺列会导致编辑回显空并覆写清空云端值）。
      // test_only：测试环境标记（2026-09-10），缺列会致编辑回显 false 并覆写清掉云端值。
      select:
        'id,code,name,icon,description,intro,rules,engine,enabled,sort_order,config,version,level_selectable,level_select_mode,test_only,created_at,updated_at',
    })
  }
}

// 50. 成绩维度配置（按游戏）
class GameDimensionService extends BaseService<DbGameDimension> {
  constructor() {
    super('game_dimensions', {
      defaultOrder: { column: 'sort_order', ascending: true },
    })
  }

  /// 按游戏拉取全部维度（维度配置用，不受分页影响）
  findAllByGame(gameId: string) {
    return this.findAll((q) => q.eq('game_id', gameId))
  }

  /// 按游戏分页（页面用）
  paginateByGame(gameId: string, page: number, pageSize: number) {
    return this.paginate(page, pageSize, (q) => q.eq('game_id', gameId))
  }
}

// 51. 关卡配置（按游戏，含 count_for_daily_clear）
class GameLevelService extends BaseService<DbGameLevel> {
  constructor() {
    super('game_levels', {
      defaultOrder: { column: 'level_no', ascending: true },
    })
  }

  findAllByGame(gameId: string) {
    return this.findAll((q) => q.eq('game_id', gameId))
  }

  paginateByGame(
    gameId: string,
    page: number,
    pageSize: number,
    modeId?: string | null,
    /// config jsonb 条件过滤（西行分类筛选）：key=顶层键，值 eq 匹配
    configFilter?: { key: string; value: string },
  ) {
    return this.paginate(page, pageSize, (q) => {
      q = q.eq('game_id', gameId)
      if (modeId) q = q.eq('mode_id', modeId)
      if (configFilter) q = q.eq(`config->>${configFilter.key}`, configFilter.value)
      return q
    })
  }
}

// 52. 成就定义（全局）
class GameAchievementService extends BaseService<DbGameAchievement> {
  constructor() {
    super('game_achievements', {
      defaultOrder: { column: 'sort_order', ascending: true },
      select:
        'id,game_id,code,name,description,icon,condition,reward_points,group_key,enabled,sort_order,created_at,updated_at',
    })
  }
}

// 53. 积分奖励规则（全局）
class GameRewardRuleService extends BaseService<DbGameRewardRule> {
  constructor() {
    super('game_reward_rules', {
      defaultOrder: { column: 'sort_order', ascending: true },
    })
  }
}

// 54. 游玩/成绩主记录（用户数据，后台成绩看板）
class GameScoreService extends BaseService<DbGameScore> {
  constructor() {
    super('game_scores', {
      defaultOrder: { column: 'played_at', ascending: false },
    })
  }

  paginateByGame(gameId: string, page: number, pageSize: number) {
    return this.paginate(page, pageSize, (q) => q.eq('game_id', gameId))
  }

  /// 某模式关联的成绩条数（删除模式前的级联保护检查）
  countScoresByMode(modeId: string) {
    return apiQuery<null>(
      () =>
        supabase
          .from('game_scores')
          .select('id', { count: 'exact', head: true })
          .eq('mode_id', modeId),
      'GameScoreService.countScoresByMode',
    )
  }
}

// 55. 成绩维度值（EAV，game_score_values 无 user_id，经 score_id 关联）
class GameScoreValueService extends BaseService<DbGameScoreValue> {
  constructor() {
    super('game_score_values', {
      defaultOrder: { column: 'dimension_id', ascending: true },
    })
  }

  /// 拉取某条成绩记录的维度值（按 dimension_id 升序）
  getScoreValues(scoreId: string) {
    return this.findAll((q) => q.eq('score_id', scoreId).order('dimension_id', { ascending: true }))
  }

  /// 最佳概览：按维度取全局最优 TOP N（EAV 联查主记录取 game/user/status）。
  /// 2026-09-10 审查：由 GameScores 页内裸 supabase.from 下沉到 service 层
  /// （service 层允许直连 supabase，页面禁止——与 rpc 调用同口径）。
  async findTopByDimension(dimensionId: string, ascending: boolean, limit = 100) {
    const { data, error } = await supabase
      .from('game_score_values')
      .select('value, score:score_id(game_id, user_id, status, played_at)')
      .eq('dimension_id', dimensionId)
      .order('value', { ascending })
      .limit(limit)
    if (error) {
      return { success: false, errorMessage: error.message, data: null } as any
    }
    return { success: true, errorMessage: null, data: data as any } as any
  }
}

// 56. 用户成就（用户数据）
class UserGameAchievementService extends BaseService<DbUserGameAchievement> {
  constructor() {
    super('user_game_achievements', {
      defaultOrder: { column: 'unlocked_at', ascending: false },
    })
  }
}

// 57. 奖励领取流水（用户数据，积分发放构成/趋势用）
class GameRewardClaimService extends BaseService<DbGameRewardClaim> {
  constructor() {
    super('game_reward_claims', {
      defaultOrder: { column: 'claimed_at', ascending: false },
    })
  }

  /// 带时间窗分页（claimed_at，to 为开区间上界），与积分流水/统计卡同口径
  paginateClaims(page: number, pageSize: number, fromIso?: string, toIso?: string) {
    return this.paginate(page, pageSize, (q) => {
      let query = q
      if (fromIso) query = query.gte('claimed_at', fromIso)
      if (toIso) query = query.lt('claimed_at', toIso)
      return query
    })
  }
}

// 51c. 游戏模式（模式 ↔ play_kind 唯一链接；GameModes 页）
class GameModeService extends BaseService<DbGameMode> {
  constructor() {
    super('game_modes', {
      defaultOrder: { column: 'sort_order', ascending: true },
      select:
        'id,game_id,code,name,icon,description,summary,guide,play_kind,config,sort_order,enabled,created_at,updated_at',
    })
  }

  /// 全量或按游戏拉取（gameId 为空 = 全部，列表页全量视图用）
  findAllModes(gameId?: string) {
    return this.findAll((q) => (gameId ? q.eq('game_id', gameId) : q))
  }

  /// 行内启停（App 端配置快照 TTL 30s 同步）
  updateEnabled(id: string, enabled: boolean) {
    return this.update(id, {
      enabled,
      updated_at: new Date().toISOString(),
    } as any)
  }

  /// 排序对调（上移/下移：两行 sort_order 互换；两次 update 非原子，
  /// 与页面原行为一致，失败即中断并提示）
  async swapSortOrder(
    selfId: string,
    selfSort: number,
    neighborId: string,
    neighborSort: number,
  ) {
    const r1 = await this.update(selfId, { sort_order: neighborSort } as any)
    if (!r1.success) return r1
    return this.update(neighborId, { sort_order: selfSort } as any)
  }

  /// 每模式关卡数（本地聚合，避免 N+1）。
  ///
  /// **必须分页拉取（2026-09-07 实证）**：`range(0,1999)` 的上限会被 PostgREST
  /// 服务端 `db-max-rows=1000` 静默钳制——game_levels 全量 1200 行时，按任意
  /// 排序落在第 1000 行之后的模式计数被截断成 0/部分值（表现为「关卡数 0/5」
  /// 的假象残留）。按 1000/页循环直至不足一页。
  async countLevelsByMode(gameId?: string): Promise<Record<string, number>> {
    const counts: Record<string, number> = {}
    const pageSize = 1000
    let offset = 0
    while (true) {
      const res = await apiQuery<{ mode_id: string | null }[]>(
        () => {
          const q = supabase
            .from('game_levels')
            .select('mode_id')
            .range(offset, offset + pageSize - 1)
          return gameId ? q.eq('game_id', gameId) : q
        },
        'GameModeService.countLevelsByMode',
      )
      const rows = res.data ?? []
      for (const r of rows) {
        if (r.mode_id) counts[r.mode_id] = (counts[r.mode_id] ?? 0) + 1
      }
      if (rows.length < pageSize) break
      offset += pageSize
    }
    return counts
  }
}

// 58d. 无尽模式局明细（game_endless_rounds；GameScores 无尽展开表）
class GameEndlessRoundService extends BaseService<DbGameEndlessRound> {
  constructor() {
    super('game_endless_rounds', {
      defaultOrder: { column: 'round_no', ascending: true },
    })
  }

  /// 按会话主记录取局明细（round_no 升序）
  getRoundsByScoreId(scoreId: string) {
    return this.findAll((q) =>
      q
        .eq('score_id', scoreId)
        .order('round_no', { ascending: true })
    )
  }
}

// 58b. 游戏道具目录（game_items；GameItems 页）
class GameItemService extends BaseService<DbGameItem> {
  constructor() {
    super('game_items', {
      defaultOrder: { column: 'sort_order', ascending: true },
      select:
        'id,game_code,mode,item_type,name,description,icon,point_cost,per_game_limit,free_per_game,enabled,sort_order,created_at,updated_at',
    })
  }
}

// 58c. 游戏积分流水（point_records 的 game_earn/game_spend 子集；GameRewardRecords 页）
class GamePointFlowService extends BaseService<DbPointRecord> {
  constructor() {
    super('point_records', {
      defaultOrder: { column: 'created_at', ascending: false },
    })
  }

  /// 游戏相关流水分页（type ∈ GAME_FLOW_TYPES，与 App 端发放/消费口径一致）。
  ///
  /// [flowType]：类型筛选**必须下推到查询**（'earn'→game_earn / 'spend'→game_spend /
  /// undefined→两类全取）。此前由页面在**当前页数据**上本地 filter，而分页 total 取的是
  /// 「两类合计」→ 消费记录稀疏或不在当前页时列表显示空（2026-09-15 用户反馈
  /// 「筛选消费数据无数据」的根因）。
  /// [fromIso]/[toIso] 时间窗（created_at，to 为开区间上界），与统计卡聚合同口径。
  paginateGameFlow(
    page: number,
    pageSize: number,
    fromIso?: string,
    toIso?: string,
    flowType?: 'earn' | 'spend',
  ) {
    return this.paginate(page, pageSize, (q) => {
      const types: string[] = flowType
        ? [flowType === 'earn' ? 'game_earn' : 'game_spend']
        : [...GAME_FLOW_TYPES]
      let query = q.in('type', types)
      if (fromIso) query = query.gte('created_at', fromIso)
      if (toIso) query = query.lt('created_at', toIso)
      return query
    })
  }
}

// ==================== 西行（journey）配置服务（journey_* 静态配置表） ====================
// 表结构以 /workspace/sql journey DDL 为准；SQL 执行前页面查询会得到空表/报错提示。

// J1. 区域（关卡分组）
class JourneyRegionService extends BaseService<DbJourneyRegion> {
  constructor() {
    super('journey_regions', { defaultOrder: { column: 'seq', ascending: true } })
  }
}

// J2. 关卡配置已退役：西行关卡统一走 game_levels（GameLevelService），
// 西行专属属性存 game_levels.config jsonb（region_code/level_kind 等）。

// J3. 地图参照物（按关卡）
class JourneyMapObjectService extends BaseService<DbJourneyMapObject> {
  constructor() {
    super('journey_map_objects', { defaultOrder: { column: 'kind', ascending: true } })
  }
}

// J4. 密度热区（按关卡）
class JourneyHeatZoneService extends BaseService<DbJourneyHeatZone> {
  constructor() {
    super('journey_heat_zones', { defaultOrder: { column: 'kind', ascending: true } })
  }
}

// J5. 波次（按关卡时间轴）
class JourneyWaveService extends BaseService<DbJourneyWave> {
  constructor() {
    super('journey_waves', { defaultOrder: { column: 'seq', ascending: true } })
  }
}

// J6. 怪物静态属性
class JourneyMonsterService extends BaseService<DbJourneyMonster> {
  constructor() {
    super('journey_monsters', { defaultOrder: { column: 'code', ascending: true } })
  }
}

// J7. 法宝主表（三分类合一；被动加持=category passive + attr_key/value）
class JourneyWeaponService extends BaseService<DbJourneyWeapon> {
  constructor() {
    super('journey_weapons', { defaultOrder: { column: 'code', ascending: true } })
  }
}

// J8. 法宝分级数值（1~8 级）
class JourneyWeaponLevelService extends BaseService<DbJourneyWeaponLevel> {
  constructor() {
    super('journey_weapon_levels', { defaultOrder: { column: 'lv', ascending: true } })
  }

  findAllByWeapon(weaponId: string) {
    return this.findAll((q) => q.eq('weapon_id', weaponId))
  }
}

// J9. 炼化配方（表顺序=宝箱多命中优先级）
class JourneyEvoRecipeService extends BaseService<DbJourneyEvoRecipe> {
  constructor() {
    super('journey_evo_recipes', { defaultOrder: { column: 'seq', ascending: true } })
  }
}

// J10. 拾取物
class JourneyPickupService extends BaseService<DbJourneyPickup> {
  constructor() {
    super('journey_pickups', { defaultOrder: { column: 'code', ascending: true } })
  }
}

// J11. 掉落表（按 table_code 聚组）
class JourneyDropService extends BaseService<DbJourneyDrop> {
  constructor() {
    super('journey_drops', { defaultOrder: { column: 'table_code', ascending: true } })
  }
}

// J12. 角色（解锁=通关关卡号+功德门槛）
class JourneyCharacterService extends BaseService<DbJourneyCharacter> {
  constructor() {
    super('journey_characters', { defaultOrder: { column: 'unlock_level_no', ascending: true } })
  }
}

// J13. 天赋层（5 系×(16 常规+1 标志层)）
class JourneyTalentService extends BaseService<DbJourneyTalent> {
  constructor() {
    super('journey_talents', { defaultOrder: { column: 'seq', ascending: true } })
  }
}

// J14. 图鉴解锁（达成资格+功德定价）
class JourneyRelicUnlockService extends BaseService<DbJourneyRelicUnlock> {
  constructor() {
    super('journey_relic_unlocks', { defaultOrder: { column: 'seq', ascending: true } })
  }
}

export const gameService = new GameService()
export const gameDimensionService = new GameDimensionService()
export const gameLevelService = new GameLevelService()
export const gameModeService = new GameModeService()
export const gameAchievementService = new GameAchievementService()
export const gameRewardRuleService = new GameRewardRuleService()
export const gameItemService = new GameItemService()
export const gamePointFlowService = new GamePointFlowService()
export const gameScoreService = new GameScoreService()
export const gameScoreValueService = new GameScoreValueService()
export const gameEndlessRoundService = new GameEndlessRoundService()
export const userGameAchievementService = new UserGameAchievementService()
export const gameRewardClaimService = new GameRewardClaimService()
export const journeyRegionService = new JourneyRegionService()
export const journeyMapObjectService = new JourneyMapObjectService()
export const journeyHeatZoneService = new JourneyHeatZoneService()
export const journeyWaveService = new JourneyWaveService()
export const journeyMonsterService = new JourneyMonsterService()
export const journeyWeaponService = new JourneyWeaponService()
export const journeyWeaponLevelService = new JourneyWeaponLevelService()
export const journeyEvoRecipeService = new JourneyEvoRecipeService()
export const journeyPickupService = new JourneyPickupService()
export const journeyDropService = new JourneyDropService()
export const journeyCharacterService = new JourneyCharacterService()
export const journeyTalentService = new JourneyTalentService()
export const journeyRelicUnlockService = new JourneyRelicUnlockService()

// J15. 全局参数（单行表：id 恒为 1；同屏怪上限等运营参数）
class JourneyGlobalsService extends BaseService<DbJourneyGlobals> {
  constructor() {
    super('journey_globals', { defaultOrder: { column: 'id', ascending: true } })
  }

  /// 读取单行（表未就绪/行缺失时返回 null，不抛异常）
  async findSingleton(): Promise<DbJourneyGlobals | null> {
    const res = await this.findAll()
    return res.data?.[0] ?? null
  }
}
export const journeyGlobalsService = new JourneyGlobalsService()

/// 游戏最佳成绩聚合（走 get_game_best_scores RPC）。
/// 注意：函数内按 get_user_business_id() 过滤，仅返回当前登录用户本人数据；
/// 后台全局概览请直接聚合 game_scores，勿依赖本方法。
export const getGameBestScores = (
  pGameId?: string | null
): Promise<{ data: DbGameBestScore[] | null; error: unknown }> =>
  supabase.rpc('get_game_best_scores', { p_game_id: pGameId ?? null } as any) as unknown as Promise<{
    data: DbGameBestScore[] | null
    error: unknown
  }>

/// 游戏积分流水聚合（奖励记录页「获取/消费合计」）：
/// 走 get_game_flow_totals RPC 按时间窗 SUM（数据量巨大，不做全表聚合）。
/// [fromIso]/[toIso] 为 ISO 字符串（to 为开区间上界）；error 上抛由调用方提示，
/// 不再静默兜底 0（曾把 RPC 被门禁拒绝掩盖成「显示 0」，2026-09-11 用户反馈）。
export async function getGameFlowTotals(
  fromIso?: string,
  toIso?: string
): Promise<{ earn: number; spend: number }> {
  const { data, error } = await (supabase.rpc('get_game_flow_totals', {
    p_from: fromIso ?? null,
    p_to: toIso ?? null,
  } as any) as any)
  if (error) throw new Error(error.message || 'get_game_flow_totals 调用失败')
  if (!Array.isArray(data)) throw new Error('get_game_flow_totals 返回结构异常')
  const earn = Number(data.find((r: any) => r.flow_type === 'game_earn')?.total ?? 0)
  const spend = Number(data.find((r: any) => r.flow_type === 'game_spend')?.total ?? 0)
  return { earn, spend }
}

/// 游戏排行榜（get_game_leaderboard RPC）。
/// security definer 跨玩家聚合：仅返回昵称/头像/最佳值/游玩次数/最近游玩，
/// 不含其他用户敏感字段；[pScope] 'all'=总榜 | 'week'=周榜（北京自然周）；
/// [pModeId] null=全模式合计；[pDimension] 为该游戏主维度码（is_primary）。
export interface GameLeaderboardRow {
  rank: number
  user_id: string
  nickname: string | null
  avatar_url: string | null
  best_value: number
  play_count: number
  last_played_at: string | null
  is_me: boolean
}

export async function getGameLeaderboard(
  pGameId: string,
  pDimension: string,
  pScope: 'all' | 'week',
  pModeId?: string | null,
  pLimit = 50
): Promise<GameLeaderboardRow[]> {
  const { data, error } = await (supabase.rpc('get_game_leaderboard', {
    p_game_id: pGameId,
    p_dimension: pDimension,
    p_scope: pScope,
    p_mode_id: pModeId ?? null,
    p_limit: pLimit,
  } as any) as any)
  if (error) throw new Error(error.message || 'get_game_leaderboard 调用失败')
  return (Array.isArray(data) ? data : []) as GameLeaderboardRow[]
}

// J3. 武器维度槽定义（6 主动槽=维度槽：属性/特效，等级上限后台可调）
class JourneyWeaponSlotService extends BaseService<DbJourneyWeaponSlot> {
  constructor() {
    super('journey_weapon_slots', {
      defaultOrder: { column: 'sort_order', ascending: true },
    })
  }
}
export const journeyWeaponSlotService = new JourneyWeaponSlotService()
