import { LocalBaseService } from './tableService'
import { apiRequest } from '../utils/adminHttp'
import {
  errorResponse,
  successResponse,
  type ApiResponse,
} from '../utils/apiClient'
import type {
  PetConfigRow,
  PetRarityRow,
  PetSpeciesRow,
  PetItemRow,
  PetEggPoolRow,
  PetAdventureSpotRow,
  PetPersonalityRow,
  PetQuestRow,
  PetWalletRow,
  PetWalletRecordRow,
  PetItemFlowRow,
  PetEvoChainRow,
  PetEvoStageRow,
  PetTraitRow,
  PetRandomEventRow,
  PetEventChoiceLogRow,
  PetPetRow,
  PetTimelineLogRow,
  PetLotteryRecordRow,
  PetAchievementRow,
  PetSceneRow,
  PetAchievementProgressRow,
} from '../types/pet'

// ==================== 宠物系统数据服务（Admin，22 子类继承 LocalBaseService 八法） ====================
//
// P1 十表 + P2 七表（进化链/阶段、特性、随机事件、成就、场景、成就进度）。
//
// 通道（2026-10-13 去 Supabase 化）：本地后端通用表层 /admin/table/pet_**（权限
// admin:pet:list / admin:pet:edit）+ 专用端点 /admin/pet/**（透传数据库函数）。
//
// 列清单 = feature_pet_tables_20260916.sql 真实 DDL（⚠️ 新加列必须同步 select 白名单，
// 否则编辑回显空 + 保存覆写清空值——见 pure-enjoy-admin-dev §3 显式 select 红线）。
// pet_* 表尚未进 database.ts（待重生成），类型来自 src/types/pet.ts（按 DDL 手工维护）。
// ⚠️ 原 PostgREST 关系嵌入（species:pet_species(...) 等）通用表层不支持，改为
//    service 层按外键批量拉字典填充（本页量级小，N=页大小）。

/// 按主键列表批量拉字典表行，返回 Map（petService 内部填充用）
async function fetchDict(
  table: string,
  cols: string,
  keyCol: string,
  keys: string[]
): Promise<Map<string, Record<string, unknown>>> {
  const map = new Map<string, Record<string, unknown>>()
  if (keys.length === 0) return map
  const where = encodeURIComponent(JSON.stringify([{ col: keyCol, op: 'in', val: keys }]))
  const rows = await apiRequest<Record<string, unknown>[]>(
    'GET',
    `/admin/table/${table}?where=${where}&cols=${encodeURIComponent(cols)}`
  )
  ;(rows || []).forEach((r) => map.set(String(r[keyCol]), r))
  return map
}

// 全局参数（单行 id=1）
class PetConfigService extends LocalBaseService<PetConfigRow> {
  constructor() {
    super('pet_config', {
      defaultOrder: { column: 'id', ascending: true },
      select:
        'id,pet_enabled,free_feed_daily,free_feed_cooldown_min,interact_cooldown_min,interact_daily,daily_task_draw_count,adventure_tiers,adventure_hunger_threshold,adventure_mood_threshold,adventure_health_threshold,adventure_health_recover,levelup_attr_points,breeding_cooldown_hours,points_per_gold,stack_limit_default,backpack_capacity_init,backpack_capacity_max,rearing_capacity_init,rearing_capacity_max,foster_capacity_init,foster_capacity_max,ssr_hatch_wait_hours,newbie_package,config_version,reserved,level_exp_base,level_exp_growth,free_feed_hunger,free_feed_exp,feed_full_hunger,interact_mood,decay_hunger_per_hour,decay_mood_per_hour,rescue_consolation_gold,render3d_enabled,asset_manifest,feed_intimacy,interact_intimacy,intimacy_daily_cap,event_rate_home_open,event_rate_action_done,event_daily_limit,release_gold_per_level,created_at,updated_at',
    })
  }

  /// 读取单行全局参数（id=1；种子保证存在）
  async loadConfig() {
    return this.findById(1)
  }
}

// 评级字典（refine_base：洗练点评级基准，2026-09-17 属性系统）
class PetRarityService extends LocalBaseService<PetRarityRow> {
  constructor() {
    super('pet_rarities', {
      defaultOrder: { column: 'sort_order', ascending: true },
      select:
        'code,name_cn,growth_factor,refine_base,potential_min,potential_max,sort_order,created_at,updated_at',
    })
  }

  /// 主键为 code（非 id），LocalBaseService.update 的 WHERE id 不适用——走按列更新端点
  async updateByCode(code: string, data: Partial<PetRarityRow>) {
    try {
      const result = await apiRequest<{ affected: number }>(
        'PUT',
        '/admin/table/pet_rarities/by-col/code',
        { value: code, data: data as Record<string, unknown> }
      )
      if (!result || result.affected === 0) {
        return errorResponse('更新失败：未匹配到任何记录（可能无权限）')
      }
      return successResponse(true)
    } catch (err) {
      return errorResponse(err instanceof Error ? err.message : '更新失败')
    }
  }
}

// 种属/形态
class PetSpeciesService extends LocalBaseService<PetSpeciesRow> {
  constructor() {
    super('pet_species', {
      defaultOrder: { column: 'sort_order', ascending: true },
      select:
        'id,species_code,family,name_cn,rarity_code,base_attributes,hatch_config,refine_config,evolution_chain_id,render2d,render3d,asset_version,asset_sha,enabled,sort_order,created_at,updated_at',
    })
  }
}

// 道具目录（三大类 + 扩容阶梯）
class PetItemService extends LocalBaseService<PetItemRow> {
  constructor() {
    super('pet_items', {
      defaultOrder: { column: 'sort_order', ascending: true },
      select:
        'id,item_code,name,description,icon,category,sub_type,effect,stack_limit,price_coin,price_points,points_purchasable,channels,ladder_key,ladder_step,add_capacity,purchase_limit,on_shelf,activity_tag,bg_scene_id,sort_order,created_at,updated_at',
    })
  }
}

// 蛋池与概率
class PetEggPoolService extends LocalBaseService<PetEggPoolRow> {
  constructor() {
    super('pet_egg_pools', {
      defaultOrder: { column: 'pool_code', ascending: true },
      select: 'id,pool_code,config_version,weights,published,created_at,updated_at',
    })
  }
}

// 历险地
class PetAdventureSpotService extends LocalBaseService<PetAdventureSpotRow> {
  constructor() {
    super('pet_adventure_spots', {
      defaultOrder: { column: 'sort_order', ascending: true },
      select:
        'id,code,name,unlock_conditions,attr_requirements,result_weights,drop_table,rescue_params,penalty,enabled,sort_order,created_at,updated_at',
    })
  }
}

// 性格字典（2026-09-17 属性系统；4 条种子默认停用，孵化时按条件加权随机）
class PetPersonalityService extends LocalBaseService<PetPersonalityRow> {
  constructor() {
    super('pet_personalities', {
      defaultOrder: { column: 'code', ascending: true },
      select: 'id,code,name_cn,description,condition,weight,enabled,created_at,updated_at',
    })
  }
}

// 任务池
class PetQuestService extends LocalBaseService<PetQuestRow> {
  constructor() {
    super('pet_quests', {
      defaultOrder: { column: 'sort_order', ascending: true },
      select:
        'id,code,type,difficulty,condition,rewards,enabled,sort_order,created_at,updated_at',
    })
  }
}

// 金币钱包
class PetWalletService extends LocalBaseService<PetWalletRow> {
  constructor() {
    super('pet_wallets', {
      defaultOrder: { column: 'gold_balance', ascending: false },
      select: 'id,user_id,gold_balance,total_earned,total_spent,created_at,updated_at',
    })
  }

  paginateWallets(page: number, pageSize: number, userIds?: string[]) {
    return this.paginate(page, pageSize, (q) => {
      if (userIds && userIds.length > 0) {
        return q.in('user_id', userIds)
      }
      return q
    })
  }
}

// 金币流水（append-only，按来源筛选）
class PetWalletRecordService extends LocalBaseService<PetWalletRecordRow> {
  constructor() {
    super('pet_wallet_records', {
      defaultOrder: { column: 'created_at', ascending: false },
      select: 'id,user_id,delta,balance_after,source_type,ref_type,ref_id,remark,created_at',
    })
  }

  paginateRecords(
    page: number,
    pageSize: number,
    options?: { sourceType?: string; userIds?: string[] }
  ) {
    return this.paginate(page, pageSize, (q) => {
      let builder = q
      if (options?.sourceType) builder = builder.eq('source_type', options.sourceType)
      if (options?.userIds && options.userIds.length > 0) {
        builder = builder.in('user_id', options.userIds)
      }
      return builder
    })
  }
}

// 道具增减流水（丢弃审计 = biz_type 前缀 discard）
class PetItemFlowService extends LocalBaseService<PetItemFlowRow> {
  constructor() {
    super('pet_item_flow_logs', {
      defaultOrder: { column: 'created_at', ascending: false },
      select: 'id,user_id,item_id,delta,biz_type,quantity_after,ref_type,ref_id,created_at',
    })
  }

  paginateFlows(
    page: number,
    pageSize: number,
    options?: { bizTypes?: string[]; userIds?: string[] }
  ) {
    return this.paginate(page, pageSize, (q) => {
      let builder = q
      if (options?.bizTypes && options.bizTypes.length > 0) {
        builder = builder.in('biz_type', options.bizTypes)
      }
      if (options?.userIds && options.userIds.length > 0) {
        builder = builder.in('user_id', options.userIds)
      }
      return builder
    })
  }

  /// 道具 ID → 名称转译映射（丢弃流水展示用，一次拉取道具目录）
  async fetchItemNameMap(): Promise<Record<string, string>> {
    const rows = await apiRequest<Array<{ id: string; name: string }>>(
      'GET',
      '/admin/table/pet_items?cols=id,name'
    )
    const map: Record<string, string> = {}
    ;(rows || []).forEach((r) => {
      map[r.id] = r.name
    })
    return map
  }
}

// ==================== P2 配置表服务（2026-09-23 RPC 上线配套，7 表） ====================

// 进化链主表
class PetEvoChainService extends LocalBaseService<PetEvoChainRow> {
  constructor() {
    super('pet_evo_chains', {
      defaultOrder: { column: 'code', ascending: true },
      select: 'id,code,family,max_stage,created_at,updated_at',
    })
  }
}

// 进化阶段（子表：按链过滤）
class PetEvoStageService extends LocalBaseService<PetEvoStageRow> {
  constructor() {
    super('pet_evo_stages', {
      defaultOrder: { column: 'stage', ascending: true },
      select:
        'id,chain_id,stage,species_id,conditions,branch_key,branch_weight,pick_mode,created_at,updated_at',
    })
  }

  /// 按链取全部阶段（链内阶段数很小，客户端排序/分组即可）
  findByChain(chainId: string) {
    return this.findAll((q) => q.eq('chain_id', chainId))
  }
}

// 特性池
class PetTraitService extends LocalBaseService<PetTraitRow> {
  constructor() {
    super('pet_traits', {
      defaultOrder: { column: 'code', ascending: true },
      select:
        'id,code,name,effect_type,effect_params,weight,family,species_code,enabled,created_at,updated_at',
    })
  }
}

// 随机事件
class PetRandomEventService extends LocalBaseService<PetRandomEventRow> {
  constructor() {
    super('pet_random_events', {
      defaultOrder: { column: 'code', ascending: true },
      select: 'id,code,context,weight,content,enabled,created_at,updated_at',
    })
  }
}

// 事件选择流水（2026-10-08 随机事件实装；客诉排查用）
class PetEventChoiceLogService extends LocalBaseService<PetEventChoiceLogRow> {
  constructor() {
    super('pet_event_choice_logs', {
      defaultOrder: { column: 'created_at', ascending: false },
      // 原嵌入 event:pet_random_events(code,context,content) → 字典填充 r.event
      select: 'id,user_id,event_id,option_index,rewards,created_at',
    })
  }

  /// 最近流水（服务端限量；审查 2026-10-08 修正——findAll 全表拉取会随数据增长劣化）
  async recentLogs(limit = 200): Promise<ApiResponse<PetEventChoiceLogRow[]>> {
    const res = await this.paginate(1, limit, (q) => q)
    if (!res.success) return errorResponse(res.errorMessage ?? '查询失败')
    const rows = (res.data?.data ?? []) as PetEventChoiceLogRow[]
    // 字典填充：event_id → pet_random_events（code/context/content）
    try {
      const dict = await fetchDict(
        'pet_random_events',
        'id,code,context,content',
        'id',
        Array.from(new Set(rows.map((r) => (r as any).event_id).filter(Boolean) as string[]))
      )
      for (const r of rows as any[]) {
        r.event = dict.get(String(r.event_id)) ?? null
      }
    } catch {
      // 填充失败不阻塞主列表（页面已有 event_id 回退显示）
    }
    return successResponse(rows)
  }
}

// 宠物个体（只读查询：客诉排查）
class PetPetAdminService extends LocalBaseService<PetPetRow> {
  constructor() {
    super('pet_pets', {
      defaultOrder: { column: 'created_at', ascending: false },
      // 原嵌入 species:pet_species(name_cn,rarity_code,family) → 字典填充 r.species
      select:
        'id,user_id,show_no,nickname,species_id,stage,gender,level,exp,hunger,mood,intimacy,health,status,base_attributes,bonus_attributes,personality_code,created_at',
    })
  }

  /// 全量列表（客服查询量级小；用户过滤由页面用 findUserIdsByKeyword 客户端完成）
  async listPets() {
    return this.findAllWithSpecies()
  }

  /// 服务端分页（审计批 20261012：pet_pets 是按用户增长的个体大表，
  /// findAll 全量拉取随数据量线性劣化——与 pet_event_choice_logs 同口径下推）。
  /// 过滤二选一：userIds（用户关键字解析结果，命中即只看该批用户）；
  /// 否则 text 对 编号/昵称 ilike 模糊下推（平铺 OR，原 PostgREST .or 语义）。
  paginatePets(
    page: number,
    pageSize: number,
    options?: { userIds?: string[] | null; text?: string }
  ) {
    return this.paginateWithSpecies(page, pageSize, (q) => {
      let builder = q
      if (options?.userIds && options.userIds.length > 0) {
        return builder.in('user_id', options.userIds)
      }
      // id 次排序键:新手包批量发宠同 created_at 时页界不稳(复审 P3)
      builder = builder.order('id', { ascending: true })
      const t = (options?.text ?? '').replace(/[,()%\\`:"]/g, '')
      if (t) {
        builder = builder.orFlat([
          { col: 'show_no', op: 'ilike', val: `*${t}*` },
          { col: 'nickname', op: 'ilike', val: `*${t}*` },
        ])
      }
      return builder
    })
  }

  /// 查询后按 species_id 批量填充 r.species（原 PostgREST 嵌入等价物）
  private async findAllWithSpecies() {
    const res = await this.findAll()
    if (res.success) {
      await this.fillSpecies(res.data as unknown as any[])
    }
    return res
  }

  private async paginateWithSpecies(
    page: number,
    pageSize: number,
    query?: Parameters<PetPetAdminService['paginate']>[2]
  ) {
    const res = await this.paginate(page, pageSize, query)
    if (res.success) {
      await this.fillSpecies(res.data?.data as unknown as any[])
    }
    return res
  }

  private async fillSpecies(rows?: any[]) {
    if (!rows || rows.length === 0) return
    try {
      const dict = await fetchDict(
        'pet_species',
        'id,name_cn,rarity_code,family',
        'id',
        Array.from(new Set(rows.map((r) => r.species_id).filter(Boolean) as string[]))
      )
      for (const r of rows) {
        r.species = dict.get(String(r.species_id)) ?? null
      }
    } catch {
      // 填充失败不阻塞主列表（页面已有 species 空回退）
    }
  }
}

// 事件触发审计（pet_lottery_records biz='event'：含放弃未选的触发占坑）
class PetEventLotteryService extends LocalBaseService<PetLotteryRecordRow> {
  constructor() {
    super('pet_lottery_records', {
      defaultOrder: { column: 'created_at', ascending: false },
      select: 'id,user_id,biz,pool_code,config_version,input,result,created_at',
    })
  }

  async recentEventRolls(limit = 200): Promise<ApiResponse<PetLotteryRecordRow[]>> {
    // biz 过滤必须下推服务端：pet_lottery_records 是全局审计大表（孵化/特性/历险/事件），
    // findAll 全量拉取再客户端过滤会随数据增长线性劣化（审查 2026-10-08 修正）
    const res = await this.paginate(1, limit, (q) => q.eq('biz', 'event'))
    if (!res.success) return errorResponse(res.errorMessage ?? '查询失败')
    return successResponse(res.data?.data ?? [])
  }
}

// 宠物时间线（pet_timeline_logs，只读审计）
class PetTimelineLogService extends LocalBaseService<PetTimelineLogRow> {
  constructor() {
    super('pet_timeline_logs', {
      defaultOrder: { column: 'created_at', ascending: false },
      // 原嵌入 pet:pet_pets(show_no,nickname) → 字典填充 r.pet
      select: 'id,user_id,pet_id,event_type,payload,created_at',
    })
  }

  /// 最近流水（服务端限量；审查口径同 choice_logs）
  async listLogs(limit = 200): Promise<ApiResponse<PetTimelineLogRow[]>> {
    const res = await this.paginate(1, limit, (q) => q)
    if (!res.success) return errorResponse(res.errorMessage ?? '查询失败')
    const rows = (res.data?.data ?? []) as PetTimelineLogRow[]
    // 字典填充：pet_id → pet_pets（show_no/nickname）
    try {
      const dict = await fetchDict(
        'pet_pets',
        'id,show_no,nickname',
        'id',
        Array.from(new Set(rows.map((r) => (r as any).pet_id).filter(Boolean) as string[]))
      )
      for (const r of rows as any[]) {
        r.pet = dict.get(String(r.pet_id)) ?? null
      }
    } catch {
      // 填充失败不阻塞主列表（页面已有 pet 空回退显示原 id）
    }
    return successResponse(rows)
  }
}

// 成就
class PetAchievementService extends LocalBaseService<PetAchievementRow> {
  constructor() {
    super('pet_achievements', {
      defaultOrder: { column: 'sort_order', ascending: true },
      select:
        'id,code,title,icon,condition_type,condition_value,reward_package,tier,sort_order,enabled,created_at,updated_at',
    })
  }
}

// 场景/背景主题
class PetSceneService extends LocalBaseService<PetSceneRow> {
  constructor() {
    super('pet_scenes', {
      defaultOrder: { column: 'scene_code', ascending: true },
      select: 'id,scene_code,name,asset_ref,is_default,price_coin,on_shelf,created_at,updated_at',
    })
  }
}

// 成就用户进度（页面 ProgressTab 未消费嵌入字段，去掉原 pet_achievements 嵌入 select）
class PetAchievementProgressService extends LocalBaseService<PetAchievementProgressRow> {
  constructor() {
    super('pet_achievement_progress', {
      defaultOrder: { column: 'created_at', ascending: false },
      select: 'id,user_id,achievement_id,progress,completed_at,claimed_at,created_at',
    })
  }

  paginateProgress(
    page: number,
    pageSize: number,
    options?: { achievementId?: string; userIds?: string[] }
  ) {
    return this.paginate(page, pageSize, (q) => {
      let builder = q
      if (options?.achievementId) builder = builder.eq('achievement_id', options.achievementId)
      if (options?.userIds && options.userIds.length > 0) {
        builder = builder.in('user_id', options.userIds)
      }
      return builder
    })
  }
}

// ==================== 客服金币调整（透传数据库函数 rpc_pet_admin_wallet_adjust） ====================
// 调整逻辑在数据库函数内完成（钱包行锁 + 流水双写 pet_admin_grant），前端只传参；
// 调整后余额以页面重新拉取为准。函数 DDL 见 D:\workspace\sql\pet\feature_pet_admin_20260916.sql。
async function adminAdjustWallet(targetUserId: string, gold: number, remark: string) {
  try {
    await apiRequest('POST', '/admin/pet/wallet/adjust', {
      target_user_id: targetUserId,
      gold,
      remark,
    })
    return successResponse(true)
  } catch (err) {
    return errorResponse(err instanceof Error ? err.message : '客服金币调整失败')
  }
}

export {
  PetConfigService,
  PetRarityService,
  PetSpeciesService,
  PetItemService,
  PetEggPoolService,
  PetAdventureSpotService,
  PetPersonalityService,
  PetQuestService,
  PetWalletService,
  PetWalletRecordService,
  PetItemFlowService,
  PetEvoChainService,
  PetEvoStageService,
  PetTraitService,
  PetRandomEventService,
  PetAchievementService,
  PetSceneService,
  PetAchievementProgressService,
  adminAdjustWallet,
}

export const petConfigService = new PetConfigService()
export const petRarityService = new PetRarityService()
export const petSpeciesService = new PetSpeciesService()
export const petItemService = new PetItemService()
export const petEggPoolService = new PetEggPoolService()
export const petAdventureSpotService = new PetAdventureSpotService()
export const petPersonalityService = new PetPersonalityService()
export const petQuestService = new PetQuestService()
export const petWalletService = new PetWalletService()
export const petWalletRecordService = new PetWalletRecordService()
export const petItemFlowService = new PetItemFlowService()
export const petEvoChainService = new PetEvoChainService()
export const petEvoStageService = new PetEvoStageService()
export const petTraitService = new PetTraitService()
export const petRandomEventService = new PetRandomEventService()
export const petEventChoiceLogService = new PetEventChoiceLogService()
export const petPetAdminService = new PetPetAdminService()
export const petEventLotteryService = new PetEventLotteryService()
export const petTimelineLogService = new PetTimelineLogService()
export const petAchievementService = new PetAchievementService()
export const petSceneService = new PetSceneService()
export const petAchievementProgressService = new PetAchievementProgressService()
