import React from 'react'
import { Form, Input, InputNumber, Modal } from 'antd'
import type { PetRarityRow } from '../../types/pet'

// ==================== 评级字典编辑弹窗（pet_rarities） ====================
//
// code 为主键语义（创建后不可改）；refine_base = 升级洗练点发放的评级基准
// （三因子之一：种属 refine_config.base + 评级 refine_base + 潜力加成档）。

export interface RarityFormValues {
  code: string
  name_cn: string
  growth_factor: number
  refine_base: number
  sort_order: number
}

interface Props {
  open: boolean
  editing: PetRarityRow | null
  saving: boolean
  onOk: (values: RarityFormValues) => void
  onCancel: () => void
}

const RarityFormModal: React.FC<Props> = ({ open, editing, saving, onOk, onCancel }) => {
  const [form] = Form.useForm()

  return (
    <Modal
      title={editing ? `编辑评级（${editing.code}）` : '新增评级'}
      open={open}
      onOk={async () => {
        const values = await form.validateFields()
        onOk(values)
      }}
      confirmLoading={saving}
      afterOpenChange={(o) => {
        if (o) {
          form.resetFields()
          form.setFieldsValue(
            editing ?? { growth_factor: 1, refine_base: 0, sort_order: 0 }
          )
        }
      }}
      onCancel={onCancel}
      destroyOnHidden
      width={520}
    >
      <Form form={form} layout="vertical" preserve={false}>
        <Form.Item
          name="code"
          label="评级编码"
          tooltip="如 N / R / SR / SSR；种属与蛋池按此引用"
          rules={[{ required: true, message: '请输入评级编码' }]}
        >
          <Input placeholder="如 SR" disabled={!!editing} />
        </Form.Item>
        <Form.Item name="name_cn" label="中文名" rules={[{ required: true, message: '请输入中文名' }]}>
          <Input placeholder="如 史诗" />
        </Form.Item>
        <Form.Item
          name="growth_factor"
          label="成长系数"
          tooltip="属性成长倍率基准；与 App 侧成长计算同源"
          rules={[{ required: true, message: '请输入成长系数' }]}
        >
          <InputNumber min={0} step={0.1} style={{ width: '100%' }} />
        </Form.Item>
        <Form.Item
          name="refine_base"
          label="每级洗练点基准（refine_base）"
          tooltip="升级发放洗练点 = 种属 base + 本评级基准 + 潜力加成档"
          rules={[{ required: true, message: '请输入洗练点基准' }]}
        >
          <InputNumber min={0} style={{ width: '100%' }} />
        </Form.Item>
        <Form.Item name="sort_order" label="排序号">
          <InputNumber min={0} style={{ width: '100%' }} />
        </Form.Item>
      </Form>
    </Modal>
  )
}

export default RarityFormModal
