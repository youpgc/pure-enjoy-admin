import React, { useEffect, useState } from 'react'
import { Modal, Form, Input, InputNumber, Switch } from 'antd'
import type { PetAdventureSpotRow } from '../../types/pet'
import { petItemService } from '../../services/petService'
import { NumberMapEditor, UnlockListEditor } from '../../components/form/pet/editors/BasicEditors'
import { DropTableEditor } from '../../components/form/pet/editors/AdventureEditors'
import {
  AttrRequirementsEditor,
  PenaltyEditor,
} from '../../components/form/pet/editors/AttributeEditors'
import { asObject } from '../../components/form/pet/editors/shared'
import { PET_ADVENTURE_RESULT_LABELS } from '../../constants/pet'
import common from '../../styles/common.module.css'

// ==================== 游历地编辑弹窗（pet_adventure_spots） ====================
//
// jsonb 结构与 rpc_pet_adventure_claim/rescue 消费同源：
// - unlock_conditions：[{type,value}]（App 侧解锁判定/展示；服务端仅校验 enabled）；
// - attr_requirements：[{attr,value}]（属性威胁定版 20261027：全达标 → 结算
//   剔除 danger 必不遇险；不达标 → 保留遇险判定，遇险走救援+失败惩罚）；
// - result_weights：{play,danger,help,memory} 累计权重（和为 1 时 roll 覆盖全区间）；
// - drop_table：<result>.gold[min,max] / exp[min,max] / items[{code,min,max,p}]
//   （danger 键不结算——遇险走救援，掉落只配 play/help/memory 与 long_only）；
// - rescue_params：{self_window_minutes}（缺省 120）；
// - penalty：{health,mood,gold（负值）, lose_item:{p}}（救援结算时生效：
//   道具自救 ×0.5 减轻 / 超窗 NPC ×1.0 拉满）。

export interface SpotFormValues {
  code: string
  name: string
  unlock_conditions: Array<Record<string, unknown>>
  attr_requirements: Array<Record<string, unknown>>
  result_weights: Record<string, unknown>
  drop_table: Record<string, unknown>
  rescue_params: Record<string, unknown>
  penalty: Record<string, unknown>
  enabled: boolean
  sort_order: number
}

interface Props {
  open: boolean
  editing: PetAdventureSpotRow | null
  saving: boolean
  onOk: (values: SpotFormValues) => void
  onCancel: () => void
}

/// 四类结果权重行：键与文案派生自 constants（ENUM 单一源，禁止本地副本）
const RESULT_WEIGHT_FIELDS = Object.entries(PET_ADVENTURE_RESULT_LABELS).map(([key, label]) => ({
  key,
  label: `${label}（${key}）`,
  min: 0,
  step: 0.05,
}))

const SpotFormModal: React.FC<Props> = ({ open, editing, saving, onOk, onCancel }) => {
  const [form] = Form.useForm()
  const [items, setItems] = useState<Array<{ item_code: string; name: string; category: string }>>([])

  useEffect(() => {
    if (!open) return
    petItemService.findAll().then((res) => {
      if (res.success && res.data) {
        setItems(res.data.map((i) => ({ item_code: i.item_code, name: i.name, category: i.category })))
      }
    })
  }, [open])

  return (
    <Modal
      title={editing ? '编辑游历地' : '新增游历地'}
      open={open}
      onOk={async () => {
        const values = await form.validateFields()
        onOk({
          ...values,
          unlock_conditions: Array.isArray(values.unlock_conditions) ? values.unlock_conditions : [],
          attr_requirements: Array.isArray(values.attr_requirements)
            ? values.attr_requirements
            : [],
          result_weights: asObject(values.result_weights),
          drop_table: asObject(values.drop_table),
          rescue_params: asObject(values.rescue_params),
          penalty: asObject(values.penalty),
        })
      }}
      confirmLoading={saving}
      afterOpenChange={(o) => {
        if (o) {
          form.resetFields()
          form.setFieldsValue(
            editing
              ? {
                  ...editing,
                  unlock_conditions: Array.isArray(editing.unlock_conditions)
                    ? (editing.unlock_conditions as Array<Record<string, unknown>>)
                    : [],
                  attr_requirements: Array.isArray(editing.attr_requirements)
                    ? (editing.attr_requirements as Array<Record<string, unknown>>)
                    : [],
                  result_weights: asObject(editing.result_weights),
                  drop_table: asObject(editing.drop_table),
                  rescue_params: asObject(editing.rescue_params),
                  penalty: asObject(editing.penalty),
                }
              : {
                  unlock_conditions: [],
                  attr_requirements: [],
                  result_weights: {},
                  drop_table: {},
                  rescue_params: { self_window_minutes: 120 },
                  penalty: {},
                  enabled: false,
                  sort_order: 0,
                }
          )
        }
      }}
      onCancel={onCancel}
      destroyOnHidden
      width={720}
    >
      <Form form={form} layout="vertical" preserve={false}>
        <Form.Item name="code" label="地点编码" rules={[{ required: true, message: '请输入地点编码' }]}>
          <Input placeholder="如 spot_garden" />
        </Form.Item>
        <Form.Item name="name" label="名称" rules={[{ required: true, message: '请输入名称' }]}>
          <Input placeholder="如 云端花园" />
        </Form.Item>

        <Form.Item name="unlock_conditions" label="解锁条件" tooltip="游历按等级/条件解锁；type 如 level，value 为阈值">
          <UnlockListEditor />
        </Form.Item>

        <Form.Item
          name="attr_requirements"
          label="属性要求（达标必不遇险）"
          tooltip="全达标 → 结算剔除遇险必不遇险；不达标仍可出发，但保留遇险判定（遇险走救援+失败惩罚）。曲线基准：两维各 ≈10+(解锁等级-1)×0.9"
        >
          <AttrRequirementsEditor />
        </Form.Item>

        <Form.Item
          name="result_weights"
          label="结果权重"
          tooltip="四类结果按累计权重与随机数比较判定；建议四项合计为 1"
          rules={[{ required: true, message: '请配置结果权重' }]}
        >
          <NumberMapEditor fields={RESULT_WEIGHT_FIELDS} sumHint="四类权重建议合计 1" />
        </Form.Item>

        <Form.Item name="drop_table" label="掉落包">
          <DropTableEditor items={items} />
        </Form.Item>

        <Form.Item
          name="rescue_params"
          label="救助参数"
          tooltip="自救窗口时长（分钟）；遇险后先自救，超时 NPC 兜底"
        >
          <NumberMapEditor
            fields={[{ key: 'self_window_minutes', label: '自救窗口（分钟）', min: 1 }]}
          />
        </Form.Item>

        <Form.Item
          name="penalty"
          label="失败惩罚（遇险救援结算）"
          tooltip="遇险救援时生效：道具自救 ×0.5 减轻 / 超窗 NPC ×1.0 拉满。健康/心情/金币按负值扣减，丢失道具按概率"
        >
          <PenaltyEditor />
        </Form.Item>

        <Form.Item name="sort_order" label="排序号">
          <InputNumber min={0} className={common.fullWidth} />
        </Form.Item>
        <Form.Item name="enabled" label="启用" valuePropName="checked" tooltip="关闭后 App 游历地列表不可见">
          <Switch checkedChildren="启用" unCheckedChildren="停用" />
        </Form.Item>
      </Form>
    </Modal>
  )
}

export default SpotFormModal
