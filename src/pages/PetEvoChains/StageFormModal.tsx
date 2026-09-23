import React from 'react'
import { Form, Input, InputNumber, Modal, Select } from 'antd'
import type { PetEvoStageRow } from '../../types/pet'
import { PET_EVO_COND_TYPE_HINTS, PET_PICK_MODE_OPTIONS, PET_PICK_MODE_TYPES } from '../../constants/pet'
import { asArray } from '../../components/form/pet/editors/shared'
import { EvoConditionsEditor } from './EvoConditionsEditor'
import common from '../../styles/common.module.css'

// ==================== 进化阶段编辑弹窗（pet_evo_stages） ====================
//
// 服务端解析口径（rpc_pet_evolve）：宠物当前 stage + 1 → 本链该 stage 的候选行；
// 唯一候选直接进化；多候选且存在 weighted_random 行则按 branch_weight 掷，
// 纯 user_choice 多候选必须玩家自选（否则 PET_EVOLVE_PICK_REQUIRED）。

export interface StageFormValues {
  chain_id: string
  stage: number
  species_id: string
  branch_key: string
  branch_weight: number
  pick_mode: string
  conditions: Record<string, unknown>[]
}

interface Props {
  open: boolean
  editing: PetEvoStageRow | null
  saving: boolean
  chainId: string
  chains: Array<{ id: string; code: string }>
  species: Array<{ value: string; label: string }>
  items: Array<{ item_code: string; name: string }>
  onOk: (values: StageFormValues) => void
  onCancel: () => void
}

const StageFormModal: React.FC<Props> = ({
  open,
  editing,
  saving,
  chainId,
  chains,
  species,
  items,
  onOk,
  onCancel,
}) => {
  const [form] = Form.useForm()

  return (
    <Modal
      title={editing ? '编辑进化阶段' : '新增进化阶段'}
      open={open}
      onOk={async () => {
        const values = await form.validateFields()
        onOk({ ...values, conditions: asArray(values.conditions) })
      }}
      confirmLoading={saving}
      afterOpenChange={(o) => {
        if (o) {
          form.resetFields()
          form.setFieldsValue(
            editing
              ? {
                  ...editing,
                  conditions: asArray(editing.conditions),
                }
              : {
                  chain_id: chainId || undefined,
                  stage: 1,
                  branch_key: 'main',
                  branch_weight: 1,
                  pick_mode: PET_PICK_MODE_TYPES.USER_CHOICE,
                  conditions: [],
                }
          )
        }
      }}
      onCancel={onCancel}
      destroyOnHidden
      width={720}
    >
      <Form form={form} layout="vertical" preserve={false}>
        <Form.Item
          name="chain_id"
          label="所属进化链"
          rules={[{ required: true, message: '请选择进化链' }]}
        >
          <Select
            showSearch
            optionFilterProp="label"
            disabled={!!editing}
            options={chains.map((c) => ({ value: c.id, label: c.code }))}
            placeholder="选择链"
          />
        </Form.Item>
        <Form.Item
          name="stage"
          label="阶段号"
          tooltip="0=基础形（一般不配进化行），1/2=进化阶；同一链内 (阶段, 目标形态) 不可重复"
          rules={[{ required: true, message: '请输入阶段号' }]}
        >
          <InputNumber min={1} max={9} style={{ width: 200 }} />
        </Form.Item>
        <Form.Item
          name="species_id"
          label="目标形态（种属）"
          tooltip="进化后宠物变成的形态；该种属须处于启用状态，否则报 PET_EVOLVE_SPECIES_DISABLED"
          rules={[{ required: true, message: '请选择目标形态' }]}
        >
          <Select
            showSearch
            optionFilterProp="label"
            options={species}
            placeholder="选择进化后的形态"
          />
        </Form.Item>
        <Form.Item name="branch_key" label="分支标识" tooltip="同阶段多分支的分组名，缺省 main">
          <Input placeholder="如 main / fire" className={common.fullWidth} />
        </Form.Item>
        <Form.Item
          name="pick_mode"
          label="分支抉择模式"
          tooltip="加权随机=服务端按权重自动选；玩家抉择=App 需弹出选择框并回传目标形态"
          rules={[{ required: true, message: '请选择模式' }]}
        >
          <Select options={PET_PICK_MODE_OPTIONS} />
        </Form.Item>
        <Form.Item
          name="branch_weight"
          label="分支权重"
          tooltip="仅加权随机模式生效，池内相对权重"
          rules={[{ required: true, message: '请输入权重' }]}
        >
          <InputNumber min={0} style={{ width: 200 }} />
        </Form.Item>
        <Form.Item
          name="conditions"
          label="进化条件"
          tooltip={Object.values(PET_EVO_COND_TYPE_HINTS).join('；')}
        >
          <EvoConditionsEditor items={items} />
        </Form.Item>
      </Form>
    </Modal>
  )
}

export default StageFormModal
