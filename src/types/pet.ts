import type { Json } from './database'

// ==================== 宠物系统行类型（pet_* 30 表中 Admin P1 页面消费的 10 张） ====================
//
// ⚠️ 口径说明：src/types/database.ts 由 supabase CLI 生成（禁止手改），截至本次
// 尚未包含 B1 新建的 pet_* 表（重生成需 pg dump，见 gen_database_ts.py 流程）。
// 本文件按线上真实 DDL（D:\workspace\sql\feature_pet_tables_20260916.sql）手工维护，
// 列名以 DDL 为唯一真相源；待 database.ts 重生成后可迁回 Db* 别名。
// BaseService 内部已按 string 表名调用（运行时走 PostgREST），不受生成类型缺表影响。

export type PetJson = Json

/// 1.1 全局参数（单行 id=1）
export interface PetConfigRow {
  id: number
  pet_enabled: boolean
  free_feed_daily: number
  free_feed_cooldown_min: number
  daily_task_draw_count: number
  adventure_tiers: Json
  adventure_hunger_threshold: number
  adventure_mood_threshold: number
  breeding_cooldown_hours: number
  points_per_gold: number
  stack_limit_default: number
  backpack_capacity_init: number
  backpack_capacity_max: number
  rearing_capacity_init: number
  rearing_capacity_max: number
  foster_capacity_init: number
  foster_capacity_max: number
  ssr_hatch_wait_hours: number
  newbie_package: Json
  config_version: number
  reserved: Json
  created_at: string
  updated_at: string
}

/// 1.2 评级字典
export interface PetRarityRow {
  code: string
  name_cn: string
  growth_factor: number
  sort_order: number
  created_at: string
  updated_at: string
}

/// 1.3 种属/形态
export interface PetSpeciesRow {
  id: string
  species_code: string
  family: string
  name_cn: string
  rarity_code: string
  base_attributes: Json
  evolution_chain_id: string | null
  render2d: Json
  render3d: Json
  asset_version: string | null
  asset_sha: string | null
  enabled: boolean
  sort_order: number
  created_at: string
  updated_at: string
}

/// 1.7 道具目录（三大类 + 扩容阶梯统一实现）
export interface PetItemRow {
  id: string
  item_code: string
  name: string
  description: string | null
  icon: string | null
  category: string
  sub_type: string | null
  effect: Json
  stack_limit: number
  price_coin: number
  price_points: number | null
  points_purchasable: boolean
  channels: string
  ladder_key: string | null
  ladder_step: number | null
  add_capacity: number | null
  purchase_limit: number | null
  on_shelf: boolean
  activity_tag: string | null
  bg_scene_id: string | null
  sort_order: number
  created_at: string
  updated_at: string
}

/// 1.8 蛋池与概率
export interface PetEggPoolRow {
  id: string
  pool_code: string
  config_version: number
  weights: Json
  published: boolean
  created_at: string
  updated_at: string
}

/// 1.9 历险地
export interface PetAdventureSpotRow {
  id: string
  code: string
  name: string
  unlock_conditions: Json
  result_weights: Json
  drop_table: Json
  rescue_params: Json
  enabled: boolean
  sort_order: number
  created_at: string
  updated_at: string
}

/// 1.11 任务池（每日/每周）
export interface PetQuestRow {
  id: string
  code: string
  type: string
  difficulty: string
  condition: Json
  rewards: Json
  enabled: boolean
  sort_order: number
  created_at: string
  updated_at: string
}

/// 2.1 金币钱包
export interface PetWalletRow {
  id: string
  user_id: string
  gold_balance: number
  total_earned: number
  total_spent: number
  created_at: string
  updated_at: string
}

/// 2.2 金币流水（append-only）
export interface PetWalletRecordRow {
  id: string
  user_id: string
  delta: number
  balance_after: number
  source_type: string
  ref_type: string | null
  ref_id: string | null
  remark: string | null
  created_at: string
}

/// 3.7 道具增减流水（append-only；丢弃审计落点）
export interface PetItemFlowRow {
  id: string
  user_id: string
  item_id: string
  delta: number
  biz_type: string
  quantity_after: number | null
  ref_type: string | null
  ref_id: string | null
  created_at: string
}
