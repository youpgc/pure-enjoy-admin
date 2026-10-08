import { BaseService, apiQuery, apiExecute } from '../utils/apiClient'
import { supabase } from '../utils/supabase'
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
  PetAchievementRow,
  PetSceneRow,
  PetAchievementProgressRow,
} from '../types/pet'

// ==================== 宠物系统数据服务（Admin，18 表各继承 BaseService 八法） ====================
//
// P1 十表 + P2 七表（进化链/阶段、特性、随机事件、成就、场景、成就进度）。
//
// 列清单 = feature_pet_tables_20260916.sql 真实 DDL（⚠️ 新加列必须同步 select 白名单，
// 否则编辑回显空 + 保存覆写清空云端值——见 pure-enjoy-admin-dev §3 显式 select 红线）。
// pet_* 表尚未进 database.ts（待重生成），类型来自 src/types/pet.ts（按 DDL 手工维护）。

// 全局参数（单行 id=1）
class PetConfigService extends BaseService<PetConfigRow> {
  constructor() {
    super('pet_config', {
      defaultOrder: { column: 'id', ascending: true },
      select:
        'id,pet_enabled,free_feed_daily,free_feed_cooldown_min,interact_cooldown_min,interact_daily,daily_task_draw_count,adventure_tiers,adventure_hunger_threshold,adventure_mood_threshold,adventure_health_threshold,adventure_health_recover,levelup_attr_points,breeding_cooldown_hours,points_per_gold,stack_limit_default,backpack_capacity_init,backpack_capacity_max,rearing_capacity_init,rearing_capacity_max,foster_capacity_init,foster_capacity_max,ssr_hatch_wait_hours,newbie_package,config_version,reserved,level_exp_base,level_exp_growth,free_feed_hunger,free_feed_exp,feed_full_hunger,interact_mood,decay_hunger_per_hour,decay_mood_per_hour,rescue_consolation_gold,render3d_enabled,asset_manifest,feed_intimacy,interact_intimacy,intimacy_daily_cap,event_rate_home_open,event_rate_action_done,event_daily_limit,created_at,updated_at',
    })
  }

  /// 读取单行全局参数（id=1；种子保证存在）
  async loadConfig() {
    return this.findById(1)
  }
}

// 评级字典（refine_base：洗练点评级基准，2026-09-17 属性系统）
class PetRarityService extends BaseService<PetRarityRow> {
  constructor() {
    super('pet_rarities', {
      defaultOrder: { column: 'sort_order', ascending: true },
      select:
        'code,name_cn,growth_factor,refine_base,potential_min,potential_max,sort_order,created_at,updated_at',
    })
  }

  /// 主键为 code（非 id），BaseService.update 的 .eq('id',…) 不适用——按 code 更新
  async updateByCode(code: string, data: Partial<PetRarityRow>) {
    return apiExecute(
      () =>
        (supabase.from('pet_rarities') as any)
          .update(data)
          .eq('code', code)
          .select(),
      'PetRarity-按 code 更新'
    )
  }
}

// 种属/形态
class PetSpeciesService extends BaseService<PetSpeciesRow> {
  constructor() {
    super('pet_species', {
      defaultOrder: { column: 'sort_order', ascending: true },
      select:
        'id,species_code,family,name_cn,rarity_code,base_attributes,hatch_config,refine_config,evolution_chain_id,render2d,render3d,asset_version,asset_sha,enabled,sort_order,created_at,updated_at',
    })
  }
}

// 道具目录（三大类 + 扩容阶梯）
class PetItemService extends BaseService<PetItemRow> {
  constructor() {
    super('pet_items', {
      defaultOrder: { column: 'sort_order', ascending: true },
      select:
        'id,item_code,name,description,icon,category,sub_type,effect,stack_limit,price_coin,price_points,points_purchasable,channels,ladder_key,ladder_step,add_capacity,purchase_limit,on_shelf,activity_tag,bg_scene_id,sort_order,created_at,updated_at',
    })
  }
}

// 蛋池与概率
class PetEggPoolService extends BaseService<PetEggPoolRow> {
  constructor() {
    super('pet_egg_pools', {
      defaultOrder: { column: 'pool_code', ascending: true },
      select: 'id,pool_code,config_version,weights,published,created_at,updated_at',
    })
  }
}

// 历险地
class PetAdventureSpotService extends BaseService<PetAdventureSpotRow> {
  constructor() {
    super('pet_adventure_spots', {
      defaultOrder: { column: 'sort_order', ascending: true },
      select:
        'id,code,name,unlock_conditions,attr_requirements,result_weights,drop_table,rescue_params,penalty,enabled,sort_order,created_at,updated_at',
    })
  }
}

// 性格字典（2026-09-17 属性系统；4 条种子默认停用，孵化时按条件加权随机）
class PetPersonalityService extends BaseService<PetPersonalityRow> {
  constructor() {
    super('pet_personalities', {
      defaultOrder: { column: 'code', ascending: true },
      select: 'id,code,name_cn,description,condition,weight,enabled,created_at,updated_at',
    })
  }
}

// 任务池
class PetQuestService extends BaseService<PetQuestRow> {
  constructor() {
    super('pet_quests', {
      defaultOrder: { column: 'sort_order', ascending: true },
      select:
        'id,code,type,difficulty,condition,rewards,enabled,sort_order,created_at,updated_at',
    })
  }
}

// 金币钱包
class PetWalletService extends BaseService<PetWalletRow> {
  constructor() {
    super('pet_wallets', {
      defaultOrder: { column: 'gold_balance', ascending: false },
      select: 'id,user_id,gold_balance,total_earned,total_spent,created_at,updated_at',
    })
  }

  paginateWallets(page: number, pageSize: number, userIds?: string[]) {
    return this.paginate(page, pageSize, (q) => {
      if (userIds && userIds.length > 0) {
        return (q as any).in('user_id', userIds)
      }
      return q
    })
  }
}

// 金币流水（append-only，按来源筛选）
class PetWalletRecordService extends BaseService<PetWalletRecordRow> {
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
        builder = (builder as any).in('user_id', options.userIds)
      }
      return builder
    })
  }
}

// 道具增减流水（丢弃审计 = biz_type 前缀 discard）
class PetItemFlowService extends BaseService<PetItemFlowRow> {
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
        builder = (builder as any).in('biz_type', options.bizTypes)
      }
      if (options?.userIds && options.userIds.length > 0) {
        builder = (builder as any).in('user_id', options.userIds)
      }
      return builder
    })
  }

  /// 道具 ID → 名称转译映射（丢弃流水展示用，一次拉取道具目录）
  async fetchItemNameMap(): Promise<Record<string, string>> {
    const res = await apiQuery<Array<{ id: string; name: string }>>(
      () => supabase.from('pet_items').select('id,name'),
      'PetItemFlow-道具目录'
    )
    const map: Record<string, string> = {}
    ;(res.data ?? []).forEach((r) => {
      map[r.id] = r.name
    })
    return map
  }
}

// ==================== P2 配置表服务（2026-09-23 RPC 上线配套，7 表） ====================

// 进化链主表
class PetEvoChainService extends BaseService<PetEvoChainRow> {
  constructor() {
    super('pet_evo_chains', {
      defaultOrder: { column: 'code', ascending: true },
      select: 'id,code,family,max_stage,created_at,updated_at',
    })
  }
}

// 进化阶段（子表：按链过滤）
class PetEvoStageService extends BaseService<PetEvoStageRow> {
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
class PetTraitService extends BaseService<PetTraitRow> {
  constructor() {
    super('pet_traits', {
      defaultOrder: { column: 'code', ascending: true },
      select:
        'id,code,name,effect_type,effect_params,weight,family,species_code,enabled,created_at,updated_at',
    })
  }
}

// 随机事件
class PetRandomEventService extends BaseService<PetRandomEventRow> {
  constructor() {
    super('pet_random_events', {
      defaultOrder: { column: 'code', ascending: true },
      select: 'id,code,context,weight,content,enabled,created_at,updated_at',
    })
  }
}

// 事件选择流水（2026-10-08 随机事件实装；RLS: is_admin() 可读全量，客诉排查用）
class PetEventChoiceLogService extends BaseService<PetEventChoiceLogRow> {
  constructor() {
    super('pet_event_choice_logs', {
      defaultOrder: { column: 'created_at', ascending: false },
      select:
        'id,user_id,event_id,option_index,rewards,created_at,event:pet_random_events(code,title,context)',
    })
  }

  /// 最近流水（低量场景取前 N 条客户端过滤即可；keyword 命中 user_id / 事件编码）
  async recentLogs(limit = 200) {
    const res = await this.findAll()
    if (!res.success) return res
    const rows = (res.data ?? []).slice(0, limit)
    return { ...res, data: rows }
  }
}

// 成就
class PetAchievementService extends BaseService<PetAchievementRow> {
  constructor() {
    super('pet_achievements', {
      defaultOrder: { column: 'sort_order', ascending: true },
      select:
        'id,code,title,icon,condition_type,condition_value,reward_package,tier,sort_order,enabled,created_at,updated_at',
    })
  }
}

// 场景/背景主题
class PetSceneService extends BaseService<PetSceneRow> {
  constructor() {
    super('pet_scenes', {
      defaultOrder: { column: 'scene_code', ascending: true },
      select: 'id,scene_code,name,asset_ref,is_default,price_coin,on_shelf,created_at,updated_at',
    })
  }
}

// 成就用户进度（运营查看：嵌入成就编码/名称/档位，避免页面自建映射）
class PetAchievementProgressService extends BaseService<PetAchievementProgressRow> {
  constructor() {
    super('pet_achievement_progress', {
      defaultOrder: { column: 'created_at', ascending: false },
      select:
        'id,user_id,achievement_id,progress,completed_at,claimed_at,created_at,pet_achievements(code,title,tier,condition_value)',
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
        builder = (builder as any).in('user_id', options.userIds)
      }
      return builder
    })
  }
}

// ==================== 客服金币调整（RPC：rpc_pet_admin_wallet_adjust） ====================
// 调整逻辑在服务端 RPC 内完成（钱包行锁 + 流水双写 pet_admin_grant），前端只传参；
// 调整后余额以页面重新拉取为准。RPC DDL 见 D:\workspace\sql\feature_pet_admin_20260916.sql。
function adminAdjustWallet(targetUserId: string, gold: number, remark: string) {
  return apiExecute(
    () =>
      supabase.rpc('rpc_pet_admin_wallet_adjust', {
        p_target_user_id: targetUserId,
        p_gold: gold,
        p_remark: remark,
      } as any) as any,
    'PetBagAdjust-客服金币调整'
  )
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
export const petAchievementService = new PetAchievementService()
export const petSceneService = new PetSceneService()
export const petAchievementProgressService = new PetAchievementProgressService()
