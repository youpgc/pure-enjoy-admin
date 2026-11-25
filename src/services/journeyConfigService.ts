import { BaseService, successResponse, errorResponse, handleApiError } from '../utils/apiClient'
import type { SupabaseQuery, ApiResponse } from '../utils/apiClient'
import type { EndlessRebuildRow } from '../utils/journeyExpPool'
import { supabase } from '../utils/supabase'
import type { DateRangeValue } from '../components/common/DateRangeFilter'
import type {
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
  DbJourneyDailyMap,
  DbJourneyEndlessWave,
  DbJourneyWeaponParam,
  DbJourneyMonsterParam,
  DbJourneyCharacter,
  DbJourneyRelicUnlock,
  DbJourneyGlobals,
  DbJourneyWeaponSlot,
  DbJourneyUpgradeCard,
  DbJourneyMeritRecord,
  DbJourneyRun,
  DbJourneyProgress,
  DbJourneyTalentBranch,
  DbJourneyLevel,
  DbJourneyCharacterAuraParam,
  DbJourneyRealmTitle,
} from '../types/database'

/// 西行管理数据服务：journey_* 静态配置表与只读流水，各表继承 BaseService 八法。
/// 表结构以 journey DDL 为准；表未部署时页面会得到空表或报错提示。

// ==================== 西行（journey）配置服务（journey_* 静态配置表） ====================
// 表结构以 /workspace/sql journey DDL 为准；SQL 执行前页面查询会得到空表/报错提示。

// J1. 区域（关卡分组）
class JourneyRegionService extends BaseService<DbJourneyRegion> {
  constructor() {
    super('journey_regions', { defaultOrder: { column: 'seq', ascending: true } })
  }
}

// J2. 关卡配置已退役：西行关卡统一走 game_levels（GameLevelService），
// 西行专属属性存 journey_levels 子表（J12a，region_code/level_kind 等）。

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

// J12a. 西行关卡专属属性（journey_levels：一行一关，由 config jsonb 拆列；
//       level_id=game_levels.id，后台关卡表单按关 upsert）
class JourneyLevelService extends BaseService<DbJourneyLevel> {
  constructor() {
    super('journey_levels', { defaultOrder: { column: 'level_id', ascending: true } })
  }

  /// 按西行分类筛选（region_code / level_kind）取匹配的 level_id 集合。
  /// 全表行数=关卡数（约 81），一次取回在内存过滤，避免 embedded join 的
  /// 复杂查询语法；返回值传给 gameLevelService.paginateByGame 作白名单。
  async filterLevelIds(
    filter: { key: 'region_code' | 'level_kind'; value: string } | undefined,
  ): Promise<ApiResponse<string[]>> {
    try {
      const res = await this.findAll()
      if (!res.success) return errorResponse<string[]>(res.errorMessage ?? 'journey_levels 查询失败')
      const rows = (res.data ?? []).filter(
        (row) => !filter || row[filter.key] === filter.value,
      )
      return successResponse(rows.map((row) => row.level_id))
    } catch (err) {
      return errorResponse<string[]>(handleApiError(err, 'journey_levels.filterLevelIds'))
    }
  }

  /// 按关卡 id 集合批量读取属性，返回 level_id→属性 映射（列表合并展示用）。
  async findMapByLevels(levelIds: string[]): Promise<Map<string, DbJourneyLevel>> {
    if (levelIds.length === 0) return new Map()
    const res = await this.findAll((q) => q.in('level_id', levelIds))
    return new Map((res.data ?? []).map((row) => [row.level_id, row]))
  }

  /// 按关卡 id upsert（level_id 为主键，冲突即更新）；行缺失字段不写，
  /// 由调用方组装完整属性对象。
  async saveByLevel(levelId: string, values: Partial<DbJourneyLevel>) {
    try {
      const { error } = await (supabase.from('journey_levels') as any)
        .upsert({ level_id: levelId, ...values, updated_at: new Date().toISOString() },
          { onConflict: 'level_id' })
      if (error) throw error
      return successResponse(true)
    } catch (err) {
      return errorResponse<boolean>(handleApiError(err, 'journey_levels.saveByLevel'))
    }
  }
}

// J12b. 角色光环参数（journey_character_aura_params：一行一键）
class JourneyCharacterAuraParamService extends BaseService<DbJourneyCharacterAuraParam> {
  constructor() {
    super('journey_character_aura_params', {
      defaultOrder: { column: 'character_code', ascending: true },
    })
  }
}

// J12c. 角色境界名号（journey_realm_titles：一行一档，tier 0~8）
class JourneyRealmTitleService extends BaseService<DbJourneyRealmTitle> {
  constructor() {
    super('journey_realm_titles', {
      defaultOrder: { column: 'character_code', ascending: true },
    })
  }
}

// J14. 图鉴解锁（达成资格+功德定价）
class JourneyRelicUnlockService extends BaseService<DbJourneyRelicUnlock> {
  constructor() {
    super('journey_relic_unlocks', { defaultOrder: { column: 'seq', ascending: true } })
  }
}

// J15. 每日游历地图（后台可配地图列表；App 端每日任选一图，进入即计次）
class JourneyDailyMapService extends BaseService<DbJourneyDailyMap> {
  constructor() {
    super('journey_daily_maps', { defaultOrder: { column: 'sort', ascending: true } })
  }
}

// J16. 无尽妖潮波次（独立表单；wave_no 1..99，boss_count>0 即妖王波，妖王种类引擎随机）
class JourneyEndlessWaveService extends BaseService<DbJourneyEndlessWave> {
  constructor() {
    super('journey_endless_waves', { defaultOrder: { column: 'wave_no', ascending: true } })
  }

  /// 按经验池曲线批量重算 99 波（只写数量/精英数/倍率，妖王波怪种保留）。
  async rebuildByExpPool(rows: EndlessRebuildRow[]) {
    try {
      const { error } = await (supabase.from('journey_endless_waves') as any)
        .upsert(rows, { onConflict: 'wave_no' })
      if (error) throw error
      return successResponse(true)
    } catch (err) {
      return errorResponse<boolean>(handleApiError(err, 'journey_endless_waves.rebuildByExpPool'))
    }
  }
}

// J17. 法宝数值参数（journey_weapon_params：weapon_id+code 一行一键；
//      App 引擎按法宝 code+参数 code 读取，行缺失回落内置兜底）
class JourneyWeaponParamService extends BaseService<DbJourneyWeaponParam> {
  constructor() {
    super('journey_weapon_params', { defaultOrder: { column: 'weapon_id', ascending: true } })
  }
}

// J18. 妖王能力参数（journey_monster_params：monster_id+code 一行一键；
//      App 引擎按怪物 code+参数 code 读取，行缺失回落内置兜底）
class JourneyMonsterParamService extends BaseService<DbJourneyMonsterParam> {
  constructor() {
    super('journey_monster_params', { defaultOrder: { column: 'monster_id', ascending: true } })
  }

  /// 整包保存：有值行一次 upsert（单条语句，失败整批回滚），留空行一次删除。
  /// 先写后删：写失败不改动删行；删失败保留旧值，避免参数整包丢失。
  async saveBundle(
    upserts: { monster_id: string; code: string; value_num: number }[],
    deleteIds: string[],
  ) {
    try {
      if (upserts.length > 0) {
        const { error } = await (supabase.from('journey_monster_params') as any)
          .upsert(upserts, { onConflict: 'monster_id,code' })
        if (error) throw error
      }
      if (deleteIds.length > 0) {
        const { error } = await (supabase.from('journey_monster_params') as any)
          .delete().in('id', deleteIds)
        if (error) throw error
      }
      return successResponse(true)
    } catch (err) {
      return errorResponse<boolean>(handleApiError(err, 'journey_monster_params.saveBundle'))
    }
  }
}

// 通用战斗参数行（journey_battle_params）。表由
// /workspace/sql/pending/feature_journey_battle_params_20261117.sql 建立，
// 生成类型尚未随 DDL 刷新，此处按该脚本列定义本地声明，不臆测 database.ts。
export interface DbJourneyBattleParam {
  id: string
  group_code: string
  param_code: string
  value_num: number | null
  value_text: string | null
  enabled: boolean
  remark: string | null
}

// J19. 通用战斗参数（group_code+param_code 一行一参数；
//      App 引擎按分组+语义键读取，行缺失/停用回落内置常量）
class JourneyBattleParamService extends BaseService<DbJourneyBattleParam> {
  constructor() {
    super('journey_battle_params', {
      defaultOrder: { column: 'group_code', ascending: true },
    })
  }
}

// J17. 功德流水（append-only 只读；source_type 三类，balance_after 余额快照）
class JourneyMeritRecordService extends BaseService<DbJourneyMeritRecord> {
  constructor() {
    super('journey_merit_records', {
      defaultOrder: { column: 'created_at', ascending: false },
      select: 'id,user_id,delta,balance_after,source_type,ref_type,ref_id,remark,created_at',
    })
  }

  paginateRecords(
    page: number,
    pageSize: number,
    options?: { sourceType?: string; userIds?: string[]; createdRange?: DateRangeValue | null }
  ) {
    return this.paginate(page, pageSize, (q) => {
      let builder = q
      if (options?.sourceType) builder = builder.eq('source_type', options.sourceType)
      if (options?.userIds && options.userIds.length > 0) {
        builder = builder.in('user_id', options.userIds)
      }
      if (options?.createdRange) {
        builder = builder
          .gte('created_at', options.createdRange.start)
          .lte('created_at', options.createdRange.end)
      }
      return builder
    })
  }
}

// J18. 对局流水（只读；一场对局一条）
class JourneyRunService extends BaseService<DbJourneyRun> {
  constructor() {
    super('journey_runs', {
      defaultOrder: { column: 'created_at', ascending: false },
      select: 'id,user_id,level_no,kills,merit_gained,duration_ms,cleared,type,name,created_at,run_detail',
    })
  }

  paginateRuns(
    page: number,
    pageSize: number,
    options?: { userIds?: string[]; levelNo?: number; cleared?: boolean }
  ) {
    return this.paginate(page, pageSize, (q) => {
      let builder = q
      if (options?.userIds && options.userIds.length > 0) {
        builder = builder.in('user_id', options.userIds)
      }
      if (options?.levelNo !== undefined) builder = builder.eq('level_no', options.levelNo)
      if (options?.cleared !== undefined) builder = builder.eq('cleared', options.cleared)
      return builder
    })
  }
}

// J19. 五行天赋分支静态配置（Admin 可编辑；v4 分支树制，character_code+element+branch_type 唯一）
class JourneyTalentBranchService extends BaseService<DbJourneyTalentBranch> {
  constructor() {
    super('journey_talent_branches', { defaultOrder: { column: 'seq', ascending: true } })
  }

  /// 双键排序：character_code asc → seq asc（查询链上先角色后 seq，
  /// BaseService defaultOrder 的 seq 排在其后属冗余、不影响结果）
  private ordered(query?: (q: SupabaseQuery) => SupabaseQuery): (q: SupabaseQuery) => SupabaseQuery {
    return (q) => {
      const builder = q
        .order('character_code', { ascending: true })
        .order('seq', { ascending: true })
      return query ? query(builder) : builder
    }
  }

  findAll(query?: (q: SupabaseQuery) => SupabaseQuery) {
    return super.findAll(this.ordered(query))
  }

  paginate(page: number, pageSize: number, query?: (q: SupabaseQuery) => SupabaseQuery) {
    return super.paginate(page, pageSize, this.ordered(query))
  }
}

// J20. 局外进度快照（服务端化：一行=一个用户，user_id 为主键；Admin 只读）
class JourneyProgressService extends BaseService<DbJourneyProgress> {
  constructor() {
    super('journey_progress', {
      defaultOrder: { column: 'updated_at', ascending: false },
      select:
        'user_id,merit_balance,farthest_level_no,total_kills,total_merit_earned,talent_pool,talent_levels,unlocked_characters,unlocked_weapons,selected_character,last_daily_date,updated_at',
    })
  }

  /// 分页拉取进度快照（updated_at desc）；表未建/查询失败时 BaseService 返回
  /// success=false，由页面兜底显示空态与提示
  listJourneyProgress(options: { page: number; pageSize: number }) {
    return this.paginate(options.page, options.pageSize)
  }
}
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
// J3. 武器维度槽定义（6 主动槽=维度槽：属性/特效，等级上限后台可调）
class JourneyWeaponSlotService extends BaseService<DbJourneyWeaponSlot> {
  constructor() {
    super('journey_weapon_slots', {
      defaultOrder: { column: 'sort_order', ascending: true },
    })
  }
}
// 基础值成长卡（三选一五张常驻成长项：名称/数值/权重/入池后台可配）
class JourneyUpgradeCardService extends BaseService<DbJourneyUpgradeCard> {
  constructor() {
    super('journey_upgrade_cards', {
      defaultOrder: { column: 'sort_order', ascending: true },
    })
  }
}
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
export const journeyLevelService = new JourneyLevelService()
export const journeyCharacterAuraParamService = new JourneyCharacterAuraParamService()
export const journeyRealmTitleService = new JourneyRealmTitleService()
export const journeyRelicUnlockService = new JourneyRelicUnlockService()
export const journeyDailyMapService = new JourneyDailyMapService()
export const journeyEndlessWaveService = new JourneyEndlessWaveService()
export const journeyWeaponParamService = new JourneyWeaponParamService()
export const journeyMonsterParamService = new JourneyMonsterParamService()
export const journeyBattleParamService = new JourneyBattleParamService()
export const journeyMeritRecordService = new JourneyMeritRecordService()
export const journeyRunService = new JourneyRunService()
export const journeyTalentBranchService = new JourneyTalentBranchService()
export const journeyProgressService = new JourneyProgressService()
export const journeyGlobalsService = new JourneyGlobalsService()
export const journeyWeaponSlotService = new JourneyWeaponSlotService()
export const journeyUpgradeCardService = new JourneyUpgradeCardService()
