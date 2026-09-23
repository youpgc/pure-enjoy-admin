import React from 'react'
import { Modal, Form, Input, InputNumber, Switch } from 'antd'
import type { PetSceneRow } from '../../types/pet'
import common from '../../styles/common.module.css'

// ==================== 场景编辑弹窗（pet_scenes） ====================

export interface SceneFormValues {
  scene_code: string
  name: string
  asset_ref?: string | null
  is_default: boolean
  price_coin?: number | null
  on_shelf: boolean
}

interface Props {
  open: boolean
  editing: PetSceneRow | null
  saving: boolean
  onOk: (values: SceneFormValues) => void
  onCancel: () => void
}

const SceneFormModal: React.FC<Props> = ({ open, editing, saving, onOk, onCancel }) => {
  const [form] = Form.useForm()

  return (
    <Modal
      title={editing ? '编辑场景' : '新增场景'}
      open={open}
      onOk={async () => {
        const values = await form.validateFields()
        onOk(values as SceneFormValues)
      }}
      confirmLoading={saving}
      afterOpenChange={(o) => {
        if (o) {
          form.resetFields()
          form.setFieldsValue(
            editing ?? { is_default: false, on_shelf: false, price_coin: null }
          )
        }
      }}
      onCancel={onCancel}
      destroyOnHidden
      width={560}
    >
      <Form form={form} layout="vertical" preserve={false}>
        <Form.Item
          name="scene_code"
          label="场景编码"
          tooltip="命名即契约：如 scene_moonlit_garden；道具管理的 bg_scene_id 按此值关联"
          rules={[{ required: true, message: '请输入场景编码' }]}
        >
          <Input placeholder="如 scene_moonlit_garden" />
        </Form.Item>
        <Form.Item name="name" label="场景名称" rules={[{ required: true, message: '请输入名称' }]}>
          <Input placeholder="如 月夜云端庭院" />
        </Form.Item>
        <Form.Item
          name="asset_ref"
          label="素材引用"
          tooltip="一期 2D：背景图层资源标识；留空表示走客户端内置占位"
        >
          <Input placeholder="如 assets/pets/bg/moonlit_garden" className={common.fullWidth} />
        </Form.Item>
        <Form.Item
          name="price_coin"
          label="定价（金币）"
          tooltip="留空 = 未定价（仅登记场景，不可购买）；0 = 免费主题"
        >
          <InputNumber min={0} className={common.fullWidth} placeholder="留空表示未定价" />
        </Form.Item>
        <Form.Item
          name="is_default"
          label="默认场景"
          valuePropName="checked"
          tooltip="用户未购买任何主题时使用的背景"
        >
          <Switch checkedChildren="是" unCheckedChildren="否" />
        </Form.Item>
        <Form.Item
          name="on_shelf"
          label="上架"
          valuePropName="checked"
          tooltip="与道具侧 bg_scene_id 配置共同决定 App 是否展示"
        >
          <Switch checkedChildren="已上架" unCheckedChildren="未上架" />
        </Form.Item>
      </Form>
    </Modal>
  )
}

export default SceneFormModal
