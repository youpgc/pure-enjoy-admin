import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Alert,
  Card,
  Button,
  Form,
  InputNumber,
  Modal,
  Switch,
  Spin,
  Table,
  Typography,
  message,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { EditOutlined } from '@ant-design/icons'
import { usePermission } from '../../hooks/usePermission'
import { petConfigService, petItemService } from '../../services/petService'
import type { PetConfigRow } from '../../types/pet'
import type { Json } from '../../types/database'
import { stringifyJson } from '../../utils/petJson'
import { JsonFormItem } from '../../components/form/pet/JsonFormItem'
import { TierListEditor } from '../../components/form/pet/editors/BasicEditors'
import { NewbiePackageEditor } from '../../components/form/pet/editors/ItemEditors'
import common from '../../styles/common.module.css'

// ==================== 宠物全局参数（pet_config 单行表） ====================
//
// 交互形态：每模块一张参数表（参数 / 当前值 / 说明），整卡只读；
// 右上角「编辑」或点击任意行 → 弹窗表单修改 → 保存只提交本模块字段
// （PATCH 语义，互不干扰、失败可单独重试）。
// 列全集 = tables + rpcs + asset 三波 DDL；结构化编辑器与 RPC 消费同源。

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

interface FieldMeta {
  field: string
  label: string
  desc?: string
  /** 当前值列的展示格式化 */
  format?: (v: unknown) => string
}

const fmtBool = (v: unknown) => (v ? '开启' : '关闭')
const fmtNum = (v: unknown) => (v === null || v === undefined ? '—' : String(v))
const fmtJson = (v: unknown) =>
  v === null || v === undefined ? '—' : stringifyJson(v as Json)

const MODULES: { key: ModuleKey; title: string; fields: FieldMeta[] }[] = [
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
    title: '历险与任务',
    fields: [
      { field: 'adventure_tiers', label: '历险档位', desc: 'tier 编码 / minutes 时长 / label 展示名', format: fmtJson },
      { field: 'daily_task_draw_count', label: '每日任务抽取数', format: fmtNum },
      { field: 'adventure_hunger_threshold', label: '历险出发饱食阈值（/100）', format: fmtNum },
      { field: 'adventure_mood_threshold', label: '历险出发心情阈值（/100）', format: fmtNum },
      { field: 'rescue_consolation_gold', label: '遇险慰问金（金币）', desc: '超出自救窗口由 NPC 兜底救助时发放', format: fmtNum },
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
      { field: 'stack_limit_default', label: '默认单格堆叠上限', format: fmtNum },
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
    key: 'render3d',
    title: '3D 渲染',
    fields: [
      {
        field: 'render3d_enabled',
        label: '3D 渲染系统开关',
        desc: '与用户开关、资源包就绪态三者与运算，任一不满足回退 2D',
        format: fmtBool,
      },
      { field: 'asset_manifest', label: '资源包清单（jsonb）', desc: '按系资源包清单（version/url/sha/size），结构开放故保留 JSON 编辑', format: fmtJson },
    ],
  },
]

const PetConfig: React.FC = () => {
  const { hasPermission } = usePermission()
  const canWrite = hasPermission('pets:write')

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [row, setRow] = useState<PetConfigRow | null>(null)
  const [itemOptions, setItemOptions] = useState<
    Array<{ item_code: string; name: string; category: string }>
  >([])
  const [editModule, setEditModule] = useState<ModuleKey | null>(null)
  const [editForm] = Form.useForm()

  const loadConfig = useCallback(async () => {
    setLoading(true)
    const res = await petConfigService.loadConfig()
    if (res.success && res.data) setRow(res.data)
    setLoading(false)
  }, [])

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

  // 打开弹窗只记录模块；值同步放到 Modal 挂载后（下方 useEffect）执行——
  // destroyOnHidden + preserve=false 下，Form.Item 未挂载时 setFieldsValue
  // 会丢失（字段未注册），导致弹窗表单不回显。
  const openEdit = (key: ModuleKey) => {
    if (!row) return
    setEditModule(key)
  }

  useEffect(() => {
    if (!editModule || !row) return
    editForm.resetFields()
    editForm.setFieldsValue(row as unknown as Record<string, unknown>)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editModule])

  // 弹窗保存：只校验并提交本模块字段
  const handleSave = async () => {
    if (!row || !editModule) return
    const mod = MODULES.find((m) => m.key === editModule)
    if (!mod) return
    const fields = mod.fields.map((f) => f.field)
    const values = await editForm.validateFields(fields)
    if (editModule === 'economy') {
      const pairs: Array<[string, number, number]> = [
        ['背包', values.backpack_capacity_init, values.backpack_capacity_max],
        ['养育格', values.rearing_capacity_init, values.rearing_capacity_max],
        ['寄养格', values.foster_capacity_init, values.foster_capacity_max],
      ]
      for (const [label, init, max] of pairs) {
        if (init > max) return void message.error(`${label}初始容量不能大于上限`)
      }
    }
    setSaving(true)
    try {
      const res = await petConfigService.update(row.id, values as never)
      if (!res.success) return
      message.success(`「${mod.title}」已保存`)
      setEditModule(null)
      await loadConfig()
    } finally {
      setSaving(false)
    }
  }

  // ---------- 各模块弹窗表单控件（与 RPC 消费结构同源） ----------
  const renderControls = (key: ModuleKey): React.ReactNode => {
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
            <Form.Item name="daily_task_draw_count" label="每日任务抽取数" rules={[{ required: true }]}>
              <InputNumber min={1} max={20} className={common.fullWidth} disabled={disabled} />
            </Form.Item>
            <Form.Item name="adventure_hunger_threshold" label="历险出发饱食阈值（/100）" rules={[{ required: true }]}>
              <InputNumber min={0} max={100} className={common.fullWidth} disabled={disabled} />
            </Form.Item>
            <Form.Item name="adventure_mood_threshold" label="历险出发心情阈值（/100）" rules={[{ required: true }]}>
              <InputNumber min={0} max={100} className={common.fullWidth} disabled={disabled} />
            </Form.Item>
            <Form.Item name="rescue_consolation_gold" label="遇险慰问金（金币）" rules={[{ required: true }]}>
              <InputNumber min={0} className={common.fullWidth} disabled={disabled} />
            </Form.Item>
          </>
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
      case 'render3d':
        return (
          <>
            <Form.Item name="render3d_enabled" label="3D 渲染系统开关" valuePropName="checked">
              <Switch disabled={disabled} checkedChildren="开启" unCheckedChildren="关闭" />
            </Form.Item>
            <JsonFormItem
              name="asset_manifest"
              label="资源包清单（jsonb，高级）"
              tooltip="按系资源包清单（version/url/sha/size），App 资源包服务按此下载校验"
              rows={6}
            />
          </>
        )
    }
  }

  const valueColumns = useMemo<ColumnsType<FieldMeta>>(
    () => [
      { title: '参数', dataIndex: 'label', width: 260 },
      {
        title: '当前值',
        dataIndex: 'field',
        width: 300,
        render: (_: unknown, record: FieldMeta) => {
          const raw = row ? (row as unknown as Record<string, unknown>)[record.field] : undefined
          const text = record.format ? record.format(raw) : fmtNum(raw)
          return (
            <Typography.Text style={{ fontSize: 13 }} ellipsis>
              {text}
            </Typography.Text>
          )
        },
      },
      {
        title: '说明',
        dataIndex: 'desc',
        render: (v: string | undefined) =>
          v ? <Typography.Text type="secondary">{v}</Typography.Text> : '—',
      },
    ],
    [row]
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

  const editMod = MODULES.find((m) => m.key === editModule)

  return (
    <div>
      <Alert
        type="info"
        showIcon
        className={common.mb16}
        message="全局参数说明"
        description="按模块查看参数表，点击「编辑」或参数行打开弹窗修改；保存只提交本模块字段。概率/审计版本锚点 config_version 只读（递增在蛋池页操作）。"
      />
      {MODULES.map((mod) => (
        <Card
          key={mod.key}
          title={mod.title}
          className={common.mb16}
          extra={
            <Button
              size="small"
              icon={<EditOutlined />}
              disabled={!canWrite}
              onClick={() => openEdit(mod.key)}
            >
              编辑
            </Button>
          }
        >
          <Table
            rowKey="field"
            size="small"
            columns={valueColumns}
            dataSource={mod.fields}
            pagination={false}
            onRow={() => ({
              style: { cursor: canWrite ? 'pointer' : 'default' },
              onClick: () => {
                if (canWrite) openEdit(mod.key)
              },
            })}
          />
        </Card>
      ))}

      <Card title="审计锚点" className={common.mb16}>
        <Table
          rowKey="field"
          size="small"
          columns={[
            { title: '参数', dataIndex: 'label', width: 260 },
            {
              title: '当前值',
              dataIndex: 'field',
              render: () => `v${row.config_version}`,
            },
            {
              title: '说明',
              dataIndex: 'desc',
              render: () => 'config_version 在「蛋池与概率」修改概率时递增，App 公示与 RPC 判定同源锚点',
            },
          ]}
          dataSource={[{ field: 'config_version', label: 'config_version（概率/审计版本）' }]}
          pagination={false}
        />
      </Card>

      <Modal
        title={`编辑 · ${editMod?.title ?? ''}`}
        open={editModule !== null}
        onOk={handleSave}
        confirmLoading={saving}
        onCancel={() => setEditModule(null)}
        destroyOnHidden
        width={620}
      >
        <Form form={editForm} layout="vertical" preserve={false}>
          {editModule ? renderControls(editModule) : null}
        </Form>
      </Modal>
    </div>
  )
}

export default PetConfig
