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
/// 列清单 = feature_pet_tables + feature_pet_rpcs（等级曲线/喂养效果/互动/衰减/慰问金）
/// + feature_pet_asset（render3d_enabled/asset_manifest）三波 DDL 合集。
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
  // —— rpcs 批补列（等级曲线 / 喂养效果 / 互动 / 离线衰减 / 慰问金）——
  level_exp_base: number
  level_exp_growth: number
  free_feed_hunger: number
  free_feed_exp: number
  interact_mood: number
  decay_hunger_per_hour: number
  decay_mood_per_hour: number
  rescue_consolation_gold: number
  // —— asset 批补列（3D 渲染开关 / 资源包清单）——
  render3d_enabled: boolean
  asset_manifest: Json
  // —— 属性系统批补列（feature_pet_attributes_20260917.sql）——
  adventure_health_threshold: number
  levelup_attr_points: number
  created_at: string
  updated_at: string
}

/// 1.2 评级字典
/// refine_base：升级时洗练点发放的评级基准（三因子之一，2026-09-17 属性系统）
export interface PetRarityRow {
  code: string
  name_cn: string
  growth_factor: number
  refine_base: number
  sort_order: number
  created_at: string
  updated_at: string
}

/// 1.3 种属/形态
/// base_attributes（孵化消费结构，rpc_pet_hatch_instant）：
///   { total 总点数(守恒), variance 每维浮动, base: {四维基准} }
/// hatch_config：{ inherit_ratio 繁育继承比(0~1), potential_min/max 潜力区间 }
/// refine_config：{ base 每级洗练点, potential_bonus: [{min,max,bonus}] 潜力加成档 }
export interface PetSpeciesRow {
  id: string
  species_code: string
  family: string
  name_cn: string
  rarity_code: string
  base_attributes: Json
  hatch_config: Json
  refine_config: Json
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
/// attr_requirements：[{attr:'strength', value:20}]（结算判据：不达标 claim 判 failed）
/// penalty：{health:-20, mood:-10, gold:-50, lose_item:{p:0.3}}（failed 时生效，负值）
export interface PetAdventureSpotRow {
  id: string
  code: string
  name: string
  unlock_conditions: Json
  attr_requirements: Json
  result_weights: Json
  drop_table: Json
  rescue_params: Json
  penalty: Json
  enabled: boolean
  sort_order: number
  created_at: string
  updated_at: string
}

/// 1.12 性格字典（pet_personalities，2026-09-17 属性系统）
/// condition：{attr: 阈值} —— 四维全部 ≥ 阈值（AND）才候选，weight 加权随机
export interface PetPersonalityRow {
  id: string
  code: string
  name_cn: string
  description: string | null
  condition: Json
  weight: number
  enabled: boolean
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
