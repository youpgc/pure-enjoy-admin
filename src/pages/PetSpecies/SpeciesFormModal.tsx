import React from 'react'
import { Modal, Form, Input, InputNumber, Select, Switch } from 'antd'
import type { PetSpeciesRow } from '../../types/pet'
import { PET_FAMILY_OPTIONS } from '../../constants/pet'
import { NumberMapEditor } from '../../components/form/pet/editors/BasicEditors'
import { Render2dEditor, Render3dEditor } from '../../components/form/pet/editors/RenderEditors'
import { asObject } from '../../components/form/pet/editors/shared'
import common from '../../styles/common.module.css'

// ==================== 种属/形态编辑弹窗（pet_species） ====================
//
// jsonb 结构化：base_attributes（初始四维基准）/ render2d {code} / render3d {code,enabled,variants}。
// base_attributes 当前为展示层基准（个体创建走 pet_pets 列默认值），预留渲染/展示引用。

export interface SpeciesFormValues {
  species_code: string
  family: string
  name_cn: string
  rarity_code: string
  base_attributes: Record<string, unknown>
  evolution_chain_id: string | null
  render2d: Record<string, unknown>
  render3d: Record<string, unknown>
  asset_version: string | null
  enabled: boolean
  sort_order: number
}

interface Props {
  open: boolean
  editing: PetSpeciesRow | null
  rarityOptions: Array<{ value: string; label: string }>
  saving: boolean
  onOk: (values: SpeciesFormValues) => void
  onCancel: () => void
}

const BASE_ATTR_FIELDS = [
  { key: 'hunger', label: '初始饱食度', min: 0, max: 100 },
  { key: 'mood', label: '初始心情', min: 0, max: 100 },
  { key: 'intimacy', label: '初始亲密度', min: 0 },
  { key: 'exp', label: '初始经验', min: 0 },
]

const SpeciesFormModal: React.FC<Props> = ({
  open,
  editing,
  rarityOptions,
  saving,
  onOk,
  onCancel,
}) => {
  const [form] = Form.useForm()

  return (
    <Modal
      title={editing ? '编辑种属' : '新增种属'}
      open={open}
      onOk={async () => {
        const values = await form.validateFields()
        onOk({
          ...values,
          base_attributes: asObject(values.base_attributes),
          render2d: asObject(values.render2d),
          render3d: asObject(values.render3d),
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
                  base_attributes: asObject(editing.base_attributes),
                  render2d: asObject(editing.render2d),
                  render3d: asObject(editing.render3d),
                }
              : {
                  base_attributes: {},
                  render2d: {},
                  render3d: {},
                  enabled: false,
                  sort_order: 0,
                }
          )
        }
      }}
      onCancel={onCancel}
      destroyOnHidden
      width={660}
    >
      <Form form={form} layout="vertical" preserve={false}>
        <Form.Item
          name="species_code"
          label="种属编码"
          tooltip="命名即契约：如 cat_n1（一阶）/ cat_n1_s1（二阶）；App/素材管线按此引用"
          rules={[{ required: true, message: '请输入种属编码' }]}
        >
          <Input placeholder="如 cat_n1" />
        </Form.Item>
        <Form.Item name="family" label="体系" rules={[{ required: true, message: '请选择体系' }]}>
          <Select options={PET_FAMILY_OPTIONS} placeholder="选择体系（运营可增）" />
        </Form.Item>
        <Form.Item name="name_cn" label="中文名" rules={[{ required: true, message: '请输入中文名' }]}>
          <Input placeholder="如 橘猫" />
        </Form.Item>
        <Form.Item name="rarity_code" label="评级" rules={[{ required: true, message: '请选择评级' }]}>
          <Select options={rarityOptions} placeholder="N / R / SR / SSR" />
        </Form.Item>

        <Form.Item name="base_attributes" label="初始四维基准">
          <NumberMapEditor fields={BASE_ATTR_FIELDS} />
        </Form.Item>

        <Form.Item
          name="evolution_chain_id"
          label="进化链 ID"
          tooltip="基础形不挂链；一阶/二阶形态挂所属链（uuid 或空串均视为未挂载）"
        >
          <Input placeholder="留空 = 未挂载进化链" allowClear />
        </Form.Item>

        <Form.Item name="render2d" label="2D 素材配置">
          <Render2dEditor />
        </Form.Item>
        <Form.Item name="render3d" label="3D 素材配置">
          <Render3dEditor />
        </Form.Item>

        <Form.Item name="asset_version" label="素材版本" tooltip="CDN 素材版本，可留空">
          <Input allowClear placeholder="如 v1" />
        </Form.Item>
        <Form.Item name="sort_order" label="排序号">
          <InputNumber min={0} className={common.fullWidth} />
        </Form.Item>
        <Form.Item
          name="enabled"
          label="启用"
          valuePropName="checked"
          tooltip="关闭后 App 不展示该种属（新形态上线先配置接线再启用）"
        >
          <Switch checkedChildren="启用" unCheckedChildren="停用" />
        </Form.Item>
      </Form>
    </Modal>
  )
}

export default SpeciesFormModal
