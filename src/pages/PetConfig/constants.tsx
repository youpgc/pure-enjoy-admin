// 宠物全局参数模块元数据（从 PetConfig/index.tsx 抽离，审查 P2-16 单文件超 500 行）
//
// 历险/任务拆分为两张卡片；历险档位按 adventure_tiers 逐档成行；初始资源包按内容拆行。
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
      { field: 'levelup_attr_points', label: '每级加点数（属性系统）', desc: '升级发放可分配属性点（pending_attr_points），同时按种属/评级/潜力发洗练点', format: fmtNum },
    ],
  },
  {
    key: 'feed',
    title: '喂养与互动',
    fields: [
      { field: 'free_feed_daily', label: '免费喂养次数 / 天', format: fmtNum },
      { field: 'free_feed_cooldown_min', label: '免费喂养冷却（分钟）', format: fmtNum },
      { field: 'free_feed_hunger', label: '免费喂养饱食恢复', desc: 'rpc_pet_feed 免费档效果', format: fmtNum },
      { field: 'free_feed_exp', label: '免费喂养经验获得', format: fmtNum },
      { field: 'feed_full_hunger', label: '饱腹阈值（饱食度）', desc: '达到即停喂：App 喂食钮置灰与 rpc_pet_feed 的 PET_ALREADY_FULL 同源', format: fmtNum },
      { field: 'interact_cooldown_min', label: '互动冷却（分钟）', desc: 'rpc_pet_interact 两次互动最小间隔', format: fmtNum },
      { field: 'interact_daily', label: '互动次数 / 天', desc: 'rpc_pet_interact 每日上限', format: fmtNum },
      { field: 'interact_mood', label: '互动心情恢复', desc: 'rpc_pet_interact 单次效果', format: fmtNum },
    ],
  },
  {
    key: 'decay',
    title: '离线衰减',
    fields: [
      { field: 'decay_hunger_per_hour', label: '饱食衰减 / 小时', desc: '离线结算：打开页面按时间戳补算', format: fmtNum },
      { field: 'decay_mood_per_hour', label: '心情衰减 / 小时', format: fmtNum },
    ],
  },
  {
    key: 'adventure',
    title: '历险',
    fields: [
      { field: 'adventure_tiers', label: '历险档位', desc: 'tier 编码 / minutes 时长 / label 展示名', format: fmtJson },
      { field: 'adventure_hunger_threshold', label: '历险出发饱食阈值（/100）', format: fmtNum },
      { field: 'adventure_mood_threshold', label: '历险出发心情阈值（/100）', format: fmtNum },
      { field: 'adventure_health_threshold', label: '历险出发健康阈值（/100）', desc: '健康为状态值：受伤扣减，药品/自然恢复；低于阈值不可出发', format: fmtNum },
      { field: 'adventure_health_recover', label: '历险结算回血（/100）', desc: 'rpc_pet_adventure_claim 正常结算回补健康值，保证账户可恢复', format: fmtNum },
      { field: 'rescue_consolation_gold', label: '遇险慰问金（金币）', desc: '超出自救窗口由 NPC 兜底救助时发放', format: fmtNum },
    ],
  },
  {
    key: 'quest',
    title: '任务',
    fields: [
      { field: 'daily_task_draw_count', label: '每日任务抽取数', desc: 'rpc_pet_daily_quests_draw 每日随机抽取条数', format: fmtNum },
    ],
  },
  {
    key: 'hatch',
    title: '繁育与孵化',
    fields: [
      { field: 'breeding_cooldown_hours', label: '繁育冷却（小时）', format: fmtNum },
      { field: 'ssr_hatch_wait_hours', label: 'SSR 等待孵化时长（小时）', format: fmtNum },
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
    // P2 参数卡（审查报告 宠物 P2：reserved 无编辑入口，运营调整须手写 SQL）
    // 键域与 p2_seed §1 种子 + 各 RPC 消费点同源；dotted field 由 rawValue 深取值
    key: 'reserved_p2',
    title: 'P2 参数（reserved）',
    fields: [
      { field: 'reserved.trait.chance', label: '孵化掷特性概率（0~1）', desc: 'rpc_pet_hatch_instant 孵化时是否掷特性', format: fmtNum },
      { field: 'reserved.trait.wash_chance', label: '洗练命中概率（0~1）', desc: 'rpc_pet_wash_trait 道具无 effect.chance 时兜底；未命中保留原特性（口径 A）', format: fmtNum },
      { field: 'reserved.hatch.accel_minutes', label: '加速孵化时长（分钟）', desc: 'rpc_pet_hatch_accelerate 道具无 effect.minutes 时兜底', format: fmtNum },
      { field: 'reserved.hatch.accel_gold', label: '加速孵化金币', desc: 'rpc_pet_hatch_accelerate mode=gold 的花费', format: fmtNum },
      { field: 'reserved.breeding.intimacy_min', label: '繁育亲密度门槛', desc: 'rpc_pet_breed_start 双亲亲密度门槛', format: fmtNum },
      { field: 'reserved.breeding.gestation_hours', label: '繁育孕期（小时）', format: fmtNum },
      { field: 'reserved.breeding.fee_gold', label: '繁育手续费（金币，0=不收）', format: fmtNum },
      { field: 'reserved.weekly.draw_count', label: '周任务抽取条数', desc: '缺省回落 daily_task_draw_count', format: fmtNum },
      { field: 'reserved.breeding.egg_pool.N', label: '评级蛋池映射 N', desc: '评级→蛋池 code，缺省回落 egg_||lower(rarity)', format: fmtStr },
      { field: 'reserved.breeding.egg_pool.R', label: '评级蛋池映射 R', format: fmtStr },
      { field: 'reserved.breeding.egg_pool.SR', label: '评级蛋池映射 SR', format: fmtStr },
      { field: 'reserved.breeding.egg_pool.SSR', label: '评级蛋池映射 SSR', format: fmtStr },
    ],
  },
]
