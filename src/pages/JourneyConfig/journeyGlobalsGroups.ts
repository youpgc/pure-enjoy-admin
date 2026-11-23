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
      item('revive_merit_cap', '还魂消耗的功德封顶价'),
      item('merit_cap', '每日游历获取功德上限：局内达上限后不再增长'),
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
    description: '主线/每日升级需求曲线与怪物经验产出的缩放系数（无尽模式另有专属曲线，见「无尽妖潮」）',
    fields: [
      item('exp_base', '首级升级所需经验基数'),
      item('exp_per_lv', '每升一级追加的经验量'),
      item('exp_curve_pow', '升级需求曲线的幂次：主线/每日所需=基数+每级增量×等级^幂次'),
      item('exp_mult_k', '怪物经验随强度乘区缩放的系数：经验×(1+乘区×K)，0=不随乘区缩放'),
    ],
  },
  {
    key: 'pacing',
    title: '对局节奏',
    description: '妖王降临、前期发育保护与精英率增长',
    fields: [
      item('boss_spawn_delay_sec', '妖王自开局起延迟降临的秒数'),
      item('boss_respawn_cd_sec', '妖王伏诛后复活的冷却秒数，冷却期罗盘位显示倒计时'),
      item('boss_warn_sec', '妖王降临前的预警提示窗口（秒）'),
      item('early_game_protect_sec', '前期发育保护秒数，期内只刷普通怪'),
      item('elite_rate_per_min', '保护期结束后精英率每分钟增量'),
      item('elite_rate_cap', '精英怪占比上限，后期仍保留普通怪比例'),
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
      item('boss_damage_lv_k', '妖王接触伤害随玩家等级成长的系数（玩家每升 1 级伤害+该比例）'),
      item('armor_curve_k', '护甲减伤曲线分母 K：减伤=护甲/(护甲+K)，越大减伤越低'),
      item('monster_armor_reduction_cap', '怪物侧护甲减伤上限（0~1），高于玩家侧上限'),
      item('monster_lv_k', '普通怪血量随玩家等级成长的系数，0=不随等级成长'),
      item('boss_hp_lv_k', '妖王血量随玩家等级成长的系数，与时间项叠乘，0=不随等级成长'),
    ],
  },
  {
    key: 'endless',
    title: '无尽妖潮',
    description: '无尽专属升级需求曲线、妖潮波次门槛、妖王配额与降临节奏',
    fields: [
      item('endless_exp_base', '无尽专属升级需求曲线的常数项：need = 基数 + 每级系数×等级^幂次'),
      item('endless_exp_per_lv', '无尽专属升级需求曲线的每级系数（默认 28）'),
      item('endless_exp_pow', '无尽专属升级需求曲线的幂次（默认 1.75）'),
      item('endless_boss_tide_start_wave', '妖潮起点波号：从该波起开始降临妖王并按波成长'),
      item('endless_boss_count_cap', '同波妖王配额上限'),
      item('endless_boss_concurrent', '同场并发妖王数上限'),
      item('endless_boss_arrive_cd', '妖王补位降临倒计时（秒）'),
      item('endless_boss_amp_per_wave', '妖王能力每波额外增幅'),
      item('endless_boss_hp_amp', '妖潮妖王血量每波额外增幅（独立于能力增幅）'),
      item('endless_boss_territory_radius', '妖王领地半径（px）'),
      item('endless_boss_spread_min_dist', '多妖王锚点最小间距（px）'),
      item('endless_boss_guard_elite_ratio', '妖潮期护卫精英占比'),
      item('endless_boss_chest_rate', '妖潮波内首杀掷宝箱概率，后场妖王不掷'),
      item('endless_boss_refine_per_wave', '宝葫妖潮期每波炼化上限'),
    ],
  },
  {
    key: 'realm',
    title: '境界与品阶',
    description: '按等级突破境界的增伤与生命增幅，及法宝品阶 L9+ 的每级延展',
    fields: [
      item('realm_step', '境界档位步长（级/档）：每升该级数突破一档，最多 9 档'),
      item('realm_amp_per', '每次境界突破的增伤增量，加法并入增伤合计'),
      item('realm_hp_per', '每次境界突破的生命上限增幅，按档复利'),
      item('weapon_grade_per_lv', '法宝品阶 L9+ 每升 1 级的数值复利增幅（L1~L8 走分级表）'),
    ],
  },
]
