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
  /// 饱腹阈值（2026-09-24）：App 喂食钮置灰与 rpc_pet_feed 的 PET_ALREADY_FULL 同源
  feed_full_hunger: number
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
  // —— 互动冷却（feature_pet_interact_cooldown_20260917.sql）——
  interact_cooldown_min: number
  interact_daily: number
  // —— 历险结算回血（fix_pet_review_20260920.sql）——
  adventure_health_recover: number
  // —— 亲密度累积三参 + 随机事件三闸（feature_pet_attr_baseline / random_events_20261008.sql）——
  feed_intimacy: number
  interact_intimacy: number
  intimacy_daily_cap: number
  event_rate_home_open: number
  event_rate_action_done: number
  event_daily_limit: number
  release_gold_per_level: number
  created_at: string
  updated_at: string
}

/// 1.2 评级字典
/// refine_base：升级时洗练点发放的评级基准（三因子之一，2026-09-17 属性系统）
/// potential_min/max：潜力区间评级粒度覆盖（2026-09-20 P2-3；
///   null = 未配置，回退种属 hatch_config.potential_min/max）
export interface PetRarityRow {
  code: string
  name_cn: string
  growth_factor: number
  refine_base: number
  potential_min: number | null
  potential_max: number | null
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

// ==================== P2 配置表（2026-09-23 RPC 已上线，本段列清单 = 同一份 DDL） ====================

/// 1.4 进化链主表（pet_evo_chains；种子 40 行 = 每种属一条 chain_<species_code>）
export interface PetEvoChainRow {
  id: string
  code: string
  family: string
  max_stage: number
  created_at: string
  updated_at: string
}

/// 1.5 进化阶段（pet_evo_stages；unique(chain_id, stage, species_id)）
/// conditions：[{type:level|intimacy|gold,value}] / [{type:item,item|item_id,cost}]
/// pick_mode：user_choice（玩家抉择）/ weighted_random（按 branch_weight 掷）
export interface PetEvoStageRow {
  id: string
  chain_id: string
  stage: number
  species_id: string
  conditions: Json
  branch_key: string
  branch_weight: number
  pick_mode: string
  created_at: string
  updated_at: string
}

/// 1.6 特性池（pet_traits；三级池优先级 species_code > family > 全局）
/// ⚠️ effect_type/effect_params 值域 P2 未定版，服务端 _pet_trait_roll 只掷不读，
/// 故后台按文本录入，不建枚举常量（不发明值域）。
export interface PetTraitRow {
  id: string
  code: string
  name: string
  effect_type: string
  effect_params: Json
  weight: number
  family: string | null
  species_code: string | null
  enabled: boolean
  created_at: string
  updated_at: string
}

/// 1.10 随机事件（pet_random_events，单表；选项内嵌 content）
/// ⚠️ content 结构（文案 + 2~3 选项 + 奖惩包）与 context 值域均未定版、暂无 RPC 消费，
/// 后台走 JsonFormItem 编辑，不发明 schema 校验。
export interface PetRandomEventRow {
  id: string
  code: string
  context: string
  weight: number
  content: Json
  enabled: boolean
  created_at: string
  updated_at: string
}

export interface PetEventChoiceLogRow {
  id: string
  user_id: string
  event_id: string
  option_index: number
  rewards: Json
  created_at: string
  event: { code: string; context: string; content: Json } | null
}

/// 1.13 成就（pet_achievements；reward_package schema 与任务 rewards 同源）
export interface PetAchievementRow {
  id: string
  code: string
  title: string
  icon: string | null
  condition_type: string
  condition_value: Json
  reward_package: Json
  tier: string
  sort_order: number
  enabled: boolean
  created_at: string
  updated_at: string
}

/// 1.4b 场景/背景主题（pet_scenes；pet_items.bg_scene_id 无 FK，纯代码关联）
export interface PetSceneRow {
  id: string
  scene_code: string
  name: string
  asset_ref: string | null
  is_default: boolean
  price_coin: number | null
  on_shelf: boolean
  created_at: string
  updated_at: string
}

/// 2.x 成就用户进度（pet_achievement_progress，服务端 check 幂等重算、只增不减）
/// 页面用 select('*, pet_achievements(code,title,tier,condition_value)') 取嵌入对象
/// （外键多对一 → 对象而非数组），避免页面自建成就映射。
export interface PetAchievementProgressRow {
  id: string
  user_id: string
  achievement_id: string
  progress: number
  completed_at: string | null
  claimed_at: string | null
  created_at: string
  pet_achievements?: { code: string; title: string; tier: string; condition_value: Json } | null
}

export interface PetPetRow {
  id: string
  user_id: string
  show_no: string
  nickname: string | null
  stage: number
  gender: string | null
  level: number
  exp: number
  hunger: number
  mood: number
  intimacy: number
  health: number
  status: string
  base_attributes: Json
  bonus_attributes: Json
  personality_code: string | null
  created_at: string
  species: { name_cn: string; rarity_code: string; family: string } | null
}

export interface PetLotteryRecordRow {
  id: string
  user_id: string
  biz: string
  pool_code: string | null
  config_version: number | null
  input: Json
  result: Json
  created_at: string
}

export interface PetTimelineLogRow {
  id: string
  user_id: string
  pet_id: string
  event_type: string
  payload: Json
  created_at: string
  pet: { show_no: string; nickname: string | null } | null
}
