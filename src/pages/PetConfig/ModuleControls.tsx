// 各模块弹窗表单控件（从 PetConfig/index.tsx 抽离，审查 P2-16 单文件超 500 行）
// 控件结构与服务端 RPC 消费的 jsonb 形状同源；只负责渲染，保存范围由 MODULES 决定。
import type { ReactNode } from 'react'
import { Form, Input, InputNumber, Switch } from 'antd'
import { TierListEditor } from '../../components/form/pet/editors/BasicEditors'
import { NewbiePackageEditor } from '../../components/form/pet/editors/ItemEditors'
import common from '../../styles/common.module.css'
import type { ItemOption, ModuleKey } from './types'

export const renderModuleControls = (
  key: ModuleKey,
  params: { canWrite: boolean; itemOptions: ItemOption[] }
): ReactNode => {
  const { canWrite, itemOptions } = params
  const disabled = !canWrite
  switch (key) {
    case 'master':
      return (
        <Form.Item name="pet_enabled" label="宠物系统总开关" valuePropName="checked">
          <Switch disabled={disabled} checkedChildren="开启" unCheckedChildren="关闭" />
        </Form.Item>
      )
    case 'growth':
      return (
        <>
          <Form.Item name="level_exp_base" label="升级基础经验（Lv1→2 所需）" rules={[{ required: true }]}>
            <InputNumber min={1} className={common.fullWidth} disabled={disabled} />
          </Form.Item>
          <Form.Item name="level_exp_growth" label="经验增长系数（每级 ×N）" rules={[{ required: true }]}>
            <InputNumber min={1} step={0.1} className={common.fullWidth} disabled={disabled} />
          </Form.Item>
          <Form.Item
            name="levelup_attr_points"
            label="每级加点数（属性系统）"
            tooltip="升级发放可分配属性点；洗练点同步按种属/评级/潜力三因子发放"
            rules={[{ required: true }]}
          >
            <InputNumber min={0} className={common.fullWidth} disabled={disabled} />
          </Form.Item>
        </>
      )
    case 'feed':
      return (
        <>
          <Form.Item name="free_feed_daily" label="免费喂养次数 / 天" rules={[{ required: true }]}>
            <InputNumber min={0} max={99} className={common.fullWidth} disabled={disabled} />
          </Form.Item>
          <Form.Item name="free_feed_cooldown_sec" label="免费喂养冷却（秒）" tooltip="两次免费喂养最小间隔;300 秒 = 5 分钟" rules={[{ required: true }]}>
            <InputNumber min={0} className={common.fullWidth} disabled={disabled} />
          </Form.Item>
          <Form.Item name="free_feed_hunger" label="免费喂养饱食恢复" rules={[{ required: true }]}>
            <InputNumber min={0} className={common.fullWidth} disabled={disabled} />
          </Form.Item>
          <Form.Item name="free_feed_exp" label="免费喂养经验获得" rules={[{ required: true }]}>
            <InputNumber min={0} className={common.fullWidth} disabled={disabled} />
          </Form.Item>
          <Form.Item name="feed_full_hunger" label="饱腹阈值（饱食度）" rules={[{ required: true }]}>
            <InputNumber min={0} max={100} className={common.fullWidth} disabled={disabled} />
          </Form.Item>
          <Form.Item name="interact_cooldown_sec" label="互动冷却（秒）" tooltip="两次抚摸最小间隔" rules={[{ required: true }]}>
            <InputNumber min={0} className={common.fullWidth} disabled={disabled} />
          </Form.Item>
          <Form.Item name="interact_daily" label="互动次数 / 天" rules={[{ required: true }]}>
            <InputNumber min={0} max={999} className={common.fullWidth} disabled={disabled} />
          </Form.Item>
          <Form.Item name="interact_mood" label="互动心情恢复" rules={[{ required: true }]}>
            <InputNumber min={0} className={common.fullWidth} disabled={disabled} />
          </Form.Item>
          <Form.Item
            name="feed_intimacy"
            label="喂养亲密度 / 次"
            tooltip="rpc_pet_feed 每次成功加的亲密；受每日上限约束"
            rules={[{ required: true }]}
          >
            <InputNumber min={0} className={common.fullWidth} disabled={disabled} />
          </Form.Item>
          <Form.Item
            name="interact_intimacy"
            label="互动亲密度 / 次"
            tooltip="rpc_pet_interact 每次成功加的亲密"
            rules={[{ required: true }]}
          >
            <InputNumber min={0} className={common.fullWidth} disabled={disabled} />
          </Form.Item>
          <Form.Item
            name="intimacy_daily_cap"
            label="亲密度每日上限 / 宠"
            tooltip="每宠每日从照料（喂养+互动）获得的亲密上限，北京日归零；事件奖励不受此限"
            rules={[{ required: true }]}
          >
            <InputNumber min={0} className={common.fullWidth} disabled={disabled} />
          </Form.Item>
        </>
      )
    case 'decay':
      return (
        <>
          <Form.Item name="decay_hunger_per_hour" label="饱食衰减 / 小时" rules={[{ required: true }]}>
            <InputNumber min={0} className={common.fullWidth} disabled={disabled} />
          </Form.Item>
          <Form.Item name="decay_mood_per_hour" label="心情衰减 / 小时" rules={[{ required: true }]}>
            <InputNumber min={0} className={common.fullWidth} disabled={disabled} />
          </Form.Item>
        </>
      )
    case 'adventure':
      return (
        <>
          <Form.Item
            name="adventure_tiers"
            label="历险档位"
            tooltip="tier 编码 / minutes 时长 / label 展示名；App 按此渲染历险发起页"
            rules={[{ required: true, message: '至少保留一个历险档位' }]}
          >
            <TierListEditor disabled={disabled} />
          </Form.Item>
          <Form.Item name="adventure_hunger_threshold" label="历险出发饱食阈值（/100）" rules={[{ required: true }]}>
            <InputNumber min={0} max={100} className={common.fullWidth} disabled={disabled} />
          </Form.Item>
          <Form.Item name="adventure_mood_threshold" label="历险出发心情阈值（/100）" rules={[{ required: true }]}>
            <InputNumber min={0} max={100} className={common.fullWidth} disabled={disabled} />
          </Form.Item>
          <Form.Item
            name="adventure_health_threshold"
            label="历险出发健康阈值（/100）"
            tooltip="健康为状态值（/100）：受伤扣减，药品/自然恢复；低于阈值不可出发"
            rules={[{ required: true }]}
          >
            <InputNumber min={0} max={100} className={common.fullWidth} disabled={disabled} />
          </Form.Item>
          <Form.Item
            name="adventure_health_recover"
            label="历险结算回血（/100）"
            tooltip="历险正常结算时回补的健康值（0 表示不回补，仅靠疗伤道具）"
            rules={[{ required: true }]}
          >
            <InputNumber min={0} max={100} className={common.fullWidth} disabled={disabled} />
          </Form.Item>
          <Form.Item name="rescue_consolation_gold" label="遇险慰问金（金币）" rules={[{ required: true }]}>
            <InputNumber min={0} className={common.fullWidth} disabled={disabled} />
          </Form.Item>
        </>
      )
    case 'quest':
      return (
        <Form.Item name="daily_task_draw_count" label="每日任务抽取数" rules={[{ required: true }]}>
          <InputNumber min={1} max={20} className={common.fullWidth} disabled={disabled} />
        </Form.Item>
      )
    case 'hatch':
      return (
        <>
          <Form.Item name="breeding_cooldown_hours" label="繁育冷却（小时）" rules={[{ required: true }]}>
            <InputNumber min={0} className={common.fullWidth} disabled={disabled} />
          </Form.Item>
          <Form.Item name="ssr_hatch_wait_hours" label="SSR 等待孵化时长（小时）" rules={[{ required: true }]}>
            <InputNumber min={0} className={common.fullWidth} disabled={disabled} />
          </Form.Item>
        </>
      )
    case 'economy':
      return (
        <>
          <Form.Item name="points_per_gold" label="1 金币 = N 积分（单向兑换）" rules={[{ required: true }]}>
            <InputNumber min={1} className={common.fullWidth} disabled={disabled} />
          </Form.Item>
          <Form.Item name="stack_limit_default" label="默认单格堆叠上限" rules={[{ required: true }]}>
            <InputNumber min={1} className={common.fullWidth} disabled={disabled} />
          </Form.Item>
          <Form.Item name="backpack_capacity_init" label="背包初始格数" rules={[{ required: true }]}>
            <InputNumber min={1} className={common.fullWidth} disabled={disabled} />
          </Form.Item>
          <Form.Item name="backpack_capacity_max" label="背包最高上限" rules={[{ required: true }]}>
            <InputNumber min={1} className={common.fullWidth} disabled={disabled} />
          </Form.Item>
          <Form.Item name="rearing_capacity_init" label="养育格初始" rules={[{ required: true }]}>
            <InputNumber min={0} className={common.fullWidth} disabled={disabled} />
          </Form.Item>
          <Form.Item name="rearing_capacity_max" label="养育格上限" rules={[{ required: true }]}>
            <InputNumber min={1} className={common.fullWidth} disabled={disabled} />
          </Form.Item>
          <Form.Item name="foster_capacity_init" label="寄养格初始（0=需扩容开启）" rules={[{ required: true }]}>
            <InputNumber min={0} className={common.fullWidth} disabled={disabled} />
          </Form.Item>
          <Form.Item name="foster_capacity_max" label="寄养格上限" rules={[{ required: true }]}>
            <InputNumber min={0} className={common.fullWidth} disabled={disabled} />
          </Form.Item>
          <Form.Item
            name="release_gold_per_level"
            label="放生补偿单价（金币/级）"
            tooltip="放生补偿 = 等级 × 本值 × 评级倍率（倍率在 reserved 卡 release_gold_mult 按评级配置，缺省 1.0）"
            rules={[{ required: true }]}
          >
            <InputNumber min={0} className={common.fullWidth} disabled={disabled} />
          </Form.Item>
        </>
      )
    case 'newbie':
      return (
        <Form.Item
          name="newbie_package"
          label="初始包内容"
          tooltip="初始蛋 + 食物 + 初始金币；服务端按 item_code 匹配道具目录"
        >
          <NewbiePackageEditor items={itemOptions} disabled={disabled} />
        </Form.Item>
      )
    case 'reserved_p2':
      // P2 参数（reserved）：数组名走 antd 嵌套路径，initialValues(row) 自动回显；
      // 保存由 index.tsx 深合并进 reserved，保留未在表单内的既有键（审查 P2 编辑入口）
      return (
        <>
          <Form.Item name={['reserved', 'trait', 'chance']} label="孵化掷特性概率（0~1）" tooltip="0.3 = 30% 概率掷出特性" rules={[{ required: true }]}>
            <InputNumber min={0} max={1} step={0.05} className={common.fullWidth} disabled={disabled} />
          </Form.Item>
          <Form.Item name={['reserved', 'trait', 'wash_chance']} label="洗练命中概率（0~1）" tooltip="未命中保留原特性（口径 A）；道具可带 effect.chance 覆盖此兜底" rules={[{ required: true }]}>
            <InputNumber min={0} max={1} step={0.05} className={common.fullWidth} disabled={disabled} />
          </Form.Item>
          <Form.Item name={['reserved', 'hatch', 'accel_minutes']} label="加速孵化时长（分钟）" rules={[{ required: true }]}>
            <InputNumber min={0} className={common.fullWidth} disabled={disabled} />
          </Form.Item>
          <Form.Item name={['reserved', 'hatch', 'accel_gold']} label="加速孵化金币" rules={[{ required: true }]}>
            <InputNumber min={0} className={common.fullWidth} disabled={disabled} />
          </Form.Item>
          <Form.Item name={['reserved', 'breeding', 'intimacy_min']} label="繁育亲密度门槛" rules={[{ required: true }]}>
            <InputNumber min={0} className={common.fullWidth} disabled={disabled} />
          </Form.Item>
          <Form.Item name={['reserved', 'breeding', 'gestation_hours']} label="繁育孕期（小时）" rules={[{ required: true }]}>
            <InputNumber min={1} className={common.fullWidth} disabled={disabled} />
          </Form.Item>
          <Form.Item name={['reserved', 'adventure_tier_mult', 'exp', 'short']} label="历险经验倍率·短途" tooltip="留空 = 服务端缺省 1；按派遣时长放大经验收益" >
            <InputNumber min={0} step={0.5} className={common.fullWidth} disabled={disabled} />
          </Form.Item>
          <Form.Item name={['reserved', 'adventure_tier_mult', 'exp', 'medium']} label="历险经验倍率·中途" >
            <InputNumber min={0} step={0.5} className={common.fullWidth} disabled={disabled} />
          </Form.Item>
          <Form.Item name={['reserved', 'adventure_tier_mult', 'exp', 'long']} label="历险经验倍率·长途" >
            <InputNumber min={0} step={0.5} className={common.fullWidth} disabled={disabled} />
          </Form.Item>
          <Form.Item name={['reserved', 'adventure_tier_mult', 'gold', 'short']} label="历险金币倍率·短途" tooltip="留空 = 服务端缺省 1" >
            <InputNumber min={0} step={0.5} className={common.fullWidth} disabled={disabled} />
          </Form.Item>
          <Form.Item name={['reserved', 'adventure_tier_mult', 'gold', 'medium']} label="历险金币倍率·中途" >
            <InputNumber min={0} step={0.5} className={common.fullWidth} disabled={disabled} />
          </Form.Item>
          <Form.Item name={['reserved', 'adventure_tier_mult', 'gold', 'long']} label="历险金币倍率·长途" >
            <InputNumber min={0} step={0.5} className={common.fullWidth} disabled={disabled} />
          </Form.Item>
          <Form.Item name={['reserved', 'long_drop_pity', 'evo_stone_n']} label="长途保底·进化石凡品（次）" tooltip="连续未中的长途次数达此值必得并清零；留空 = 服务端缺省 20" >
            <InputNumber min={1} className={common.fullWidth} disabled={disabled} />
          </Form.Item>
          <Form.Item name={['reserved', 'long_drop_pity', 'evo_stone_r']} label="长途保底·进化石珍品（次）" >
            <InputNumber min={1} className={common.fullWidth} disabled={disabled} />
          </Form.Item>
          <Form.Item name={['reserved', 'long_drop_pity', 'relic_compass']} label="长途保底·星辰罗盘（次）" >
            <InputNumber min={1} className={common.fullWidth} disabled={disabled} />
          </Form.Item>
          <Form.Item name={['reserved', 'breeding', 'fee_gold']} label="繁育手续费（金币，0=不收）" rules={[{ required: true }]}>
            <InputNumber min={0} className={common.fullWidth} disabled={disabled} />
          </Form.Item>
          <Form.Item name={['reserved', 'weekly', 'draw_count']} label="周任务抽取条数" tooltip="缺省回落 daily_task_draw_count" rules={[{ required: true }]}>
            <InputNumber min={1} max={20} className={common.fullWidth} disabled={disabled} />
          </Form.Item>
          <Form.Item label="评级 → 蛋池映射" tooltip="缺省回落 egg_||lower(rarity)；留空走回落">
            <Input.Group compact>
              {(['N', 'R', 'SR', 'SSR'] as const).map((rank) => (
                <Form.Item key={rank} name={['reserved', 'breeding', 'egg_pool', rank]} noStyle>
                  <Input placeholder={rank} style={{ width: '25%' }} disabled={disabled} />
                </Form.Item>
              ))}
            </Input.Group>
          </Form.Item>
          {/* 幸运抽奖（rpc_pet_lottery_draw：双限购闸，seed fix_pet_lottery_20261023） */}
          <Form.Item name={['reserved', 'lottery', 'price']} label="幸运抽奖单价（金币）" tooltip="rpc_pet_lottery_draw 每次消耗；留空 = 服务端缺省 30000">
            <InputNumber min={0} className={common.fullWidth} disabled={disabled} />
          </Form.Item>
          <Form.Item name={['reserved', 'lottery', 'limit_total']} label="幸运抽奖·终身限购（次）" tooltip="留空 = 服务端缺省 100">
            <InputNumber min={0} className={common.fullWidth} disabled={disabled} />
          </Form.Item>
          <Form.Item name={['reserved', 'lottery', 'limit_window_hours']} label="幸运抽奖·时段窗口（小时）" tooltip="与窗口限购组合成时段限购；留空 = 服务端缺省 24">
            <InputNumber min={1} className={common.fullWidth} disabled={disabled} />
          </Form.Item>
          <Form.Item name={['reserved', 'lottery', 'limit_per_window']} label="幸运抽奖·窗口内限购（次）" tooltip="留空 = 服务端缺省 10">
            <InputNumber min={0} className={common.fullWidth} disabled={disabled} />
          </Form.Item>
          {/* 任务/健康调参键（进化任务经验差窗口 + 低状态掉血速率） */}
          <Form.Item name={['reserved', 'evo_quest_window_exp']} label="进化任务经验差窗口" tooltip="距下一阶等级门槛的剩余经验 ≤ 此值才下发进化任务（2600 ≈ 7 天日常经验）；留空 = 服务端缺省 2600">
            <InputNumber min={1} className={common.fullWidth} disabled={disabled} />
          </Form.Item>
          <Form.Item name={['reserved', 'low_status_health_decay']} label="低状态掉血（健康/小时）" tooltip="饱食或心情低于线时按此速率掉健康（虚弱线钳制）；留空 = 服务端缺省 2">
            <InputNumber min={0} className={common.fullWidth} disabled={disabled} />
          </Form.Item>
        </>
      )
  }
}
