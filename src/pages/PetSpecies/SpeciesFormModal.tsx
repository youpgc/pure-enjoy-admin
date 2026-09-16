import React from 'react'
import { Modal, Form, Input, InputNumber, Select, Switch, message } from 'antd'
import type { PetSpeciesRow } from '../../types/pet'
import { PET_FAMILY_OPTIONS } from '../../constants/pet'
import { JsonFormItem } from '../../components/form/pet/JsonFormItem'
import { parseJsonText, stringifyJson } from '../../utils/petJson'
import common from '../../styles/common.module.css'

// ==================== 种属/形态编辑弹窗（pet_species） ====================

export interface SpeciesFormValues {
  species_code: string
  family: string
  name_cn: string
  rarity_code: string
  base_attributes: string
  evolution_chain_id: string | null
  render2d: string
  render3d: string
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

  const initialValues = (): Record<string, unknown> => {
    if (editing) {
      return {
        ...editing,
        base_attributes: stringifyJson(editing.base_attributes),
        render2d: stringifyJson(editing.render2d),
        render3d: stringifyJson(editing.render3d),
      }
    }
    return {
      base_attributes: '{}',
      render2d: '{}',
      render3d: '{}',
      enabled: false,
      sort_order: 0,
    }
  }

  const handleOk = async () => {
    const values = await form.validateFields()
    // jsonb 字段保存前统一 parse 校验（失败提示并停留弹窗，open 由父组件控制不会关闭）
    const base = parseJsonText(values.base_attributes)
    if (!base.ok) return void message.error(`初始四维基准：${base.error}`)
    const r2d = parseJsonText(values.render2d)
    if (!r2d.ok) return void message.error(`2D 素材配置：${r2d.error}`)
    const r3d = parseJsonText(values.render3d)
    if (!r3d.ok) return void message.error(`3D 素材配置：${r3d.error}`)
    onOk({
      ...values,
      base_attributes: base.value as unknown as string,
      render2d: r2d.value as unknown as string,
      render3d: r3d.value as unknown as string,
    })
  }

  return (
    <Modal
      title={editing ? '编辑种属' : '新增种属'}
      open={open}
      onOk={handleOk}
      confirmLoading={saving}
      afterOpenChange={(o) => {
        if (o) {
          form.resetFields()
          form.setFieldsValue(initialValues())
        }
      }}
      onCancel={onCancel}
      destroyOnHidden
      width={640}
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
        <JsonFormItem
          name="base_attributes"
          label="初始四维基准（jsonb）"
          placeholder='{"hunger":80,"mood":80,"exp":0,"intimacy":0}'
          rows={3}
        />
        <Form.Item
          name="evolution_chain_id"
          label="进化链 ID"
          tooltip="P2 进化实装前可留空；uuid 或空串均视为未挂载"
        >
          <Input placeholder="留空 = 未挂载进化链" allowClear />
        </Form.Item>
        <JsonFormItem
          name="render2d"
          label="2D 素材配置（jsonb）"
          placeholder='{"code":"cat_n1_2d"}'
          rows={3}
        />
        <JsonFormItem
          name="render3d"
          label="3D 素材配置（jsonb）"
          tooltip="code/variants/相机预设；App 按此引用，素材缺失回退默认表现"
          placeholder='{"code":"cat_n1","variants":["default"],"enabled":true}'
          rows={4}
        />
        <Form.Item name="asset_version" label="素材版本" tooltip="CDN 素材版本，可留空">
          <Input allowClear placeholder="如 v1" />
        </Form.Item>
        <Form.Item name="sort_order" label="排序号">
          <InputNumber min={0} className={common.fullWidth} />
        </Form.Item>
        <Form.Item
          name="enabled"
          label="启用（灰度）"
          valuePropName="checked"
          tooltip="预埋期保持停用；素材到位并配置接线后再启用，App 端仅展示启用种属"
        >
          <Switch checkedChildren="启用" unCheckedChildren="停用" />
        </Form.Item>
      </Form>
    </Modal>
  )
}

export default SpeciesFormModal
