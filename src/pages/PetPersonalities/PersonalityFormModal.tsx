import React from 'react'
import { Form, Input, InputNumber, Modal, Switch } from 'antd'
import type { PetPersonalityRow } from '../../types/pet'
import { NumberMapEditor } from '../../components/form/pet/editors/BasicEditors'
import { asObject } from '../../components/form/pet/editors/shared'
import { PET_ATTR_LABELS } from '../../constants/pet'

// ==================== 性格字典编辑弹窗（pet_personalities） ====================
//
// condition 结构与 rpc_pet_hatch_instant 消费同源：{attr: 阈值}，
// 四维全部 ≥ 阈值（AND）才进入候选，按 weight 加权随机定一个。

export interface PersonalityFormValues {
  code: string
  name_cn: string
  description: string | null
  condition: Record<string, unknown>
  weight: number
  enabled: boolean
}

interface Props {
  open: boolean
  editing: PetPersonalityRow | null
  saving: boolean
  onOk: (values: PersonalityFormValues) => void
  onCancel: () => void
}

const CONDITION_FIELDS = Object.entries(PET_ATTR_LABELS).map(([key, label]) => ({
  key,
  label: `${label} ≥`,
  min: 0,
}))

const PersonalityFormModal: React.FC<Props> = ({ open, editing, saving, onOk, onCancel }) => {
  const [form] = Form.useForm()

  return (
    <Modal
      title={editing ? `编辑性格（${editing.code}）` : '新增性格'}
      open={open}
      onOk={async () => {
        const values = await form.validateFields()
        onOk({ ...values, condition: asObject(values.condition) })
      }}
      confirmLoading={saving}
      afterOpenChange={(o) => {
        if (o) {
          form.resetFields()
          form.setFieldsValue(
            editing
              ? { ...editing, condition: asObject(editing.condition) }
              : { condition: {}, weight: 100, enabled: false }
          )
        }
      }}
      onCancel={onCancel}
      destroyOnHidden
      width={560}
    >
      <Form form={form} layout="vertical" preserve={false}>
        <Form.Item
          name="code"
          label="性格编码"
          tooltip="如 lively / calm；App 展示与孵化匹配按此引用"
          rules={[{ required: true, message: '请输入性格编码' }]}
        >
          <Input placeholder="如 lively" disabled={!!editing} />
        </Form.Item>
        <Form.Item name="name_cn" label="中文名" rules={[{ required: true, message: '请输入中文名' }]}>
          <Input placeholder="如 活泼" />
        </Form.Item>
        <Form.Item name="description" label="描述">
          <Input.TextArea rows={2} placeholder="如 精力旺盛，好奇心强" />
        </Form.Item>
        <Form.Item
          name="condition"
          label="属性条件（{维度: 阈值}，全维度 ≥ AND）"
          tooltip="孵化时四维全部 ≥ 对应阈值才进入候选；留空 = 无条件（任何宠物都候选）"
        >
          <NumberMapEditor fields={CONDITION_FIELDS} />
        </Form.Item>
        <Form.Item
          name="weight"
          label="权重"
          tooltip="候选性格按权重加权随机取一个；默认 100"
          rules={[{ required: true, message: '请输入权重' }]}
        >
          <InputNumber min={1} style={{ width: '100%' }} />
        </Form.Item>
        <Form.Item
          name="enabled"
          label="启用"
          valuePropName="checked"
          tooltip="关闭后孵化匹配跳过该性格（种子 4 条默认停用，验证属性系统稳定后再放开）"
        >
          <Switch checkedChildren="启用" unCheckedChildren="停用" />
        </Form.Item>
      </Form>
    </Modal>
  )
}

export default PersonalityFormModal
