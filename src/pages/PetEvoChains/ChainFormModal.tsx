import React from 'react'
import { Form, Input, InputNumber, Modal, Select } from 'antd'
import type { PetEvoChainRow } from '../../types/pet'
import { PET_FAMILY_OPTIONS } from '../../constants/pet'

// ==================== 进化链编辑弹窗（pet_evo_chains） ====================

export interface ChainFormValues {
  code: string
  family: string
  max_stage: number
}

interface Props {
  open: boolean
  editing: PetEvoChainRow | null
  saving: boolean
  onOk: (values: ChainFormValues) => void
  onCancel: () => void
}

const ChainFormModal: React.FC<Props> = ({ open, editing, saving, onOk, onCancel }) => {
  const [form] = Form.useForm()

  return (
    <Modal
      title={editing ? '编辑进化链' : '新增进化链'}
      open={open}
      onOk={async () => {
        const values = await form.validateFields()
        onOk(values as ChainFormValues)
      }}
      confirmLoading={saving}
      afterOpenChange={(o) => {
        if (o) {
          form.resetFields()
          form.setFieldsValue(editing ?? { max_stage: 2 })
        }
      }}
      onCancel={onCancel}
      destroyOnHidden
      width={560}
    >
      <Form form={form} layout="vertical" preserve={false}>
        <Form.Item
          name="code"
          label="链编码"
          tooltip="种子命名规则 chain_<species_code>；挂载方式 = 在种属管理把该形态的「进化链」指向本链"
          rules={[{ required: true, message: '请输入链编码' }]}
        >
          <Input placeholder="如 chain_cat_n1" />
        </Form.Item>
        <Form.Item
          name="family"
          label="体系"
          tooltip="仅作分组展示；实际进化目标形态由阶段行的种属决定"
          rules={[{ required: true, message: '请选择体系' }]}
        >
          <Select options={PET_FAMILY_OPTIONS} placeholder="选择体系（运营可增）" />
        </Form.Item>
        <Form.Item
          name="max_stage"
          label="最高阶段"
          tooltip="stage 上限（含）。0=基础形，1/2=进化阶；预留 3/4 阶时改这里"
          rules={[{ required: true, message: '请输入最高阶段' }]}
        >
          <InputNumber min={0} max={9} style={{ width: 200 }} />
        </Form.Item>
      </Form>
    </Modal>
  )
}

export default ChainFormModal
