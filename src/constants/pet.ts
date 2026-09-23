// ==================== 宠物系统常量（ENUM 单一源） ====================
//
// 与 App 端 lib/constants/pet.dart 语义对齐（三端 ENUM 对齐铁律）；
// 值域以线上 DDL check 约束为唯一真相源（feature_pet_tables_20260916.sql）。
// 页面禁止硬编码枚举值，一律从本文件导入。

// ---------- 金币流水来源（蓝图 §六.2，双账本来源枚举） ----------

export const PET_SOURCE_TYPES = {
  SHOP_BUY: 'pet_shop_buy',
  SYSTEM_REWARD: 'pet_system_reward',
  ACHIEVEMENT: 'pet_achievement',
  EXCHANGE: 'pet_exchange',
  ADMIN_GRANT: 'pet_admin_grant',
  ADVENTURE_PENALTY: 'pet_adventure_penalty',
} as const

export const PET_SOURCE_TYPE_LABELS: Record<string, string> = {
  pet_shop_buy: '商城消费',
  pet_system_reward: '系统发放',
  pet_achievement: '成就发放',
  pet_exchange: '积分兑换',
  pet_admin_grant: '客服调整',
  pet_adventure_penalty: '历险惩罚',
}

export const PET_SOURCE_TYPE_COLORS: Record<string, string> = {
  pet_shop_buy: 'orange',
  pet_system_reward: 'green',
  pet_achievement: 'gold',
  pet_exchange: 'blue',
  pet_admin_grant: 'purple',
  pet_adventure_penalty: 'red',
}

export const PET_SOURCE_TYPE_OPTIONS = Object.entries(PET_SOURCE_TYPE_LABELS).map(
  ([value, label]) => ({ value, label })
)

// ---------- 道具三大类（背包四分区） ----------
//
// 枚举码（*_TYPES）为判据/默认值唯一源，LABELS 的键由码派生（同 PET_SOURCE_TYPES 写法）。

export const PET_ITEM_CATEGORY_TYPES = {
  EGG: 'egg',
  CONSUMABLE: 'consumable',
  TOOL: 'tool',
  EQUIP: 'equip',
} as const

export const PET_ITEM_CATEGORY_LABELS: Record<string, string> = {
  [PET_ITEM_CATEGORY_TYPES.EGG]: '蛋',
  [PET_ITEM_CATEGORY_TYPES.CONSUMABLE]: '消耗品',
  [PET_ITEM_CATEGORY_TYPES.TOOL]: '工具',
  [PET_ITEM_CATEGORY_TYPES.EQUIP]: '装备',
}

export const PET_ITEM_CATEGORY_COLORS: Record<string, string> = {
  egg: 'geekblue',
  consumable: 'green',
  tool: 'orange',
  equip: 'default',
}

export const PET_ITEM_CATEGORY_OPTIONS = Object.entries(PET_ITEM_CATEGORY_LABELS).map(
  ([value, label]) => ({ value, label })
)

// ---------- 道具获取渠道 ----------

export const PET_ITEM_CHANNEL_LABELS: Record<string, string> = {
  shop: '商城',
  activity: '活动',
  both: '商城+活动',
  adventure_drop: '历险掉落',
  system: '系统',
}

export const PET_ITEM_CHANNEL_OPTIONS = Object.entries(PET_ITEM_CHANNEL_LABELS).map(
  ([value, label]) => ({ value, label })
)

// ---------- 统一扩容阶梯（背包/养育格/寄养格三套） ----------

export const PET_LADDER_KEY_LABELS: Record<string, string> = {
  backpack: '背包格',
  rearing: '养育格',
  foster: '寄养格',
}

export const PET_LADDER_KEY_COLORS: Record<string, string> = {
  backpack: 'blue',
  rearing: 'cyan',
  foster: 'purple',
}

export const PET_LADDER_KEY_OPTIONS = [
  { value: '', label: '普通道具（非阶梯）' },
  ...Object.entries(PET_LADDER_KEY_LABELS).map(([value, label]) => ({ value, label })),
]

// ---------- 任务类型 / 难度 ----------

export const PET_QUEST_TYPE_TYPES = {
  DAILY: 'daily',
  WEEKLY: 'weekly',
} as const

export const PET_QUEST_TYPE_LABELS: Record<string, string> = {
  [PET_QUEST_TYPE_TYPES.DAILY]: '每日',
  [PET_QUEST_TYPE_TYPES.WEEKLY]: '每周',
}

export const PET_QUEST_TYPE_OPTIONS = Object.entries(PET_QUEST_TYPE_LABELS).map(
  ([value, label]) => ({ value, label })
)

export const PET_QUEST_DIFFICULTY_TYPES = {
  NORMAL: 'normal',
  ADVANCED: 'advanced',
  HARD: 'hard',
} as const

export const PET_QUEST_DIFFICULTY_LABELS: Record<string, string> = {
  [PET_QUEST_DIFFICULTY_TYPES.NORMAL]: '普通',
  [PET_QUEST_DIFFICULTY_TYPES.ADVANCED]: '进阶',
  [PET_QUEST_DIFFICULTY_TYPES.HARD]: '困难',
}

export const PET_QUEST_DIFFICULTY_COLORS: Record<string, string> = {
  normal: 'green',
  advanced: 'orange',
  hard: 'red',
}

export const PET_QUEST_DIFFICULTY_OPTIONS = Object.entries(PET_QUEST_DIFFICULTY_LABELS).map(
  ([value, label]) => ({ value, label })
)

// ---------- 历险结果四类 ----------

export const PET_ADVENTURE_RESULT_LABELS: Record<string, string> = {
  play: '游玩',
  danger: '遇险',
  help: '帮助',
  memory: '纪念',
}

// 注：四类结果的表单键由此 LABELS 派生（Object.entries/keys），不再单列 OPTIONS。

// ---------- 道具流水 biz_type（丢弃审计重点） ----------

export const PET_FLOW_BIZ_LABELS: Record<string, string> = {
  acquire: '获得',
  consume: '消耗',
  discard: '丢弃',
  discard_batch: '批量丢弃',
  expire: '过期',
  admin_adjust: '客服调整',
}

export const PET_FLOW_BIZ_OPTIONS = Object.entries(PET_FLOW_BIZ_LABELS).map(
  ([value, label]) => ({ value, label })
)

// ---------- 体系（4 系萌宠；family 字段运营可增，选项仅作快捷录入） ----------

export const PET_FAMILY_LABELS: Record<string, string> = {
  cat: '猫',
  dog: '犬',
  rabbit: '兔',
  mouse: '鼠',
}

export const PET_FAMILY_OPTIONS = Object.entries(PET_FAMILY_LABELS).map(([value, label]) => ({
  value,
  label,
}))

// ---------- 权限码（与 feature_pet_admin_20260916.sql 种子对齐） ----------

export const PET_PERMS = {
  MENU: 'menu:pets',
  READ: 'pets:read',
  WRITE: 'pets:write',
  DELETE: 'pets:delete',
} as const

// ---------- 结构化 jsonb 编辑器选项（结构以 RPC 真实消费为准，禁止臆测） ----------
//
// 消费点实证（feature_pet_rpcs_20260916.sql）：
// - 道具 effect：rpc_pet_use_item / rpc_pet_feed 读 type(feed|clean|toy)+hunger/mood/exp；
//   蛋类 effect 读 pool+mode（rpc_pet_hatch_instant）；
// - 任务 condition：rpc_pet_daily_quests_draw 读 type + target（int，缺省 1）；
// - 任务 rewards：rpc_pet_daily_quests_claim 读 gold + points + items[{code,count}]；
// - 蛋池 weights：hatch 读 fixed_species / families / rarity(取首键) / gender.male(0~1 概率)；
// - 历险 result_weights：claim 按 jsonb_each_text 累计权重与 random() 比较（和应为 1）；
// - 历险 rescue_params：读 self_window_minutes（缺省 120）；
// - 历险 drop_table：<result>.gold[min,max] / exp[min,max] / items[{code,min,max,p}]。

/// 消耗品 effect.type（rpc_pet_use_item 白名单，fix_pet_review_20260920.sql：feed/clean/toy/heal）
export const PET_EFFECT_TYPE_LABELS: Record<string, string> = {
  feed: '喂养（饱食）',
  clean: '清洁（心情）',
  toy: '玩耍（心情）',
  heal: '疗伤（健康，effect.value）',
}

export const PET_EFFECT_TYPE_OPTIONS = Object.entries(PET_EFFECT_TYPE_LABELS).map(
  ([value, label]) => ({ value, label })
)

/// 任务条件 type（服务端 _pet_quest_bump 的 bump 键；feed/use_item、interact/互动、adventure/claim、hatch/孵化）
export const PET_CONDITION_TYPE_LABELS: Record<string, string> = {
  feed: '喂养次数',
  interact: '互动次数',
  adventure: '历险次数',
  hatch: '孵化次数',
}

export const PET_CONDITION_TYPE_OPTIONS = Object.entries(PET_CONDITION_TYPE_LABELS).map(
  ([value, label]) => ({ value, label })
)

/// 蛋池 rarity 单选（weights.rarity 取首键语义 → 单选归一为 {code:1}）
export const PET_RARITY_CODE_OPTIONS = [
  { value: 'N', label: 'N 普通' },
  { value: 'R', label: 'R 稀有' },
  { value: 'SR', label: 'SR 史诗' },
  { value: 'SSR', label: 'SSR 传说' },
]

/// 蛋孵化 mode（item effect.mode / weights.mode）
export const PET_EGG_MODE_OPTIONS = [
  { value: 'instant', label: '即开' },
  { value: 'wait', label: '等待' },
]

// ---------- 四维属性（2026-09-17 属性系统，与 App/SQL 对齐） ----------
// 消费点实证（feature_pet_attributes_20260917.sql）：
// - 种属 base_attributes.base 键 / hatch roll 维度；
// - 历险 attr_requirements[].attr（claim 结算判据）；
// - 性格 condition 键（{attr:阈值} 全维度 ≥ AND）；
// - rpc_pet_allocate_attr 的 p_attr_key 白名单（前三维加点，末维收尾）。

export const PET_ATTR_LABELS: Record<string, string> = {
  intellect: '智力',
  stamina: '体力',
  strength: '力量',
  agility: '敏捷',
}

export const PET_ATTR_OPTIONS = Object.entries(PET_ATTR_LABELS).map(([value, label]) => ({
  value,
  label: `${label}（${value}）`,
}))

/// 历险失败惩罚键（penalty jsonb；数值均为负值扣减）
export const PET_PENALTY_LABELS: Record<string, string> = {
  health: '健康',
  mood: '心情',
  gold: '金币',
  lose_item: '丢失道具',
}

// ---------- P2 进化链（pet_evo_stages，2026-09-23 rpc_pet_evolve 已上线） ----------
//
// pick_mode 键域三端对齐：App lib/constants/pet.dart 的 PetPickMode 已有同名两值。
// 消费实证 feature_pet_p2_rpcs_20260923.sql：阶段候选 >1 时，
// weighted_random 走 `order by random()*branch_weight desc limit 1` 自动选；
// user_choice 则由客户端必须显式传 p_to_species_id，否则抛 PET_EVOLVE_PICK_REQUIRED。

export const PET_PICK_MODE_TYPES = {
  USER_CHOICE: 'user_choice',
  WEIGHTED_RANDOM: 'weighted_random',
} as const

export const PET_PICK_MODE_LABELS: Record<string, string> = {
  [PET_PICK_MODE_TYPES.USER_CHOICE]: '玩家抉择',
  [PET_PICK_MODE_TYPES.WEIGHTED_RANDOM]: '加权随机',
}

export const PET_PICK_MODE_COLORS: Record<string, string> = {
  user_choice: 'blue',
  weighted_random: 'purple',
}

export const PET_PICK_MODE_OPTIONS = Object.entries(PET_PICK_MODE_LABELS).map(
  ([value, label]) => ({ value, label })
)

/// 进化条件 type（pet_evo_stages.conditions = [{type, ...}]，全部满足才放行）
/// 未知 type 服务端直接抛 PET_EVOLVE_COND_INVALID，故只允许下面四值。
export const PET_EVO_COND_TYPE_LABELS: Record<string, string> = {
  level: '等级达到',
  intimacy: '亲密度达到',
  gold: '消耗金币',
  item: '消耗道具',
}

/// 各条件的键位说明（与服务端读取口径一致，配置写错键名即条件形同虚设）
export const PET_EVO_COND_TYPE_HINTS: Record<string, string> = {
  level: '读 value：宠物等级 ≥ value',
  intimacy: '读 value：亲密度 ≥ value',
  gold: '读 value：多条 gold 会累加后一次性扣钱包，不足报 PET_GOLD_INSUFFICIENT',
  item: '读 item（item_code）或 item_id（uuid），cost = 消耗数量（缺省 1）；不足报 PET_EVOLVE_COND_NOT_MET',
}

export const PET_EVO_COND_TYPE_OPTIONS = Object.entries(PET_EVO_COND_TYPE_LABELS).map(
  ([value, label]) => ({ value, label })
)

// ---------- P2 成就（pet_achievements，2026-09-23 rpc_pet_achievement_check 已上线） ----------
//
// condition_type 11 值 = rpc_pet_achievement_check 的 case 分支白名单；
// 未列入的取值进度恒为 0（服务端不报错，靠后台配置自检发现拼写错误）。
// 目标值读取优先级 condition_value.value → .target → 1（_pet_ach_target）。

export const PET_ACH_CONDITION_TYPE_LABELS: Record<string, string> = {
  feed_total: '累计喂养次数',
  interact_total: '累计互动次数',
  hatch_total: '累计孵化次数',
  adventure_total: '累计历险次数',
  rescue_total: '累计救助次数',
  evolve_total: '累计进化次数',
  breed_egg_total: '累计繁育产蛋次数',
  level_max: '最高等级达到',
  pets_owned: '拥有宠物数达到',
  families_owned: '拥有系别数达到',
  rarity_owned: '拥有指定评级宠物（condition_value.rarity）',
}

export const PET_ACH_CONDITION_TYPE_OPTIONS = Object.entries(
  PET_ACH_CONDITION_TYPE_LABELS
).map(([value, label]) => ({ value, label }))

/// 需填 condition_value.rarity 的条件类型（其余类型只需目标值）
export const PET_ACH_CONDITION_RARITY_KEYS = ['rarity_owned']

/// 评级值域（pet_rarities.code 种子四档，与 App PetRarity 对齐）
export const PET_RARITY_CODE_SELECT_OPTIONS = [
  { value: 'N', label: 'N 普通' },
  { value: 'R', label: 'R 稀有' },
  { value: 'SR', label: 'SR 史诗' },
  { value: 'SSR', label: 'SSR 传说' },
]

export const PET_ACH_TIER_TYPES = {
  NORMAL: 'normal',
  LEGENDARY: 'legendary',
} as const

export const PET_ACH_TIER_LABELS: Record<string, string> = {
  [PET_ACH_TIER_TYPES.NORMAL]: '普通',
  [PET_ACH_TIER_TYPES.LEGENDARY]: '传说',
}

export const PET_ACH_TIER_COLORS: Record<string, string> = {
  normal: 'default',
  legendary: 'gold',
}

export const PET_ACH_TIER_OPTIONS = Object.entries(PET_ACH_TIER_LABELS).map(
  ([value, label]) => ({ value, label })
)
