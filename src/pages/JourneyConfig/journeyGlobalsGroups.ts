import { globalsFields } from './journeySchemas'
import type { JourneyFieldDef } from './journeyTabSchema'

/// 信息卡中的一项：字段定义取自全局参数 schema，说明用于只读展示。
export interface JourneyGlobalsFieldMeta {
  field: JourneyFieldDef
  desc: string
}

/// 一组参数对应一张只读信息卡和一个编辑弹窗；保存只提交本组字段。
export interface JourneyGlobalsGroup {
  key: string
  title: string
  description: string
  fields: JourneyGlobalsFieldMeta[]
}

const fieldOf = (name: string): JourneyFieldDef => {
  const hit = globalsFields.find((f) => f.name === name)
  if (!hit) {
    throw new Error(`全局参数字段未登记：${name}`)
  }
  return hit
}

const item = (name: string, desc: string): JourneyGlobalsFieldMeta => ({
  field: fieldOf(name),
  desc,
})

export const JOURNEY_GLOBALS_GROUPS: JourneyGlobalsGroup[] = [
  {
    key: 'basic',
    title: '基础参数',
    description: '同屏怪、掉率、等级、还魂与开局铺场的基础口径',
    fields: [
      item('code', '单行标识，固定为 globals'),
      item('monster_cap', '同屏怪物数量上限，超出后停止刷怪'),
      item('talent_drop_rate', '末场妖王伏诛掉落天赋点的概率（0~1）'),
      item('char_level_cap', '局内角色等级上限'),
      item('revive_merit_base', '还魂消耗的功德基准价'),
      item('initial_pack_size', '开局一次性铺场的怪物数量'),
      item('spawn_den_ratio', '刷怪集中到妖穴的概率（0~1）'),
    ],
  },
  {
    key: 'growth',
    title: '成长卡',
    description: '局内升级与三选一成长卡的攻击、生命及属性加成',
    fields: [
      item('level_attack_per_lv', '每次升级提升的基础攻击力，独立于法宝品阶'),
      item('level_hp_per_lv', '每次升级提升的生命上限，同步补足当前生命'),
      item('upgrade_attack', '攻击力成长卡单次提升量'),
      item('attack_upgrade_cap', '攻击卡累计提升上限，达到后该卡不再出现'),
      item('upgrade_move', '移速成长卡每级加成'),
      item('upgrade_hp', '生命上限成长卡每级加成'),
      item('upgrade_regen', '回复/秒成长卡每级加成'),
      item('upgrade_pickup', '拾取范围成长卡每级加成'),
    ],
  },
  {
    key: 'exp',
    title: '经验曲线',
    description: '局内升级所需经验的基数与逐级增量',
    fields: [
      item('exp_base', '首级升级所需经验基数'),
      item('exp_per_lv', '每升一级追加的经验量'),
    ],
  },
  {
    key: 'pacing',
    title: '对局节奏',
    description: '妖王降临、前期发育保护与精英率增长',
    fields: [
      item('boss_spawn_delay_sec', '妖王自开局起延迟降临的秒数'),
      item('early_game_protect_sec', '前期发育保护秒数，期内只刷普通怪'),
      item('elite_rate_per_min', '保护期结束后精英率每分钟增量'),
    ],
  },
  {
    key: 'curve',
    title: '难度曲线',
    description: '强度乘区随时间的增长、妖王血量时间系数与硬上限',
    fields: [
      item('buff_time_slope', '强度乘区每分钟增长斜率'),
      item('buff_level_mult', '每点关卡难度对应的乘区增量'),
      item('buff_mult_cap', '最终强度乘区的硬上限'),
      item('monster_speed_cap', '怪物移速硬上限（px/s）'),
      item('boss_hp_time_k', '妖王血量时间项系数，妖王血量不随关卡难度放大'),
    ],
  },
]
