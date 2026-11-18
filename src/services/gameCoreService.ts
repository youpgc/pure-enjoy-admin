import { BaseService, apiQuery, type SupabaseQuery } from '../utils/apiClient'
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
  DbGameEndlessRound,
  DbGameMode,
  DbGameItem,
  DbPointRecord,
} from '../types/database'

/// 游戏中心数据服务：游戏 / 关卡 / 模式 / 成绩 / 成就 / 奖励规则 / 道具 / 积分流水，
/// 各表继承 BaseService 八法，非标查询与聚合封装在类内，页面禁止裸 supabase.from。

// 49. 游戏配置（全局）
class GameService extends BaseService<DbGame> {
  constructor() {
    super('games', {
      defaultOrder: { column: 'sort_order', ascending: true },
      // 必须含 level_selectable / level_select_mode：否则列表永远显示「不可/—」，
      // 且编辑回显拿不到原值 → 保存把 level_selectable 覆写成 false、level_select_mode
      // 缺失触发 check 约束报错（选关/选关模式「修改未生效 + 报错」根因）。
      // intro/rules：游戏介绍与规则（说明配置化，缺列会导致编辑回显空并覆写清空云端值）。
      // test_only：测试环境标记，缺列会致编辑回显 false 并覆写清掉云端值。
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
    /// 关卡 id 白名单（西行分类筛选：先由 journey_levels 子表筛出匹配
    /// 的 level_id 集合再传入；空数组表示无匹配，undefined 表示不过滤）
    idSet?: string[],
  ) {
    return this.paginate(page, pageSize, (q) => {
      q = q.eq('game_id', gameId)
      if (modeId) q = q.eq('mode_id', modeId)
      if (idSet) q = q.in('id', idSet.length ? idSet : ['00000000-0000-0000-0000-000000000000'])
      return q
    })
  }

  /// 每个模式的首关（level_no = 1）：成绩看板在成绩行无 level_id 时，
  /// 用所属模式的首关 config/target 兜底推导「通关条件」。
  /// 只取这一档关卡（而非全量关卡表）即可覆盖所有模式。
  findBaseLevels() {
    return this.findAll((q) => q.eq('level_no', 1))
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

  /// 成绩分页（关卡内嵌）：DB 侧按 level_id 关联 game_levels，只随当页
  /// 记录返回其引用的关卡（名 / config / target），供看板「关卡」与
  /// 「通关条件」两列直接消费——避免前端为拿关卡名而拉全量关卡表。
  /// 内嵌值为 many-to-one 单对象（level_id 为空时为 null）。
  paginateWithLevels(
    page: number,
    pageSize: number,
    query?: (q: SupabaseQuery) => SupabaseQuery
  ) {
    return this.paginate(page, pageSize, query, {
      select:
        'id,user_id,game_id,level_id,mode_id,status,duration_ms,condition_text,run_detail,played_at,created_at,' +
        'game_levels(id,name,level_no,config,target)',
    })
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
  /// 聚合查询在 service 层直连 supabase（页面禁止裸写 supabase.from，与 rpc 调用同口径）。
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
  /// **必须分页拉取**：PostgREST 服务端 `db-max-rows=1000` 会静默钳制
  /// `range(0,1999)` 的上限——game_levels 超过 1000 行时，排在 1000 行之后的
  /// 模式计数会被截断。按 1000/页循环直至不足一页。
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
  /// undefined→两类全取）。分页 total 取「两类合计」，若在本地按当前页数据 filter，
  /// 消费记录稀疏或不在当前页时列表会显示为空。
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
