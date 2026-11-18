/// 西行通用战斗参数字典（journey_battle_params）。
/// 一行一参数，按 group_code 分组、param_code 标识语义键；
/// default 与 App 端内置兜底常量一致：参数表未配置时 App 回落该值，行为不变。
/// 本字典是后台编辑界面的中文名/类型/取值范围单一真源。

export type BattleParamKind = 'number' | 'percent' | 'duration' | 'integer'

export interface BattleParamDef {
  /// 参数键（对应 journey_battle_params.param_code）
  code: string
  /// 中文名
  label: string
  /// 值类型：决定输入控件与步进
  kind: BattleParamKind
  /// 缺省值（与 App 兜底一致，仅作输入框占位与"未配置"提示）
  default: number
  /// 允许范围
  min?: number
  max?: number
  step?: number
  /// 单位/口径说明
  hint?: string
}

export interface BattleParamGroupDef {
  /// 分组码（对应 journey_battle_params.group_code）
  code: string
  /// 分组中文名（二级 tab 标题）
  label: string
  /// 分组说明
  intro: string
  params: BattleParamDef[]
}

export const JOURNEY_BATTLE_PARAM_GROUPS: BattleParamGroupDef[] = [
  {
    code: 'damage',
    label: '伤害结算',
    intro: '伤害节拍、护甲与暴击口径、虚弱与增伤上限。参数未配置时回落 App 内置值。',
    params: [
      { code: 'hurt_interval', label: '接触伤害节拍(秒)', kind: 'duration', default: 0.5, min: 0.05, max: 5, step: 0.05 },
      { code: 'player_armor_cap', label: '玩家护甲减伤上限', kind: 'percent', default: 0.6, min: 0, max: 0.95, step: 0.01, hint: '保底承伤 1−该值' },
      { code: 'weaken_mult', label: '虚弱期伤害系数', kind: 'number', default: 0.5, min: 0, max: 1, step: 0.05, hint: '金刚琢虚弱' },
      { code: 'amp_cap', label: '增伤合计上限', kind: 'number', default: 2.0, min: 0, max: 10, step: 0.1, hint: '对应 +200%' },
      { code: 'crit_rate_cap', label: '暴击率上限', kind: 'percent', default: 0.6, min: 0, max: 1, step: 0.01 },
      { code: 'crit_dmg_min', label: '暴击伤害下限', kind: 'number', default: 1.0, min: 1, max: 3, step: 0.05 },
      { code: 'crit_dmg_cap', label: '暴击伤害上限', kind: 'number', default: 2.0, min: 1, max: 5, step: 0.05 },
    ],
  },
  {
    code: 'weapon',
    label: '武器与吸血穿刺',
    intro: '命中冷却、穿刺与吸血基准/上限。维度槽的每级增量仍在「武器维度槽」表配置。',
    params: [
      { code: 'hit_cd', label: '单怪命中冷却(秒)', kind: 'duration', default: 0.3, min: 0.05, max: 2, step: 0.05 },
      { code: 'burn_dwell_sec', label: '灼烧驻留触发(秒)', kind: 'duration', default: 1, min: 0.1, max: 30, step: 0.1, hint: '处于武器臂展圆内累计驻留满该时长即点燃全部灼烧，每满一次续燃；离开范围清零' },
      { code: 'pierce_base', label: '穿刺基准比例', kind: 'percent', default: 0.1, min: 0, max: 1, step: 0.01 },
      { code: 'pierce_cap', label: '穿刺比例上限', kind: 'percent', default: 0.3, min: 0, max: 1, step: 0.01 },
      { code: 'lifesteal_base', label: '吸血基准比例', kind: 'percent', default: 0.03, min: 0, max: 1, step: 0.005 },
      { code: 'lifesteal_cap', label: '吸血比例上限', kind: 'percent', default: 0.2, min: 0, max: 1, step: 0.01 },
      { code: 'lifesteal_floor', label: '吸血保底回血(点)', kind: 'number', default: 2, min: 0, max: 100, step: 1 },
      { code: 'lifesteal_sec_cap', label: '吸血秒窗上限(最大生命比例)', kind: 'percent', default: 0.1, min: 0, max: 1, step: 0.01 },
    ],
  },
  {
    code: 'spawn',
    label: '刷怪生态',
    intro: '无波次关的兜底刷怪节奏与妖王据点守卫布置。有波次配置时波次优先。',
    params: [
      { code: 'interval_base', label: '兜底刷怪间隔基准(秒)', kind: 'duration', default: 0.8, min: 0.1, max: 5, step: 0.05 },
      { code: 'interval_tier', label: '密度档间隔缩减', kind: 'number', default: 0.1, min: 0, max: 1, step: 0.01 },
      { code: 'interval_minute', label: '每分钟间隔缩减', kind: 'number', default: 0.12, min: 0, max: 1, step: 0.01 },
      { code: 'interval_min', label: '间隔下限(秒)', kind: 'duration', default: 0.28, min: 0.05, max: 2, step: 0.01 },
      { code: 'batch_minutes', label: '批量递增分钟跨度', kind: 'number', default: 1.5, min: 0.5, max: 10, step: 0.5 },
      { code: 'boss_guard_count', label: '妖王据点守卫只数', kind: 'integer', default: 10, min: 0, max: 60, step: 1 },
      { code: 'boss_guard_ring_min', label: '守卫环带内径(px)', kind: 'number', default: 120, min: 20, max: 1000, step: 10 },
      { code: 'boss_guard_ring_span', label: '守卫环带宽度(px)', kind: 'number', default: 140, min: 20, max: 1000, step: 10 },
    ],
  },
  {
    code: 'monster',
    label: '怪物 AI',
    intro: '怪速/接触伤害成长乘区、索敌与脱战、离屏冻结与分裂阈值。',
    params: [
      { code: 'speed_base', label: '怪速基础乘区', kind: 'number', default: 0.9, min: 0, max: 3, step: 0.05 },
      { code: 'speed_per_buff', label: '怪速强度系数', kind: 'number', default: 0.12, min: 0, max: 1, step: 0.01 },
      { code: 'contact_base', label: '接触伤害基础乘区', kind: 'number', default: 0.85, min: 0, max: 3, step: 0.05 },
      { code: 'contact_per_buff', label: '接触伤害强度系数', kind: 'number', default: 0.2, min: 0, max: 1, step: 0.01 },
      { code: 'aggro_boss', label: '妖王侦测半径(px)', kind: 'number', default: 420, min: 50, max: 3000, step: 10 },
      { code: 'aggro_normal', label: '普通怪侦测半径(px)', kind: 'number', default: 260, min: 50, max: 3000, step: 10 },
      { code: 'leash_mult', label: '默认脱战倍率', kind: 'number', default: 1.5, min: 1, max: 5, step: 0.1 },
      { code: 'regen_per_sec', label: '脱战回血(最大生命/秒)', kind: 'percent', default: 0.4, min: 0, max: 1, step: 0.05 },
      { code: 'freeze_dist', label: '离屏冻结距离(px)', kind: 'number', default: 1400, min: 300, max: 5000, step: 100 },
      { code: 'split_hp_ratio', label: '分裂触发血量比例', kind: 'percent', default: 0.5, min: 0.05, max: 1, step: 0.05, hint: '白骨精分魂' },
      { code: 'split_hp_mult', label: '分身血量倍率', kind: 'number', default: 0.4, min: 0.05, max: 2, step: 0.05 },
    ],
  },
  {
    code: 'boss',
    label: '妖王冲撞',
    intro: '妖王冲撞状态机的时序、距离与逐场递增。冷却仍走「妖王参数」逐怪配置。',
    params: [
      { code: 'charge_trigger_dist', label: '冲撞触发距离(px)', kind: 'number', default: 340, min: 50, max: 2000, step: 10 },
      { code: 'charge_windup_sec', label: '蓄力预警(秒)', kind: 'duration', default: 0.7, min: 0.1, max: 5, step: 0.1 },
      { code: 'charge_dash_sec', label: '突进时长(秒)', kind: 'duration', default: 0.55, min: 0.1, max: 5, step: 0.05 },
      { code: 'charge_speed_mult', label: '突进速度倍率', kind: 'number', default: 4.5, min: 1, max: 20, step: 0.5 },
      { code: 'charge_recover_sec', label: '收招时长(秒)', kind: 'duration', default: 1.0, min: 0.1, max: 5, step: 0.1 },
      { code: 'stage_damage_gain', label: '逐场伤害递增', kind: 'percent', default: 0.25, min: 0, max: 2, step: 0.05 },
      { code: 'stage_hp_gain', label: '逐场血量递增', kind: 'percent', default: 0.55, min: 0, max: 2, step: 0.05 },
    ],
  },
  {
    code: 'ability',
    label: '角色能力',
    intro: '各角色特殊能力的周期、窗口、倍率与时长。仅为数值；触发逻辑分支固化在 App。',
    params: [
      { code: 'bajie_guard_mult', label: '铜皮铁骨减伤系数', kind: 'number', default: 0.7, min: 0, max: 1, step: 0.05, hint: '八戒' },
      { code: 'bajie_knock_mult', label: '铜皮铁骨击退倍率', kind: 'number', default: 1.5, min: 1, max: 5, step: 0.1, hint: '八戒' },
      { code: 'fumo_charge_sec', label: '伏魔重击蓄力(秒)', kind: 'duration', default: 20, min: 1, max: 300, step: 1, hint: '沙僧' },
      { code: 'nezha_period_sec', label: '三头六臂周期(秒)', kind: 'duration', default: 30, min: 1, max: 300, step: 1, hint: '哪吒' },
      { code: 'nezha_window_sec', label: '三头六臂窗口(秒)', kind: 'duration', default: 6, min: 1, max: 60, step: 1 },
      { code: 'nezha_amp', label: '三头六臂增伤', kind: 'percent', default: 0.4, min: 0, max: 3, step: 0.05 },
      { code: 'laojun_period_sec', label: '兜率炉火周期(秒)', kind: 'duration', default: 30, min: 1, max: 300, step: 1, hint: '老君' },
      { code: 'laojun_window_sec', label: '兜率炉火窗口(秒)', kind: 'duration', default: 6, min: 1, max: 60, step: 1 },
      { code: 'laojun_burn_ratio', label: '炉火灼烧(武器伤害比例)', kind: 'percent', default: 0.4, min: 0, max: 3, step: 0.05 },
      { code: 'laojun_burn_sec', label: '炉火灼烧时长(秒)', kind: 'duration', default: 2, min: 0.5, max: 20, step: 0.5 },
      { code: 'tieshan_period_sec', label: '芭蕉罡风周期(秒)', kind: 'duration', default: 30, min: 1, max: 300, step: 1, hint: '铁扇' },
      { code: 'tieshan_knockback', label: '罡风击退距离(px)', kind: 'number', default: 240, min: 10, max: 2000, step: 10 },
      { code: 'tieshan_root_sec', label: '罡风定身(秒)', kind: 'duration', default: 1, min: 0.1, max: 10, step: 0.1 },
      { code: 'jinjiao_per_stack', label: '紫金宝葫每层增伤', kind: 'percent', default: 0.03, min: 0, max: 0.5, step: 0.005, hint: '金角' },
      { code: 'jinjiao_max_stacks', label: '紫金宝葫层数上限', kind: 'integer', default: 20, min: 1, max: 100, step: 1 },
      { code: 'jinjiao_heal_per_stack', label: '宝葫叠层回血(生命比例)', kind: 'percent', default: 0.15, min: 0, max: 1, step: 0.01 },
      { code: 'tang_heal_period_sec', label: '金身佛光周期(秒)', kind: 'duration', default: 10, min: 1, max: 300, step: 1, hint: '唐僧' },
      { code: 'tang_heal_ratio', label: '金身佛光回血(生命比例)', kind: 'percent', default: 0.08, min: 0, max: 1, step: 0.01 },
      { code: 'tang_fatal_heal_ratio', label: '金身佛光免死回血(比例)', kind: 'percent', default: 0.3, min: 0, max: 1, step: 0.05 },
      { code: 'honghaier_burn_mult', label: '三昧真火灼烧倍率', kind: 'number', default: 2.0, min: 1, max: 10, step: 0.5, hint: '红孩儿' },
      { code: 'honghaier_burn_sec', label: '三昧真火灼烧时长(秒)', kind: 'duration', default: 4, min: 0.5, max: 30, step: 0.5 },
    ],
  },
  {
    code: 'economy',
    label: '经济与掉落',
    intro: '宝箱收益、还魂效果、掉落兜底与通关奖励系数。功德定价仍在对应配置表/后台参数。',
    params: [
      { code: 'chest_choice_rate', label: '宝箱额外三选一概率', kind: 'percent', default: 0.8, min: 0, max: 1, step: 0.05 },
      { code: 'chest_merit_base', label: '宝箱功德兜底枚数', kind: 'integer', default: 15, min: 0, max: 1000, step: 1 },
      { code: 'chest_merit_double', label: '宝箱翻倍枚数', kind: 'integer', default: 30, min: 0, max: 1000, step: 1 },
      { code: 'chest_merit_double_rate', label: '宝箱翻倍概率', kind: 'percent', default: 0.5, min: 0, max: 1, step: 0.05 },
      { code: 'revive_hp_ratio', label: '还魂回血(生命比例)', kind: 'percent', default: 0.6, min: 0, max: 1, step: 0.05 },
      { code: 'revive_push_from', label: '还魂推怪起始距离(px)', kind: 'number', default: 300, min: 0, max: 2000, step: 10 },
      { code: 'revive_push_to', label: '还魂推开目标距离(px)', kind: 'number', default: 420, min: 0, max: 2000, step: 10 },
      { code: 'drop_coin_fallback', label: '掉落表空兜底·铜钱概率', kind: 'percent', default: 0.35, min: 0, max: 1, step: 0.05 },
      { code: 'drop_peach_fallback', label: '掉落表空兜底·蟠桃概率', kind: 'percent', default: 0.04, min: 0, max: 1, step: 0.01 },
      { code: 'elite_chest_rate', label: '精英宝箱掉率', kind: 'percent', default: 0.01, min: 0, max: 1, step: 0.001, hint: '精英以经验为主，宝箱为惊喜彩蛋' },
      { code: 'daily_coin_period_sec', label: '每日铜钱雨周期(秒)', kind: 'duration', default: 4, min: 0.5, max: 60, step: 0.5 },
      { code: 'daily_coin_count', label: '每日铜钱雨每轮枚数', kind: 'integer', default: 4, min: 1, max: 50, step: 1 },
      { code: 'daily_coin_unit', label: '每日铜钱单价', kind: 'integer', default: 8, min: 1, max: 1000, step: 1 },
      { code: 'repeat_clear_ratio', label: '重复通关奖励(首通功德比例)', kind: 'percent', default: 0.3, min: 0, max: 1, step: 0.05 },
      { code: 'repeat_clear_flat', label: '普通关重复通关固定功德', kind: 'integer', default: 10, min: 0, max: 1000, step: 1 },
    ],
  },
  {
    code: 'endless',
    label: '无尽妖潮',
    intro: '无尽波次节奏与妖王配额递增。波次专项值（配额/精英比等）仍在「全局参数」与波次表。',
    params: [
      { code: 'wave_rest_sec', label: '波间休整(秒)', kind: 'duration', default: 1.2, min: 0, max: 30, step: 0.1 },
      { code: 'wave_spread_sec', label: '每波铺怪总时长(秒)', kind: 'duration', default: 18, min: 1, max: 120, step: 1 },
      { code: 'boss_quota_gain', label: '妖王配额递增系数', kind: 'number', default: 1.1, min: 0.1, max: 5, step: 0.1, hint: '配额≈(波号−起点+1)×该值' },
      { code: 'boss_leash_gain', label: '妖王软领地脱战倍率', kind: 'number', default: 1.3, min: 1, max: 5, step: 0.1 },
      { code: 'boss_pool_hp_base', label: '妖王候选·血量档基数', kind: 'number', default: 0, min: 0, max: 1000000, step: 1000, hint: '候选上限=基数+每级增量×玩家等级；档内随机' },
      { code: 'boss_pool_hp_per_lv', label: '妖王候选·每级血量增量', kind: 'number', default: 3000, min: 0, max: 100000, step: 500, hint: '低等级只在低血档抽妖王，避免早波撞终盘妖王' },
      { code: 'develop_extra_count', label: '发育期每波追加怪数', kind: 'integer', default: 0, min: 0, max: 200, step: 5, hint: '妖潮起点前的发育波，撑起角色经验池' },
      { code: 'develop_exp_mult', label: '发育期经验倍率', kind: 'number', default: 1.0, min: 0, max: 10, step: 0.1, hint: '仅发育波的经验掉落；1=不加成' },
      { code: 'auto_hunt_remain_count', label: '全图追猎·触发剩余数', kind: 'integer', default: 10, min: 1, max: 200, step: 1, hint: '本波怪铺完后，剩余普怪（妖王除外）降至该数以内才开启追踪；波末自动关闭' },
      { code: 'auto_hunt_hp_ratio', label: '全图追猎·血量门槛', kind: 'percent', default: 0.5, min: 0, max: 1, step: 0.05, hint: '玩家血量比例高于此值才允许触发' },
      { code: 'spawn_edge_margin', label: '刷怪边界留白(px)', kind: 'number', default: 80, min: 40, max: 600, step: 10, hint: '铺怪/妖王降临点到地图四边的最小留白；越大越靠内、不贴墙' },
    ],
  },
  {
    code: 'player',
    label: '玩家移动',
    intro: '基础移速与里程换算。移速加成来自维度槽/光环，此处为基础值。',
    params: [
      { code: 'base_speed', label: '基础移速(px/s)', kind: 'number', default: 240, min: 50, max: 2000, step: 10 },
      { code: 'units_per_li', label: '1 里对应世界单位', kind: 'number', default: 25, min: 1, max: 500, step: 1 },
    ],
  },
]

/// 参数键反查（group.param → 定义），供编辑器按现有行取元数据。
export const JOURNEY_BATTLE_PARAM_INDEX: Record<string, BattleParamDef> =
  Object.fromEntries(
    JOURNEY_BATTLE_PARAM_GROUPS.flatMap((g) =>
      g.params.map((p) => [`${g.code}.${p.code}`, p]),
    ),
  )

export interface BattleParamSubGroupDef {
  /// 子分类码，组内唯一
  code: string
  /// 子分类中文名（卡片标题）
  label: string
  /// 子分类口径说明
  intro?: string
  /// 该子分类包含的参数键，顺序即展示顺序
  params: string[]
}

/// 分组内的子分类：每组参数按语义聚合成卡片，与全局参数的信息卡形态一致。
/// params 必须覆盖所属分组的全部参数键且不重不漏，未列入的参数不会展示。
export const JOURNEY_BATTLE_PARAM_SUBGROUPS: Record<string, BattleParamSubGroupDef[]> = {
  damage: [
    { code: 'rhythm', label: '伤害节拍', params: ['hurt_interval'] },
    { code: 'defense', label: '护甲与虚弱', params: ['player_armor_cap', 'weaken_mult'] },
    { code: 'crit', label: '增伤与暴击', params: ['amp_cap', 'crit_rate_cap', 'crit_dmg_min', 'crit_dmg_cap'] },
  ],
  weapon: [
    { code: 'hit', label: '命中冷却与灼烧驻留', params: ['hit_cd', 'burn_dwell_sec'] },
    { code: 'pierce', label: '穿刺', params: ['pierce_base', 'pierce_cap'] },
    { code: 'lifesteal', label: '吸血', params: ['lifesteal_base', 'lifesteal_cap', 'lifesteal_floor', 'lifesteal_sec_cap'] },
  ],
  spawn: [
    { code: 'cadence', label: '兜底刷怪节奏', params: ['interval_base', 'interval_tier', 'interval_minute', 'interval_min', 'batch_minutes'] },
    { code: 'guard', label: '妖王据点守卫', params: ['boss_guard_count', 'boss_guard_ring_min', 'boss_guard_ring_span'] },
  ],
  monster: [
    { code: 'growth', label: '怪速与接触成长', params: ['speed_base', 'speed_per_buff', 'contact_base', 'contact_per_buff'] },
    { code: 'aggro', label: '索敌与脱战', params: ['aggro_boss', 'aggro_normal', 'leash_mult', 'regen_per_sec'] },
    { code: 'freeze', label: '离屏冻结', params: ['freeze_dist'] },
    { code: 'split', label: '分裂阈值', params: ['split_hp_ratio', 'split_hp_mult'] },
  ],
  boss: [
    { code: 'charge', label: '冲撞时序', params: ['charge_trigger_dist', 'charge_windup_sec', 'charge_dash_sec', 'charge_speed_mult', 'charge_recover_sec'] },
    { code: 'stage', label: '逐场递增', params: ['stage_damage_gain', 'stage_hp_gain'] },
  ],
  ability: [
    { code: 'bajie', label: '八戒', params: ['bajie_guard_mult', 'bajie_knock_mult'] },
    { code: 'sha', label: '沙僧', params: ['fumo_charge_sec'] },
    { code: 'nezha', label: '哪吒', params: ['nezha_period_sec', 'nezha_window_sec', 'nezha_amp'] },
    { code: 'laojun', label: '老君', params: ['laojun_period_sec', 'laojun_window_sec', 'laojun_burn_ratio', 'laojun_burn_sec'] },
    { code: 'tieshan', label: '铁扇', params: ['tieshan_period_sec', 'tieshan_knockback', 'tieshan_root_sec'] },
    { code: 'jinjiao', label: '金角', params: ['jinjiao_per_stack', 'jinjiao_max_stacks', 'jinjiao_heal_per_stack'] },
    { code: 'tang', label: '唐僧', params: ['tang_heal_period_sec', 'tang_heal_ratio', 'tang_fatal_heal_ratio'] },
    { code: 'honghaier', label: '红孩儿', params: ['honghaier_burn_mult', 'honghaier_burn_sec'] },
  ],
  economy: [
    { code: 'chest', label: '宝箱收益', params: ['chest_choice_rate', 'chest_merit_base', 'chest_merit_double', 'chest_merit_double_rate'] },
    { code: 'revive', label: '还魂', params: ['revive_hp_ratio', 'revive_push_from', 'revive_push_to'] },
    { code: 'drop', label: '掉落表', params: ['drop_coin_fallback', 'drop_peach_fallback'] },
    { code: 'elite_chest', label: '精英宝箱', params: ['elite_chest_rate'] },
    { code: 'daily_coin', label: '每日铜钱雨', params: ['daily_coin_period_sec', 'daily_coin_count', 'daily_coin_unit'] },
    { code: 'repeat_clear', label: '通关奖励', params: ['repeat_clear_ratio', 'repeat_clear_flat'] },
  ],
  endless: [
    { code: 'rhythm', label: '波次节奏', params: ['wave_rest_sec', 'wave_spread_sec'] },
    { code: 'boss', label: '妖王配额与领地', params: ['boss_quota_gain', 'boss_leash_gain'] },
    { code: 'pool', label: '妖王候选池', params: ['boss_pool_hp_base', 'boss_pool_hp_per_lv'] },
    { code: 'develop', label: '发育期', params: ['develop_extra_count', 'develop_exp_mult'] },
    { code: 'auto_hunt', label: '全图追猎', params: ['auto_hunt_remain_count', 'auto_hunt_hp_ratio'] },
    { code: 'spawn', label: '刷怪分布', params: ['spawn_edge_margin'] },
  ],
  player: [
    { code: 'move', label: '基础移动', params: ['base_speed', 'units_per_li'] },
  ],
}
