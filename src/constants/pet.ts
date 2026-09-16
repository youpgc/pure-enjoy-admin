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
} as const

export const PET_SOURCE_TYPE_LABELS: Record<string, string> = {
  pet_shop_buy: '商城消费',
  pet_system_reward: '系统发放',
  pet_achievement: '成就发放',
  pet_exchange: '积分兑换',
  pet_admin_grant: '客服调整',
}

export const PET_SOURCE_TYPE_COLORS: Record<string, string> = {
  pet_shop_buy: 'orange',
  pet_system_reward: 'green',
  pet_achievement: 'gold',
  pet_exchange: 'blue',
  pet_admin_grant: 'purple',
}

export const PET_SOURCE_TYPE_OPTIONS = Object.entries(PET_SOURCE_TYPE_LABELS).map(
  ([value, label]) => ({ value, label })
)

// ---------- 道具三大类（背包四分区） ----------

export const PET_ITEM_CATEGORY_LABELS: Record<string, string> = {
  egg: '蛋',
  consumable: '消耗品',
  tool: '工具',
  equip: '装备',
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

export const PET_QUEST_TYPE_LABELS: Record<string, string> = {
  daily: '每日',
  weekly: '每周',
}

export const PET_QUEST_TYPE_OPTIONS = Object.entries(PET_QUEST_TYPE_LABELS).map(
  ([value, label]) => ({ value, label })
)

export const PET_QUEST_DIFFICULTY_LABELS: Record<string, string> = {
  normal: '普通',
  advanced: '进阶',
  hard: '困难',
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

export const PET_ADVENTURE_RESULT_OPTIONS = Object.entries(PET_ADVENTURE_RESULT_LABELS).map(
  ([value, label]) => ({ value, label })
)

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

/// 消耗品 effect.type（rpc_pet_use_item 白名单）
export const PET_EFFECT_TYPE_LABELS: Record<string, string> = {
  feed: '喂养（饱食）',
  clean: '清洁（心情）',
  toy: '玩耍（心情）',
}

export const PET_EFFECT_TYPE_OPTIONS = Object.entries(PET_EFFECT_TYPE_LABELS).map(
  ([value, label]) => ({ value, label })
)

/// 任务条件 type（服务端 _pet_quest_bump 的 bump 键；feed/use_item、adventure/claim、hatch/孵化）
export const PET_CONDITION_TYPE_LABELS: Record<string, string> = {
  feed: '喂养次数',
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
