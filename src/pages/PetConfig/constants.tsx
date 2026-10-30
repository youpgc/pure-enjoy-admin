// 宠物全局参数模块元数据（从 PetConfig/index.tsx 抽离，审查 P2-16 单文件超 500 行）
//
// 游历/任务拆分为两张卡片；游历档位按 adventure_tiers 逐档成行；初始资源包按内容拆行。
// 列全集 = tables + rpcs + asset 三波 DDL + 互动冷却批补列；结构化编辑器与 RPC 消费同源。
// 3D 一期已下线：render3d_enabled / asset_manifest 两列不再建卡编辑（列与存量值保留，
// App 端已不取回，后期迭代重写渲染层时随 3D 编辑器一并恢复）。
import type { Json } from '../../types/database'
import { stringifyJson } from '../../utils/petJson'
import type { ModuleMeta } from './types'

export const fmtBool = (v: unknown) => (v ? '开启' : '关闭')
export const fmtNum = (v: unknown) => (v === null || v === undefined ? '—' : String(v))
export const fmtJson = (v: unknown) =>
  v === null || v === undefined ? '—' : stringifyJson(v as Json)
export const fmtStr = (v: unknown) => (v === null || v === undefined ? '—' : String(v))

export const MODULES: ModuleMeta[] = [
  {
    key: 'master',
    title: '总开关',
    fields: [
      {
        field: 'pet_enabled',
        label: '宠物系统总开关',
        desc: '关闭后 App 三处入口（状态卡/快捷工具/金币钱包）全部隐藏',
        format: fmtBool,
      },
    ],
  },
  {
    key: 'growth',
    title: '等级与成长',
    fields: [
      { field: 'level_exp_base', label: '升级基础经验（Lv1→2 所需）', format: fmtNum },
      { field: 'level_exp_growth', label: '经验增长系数（每级 ×N）', desc: '下一级所需 = 上一级 × 增长系数', format: fmtNum },
      { field: 'level_max', label: '等级上限', desc: '宠物等级封顶值，rpc_pet_add_exp 到顶不再累积', format: fmtNum },
      { field: 'level_exp_table', label: '等级经验定版表', desc: 'jsonb：{"1":91,...}；非空时优先于公式曲线', format: fmtJson },
      { field: 'levelup_attr_points', label: '每级加点数（属性系统）', desc: '升级发放可分配属性点（pending_attr_points），同时按种属/评级/潜力发洗练点', format: fmtNum },
    ],
  },
  {
    key: 'feed',
    title: '喂养与互动',
    fields: [
      { field: 'free_feed_daily', label: '免费喂养次数 / 天', format: fmtNum },
      { field: 'free_feed_cooldown_sec', label: '免费喂养冷却（秒）', desc: '两次免费喂养最小间隔;300 秒 = 5 分钟', format: fmtNum },
      { field: 'free_feed_hunger', label: '免费喂养饱食恢复', desc: '免费喂养档恢复的饱食量', format: fmtNum },
      { field: 'free_feed_exp', label: '免费喂养经验获得', format: fmtNum },
      { field: 'feed_full_hunger', label: '饱腹阈值（饱食度）', desc: '达到即停止喂食：App 喂食按钮置灰与喂食服务同源判定', format: fmtNum },
      { field: 'interact_cooldown_sec', label: '互动冷却（秒）', desc: '两次互动的最小间隔', format: fmtNum },
      { field: 'interact_daily', label: '互动次数 / 天', desc: '每日互动次数上限', format: fmtNum },
      { field: 'interact_mood', label: '互动心情恢复', desc: '单次互动恢复的心情', format: fmtNum },
      { field: 'feed_intimacy', label: '喂养亲密度 / 次', desc: '每次成功喂养加的亲密；受每日上限约束', format: fmtNum },
      { field: 'interact_intimacy', label: '互动亲密度 / 次', desc: '每次成功互动加的亲密', format: fmtNum },
      { field: 'intimacy_daily_cap', label: '亲密度每日上限 / 宠', desc: '每宠每日从照料（喂养+互动）获得的亲密上限，北京日归零；事件奖励不受此限', format: fmtNum },
      { field: 'intimacy_level_base', label: '亲密度等级基础需求', desc: 'Lv1→2 所需亲密度；区间 = base × growth^(n-1)', format: fmtNum },
      { field: 'intimacy_level_growth', label: '亲密度等级增长系数（×N）', format: fmtNum },
    ],
  },
  {
    key: 'decay',
    title: '离线衰减与健康',
    fields: [
      { field: 'decay_hunger_per_hour', label: '饱食衰减 / 小时', desc: '离线结算：打开页面按时间戳补算', format: fmtNum },
      { field: 'decay_mood_per_hour', label: '心情衰减 / 小时', format: fmtNum },
      { field: 'health_recover_per_hour', label: '自然回血 / 小时', desc: '健康状态值每小时自然恢复量', format: fmtNum },
      { field: 'weak_health_threshold', label: '虚弱健康线（/100）', desc: '健康低于此值进入虚弱态：心情衰减 × 虚弱倍率', format: fmtNum },
      { field: 'weak_mood_decay_mult', label: '虚弱心情衰减倍率', desc: '虚弱态下心情衰减速率乘数', format: fmtNum },
      { field: 'rescue_timeout_health', label: '救援超窗扣健康', desc: '游历遇险超出自救窗口被 NPC 救回时的健康扣减', format: fmtNum },
    ],
  },
  {
    key: 'adventure',
    title: '游历',
    fields: [
      { field: 'adventure_tiers', label: '游历档位', desc: 'tier 编码 / minutes 时长 / label 展示名', format: fmtJson },
      { field: 'adventure_hunger_threshold', label: '游历出发饱食阈值（/100）', format: fmtNum },
      { field: 'adventure_mood_threshold', label: '游历出发心情阈值（/100）', format: fmtNum },
      { field: 'adventure_health_threshold', label: '游历出发健康阈值（/100）', desc: '健康为状态值：受伤扣减，药品/自然恢复；低于阈值不可出发', format: fmtNum },
      { field: 'adventure_health_recover', label: '游历结算回血（/100）', desc: '游历正常归来结算时回补的健康值', format: fmtNum },
      { field: 'reserved.adventure_tier_mult.exp.short', label: '经验倍率·短途', desc: '短途派遣的经验收益倍率', format: fmtNum },
      { field: 'reserved.adventure_tier_mult.exp.medium', label: '经验倍率·中途', desc: '中途派遣的经验收益倍率', format: fmtNum },
      { field: 'reserved.adventure_tier_mult.exp.long', label: '经验倍率·长途', desc: '长途派遣的经验收益倍率', format: fmtNum },
      { field: 'reserved.adventure_tier_mult.gold.short', label: '金币倍率·短途', desc: '短途派遣的金币收益倍率', format: fmtNum },
      { field: 'reserved.adventure_tier_mult.gold.medium', label: '金币倍率·中途', desc: '中途派遣的金币收益倍率', format: fmtNum },
      { field: 'reserved.adventure_tier_mult.gold.long', label: '金币倍率·长途', desc: '长途派遣的金币收益倍率', format: fmtNum },
      { field: 'reserved.long_drop_pity.evo_stone_n', label: '长途保底·进化石凡品（次）', desc: '连续长途未出凡品进化石的保底次数，触达必得并清零', format: fmtNum },
      { field: 'reserved.long_drop_pity.evo_stone_r', label: '长途保底·进化石珍品（次）', desc: '连续长途未出珍品进化石的保底次数，触达必得并清零', format: fmtNum },
      { field: 'reserved.long_drop_pity.relic_compass', label: '长途保底·星辰罗盘（次）', desc: '连续长途未出星辰罗盘的保底次数，触达必得并清零', format: fmtNum },
    ],
  },
  {
    key: 'quest',
    title: '任务参数',
    fields: [
      { field: 'daily_task_draw_count', label: '每日任务抽取数', desc: '每日随机抽取的任务条数', format: fmtNum },
      { field: 'reserved.weekly.draw_count', label: '周任务抽取条数', desc: '每周抽取的任务条数，留空回落每日抽取数', format: fmtNum },
      { field: 'reserved.evo_quest_window_exp', label: '进化任务经验差窗口', desc: '距下一阶等级门槛剩余经验 ≤ 此值才下发进化任务，缺省 2600', format: fmtNum },
    ],
  },
  {
    key: 'trait',
    title: '特性概率',
    fields: [
      { field: 'reserved.trait.chance', label: '孵化掷特性概率（0~1）', desc: '每次孵化掷出特性的概率', format: fmtNum },
      { field: 'reserved.trait.wash_chance', label: '洗练命中概率（0~1）', desc: '洗练道具未自带概率时的兜底命中概率，未命中保留原特性', format: fmtNum },
    ],
  },
  {
    key: 'event',
    title: '随机事件',
    fields: [
      { field: 'event_rate_home_open', label: '打开宠物页触发率（0~1）', desc: 'rpc_pet_event_roll 掷中概率；0.25 = 25%', format: fmtNum },
      { field: 'event_rate_action_done', label: '照料动作后触发率（0~1）', desc: '喂养/抚摸成功后的掷中概率', format: fmtNum },
      { field: 'event_daily_limit', label: '每日事件触发上限 / 人', desc: '按当日触发流水计数，放弃选择也占坑', format: fmtNum },
    ],
  },
  {
    key: 'hatch',
    title: '繁育与孵化',
    fields: [
      { field: 'breeding_cooldown_hours', label: '繁育冷却（小时）', format: fmtNum },
      { field: 'ssr_hatch_wait_hours', label: 'SSR 等待孵化时长（小时）', format: fmtNum },
      { field: 'reserved.hatch.accel_minutes', label: '加速孵化时长（分钟）', desc: '加速道具未配置时长时的兜底档', format: fmtNum },
      { field: 'reserved.hatch.accel_gold', label: '加速孵化金币', desc: '金币加速档的花费', format: fmtNum },
    ],
  },
  {
    key: 'lottery',
    title: '幸运蛋礼盒',
    fields: [
      { field: 'reserved.lottery.price', label: '单价（金币）', desc: '每次抽取消耗的金币', format: fmtNum },
      { field: 'reserved.lottery.limit_total', label: '终身限购（次）', desc: '每个账号累计可抽取次数', format: fmtNum },
      { field: 'reserved.lottery.limit_window_hours', label: '时段窗口（小时）', desc: '滚动窗口时长，与窗口限购组成时段限购', format: fmtNum },
      { field: 'reserved.lottery.limit_per_window', label: '窗口内限购（次）', desc: '窗口内最多可抽取次数', format: fmtNum },
      { field: 'reserved.lottery.ssr_pity_at', label: 'SSR 保底（次）', desc: '连续未出 SSR 达此值，下一抽必出 SSR（出即清零）', format: fmtNum },
    ],
  },
  {
    key: 'economy',
    title: '经济与背包',
    fields: [
      { field: 'points_per_gold', label: '1 金币 = N 积分（单向兑换）', format: fmtNum },
      { field: 'stack_limit_default', label: '默认单格堆叠上限', desc: '仅作道具目录未显式配置 stack_limit 时的兜底；每格实际上限以「宠物道具」页的 stack_limit 为准（App 背包据此显示 数量/上限 与满格角标）', format: fmtNum },
      { field: 'backpack_capacity_init', label: '背包初始格数', format: fmtNum },
      { field: 'backpack_capacity_max', label: '背包最高上限', format: fmtNum },
      { field: 'release_gold_per_level', label: '放生补偿单价（金币/级）', desc: '放生补偿 = 宠物等级 × 本值 × 评级倍率', format: fmtNum },
      { field: 'rearing_capacity_init', label: '养育格初始', format: fmtNum },
      { field: 'rearing_capacity_max', label: '养育格上限', format: fmtNum },
      { field: 'foster_capacity_init', label: '寄养格初始', desc: '0 = 需扩容道具开启', format: fmtNum },
      { field: 'foster_capacity_max', label: '寄养格上限', format: fmtNum },
    ],
  },
  {
    key: 'newbie',
    title: '初始资源包',
    fields: [
      {
        field: 'newbie_package',
        label: '初始包内容',
        desc: '首次进入宠物系统幂等发放：初始蛋 + 食物 + 初始金币',
        format: fmtJson,
      },
    ],
  },
  {
    // 收藏兑换配方卡：reserved.collection_exchange（收藏品 × 目标道具的兑换矩阵），
    // rpc_pet_collection_exchange 消费；体为动态数组，展示与编辑走 index 专属分支
    key: 'collection_exchange',
    title: '收藏兑换配方',
    fields: [],
  },
  {
    // 繁育与健康参数卡（四卡归位定案：特性概率/任务参数/游历倍率+长途保底/孵化加速
    // 各键归位本页对应模块卡；礼盒 5 键@商城页「幸运蛋礼盒」页签）
    // 键域与 p2_seed §1 种子 + 各 RPC 消费点同源；dotted field 由 rawValue 深取值
    key: 'reserved_p2',
    title: '繁育与健康参数',
    fields: [
      { field: 'reserved.breeding.intimacy_min', label: '繁育亲密度门槛', desc: '发起繁育时双亲需达到的亲密度', format: fmtNum },
      { field: 'reserved.breeding.gestation_hours', label: '繁育孕期（小时）', format: fmtNum },
      { field: 'reserved.breeding.fee_gold', label: '繁育手续费（金币，0=不收）', format: fmtNum },
      { field: 'reserved.breeding.egg_pool.N', label: '评级蛋池映射 N', desc: '评级对应的蛋池编码，留空用默认池', format: fmtStr },
      { field: 'reserved.breeding.egg_pool.R', label: '评级蛋池映射 R', format: fmtStr },
      { field: 'reserved.breeding.egg_pool.SR', label: '评级蛋池映射 SR', format: fmtStr },
      { field: 'reserved.breeding.egg_pool.SSR', label: '评级蛋池映射 SSR', format: fmtStr },
      { field: 'reserved.low_status_health_decay', label: '低状态掉血（健康/小时）', desc: '饱食/心情低于线时的健康流失速率（虚弱线钳制），缺省 2', format: fmtNum },
    ],
  },
]
