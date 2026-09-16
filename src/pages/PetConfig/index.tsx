import React, { useCallback, useEffect, useState } from 'react'
import {
  Alert,
  Card,
  Button,
  Form,
  InputNumber,
  Input,
  Switch,
  Spin,
  Tag,
  message,
} from 'antd'
import { usePermission } from '../../hooks/usePermission'
import { petConfigService } from '../../services/petService'
import type { PetConfigRow } from '../../types/pet'
import { stringifyJson } from '../../utils/petJson'
import { JsonFormItem } from '../../components/form/pet/JsonFormItem'
import { parseJsonText } from '../../utils/petJson'
import common from '../../styles/common.module.css'

// ==================== 宠物全局参数（pet_config 单行表，一屏管理） ====================
// 与需求 §17 验收对应：免费喂养 / 每日任务 / 历险三档与阈值 / 繁育冷却 / 兑换比 /
// 三套容量 init/max / SSR 等待时长 / 初始资源包 / 总开关。

interface ConfigFormValues {
  pet_enabled: boolean
  free_feed_daily: number
  free_feed_cooldown_min: number
  daily_task_draw_count: number
  adventure_tiers: string
  adventure_hunger_threshold: number
  adventure_mood_threshold: number
  breeding_cooldown_hours: number
  points_per_gold: number
  stack_limit_default: number
  backpack_capacity_init: number
  backpack_capacity_max: number
  rearing_capacity_init: number
  rearing_capacity_max: number
  foster_capacity_init: number
  foster_capacity_max: number
  ssr_hatch_wait_hours: number
  newbie_package: string
}

const PetConfig: React.FC = () => {
  const { hasPermission } = usePermission()
  const canWrite = hasPermission('pets:write')

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [row, setRow] = useState<PetConfigRow | null>(null)
  const [form] = Form.useForm()

  const loadConfig = useCallback(async () => {
    setLoading(true)
    const res = await petConfigService.loadConfig()
    if (res.success && res.data) {
      setRow(res.data)
      form.setFieldsValue({
        ...res.data,
        adventure_tiers: stringifyJson(res.data.adventure_tiers),
        newbie_package: stringifyJson(res.data.newbie_package),
      } as unknown as ConfigFormValues)
    }
    setLoading(false)
  }, [form])

  useEffect(() => {
    loadConfig()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSave = async () => {
    const values = await form.validateFields()
    if (!row) return
    const tiers = parseJsonText(values.adventure_tiers)
    if (!tiers.ok) return void message.error(`历险三档：${tiers.error}`)
    const pkg = parseJsonText(values.newbie_package)
    if (!pkg.ok) return void message.error(`初始资源包：${pkg.error}`)
    // 容量 init ≤ max 成对校验（应用层前置；RPC/SQL 侧以阶梯道具兜底）
    const pairs: Array<[string, number, number]> = [
      ['背包', values.backpack_capacity_init, values.backpack_capacity_max],
      ['养育格', values.rearing_capacity_init, values.rearing_capacity_max],
      ['寄养格', values.foster_capacity_init, values.foster_capacity_max],
    ]
    for (const [label, init, max] of pairs) {
      if (init > max) return void message.error(`${label}初始容量不能大于上限`)
    }
    setSaving(true)
    try {
      const res = await petConfigService.update(row.id, {
        pet_enabled: !!values.pet_enabled,
        free_feed_daily: values.free_feed_daily,
        free_feed_cooldown_min: values.free_feed_cooldown_min,
        daily_task_draw_count: values.daily_task_draw_count,
        adventure_tiers: tiers.value,
        adventure_hunger_threshold: values.adventure_hunger_threshold,
        adventure_mood_threshold: values.adventure_mood_threshold,
        breeding_cooldown_hours: values.breeding_cooldown_hours,
        points_per_gold: values.points_per_gold,
        stack_limit_default: values.stack_limit_default,
        backpack_capacity_init: values.backpack_capacity_init,
        backpack_capacity_max: values.backpack_capacity_max,
        rearing_capacity_init: values.rearing_capacity_init,
        rearing_capacity_max: values.rearing_capacity_max,
        foster_capacity_init: values.foster_capacity_init,
        foster_capacity_max: values.foster_capacity_max,
        ssr_hatch_wait_hours: values.ssr_hatch_wait_hours,
        newbie_package: pkg.value,
      } as never)
      if (!res.success) return
      message.success('全局参数已保存')
      await loadConfig()
    } finally {
      setSaving(false)
    }
  }

  if (loading)
    return (
      <div className={common.mt16} style={{ textAlign: 'center', padding: 80 }}>
        <Spin size="large" />
      </div>
    )
  if (!row) {
    return (
      <Alert
        type="warning"
        showIcon
        message="未找到全局参数行（pet_config id=1）"
        description="请确认 feature_pet_seed_20260916.sql 已执行（种子应插入 id=1 的默认参数行）。"
      />
    )
  }

  return (
    <div>
      <Alert
        type="info"
        showIcon
        className={common.mb16}
        message="全局参数说明"
        description="本页即宠物系统全部可配项（无魔法数字原则的落点）：修改即对 App 生效；概率/审计版本锚点 config_version 为只读展示（递增在蛋池页操作）。"
      />
      <Form form={form} layout="vertical" preserve={false} style={{ maxWidth: 860 }}>
        <Card
          title="总开关"
          className={common.mb16}
          extra={
            <Tag color={row.pet_enabled ? 'green' : 'red'}>
              当前：{row.pet_enabled ? '已开启' : '已关闭'}
            </Tag>
          }
        >
          <Form.Item
            name="pet_enabled"
            label="宠物系统总开关"
            valuePropName="checked"
            tooltip="关闭后 App 三处入口（状态卡/快捷工具/金币钱包）全部隐藏"
          >
            <Switch disabled={!canWrite} checkedChildren="开启" unCheckedChildren="关闭" />
          </Form.Item>
        </Card>

        <Card title="养成与喂养" className={common.mb16}>
          <Form.Item name="free_feed_daily" label="免费喂养次数 / 天" rules={[{ required: true }]}>
            <InputNumber min={0} max={99} className={common.fullWidth} disabled={!canWrite} />
          </Form.Item>
          <Form.Item name="free_feed_cooldown_min" label="免费喂养冷却（分钟）" rules={[{ required: true }]}>
            <InputNumber min={0} className={common.fullWidth} disabled={!canWrite} />
          </Form.Item>
          <Form.Item name="breeding_cooldown_hours" label="繁育冷却（小时，P2）" rules={[{ required: true }]}>
            <InputNumber min={0} className={common.fullWidth} disabled={!canWrite} />
          </Form.Item>
          <Form.Item name="ssr_hatch_wait_hours" label="SSR 等待孵化时长（小时，P2）" rules={[{ required: true }]}>
            <InputNumber min={0} className={common.fullWidth} disabled={!canWrite} />
          </Form.Item>
        </Card>

        <Card title="历险与任务" className={common.mb16}>
          <Form.Item name="daily_task_draw_count" label="每日任务抽取数" rules={[{ required: true }]}>
            <InputNumber min={1} max={20} className={common.fullWidth} disabled={!canWrite} />
          </Form.Item>
          <JsonFormItem
            name="adventure_tiers"
            label="历险三档（jsonb 数组）"
            tooltip="tier 编码 / minutes 时长 / label 展示名；App 按此渲染历险发起页"
            placeholder='[{"tier":"short","minutes":30,"label":"短途"},{"tier":"medium","minutes":120,"label":"中途"},{"tier":"long","minutes":480,"label":"长途"}]'
            rows={5}
          />
          <Form.Item name="adventure_hunger_threshold" label="历险出发饱食阈值（/100）" rules={[{ required: true }]}>
            <InputNumber min={0} max={100} className={common.fullWidth} disabled={!canWrite} />
          </Form.Item>
          <Form.Item name="adventure_mood_threshold" label="历险出发心情阈值（/100）" rules={[{ required: true }]}>
            <InputNumber min={0} max={100} className={common.fullWidth} disabled={!canWrite} />
          </Form.Item>
        </Card>

        <Card title="经济与背包" className={common.mb16}>
          <Form.Item name="points_per_gold" label="1 金币 = N 积分（单向兑换）" rules={[{ required: true }]}>
            <InputNumber min={1} className={common.fullWidth} disabled={!canWrite} />
          </Form.Item>
          <Form.Item name="stack_limit_default" label="默认单格堆叠上限" rules={[{ required: true }]}>
            <InputNumber min={1} className={common.fullWidth} disabled={!canWrite} />
          </Form.Item>
        </Card>

        <Card title="三套容量（初始 / 上限）" className={common.mb16}>
          <Form.Item name="backpack_capacity_init" label="背包初始格数" rules={[{ required: true }]}>
            <InputNumber min={1} className={common.fullWidth} disabled={!canWrite} />
          </Form.Item>
          <Form.Item name="backpack_capacity_max" label="背包最高上限" rules={[{ required: true }]}>
            <InputNumber min={1} className={common.fullWidth} disabled={!canWrite} />
          </Form.Item>
          <Form.Item name="rearing_capacity_init" label="养育格初始" rules={[{ required: true }]}>
            <InputNumber min={0} className={common.fullWidth} disabled={!canWrite} />
          </Form.Item>
          <Form.Item name="rearing_capacity_max" label="养育格上限" rules={[{ required: true }]}>
            <InputNumber min={1} className={common.fullWidth} disabled={!canWrite} />
          </Form.Item>
          <Form.Item name="foster_capacity_init" label="寄养格初始（0=需扩容开启）" rules={[{ required: true }]}>
            <InputNumber min={0} className={common.fullWidth} disabled={!canWrite} />
          </Form.Item>
          <Form.Item name="foster_capacity_max" label="寄养格上限" rules={[{ required: true }]}>
            <InputNumber min={0} className={common.fullWidth} disabled={!canWrite} />
          </Form.Item>
        </Card>

        <Card title="初始资源包" className={common.mb16}>
          <JsonFormItem
            name="newbie_package"
            label="初始包内容（jsonb）"
            tooltip="首次进入宠物系统幂等发放：初始蛋 item_code + 食物数组 + 初始金币"
            placeholder={'{\n  "egg_item_code": "egg_initial_ssr",\n  "foods": [{"item_code": "food_can", "count": 3}],\n  "gold": 0\n}'}
            rows={6}
          />
        </Card>

        <Card title="审计锚点" className={common.mb16}>
          <Form.Item label="config_version（概率/审计版本）">
            <Input value={`v${row.config_version}`} disabled />
          </Form.Item>
          <Alert
            type="info"
            showIcon
            message="config_version 在「蛋池管理」修改概率时递增，此处只读展示；App 公示与 RPC 判定均以该版本为同源锚点。"
          />
        </Card>

        <div className={`${common.textRight} ${common.mb16}`}>
          <Button type="primary" loading={saving} disabled={!canWrite} onClick={handleSave}>
            保存全局参数
          </Button>
        </div>
      </Form>
    </div>
  )
}

export default PetConfig
