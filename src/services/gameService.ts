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
  DbGameMode,
  DbGameItem,
  DbPointRecord,
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
      select:
        'id,code,name,icon,description,engine,enabled,sort_order,config,version,level_selectable,level_select_mode,created_at,updated_at',
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

  paginateByGame(gameId: string, page: number, pageSize: number, modeId?: string | null) {
    return this.paginate(page, pageSize, (q) => {
      q = q.eq('game_id', gameId)
      if (modeId) q = q.eq('mode_id', modeId)
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
        'id,game_id,code,name,description,icon,condition,reward_points,enabled,sort_order,created_at,updated_at',
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
}

// 51c. 游戏模式（模式 ↔ play_kind 唯一链接；GameModes 页）
class GameModeService extends BaseService<DbGameMode> {
  constructor() {
    super('game_modes', {
      defaultOrder: { column: 'sort_order', ascending: true },
      select:
        'id,game_id,code,name,icon,description,play_kind,config,sort_order,enabled,created_at,updated_at',
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
  /// range(0,1999) 破 PostgREST 默认 1000 行截断（game_levels 全量 1200 行）。
  async countLevelsByMode(gameId?: string): Promise<Record<string, number>> {
    const res = await apiQuery<{ mode_id: string | null }[]>(
      () => {
        const q = supabase.from('game_levels').select('mode_id').range(0, 1999)
        return gameId ? q.eq('game_id', gameId) : q
      },
      'GameModeService.countLevelsByMode',
    )
    const counts: Record<string, number> = {}
    for (const r of res.data ?? []) {
      if (r.mode_id) counts[r.mode_id] = (counts[r.mode_id] ?? 0) + 1
    }
    return counts
  }
}

// 58b. 游戏道具目录（game_items；GameItems 页）
class GameItemService extends BaseService<DbGameItem> {
  constructor() {
    super('game_items', {
      defaultOrder: { column: 'sort_order', ascending: true },
      select:
        'id,game_code,mode,item_type,name,description,point_cost,per_game_limit,free_per_game,enabled,sort_order,created_at,updated_at',
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

  /// 游戏相关流水分页（type ∈ GAME_FLOW_TYPES，与 App 端发放/消费口径一致）
  paginateGameFlow(page: number, pageSize: number) {
    return this.paginate(page, pageSize, (q) => q.in('type', [...GAME_FLOW_TYPES]))
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
export const userGameAchievementService = new UserGameAchievementService()
export const gameRewardClaimService = new GameRewardClaimService()

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
