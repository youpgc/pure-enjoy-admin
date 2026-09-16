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
  message,
} from 'antd'
import { usePermission } from '../../hooks/usePermission'
import { petConfigService, petItemService } from '../../services/petService'
import type { PetConfigRow } from '../../types/pet'
import { JsonFormItem } from '../../components/form/pet/JsonFormItem'
import { TierListEditor } from '../../components/form/pet/editors/BasicEditors'
import { NewbiePackageEditor } from '../../components/form/pet/editors/ItemEditors'
import common from '../../styles/common.module.css'

// ==================== 宠物全局参数（pet_config 单行表，按模块独立修改保存） ====================
//
// 每个模块卡片独立保存：只提交本模块字段（PATCH 语义），互不干扰、失败可单独重试。
// 列全集 = tables + rpcs + asset 三波 DDL（等级曲线/喂养效果/互动/衰减/慰问金/3D 开关/资源清单）。
// 结构化编辑器与 RPC 消费结构同源（详见 editors/ 下各组件注释）。

type ModuleKey =
  | 'master'
  | 'growth'
  | 'feed'
  | 'decay'
  | 'adventure'
  | 'hatch'
  | 'economy'
  | 'newbie'
  | 'render3d'

const MODULE_FIELDS: Record<ModuleKey, string[]> = {
  master: ['pet_enabled'],
  growth: ['level_exp_base', 'level_exp_growth'],
  feed: ['free_feed_daily', 'free_feed_cooldown_min', 'free_feed_hunger', 'free_feed_exp', 'interact_mood'],
  decay: ['decay_hunger_per_hour', 'decay_mood_per_hour'],
  adventure: [
    'adventure_tiers',
    'adventure_hunger_threshold',
    'adventure_mood_threshold',
    'daily_task_draw_count',
    'rescue_consolation_gold',
  ],
  hatch: ['breeding_cooldown_hours', 'ssr_hatch_wait_hours'],
  economy: [
    'points_per_gold',
    'stack_limit_default',
    'backpack_capacity_init',
    'backpack_capacity_max',
    'rearing_capacity_init',
    'rearing_capacity_max',
    'foster_capacity_init',
    'foster_capacity_max',
  ],
  newbie: ['newbie_package'],
  render3d: ['render3d_enabled', 'asset_manifest'],
}

const MODULE_TITLES: Record<ModuleKey, string> = {
  master: '总开关',
  growth: '等级与成长',
  feed: '喂养与互动',
  decay: '离线衰减',
  adventure: '历险与任务',
  hatch: '繁育与孵化',
  economy: '经济与背包',
  newbie: '初始资源包',
  render3d: '3D 渲染',
}

const PetConfig: React.FC = () => {
  const { hasPermission } = usePermission()
  const canWrite = hasPermission('pets:write')

  const [loading, setLoading] = useState(true)
  const [savingModule, setSavingModule] = useState<ModuleKey | null>(null)
  const [row, setRow] = useState<PetConfigRow | null>(null)
  const [itemOptions, setItemOptions] = useState<
    Array<{ item_code: string; name: string; category: string }>
  >([])
  const [form] = Form.useForm()

  const loadConfig = useCallback(async () => {
    setLoading(true)
    const res = await petConfigService.loadConfig()
    if (res.success && res.data) {
      setRow(res.data)
      form.setFieldsValue(res.data as unknown as Record<string, unknown>)
    }
    setLoading(false)
  }, [form])

  const loadItems = useCallback(async () => {
    const res = await petItemService.findAll()
    if (res.success && res.data) {
      setItemOptions(
        res.data.map((i) => ({ item_code: i.item_code, name: i.name, category: i.category }))
      )
    }
  }, [])

  useEffect(() => {
    loadConfig()
    loadItems()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 模块级保存：只校验并提交本模块字段
  const handleSaveModule = async (key: ModuleKey) => {
    if (!row) return
    const fields = MODULE_FIELDS[key]
    const values = await form.validateFields(fields)
    // 经济模块：容量 init ≤ max 成对校验
    if (key === 'economy') {
      const pairs: Array<[string, number, number]> = [
        ['背包', values.backpack_capacity_init, values.backpack_capacity_max],
        ['养育格', values.rearing_capacity_init, values.rearing_capacity_max],
        ['寄养格', values.foster_capacity_init, values.foster_capacity_max],
      ]
      for (const [label, init, max] of pairs) {
        if (init > max) return void message.error(`${label}初始容量不能大于上限`)
      }
    }
    setSavingModule(key)
    try {
      const res = await petConfigService.update(row.id, values as never)
      if (!res.success) return
      message.success(`「${MODULE_TITLES[key]}」已保存`)
      await loadConfig()
    } finally {
      setSavingModule(null)
    }
  }

  // 模块卡片骨架：标题 + 独立保存按钮
  const moduleCard = (
    key: ModuleKey,
    content: React.ReactNode,
    extraAlert?: React.ReactNode
  ) => (
    <Card
      title={MODULE_TITLES[key]}
      className={common.mb16}
      extra={
        <Button
          size="small"
          type="primary"
          ghost
          loading={savingModule === key}
          disabled={!canWrite || savingModule !== null}
          onClick={() => handleSaveModule(key)}
        >
          保存本模块
        </Button>
      }
    >
      {extraAlert}
      {content}
    </Card>
  )

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
        description="请确认宠物系统建表与种子 SQL 已执行（种子应插入 id=1 的默认参数行）。"
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
        description="全部可配项按模块拆分，每个模块独立保存（只提交本模块字段）；修改保存后即对 App 生效。概率/审计版本锚点 config_version 为只读展示（递增在蛋池页操作）。"
      />
      <Form form={form} layout="vertical" preserve={false} style={{ maxWidth: 860 }}>
        {moduleCard(
          'master',
          <Form.Item
            name="pet_enabled"
            label="宠物系统总开关"
            valuePropName="checked"
            tooltip="关闭后 App 三处入口（状态卡/快捷工具/金币钱包）全部隐藏"
          >
            <Switch disabled={!canWrite} checkedChildren="开启" unCheckedChildren="关闭" />
          </Form.Item>
        )}

        {moduleCard(
          'growth',
          <>
            <Form.Item name="level_exp_base" label="升级基础经验（Lv1→2 所需）" rules={[{ required: true }]}>
              <InputNumber min={1} className={common.fullWidth} disabled={!canWrite} />
            </Form.Item>
            <Form.Item
              name="level_exp_growth"
              label="经验增长系数（每级 ×N）"
              tooltip="下一级所需 = 上一级 × 增长系数"
              rules={[{ required: true }]}
            >
              <InputNumber min={1} step={0.1} className={common.fullWidth} disabled={!canWrite} />
            </Form.Item>
          </>
        )}

        {moduleCard(
          'feed',
          <>
            <Form.Item name="free_feed_daily" label="免费喂养次数 / 天" rules={[{ required: true }]}>
              <InputNumber min={0} max={99} className={common.fullWidth} disabled={!canWrite} />
            </Form.Item>
            <Form.Item name="free_feed_cooldown_min" label="免费喂养冷却（分钟）" rules={[{ required: true }]}>
              <InputNumber min={0} className={common.fullWidth} disabled={!canWrite} />
            </Form.Item>
            <Form.Item name="free_feed_hunger" label="免费喂养饱食恢复" tooltip="rpc_pet_feed 免费档效果" rules={[{ required: true }]}>
              <InputNumber min={0} className={common.fullWidth} disabled={!canWrite} />
            </Form.Item>
            <Form.Item name="free_feed_exp" label="免费喂养经验获得" rules={[{ required: true }]}>
              <InputNumber min={0} className={common.fullWidth} disabled={!canWrite} />
            </Form.Item>
            <Form.Item name="interact_mood" label="互动心情恢复" tooltip="rpc_pet_interact 单次效果" rules={[{ required: true }]}>
              <InputNumber min={0} className={common.fullWidth} disabled={!canWrite} />
            </Form.Item>
          </>
        )}

        {moduleCard(
          'decay',
          <>
            <Form.Item name="decay_hunger_per_hour" label="饱食衰减 / 小时" tooltip="离线结算：打开页面按时间戳补算" rules={[{ required: true }]}>
              <InputNumber min={0} className={common.fullWidth} disabled={!canWrite} />
            </Form.Item>
            <Form.Item name="decay_mood_per_hour" label="心情衰减 / 小时" rules={[{ required: true }]}>
              <InputNumber min={0} className={common.fullWidth} disabled={!canWrite} />
            </Form.Item>
          </>
        )}

        {moduleCard(
          'adventure',
          <>
            <Form.Item
              name="adventure_tiers"
              label="历险档位"
              tooltip="tier 编码 / minutes 时长 / label 展示名；App 按此渲染历险发起页，服务端按 tier 匹配时长"
              rules={[{ required: true, message: '至少保留一个历险档位' }]}
            >
              <TierListEditor disabled={!canWrite} />
            </Form.Item>
            <Form.Item name="daily_task_draw_count" label="每日任务抽取数" rules={[{ required: true }]}>
              <InputNumber min={1} max={20} className={common.fullWidth} disabled={!canWrite} />
            </Form.Item>
            <Form.Item name="adventure_hunger_threshold" label="历险出发饱食阈值（/100）" rules={[{ required: true }]}>
              <InputNumber min={0} max={100} className={common.fullWidth} disabled={!canWrite} />
            </Form.Item>
            <Form.Item name="adventure_mood_threshold" label="历险出发心情阈值（/100）" rules={[{ required: true }]}>
              <InputNumber min={0} max={100} className={common.fullWidth} disabled={!canWrite} />
            </Form.Item>
            <Form.Item
              name="rescue_consolation_gold"
              label="遇险慰问金（金币）"
              tooltip="超出自救窗口由 NPC 兜底救助时发放"
              rules={[{ required: true }]}
            >
              <InputNumber min={0} className={common.fullWidth} disabled={!canWrite} />
            </Form.Item>
          </>
        )}

        {moduleCard(
          'hatch',
          <>
            <Form.Item name="breeding_cooldown_hours" label="繁育冷却（小时）" rules={[{ required: true }]}>
              <InputNumber min={0} className={common.fullWidth} disabled={!canWrite} />
            </Form.Item>
            <Form.Item name="ssr_hatch_wait_hours" label="SSR 等待孵化时长（小时）" rules={[{ required: true }]}>
              <InputNumber min={0} className={common.fullWidth} disabled={!canWrite} />
            </Form.Item>
          </>
        )}

        {moduleCard(
          'economy',
          <>
            <Form.Item name="points_per_gold" label="1 金币 = N 积分（单向兑换）" rules={[{ required: true }]}>
              <InputNumber min={1} className={common.fullWidth} disabled={!canWrite} />
            </Form.Item>
            <Form.Item name="stack_limit_default" label="默认单格堆叠上限" rules={[{ required: true }]}>
              <InputNumber min={1} className={common.fullWidth} disabled={!canWrite} />
            </Form.Item>
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
          </>
        )}

        {moduleCard(
          'newbie',
          <Form.Item
            name="newbie_package"
            label="初始包内容"
            tooltip="首次进入宠物系统幂等发放：初始蛋 + 食物 + 初始金币；服务端按 item_code 匹配道具目录"
          >
            <NewbiePackageEditor items={itemOptions} disabled={!canWrite} />
          </Form.Item>
        )}

        {moduleCard(
          'render3d',
          <>
            <Form.Item
              name="render3d_enabled"
              label="3D 渲染系统开关"
              valuePropName="checked"
              tooltip="系统级总闸；与用户开关、资源包就绪态三者与运算决定 App 是否 3D 渲染，任一不满足回退 2D"
            >
              <Switch disabled={!canWrite} checkedChildren="开启" unCheckedChildren="关闭" />
            </Form.Item>
            <JsonFormItem
              name="asset_manifest"
              label="资源包清单（jsonb，高级）"
              tooltip="按系资源包清单（version/url/sha/size），App 资源包服务按此下载校验；结构开放故保留 JSON 编辑"
              rows={6}
            />
          </>
        )}

        <Card title="审计锚点" className={common.mb16}>
          <Form.Item label="config_version（概率/审计版本）">
            <Input value={`v${row.config_version}`} disabled />
          </Form.Item>
          <Alert
            type="info"
            showIcon
            message="config_version 在「蛋池与概率」修改概率时递增，此处只读展示；App 公示与 RPC 判定均以该版本为同源锚点。"
          />
        </Card>
      </Form>
    </div>
  )
}

export default PetConfig
