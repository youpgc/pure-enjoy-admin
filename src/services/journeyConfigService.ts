import { BaseService, successResponse, errorResponse, handleApiError } from '../utils/apiClient'
import type { SupabaseQuery } from '../utils/apiClient'
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
  DbJourneyMeritRecord,
  DbJourneyRun,
  DbJourneyProgress,
  DbJourneyTalentBranch,
} from '../types/database'

/// 西行配置数据服务：journey_* 静态配置表与只读流水，各表继承 BaseService 八法。
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

// J16. 无尽妖潮波次（独立表单；wave_no 1..99，monster_code 命中妖王即妖王波）
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
      select: 'id,user_id,level_no,kills,merit_gained,duration_ms,cleared,created_at',
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
        'user_id,merit_balance,farthest_level_no,total_kills,talent_pool,talent_levels,unlocked_characters,unlocked_weapons,selected_character,updated_at',
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
export const journeyRelicUnlockService = new JourneyRelicUnlockService()
export const journeyDailyMapService = new JourneyDailyMapService()
export const journeyEndlessWaveService = new JourneyEndlessWaveService()
export const journeyWeaponParamService = new JourneyWeaponParamService()
export const journeyMonsterParamService = new JourneyMonsterParamService()
export const journeyMeritRecordService = new JourneyMeritRecordService()
export const journeyRunService = new JourneyRunService()
export const journeyTalentBranchService = new JourneyTalentBranchService()
export const journeyProgressService = new JourneyProgressService()
export const journeyGlobalsService = new JourneyGlobalsService()
export const journeyWeaponSlotService = new JourneyWeaponSlotService()
