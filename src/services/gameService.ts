import { LocalBaseService } from './tableService'
import { apiRequest } from '../utils/adminHttp'
import { successResponse, errorResponse, type ApiResponse } from '../utils/apiClient'
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
  DbGameEndlessRound,
  DbGameMode,
  DbGameItem,
  DbPointRecord,
} from '../types/database'

/// 游戏中心数据服务（13 子类继承 LocalBaseService 八法，非标聚合走专用端点）
/// 通道：本地后端 /admin/table/**（通用表层）+ /admin/game-stats/**（专用聚合）。

// 49. 游戏配置（全局）
class GameService extends LocalBaseService<DbGame> {
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
class GameDimensionService extends LocalBaseService<DbGameDimension> {
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
class GameLevelService extends LocalBaseService<DbGameLevel> {
  constructor() {
    super('game_levels', {
      defaultOrder: { column: 'level_no', ascending: true },
    })
  }

  findAllByGame(gameId: string) {
    return this.findAll((q) => q.eq('game_id', gameId))
  }

  paginateByGame(gameId: string, page: number, pageSize: number, modeId?: string | null) {
    return this.paginate(page, pageSize, (q) => {
      q = q.eq('game_id', gameId)
      if (modeId) q = q.eq('mode_id', modeId)
      return q
    })
  }
}

// 52. 成就定义（全局）
class GameAchievementService extends LocalBaseService<DbGameAchievement> {
  constructor() {
    super('game_achievements', {
      defaultOrder: { column: 'sort_order', ascending: true },
      select:
        'id,game_id,code,name,description,icon,condition,reward_points,group_key,enabled,sort_order,created_at,updated_at',
    })
  }
}

// 53. 积分奖励规则（全局）
class GameRewardRuleService extends LocalBaseService<DbGameRewardRule> {
  constructor() {
    super('game_reward_rules', {
      defaultOrder: { column: 'sort_order', ascending: true },
    })
  }
}

// 54. 游玩/成绩主记录（用户数据，后台成绩看板）
class GameScoreService extends LocalBaseService<DbGameScore> {
  constructor() {
    super('game_scores', {
      defaultOrder: { column: 'played_at', ascending: false },
    })
  }

  paginateByGame(gameId: string, page: number, pageSize: number) {
    return this.paginate(page, pageSize, (q) => q.eq('game_id', gameId))
  }

  /// 某模式关联的成绩条数（删除模式前的级联保护检查）
  async countScoresByMode(modeId: string): Promise<ApiResponse<null> & { count?: number | null }> {
    try {
      const where = JSON.stringify([{ col: 'mode_id', op: 'eq', val: modeId }])
      const data = await apiRequest<{ count: number }>(
        'GET',
        `/admin/table/game_scores/count?where=${encodeURIComponent(where)}`
      )
      return { ...successResponse(null), count: data?.count ?? 0 }
    } catch (err) {
      return { ...errorResponse(err instanceof Error ? err.message : '计数失败'), count: null }
    }
  }
}

// 55. 成绩维度值（EAV，game_score_values 无 user_id，经 score_id 关联）
class GameScoreValueService extends LocalBaseService<DbGameScoreValue> {
  constructor() {
    super('game_score_values', {
      defaultOrder: { column: 'dimension_id', ascending: true },
    })
  }

  /// 拉取某条成绩记录的维度值（按 dimension_id 升序）
  getScoreValues(scoreId: string) {
    return this.findAll((q) => q.eq('score_id', scoreId).order('dimension_id', { ascending: true }))
  }

  /// 最佳概览：按维度取全局最优 TOP N（联查主记录取 game/user/status）。
  /// 通道：本地后端 /admin/game-stats/top-by-dimension（原 PostgREST 嵌套 select）
  async findTopByDimension(dimensionId: string, ascending: boolean, limit = 100) {
    try {
      const qs = `dimension_id=${encodeURIComponent(dimensionId)}&asc=${ascending}&limit=${limit}`
      const data = await apiRequest<
        Array<{ value: number; score: { game_id: string; user_id: string; status: string; played_at: string | null } | null }>
      >('GET', `/admin/game-stats/top-by-dimension?${qs}`)
      return successResponse(data) as any
    } catch (err) {
      return errorResponse(err instanceof Error ? err.message : '查询失败') as any
    }
  }
}

// 56. 用户成就（用户数据）
class UserGameAchievementService extends LocalBaseService<DbUserGameAchievement> {
  constructor() {
    super('user_game_achievements', {
      defaultOrder: { column: 'unlocked_at', ascending: false },
    })
  }
}

// 57. 奖励领取流水（用户数据，积分发放构成/趋势用）
class GameRewardClaimService extends LocalBaseService<DbGameRewardClaim> {
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
class GameModeService extends LocalBaseService<DbGameMode> {
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
  /// 通道：本地后端 /admin/table/game_levels/count-group（原 1000/页循环全量拉取聚合）。
  async countLevelsByMode(gameId?: string): Promise<Record<string, number>> {
    try {
      const where = gameId
        ? `&where=${encodeURIComponent(JSON.stringify([{ col: 'game_id', op: 'eq', val: gameId }]))}`
        : ''
      const data = await apiRequest<Record<string, number>>(
        'GET',
        `/admin/table/game_levels/count-group?col=mode_id${where}`
      )
      const counts: Record<string, number> = {}
      for (const [key, value] of Object.entries(data || {})) {
        if (key !== '_null') counts[key] = Number(value) || 0
      }
      return counts
    } catch {
      return {}
    }
  }
}

// 58d. 无尽模式局明细（game_endless_rounds；GameScores 无尽展开表）
class GameEndlessRoundService extends LocalBaseService<DbGameEndlessRound> {
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
class GameItemService extends LocalBaseService<DbGameItem> {
  constructor() {
    super('game_items', {
      defaultOrder: { column: 'sort_order', ascending: true },
      select:
        'id,game_code,mode,item_type,name,description,icon,point_cost,per_game_limit,free_per_game,enabled,sort_order,created_at,updated_at',
    })
  }
}

// 58c. 游戏积分流水（point_records 的 game_earn/game_spend 子集；GameRewardRecords 页）
class GamePointFlowService extends LocalBaseService<DbPointRecord> {
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

/// 游戏积分流水聚合（奖励记录页「获取/消费合计」）：
/// 通道：本地后端 /admin/game-stats/flow-totals 按时间窗 SUM（数据量巨大，不做全表聚合）。
/// [fromIso]/[toIso] 为 ISO 字符串（to 为开区间上界）；error 上抛由调用方提示，
/// 不再静默兜底 0（曾把 RPC 被门禁拒绝掩盖成「显示 0」，2026-09-11 用户反馈）。
export async function getGameFlowTotals(
  fromIso?: string,
  toIso?: string
): Promise<{ earn: number; spend: number }> {
  const sp = new URLSearchParams()
  if (fromIso) sp.set('from', fromIso)
  if (toIso) sp.set('to', toIso)
  const qs = sp.toString()
  const data = await apiRequest<{ earn: number; spend: number }>(
    'GET',
    `/admin/game-stats/flow-totals${qs ? `?${qs}` : ''}`
  )
  if (!data) throw new Error('getGameFlowTotals 返回结构异常')
  return { earn: Number(data.earn ?? 0), spend: Number(data.spend ?? 0) }
}
