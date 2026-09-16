import { BaseService, apiQuery, apiExecute } from '../utils/apiClient'
import { supabase } from '../utils/supabase'
import type {
  PetConfigRow,
  PetRarityRow,
  PetSpeciesRow,
  PetItemRow,
  PetEggPoolRow,
  PetAdventureSpotRow,
  PetQuestRow,
  PetWalletRow,
  PetWalletRecordRow,
  PetItemFlowRow,
} from '../types/pet'

// ==================== 宠物系统数据服务（Admin P1，10 表各继承 BaseService 八法） ====================
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
        'id,pet_enabled,free_feed_daily,free_feed_cooldown_min,daily_task_draw_count,adventure_tiers,adventure_hunger_threshold,adventure_mood_threshold,breeding_cooldown_hours,points_per_gold,stack_limit_default,backpack_capacity_init,backpack_capacity_max,rearing_capacity_init,rearing_capacity_max,foster_capacity_init,foster_capacity_max,ssr_hatch_wait_hours,newbie_package,config_version,reserved,level_exp_base,level_exp_growth,free_feed_hunger,free_feed_exp,interact_mood,decay_hunger_per_hour,decay_mood_per_hour,rescue_consolation_gold,render3d_enabled,asset_manifest,created_at,updated_at',
    })
  }

  /// 读取单行全局参数（id=1；种子保证存在）
  async loadConfig() {
    return this.findById(1)
  }
}

// 评级字典
class PetRarityService extends BaseService<PetRarityRow> {
  constructor() {
    super('pet_rarities', {
      defaultOrder: { column: 'sort_order', ascending: true },
      select: 'code,name_cn,growth_factor,sort_order,created_at,updated_at',
    })
  }
}

// 种属/形态
class PetSpeciesService extends BaseService<PetSpeciesRow> {
  constructor() {
    super('pet_species', {
      defaultOrder: { column: 'sort_order', ascending: true },
      select:
        'id,species_code,family,name_cn,rarity_code,base_attributes,evolution_chain_id,render2d,render3d,asset_version,asset_sha,enabled,sort_order,created_at,updated_at',
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
        'id,code,name,unlock_conditions,result_weights,drop_table,rescue_params,enabled,sort_order,created_at,updated_at',
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
  PetQuestService,
  PetWalletService,
  PetWalletRecordService,
  PetItemFlowService,
  adminAdjustWallet,
}

export const petConfigService = new PetConfigService()
export const petRarityService = new PetRarityService()
export const petSpeciesService = new PetSpeciesService()
export const petItemService = new PetItemService()
export const petEggPoolService = new PetEggPoolService()
export const petAdventureSpotService = new PetAdventureSpotService()
export const petQuestService = new PetQuestService()
export const petWalletService = new PetWalletService()
export const petWalletRecordService = new PetWalletRecordService()
export const petItemFlowService = new PetItemFlowService()
