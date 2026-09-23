import React from 'react'
import { Form, Input, InputNumber, Modal, Select, Switch } from 'antd'
import type { PetTraitRow } from '../../types/pet'
import { PET_FAMILY_OPTIONS } from '../../constants/pet'
import { JsonFormItem } from '../../components/form/pet/JsonFormItem'
import { asObject } from '../../components/form/pet/editors/shared'

// ==================== 特性编辑弹窗（pet_traits） ====================
//
// 掷取规则（_pet_trait_roll）：三级池优先级 种属 > 体系 > 全局，池内按 weight 加权随机；
// ⚠️ effect_type / effect_params 值域 P2 尚未定版，服务端只掷不读，故此处按文本/JSON 录入。

export interface TraitFormValues {
  code: string
  name: string
  effect_type: string
  effect_params: Record<string, unknown>
  weight: number
  family?: string | null
  species_code?: string | null
  enabled: boolean
}

interface Props {
  open: boolean
  editing: PetTraitRow | null
  saving: boolean
  speciesOptions: Array<{ value: string; label: string }>
  onOk: (values: TraitFormValues) => void
  onCancel: () => void
}

const TraitFormModal: React.FC<Props> = ({
  open,
  editing,
  saving,
  speciesOptions,
  onOk,
  onCancel,
}) => {
  const [form] = Form.useForm()

  return (
    <Modal
      title={editing ? '编辑特性' : '新增特性'}
      open={open}
      onOk={async () => {
        const values = await form.validateFields()
        onOk({ ...values, effect_params: asObject(values.effect_params) })
      }}
      confirmLoading={saving}
      afterOpenChange={(o) => {
        if (o) {
          form.resetFields()
          form.setFieldsValue(
            editing
              ? {
                  ...editing,
                  effect_params: asObject(editing.effect_params),
                  family: editing.family ?? undefined,
                  species_code: editing.species_code ?? undefined,
                }
              : { weight: 100, effect_params: {}, enabled: false }
          )
        }
      }}
      onCancel={onCancel}
      destroyOnHidden
      width={620}
    >
      <Form form={form} layout="vertical" preserve={false}>
        <Form.Item
          name="code"
          label="特性编码"
          tooltip="如 trait_swift；宠物侧按此编码展示，命名即契约"
          rules={[{ required: true, message: '请输入特性编码' }]}
        >
          <Input placeholder="如 trait_swift" />
        </Form.Item>
        <Form.Item name="name" label="特性名称" rules={[{ required: true, message: '请输入名称' }]}>
          <Input placeholder="如 迅捷" />
        </Form.Item>
        <Form.Item
          name="effect_type"
          label="效果类型"
          tooltip="值域未定版（服务端掷取时不读该列）；请填小写下划线英文码，便于后续 RPC 接入"
          rules={[{ required: true, message: '请输入效果类型' }]}
        >
          <Input placeholder="如 attr_bonus / exp_rate" />
        </Form.Item>
        <JsonFormItem
          name="effect_params"
          label="效果参数"
          rows={4}
          tooltip="JSON 对象；当前仅作配置留档，掷中后不下发数值效果"
          placeholder='{"attr":"agility","value":5}'
        />
        <Form.Item
          name="family"
          label="体系池（可选）"
          tooltip="留空且种属为空 = 全局池；种属配置优先于体系"
        >
          <Select allowClear options={PET_FAMILY_OPTIONS} placeholder="不填则不进入体系池" />
        </Form.Item>
        <Form.Item name="species_code" label="种属池（可选）" tooltip="优先级最高，命中即只在该种属内掷">
          <Select
            allowClear
            showSearch
            options={speciesOptions}
            optionFilterProp="label"
            placeholder="不填则不进入种属池"
          />
        </Form.Item>
        <Form.Item
          name="weight"
          label="掷取权重"
          tooltip="同池内相对权重，非百分比；缺省 100"
          rules={[{ required: true, message: '请输入权重' }]}
        >
          <InputNumber min={0} style={{ width: 200 }} />
        </Form.Item>
        <Form.Item
          name="enabled"
          label="启用"
          valuePropName="checked"
          tooltip="关闭后不参与掷取（存量宠物的特性不受影响）"
        >
          <Switch checkedChildren="启用" unCheckedChildren="停用" />
        </Form.Item>
      </Form>
    </Modal>
  )
}

export default TraitFormModal
