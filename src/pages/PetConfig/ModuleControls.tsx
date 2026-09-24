// 各模块弹窗表单控件（从 PetConfig/index.tsx 抽离，审查 P2-16 单文件超 500 行）
// 控件结构与服务端 RPC 消费的 jsonb 形状同源；只负责渲染，保存范围由 MODULES 决定。
import type { ReactNode } from 'react'
import { Form, InputNumber, Switch } from 'antd'
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
          <Form.Item name="free_feed_cooldown_min" label="免费喂养冷却（分钟）" rules={[{ required: true }]}>
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
          <Form.Item name="interact_cooldown_min" label="互动冷却（分钟）" rules={[{ required: true }]}>
            <InputNumber min={0} className={common.fullWidth} disabled={disabled} />
          </Form.Item>
          <Form.Item name="interact_daily" label="互动次数 / 天" rules={[{ required: true }]}>
            <InputNumber min={0} max={999} className={common.fullWidth} disabled={disabled} />
          </Form.Item>
          <Form.Item name="interact_mood" label="互动心情恢复" rules={[{ required: true }]}>
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
  }
}
