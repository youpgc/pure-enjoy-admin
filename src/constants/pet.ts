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
  equip: '装备（P2）',
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
  weekly: '每周（P2）',
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
