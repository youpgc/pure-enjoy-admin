// ==================== 宠物系统常量（ENUM 单一源） ====================
//
// 与 App 端 lib/constants/pet.dart 语义对齐（三端 ENUM 对齐铁律）；
// 值域以线上 DDL check 约束为唯一真相源（feature_pet_tables_20260916.sql）。
// 页面禁止硬编码枚举值，一律从本文件导入。

/// 宠物模块所有后台表格统一默认每页条数（2026-09-24 定版）
export const PET_TABLE_PAGE_SIZE = 10

// ---------- 金币流水来源（蓝图 §六.2，双账本来源枚举） ----------
//
// 值域与 App `lib/constants/pet.dart` 的 PetWalletSourceType 一一对应（铁律 12）；
// pet_feature_spend 由 feature_pet_p2_rpcs_20260923.sql 新增（金币档孵化加速花费）。

export const PET_SOURCE_TYPES = {
  SHOP_BUY: 'pet_shop_buy',
  SYSTEM_REWARD: 'pet_system_reward',
  ACHIEVEMENT: 'pet_achievement',
  EXCHANGE: 'pet_exchange',
  ADMIN_GRANT: 'pet_admin_grant',
  ADVENTURE_PENALTY: 'pet_adventure_penalty',
  FEATURE_SPEND: 'pet_feature_spend',
} as const

export const PET_SOURCE_TYPE_LABELS: Record<string, string> = {
  pet_shop_buy: '商城消费',
  pet_system_reward: '系统发放',
  pet_achievement: '成就发放',
  pet_exchange: '积分兑换',
  pet_admin_grant: '客服调整',
  pet_adventure_penalty: '游历惩罚',
  pet_feature_spend: '功能消耗',
}

export const PET_SOURCE_TYPE_COLORS: Record<string, string> = {
  pet_shop_buy: 'orange',
  pet_system_reward: 'green',
  pet_achievement: 'gold',
  pet_exchange: 'blue',
  pet_admin_grant: 'purple',
  pet_adventure_penalty: 'red',
  pet_feature_spend: 'cyan',
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
} as const

export const PET_ITEM_CATEGORY_LABELS: Record<string, string> = {
  [PET_ITEM_CATEGORY_TYPES.EGG]: '蛋',
  [PET_ITEM_CATEGORY_TYPES.CONSUMABLE]: '消耗品',
  [PET_ITEM_CATEGORY_TYPES.TOOL]: '工具',
}

/// 道具子类型中文标签（值域来自线上 pet_items 实测，文案按道具名定稿；
/// 未登记码由筛选项原样展示——新 sub_type 无需改代码即可筛）
export const PET_ITEM_SUB_TYPE_LABELS: Record<string, string> = {
  // egg
  initial: '初始蛋',
  random: '随机蛋',
  // consumable
  food: '食物',
  clean: '清洁',
  toy: '玩具',
  heal: '治疗',
  refine_point: '属性洗练',
  trait_wash: '特性洗练',
  exp_double: '双倍经验',
  // tool
  rescue: '救援',
  evolution: '进化石',
  accelerate: '孵化加速',
  expand: '扩容',
  key: '罗盘',
  rename: '更名卡',
  scene: '场景主题',
  unlock: '功能解锁',
}

export const PET_ITEM_CATEGORY_COLORS: Record<string, string> = {
  egg: 'geekblue',
  consumable: 'green',
  tool: 'orange',
}

export const PET_ITEM_CATEGORY_OPTIONS = Object.entries(PET_ITEM_CATEGORY_LABELS).map(
  ([value, label]) => ({ value, label })
)

// ---------- 道具获取渠道 ----------

export const PET_ITEM_CHANNEL_LABELS: Record<string, string> = {
  shop: '商城',
  activity: '活动',
  both: '商城+活动',
  adventure_drop: '游历掉落',
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

/// 任务条件类型（pet_quests.condition.type，与 App PetQuestConditionType 值域对齐；
/// 未登记码由列渲染原样展示）
export const PET_QUEST_CONDITION_TYPE_LABELS: Record<string, string> = {
  feed: '喂养次数',
  interact: '互动次数',
  adventure: '游历次数',
  hatch: '孵化次数',
  clean: '清洁次数',
  play: '游玩次数',
  heal: '治疗次数',
  exchange: '积分兑换次数',
  scene: '场景装扮次数',
  breed: '繁育次数',
  evolve: '进化次数',
}

export const PET_QUEST_DIFFICULTY_OPTIONS = Object.entries(PET_QUEST_DIFFICULTY_LABELS).map(
  ([value, label]) => ({ value, label })
)

// ---------- 游历结果四类 ----------

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
// - 游历 result_weights：claim 按 jsonb_each_text 累计权重与 random() 比较（和应为 1）；
// - 游历 rescue_params：读 self_window_minutes（缺省 120）；
// - 游历 drop_table：<result>.gold[min,max] / exp[min,max] / items[{code,min,max,p}]。

/// 道具效果类型（rpc_pet_use_item 认 feed/clean/toy/heal/refine_point；
/// rescue 只用于游历自救（sub_type='rescue' 或 effect.type='rescue' 二者之一）；
/// P2 三类各由专属 RPC 卡键——hatch_accel→rpc_pet_hatch_accelerate、
/// trait_wash→rpc_pet_wash_trait（category 必须 consumable）、unlock→rpc_pet_unlock_feature；
/// refine_reassign 是旧属性洗练语义，仅历史数据兜底展示，新配置不得再写。
/// 值域与 App PetItemEffectType 一一对应（铁律 12））
export const PET_EFFECT_TYPE_LABELS: Record<string, string> = {
  feed: '喂养（饱食）',
  clean: '清洁（心情）',
  toy: '玩耍（心情）',
  heal: '疗伤（健康，effect.value）',
  exp_double: '双倍经验（effect.hours 时长）',
  rescue: '游历自救',
  refine_point: '洗练点补给',
  refine_reassign: '属性重掷（已下线）',
  hatch_accel: '孵化加速（effect.minutes）',
  trait_wash: '特性洗练',
  unlock: '功能解锁（effect.feature，当前仅 breeding）',
}

/// 消耗品「效果类型」下拉可选项：LABELS 的超集用于历史数据兜底展示，
/// 这两类不许再新建（rescue 是工具类自救道具走 JSON 编辑；refine_reassign 语义已下线）。
const PET_EFFECT_TYPE_NOT_CONFIGURABLE = ['rescue', 'refine_reassign']

export const PET_EFFECT_TYPE_OPTIONS = Object.entries(PET_EFFECT_TYPE_LABELS)
  .filter(([value]) => !PET_EFFECT_TYPE_NOT_CONFIGURABLE.includes(value))
  .map(([value, label]) => ({ value, label }))

/// 任务条件 type（服务端 _pet_quest_bump 进度键：十类按事实表实况重算
/// （feed/interact/adventure/clean/play/heal/hatch/exchange/breed/evolve）+ scene 增量。
/// 值域与 App PetQuestConditionType 一致（铁律 12）；游历类可带 tier 时长维度）
export const PET_CONDITION_TYPE_LABELS: Record<string, string> = PET_QUEST_CONDITION_TYPE_LABELS

export const PET_CONDITION_TYPE_OPTIONS = Object.entries(PET_CONDITION_TYPE_LABELS).map(
  ([value, label]) => ({ value, label })
)

/// 游历条件时长维度（condition.tier；服务端游历重算按 a.tier 过滤，
/// App 任务标题前缀显示「短途/中途/长途游历」，双端同口径）
export const PET_QUEST_TIER_LABELS: Record<string, string> = {
  short: '短途',
  medium: '中途',
  long: '长途',
}

export const PET_QUEST_TIER_OPTIONS = Object.entries(PET_QUEST_TIER_LABELS).map(
  ([value, label]) => ({ value, label })
)

/// 下发资格（pet_quests.eligibility；draw 过滤不满足不进候选，多键之间 OR——
/// 服务端语义见 fix_pet_quest_ecosystem_20261026 / fix_pet_quest_eligibility_align_20261026）
export const PET_QUEST_ELIGIBILITY_LABELS: Record<string, string> = {
  feature: '功能已解锁',
  item_any: '持有任一道具',
  counter: '累计次数达标',
  evo_ready: '即将可进化',
  scene_available: '仍有主题未解锁',
  any_damaged: '存在伤员',
}
// points_enough（积分充足）已废止（20261030，定版积分单向：宠物模块不产出/不消费积分）

/// counter 资格的计数键（服务端 draw 过滤 case 枚举，新增计数须同步服务端）
export const PET_QUEST_ELIGIBILITY_COUNTER_LABELS: Record<string, string> = {
  hatch_total: '累计孵化',
  evolve_total: '累计进化',
  breed_egg_total: '累计繁育出蛋',
}

/// 蛋池 rarity 单选（weights.rarity 取首键语义 → 单选归一为 {code:1}）
export const PET_RARITY_CODE_OPTIONS = [
  { value: 'N', label: 'N 普通' },
  { value: 'R', label: 'R 稀有' },
  { value: 'SR', label: 'SR 史诗' },
  { value: 'SSR', label: 'SSR 传说' },
]

/// 评级 Tag 展示色（礼盒抽取记录等审计列表用；与 App PetRarity 视觉档位一致）
export const PET_RARITY_TAG_COLORS: Record<string, string> = {
  N: 'default',
  R: 'blue',
  SR: 'purple',
  SSR: 'gold',
}

/// 蛋孵化 mode（item effect.mode / weights.mode）
export const PET_EGG_MODE_OPTIONS = [
  { value: 'instant', label: '即开' },
  { value: 'wait', label: '等待' },
]

export const PET_EGG_MODE_LABELS: Record<string, string> = Object.fromEntries(
  PET_EGG_MODE_OPTIONS.map((o) => [o.value, o.label]),
)

/// 特性效果类型（pet_traits.effect_type，值域来自线上种子；未登记码原样展示）
export const PET_TRAIT_EFFECT_TYPE_LABELS: Record<string, string> = {
  exp_bonus: '经验加成',
  gold_bonus: '金币加成',
  feed_exp_bonus: '喂食经验加成',
  hunger_decay_slow: '饱食衰减减缓',
  mood_decay_slow: '心情衰减减缓',
  health_recover_bonus: '健康恢复加成',
  intimacy_bonus: '亲密度加成',
  adventure_time_reduce: '游历时长缩短',
  adventure_danger_reduce: '游历遇险降低',
  breed_cd_reduce: '繁育冷却缩短',
  drop_chance_bonus: '掉落概率提升',
}

/// 宠物时间线事件类型（pet_timeline_logs.event_type，12 类 = 全部写入点实证：
/// levelup/evolve/rename/release/obtain/breed/adventure_memory/adventure_failed/
/// adventure_recalled/refine_reassigned/trait_wash/spot_hidden_unlock；
/// 未登记码回退原样展示，便于新事件先行落库观察）
export const PET_TIMELINE_EVENT_META: Record<string, { label: string; color: string }> = {
  levelup: { label: '升级', color: 'green' },
  evolve: { label: '进化', color: 'purple' },
  rename: { label: '改名', color: 'blue' },
  release: { label: '送别', color: 'default' },
  obtain: { label: '孵化获得', color: 'cyan' },
  breed: { label: '繁育产蛋', color: 'gold' },
  adventure_memory: { label: '游历归来', color: 'geekblue' },
  adventure_failed: { label: '游历失败', color: 'red' },
  adventure_recalled: { label: '游历召回', color: 'default' },
  refine_reassigned: { label: '属性洗练', color: 'purple' },
  trait_wash: { label: '特性洗练', color: 'purple' },
  spot_hidden_unlock: { label: '秘境解锁', color: 'magenta' },
}

// ---------- 四维属性（2026-09-17 属性系统，与 App/SQL 对齐） ----------
// 消费点实证（feature_pet_attributes_20260917.sql）：
// - 种属 base_attributes.base 键 / hatch roll 维度；
// - 游历 attr_requirements[].attr（claim 结算判据）；
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

/// 游历失败惩罚键（penalty jsonb；数值均为负值扣减）
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
// condition_type 13 值 = rpc_pet_achievement_check 的 case 分支白名单（11 基础 + collection_total/tree_full_claim 收藏批扩展）；
// 未列入的取值进度恒为 0（服务端不报错，靠后台配置自检发现拼写错误）。
// 目标值读取优先级 condition_value.value → .target → 1（_pet_ach_target）。

export const PET_ACH_CONDITION_TYPE_LABELS: Record<string, string> = {
  feed_total: '累计喂养次数',
  interact_total: '累计互动次数',
  hatch_total: '累计孵化次数',
  adventure_total: '累计游历次数',
  rescue_total: '累计救助次数',
  evolve_total: '累计进化次数',
  breed_egg_total: '累计繁育产蛋次数',
  level_max: '最高等级达到',
  pets_owned: '拥有宠物数达到',
  families_owned: '拥有系别数达到',
  rarity_owned: '拥有指定评级宠物（condition_value.rarity）',
  collection_total: '累计获得收藏品',
  tree_full_claim: '成就树圆满度（全树领取数）',
}

export const PET_ACH_CONDITION_TYPE_OPTIONS = Object.entries(
  PET_ACH_CONDITION_TYPE_LABELS
).map(([value, label]) => ({ value, label }))

/// 需填 condition_value.rarity 的条件类型（其余类型只需目标值）
export const PET_ACH_CONDITION_RARITY_KEYS = ['rarity_owned']

/// 评级值域（20261030 去重：与 PET_RARITY_CODE_OPTIONS 同一常量别名，消除文件内双副本）
export const PET_RARITY_CODE_SELECT_OPTIONS = PET_RARITY_CODE_OPTIONS

/// 宠物状态标签（pet_pets.status；值域=rearing/fostered/adventuring/breeding
/// （20260916 建表 CHECK）+ released（20261009 软删除扩展）——新增状态先扩 DB 再补此表）
export const PET_PET_STATUS_META: Record<string, { text: string; color: string }> = {
  rearing: { text: '养育中', color: 'green' },
  adventuring: { text: '游历中', color: 'blue' },
  breeding: { text: '繁育中', color: 'purple' },
  released: { text: '已放生', color: 'default' },
  fostered: { text: '寄养', color: 'orange' },
}

/// 进化阶文案（species_code `_sN` 后缀约定；N=0 即基础形）
export const PET_STAGE_LABELS = ['基础形', '一阶', '二阶', '三阶', '四阶']

export const stageNum = (code: string): number => {
  const m = /_s(\d+)$/.exec(code)
  return m ? Number(m[1]) : 0
}

/// 性别符号（male/female；与 App PetGender.label 同源）
export const PET_GENDER_LABELS: Record<string, string> = {
  male: '♂',
  female: '♀',
}

/// 任务条件概要（游历类带档位前缀；「游历次数→游历」短名收敛此处，
/// 消除 QuestFormModal / 列表两处魔法串 replace）
export const questConditionSummary = (type: string, tier: string | null): string => {
  const typeText = PET_QUEST_CONDITION_TYPE_LABELS[type] ?? type
  if (type === 'adventure' && tier) {
    return `${PET_QUEST_TIER_LABELS[tier] ?? tier}${typeText.replace('游历次数', '游历')}`
  }
  return typeText
}

/// 成就档位（pet_achievements.tier；值域与文案与 App PetAchTier 枚举一致
/// ——经典/铜银金/彩/传说/纪念/史诗，20261023 成就树批起 bronze~epic 投产）
export const PET_ACH_TIER_TYPES = {
  NORMAL: 'normal',
  BRONZE: 'bronze',
  SILVER: 'silver',
  GOLD: 'gold',
  LEGEND: 'legend',
  LEGENDARY: 'legendary',
  MEMORIAL: 'memorial',
  EPIC: 'epic',
} as const

export const PET_ACH_TIER_LABELS: Record<string, string> = {
  [PET_ACH_TIER_TYPES.NORMAL]: '经典',
  [PET_ACH_TIER_TYPES.BRONZE]: '铜阶',
  [PET_ACH_TIER_TYPES.SILVER]: '银阶',
  [PET_ACH_TIER_TYPES.GOLD]: '金阶',
  [PET_ACH_TIER_TYPES.LEGEND]: '彩阶',
  [PET_ACH_TIER_TYPES.LEGENDARY]: '传说',
  [PET_ACH_TIER_TYPES.MEMORIAL]: '纪念',
  [PET_ACH_TIER_TYPES.EPIC]: '史诗',
}

export const PET_ACH_TIER_COLORS: Record<string, string> = {
  normal: 'default',
  bronze: 'volcano',
  silver: 'default',
  gold: 'gold',
  epic: 'purple',
  legend: 'magenta',
  legendary: 'red',
  memorial: 'cyan',
}

export const PET_ACH_TIER_OPTIONS = Object.entries(PET_ACH_TIER_LABELS).map(
  ([value, label]) => ({ value, label })
)

// ---------- 随机事件（feature_pet_random_events_20261008.sql 定版） ----------
//
// context 值域 = 服务端 rpc_pet_event_roll 的代码枚举（两端同源，禁止私加）；
// content schema：{title, text, options:[{label, rewards}]}，2~3 个选项。

export const PET_EVENT_CONTEXTS = {
  HOME_OPEN: 'home_open',
  ACTION_DONE: 'action_done',
} as const

export const PET_EVENT_CONTEXT_LABELS: Record<string, string> = {
  [PET_EVENT_CONTEXTS.HOME_OPEN]: '打开宠物页',
  [PET_EVENT_CONTEXTS.ACTION_DONE]: '照料动作成功后',
}

export const PET_EVENT_CONTEXT_OPTIONS = Object.entries(
  PET_EVENT_CONTEXT_LABELS
).map(([value, label]) => ({ value, label }))

/// 奖惩包数值键（choose 结算与 App 公示同源；hunger 允许负值=代价型选项）
/// ⚠️ 不含 points：20261024 拍板宠物模块不再奖励积分（fix_pet_event_points_remove_20261024.sql
/// 已全量剥除存量，保存时残余 points 键一并剔除）——积分只经「积分兑换」渠道产出。
export const PET_EVENT_REWARD_FIELDS = [
  { key: 'gold', label: '金币', min: 0 },
  { key: 'exp', label: '经验', min: 0 },
  { key: 'mood', label: '心情', min: 0 },
  { key: 'intimacy', label: '亲密', min: 0 },
  { key: 'hunger', label: '饱食', min: -100 },
] as const

// ---------- 2D 表现动作（pet_species.render2d.frames 的键域） ----------
//
// 值域 = App 端 `lib/constants/pet_render.dart` 的 `PetAction.code` 全集（铁律 12 三端对齐），
// 两族兼容值（walk/happy）虽不再被 App 触发，但仍是合法键（素材文件名契约依赖），故一并登记。
//
// 只管「整图补间」那条路：分层弯曲的 6 档表情帧由 App 编译期 `kPetBendGeo` 是否登记决定，
// 不吃本键域，改帧数动不了弯曲形态（口径见 App `utils/pet_art_resolver.dart` 契约注释）。
// 配置帧数超过已随包帧数时 App 按随包数裁剪——一期素材全随包，配置无权凭空造资源。

export const PET_RENDER_ACTIONS = {
  IDLE: 'idle',
  EAT: 'eat',
  PETTED: 'petted',
  SAD: 'sad',
  SLEEP: 'sleep',
  EVOLVE: 'evolve',
  WALK: 'walk',
  HAPPY: 'happy',
} as const

export const PET_RENDER_ACTION_LABELS: Record<string, string> = {
  [PET_RENDER_ACTIONS.IDLE]: '待机 idle',
  [PET_RENDER_ACTIONS.EAT]: '进食 eat',
  [PET_RENDER_ACTIONS.PETTED]: '被抚摸 petted',
  [PET_RENDER_ACTIONS.SAD]: '委屈 sad',
  [PET_RENDER_ACTIONS.SLEEP]: '睡觉 sleep',
  [PET_RENDER_ACTIONS.EVOLVE]: '进化演出 evolve',
  [PET_RENDER_ACTIONS.WALK]: '行走 walk（兼容保留）',
  [PET_RENDER_ACTIONS.HAPPY]: '开心 happy（兼容保留）',
}

/// frames 编辑器行字段（数组顺序即展示顺序：定版集在前、兼容值垫底）
///
/// 不设上限：帧数上限的真相在「已随包帧数」（App 侧按包裁剪），后台写超只是被裁，不该被表单挡住。
export const PET_RENDER_ACTION_FIELDS = Object.entries(PET_RENDER_ACTION_LABELS).map(
  ([key, label]) => ({ key, label, min: 1, placeholder: '未配置=随包全放' })
)
