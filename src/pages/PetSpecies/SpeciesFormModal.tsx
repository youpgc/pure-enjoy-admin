import React from 'react'
import { Modal, Form, Input, InputNumber, Select, Switch } from 'antd'
import type { PetSpeciesRow } from '../../types/pet'
import { PET_FAMILY_OPTIONS } from '../../constants/pet'
import { Render2dEditor, Render3dEditor } from '../../components/form/pet/editors/RenderEditors'
import {
  SpeciesAttrEditor,
  HatchConfigEditor,
  RefineConfigEditor,
} from '../../components/form/pet/editors/AttributeEditors'
import { asObject } from '../../components/form/pet/editors/shared'

// ==================== 种属/形态编辑弹窗（pet_species） ====================
//
// jsonb 结构化（与 RPC 消费同源，2026-09-17 属性系统重构）：
// - base_attributes：{ total, variance, base:{四维} }——孵化 roll 消费结构
//   （此前误按旧展示层扁平结构 {hunger,mood,intimacy,exp} 编辑，已修正）；
// - hatch_config：{ inherit_ratio, potential_min, potential_max }；
// - refine_config：{ base, potential_bonus:[{min,max,bonus}] }；
// - render2d {code} / render3d {code,enabled,variants}。

export interface SpeciesFormValues {
  species_code: string
  family: string
  name_cn: string
  rarity_code: string
  base_attributes: Record<string, unknown>
  hatch_config: Record<string, unknown>
  refine_config: Record<string, unknown>
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
          hatch_config: asObject(values.hatch_config),
          refine_config: asObject(values.refine_config),
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
                  hatch_config: asObject(editing.hatch_config),
                  refine_config: asObject(editing.refine_config),
                  render2d: asObject(editing.render2d),
                  render3d: asObject(editing.render3d),
                }
              : {
                  base_attributes: {},
                  hatch_config: { inherit_ratio: 0.5, potential_min: 60, potential_max: 100 },
                  refine_config: {},
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
      width={680}
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

        <Form.Item
          name="base_attributes"
          label="初始属性（总点数 / 浮动 / 四维基准）"
          tooltip="孵化 roll：每维 [基准±浮动] 随机，差值随机分摊守恒到总点数；总点数 0 = 该种属不启用属性"
        >
          <SpeciesAttrEditor />
        </Form.Item>

        <Form.Item
          name="hatch_config"
          label="孵化配置（繁育继承比 / 潜力区间）"
          tooltip="潜力为隐藏属性不下发；繁育蛋按继承比混合父母均值与随机 roll"
        >
          <HatchConfigEditor />
        </Form.Item>

        <Form.Item
          name="refine_config"
          label="洗练配置（每级洗练点 / 潜力加成档）"
          tooltip="升级发放：种属 base + 评级 refine_base + 潜力加成，三因子叠加"
        >
          <RefineConfigEditor />
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
          <InputNumber min={0} style={{ width: '100%' }} />
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
