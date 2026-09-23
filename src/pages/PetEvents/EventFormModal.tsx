import React from 'react'
import { Form, Input, InputNumber, Modal, Switch } from 'antd'
import type { PetRandomEventRow } from '../../types/pet'
import { JsonFormItem } from '../../components/form/pet/JsonFormItem'
import { asObject } from '../../components/form/pet/editors/shared'

// ==================== 随机事件编辑弹窗（pet_random_events） ====================
//
// ⚠️ 定版状态：context 值域与 content 结构在需求文档里尚未定版，且暂无 RPC 消费
// （随机事件触发 RPC 属 P2 未启动项）。故两列均按「文本 / JSON 原样存」录入，
// 不发明枚举、不做结构校验——避免后台先把口径写死，服务端接入时返工。

const CONTENT_PLACEHOLDER = `{
  "text": "散步时我们发现了一枚发光的石头",
  "choices": [
    { "label": "捡起来", "rewards": { "gold": 5 } },
    { "label": "留给别人", "rewards": { "points": 2 } }
  ]
}`

export interface EventFormValues {
  code: string
  context: string
  weight: number
  content: Record<string, unknown>
  enabled: boolean
}

interface Props {
  open: boolean
  editing: PetRandomEventRow | null
  saving: boolean
  onOk: (values: EventFormValues) => void
  onCancel: () => void
}

const EventFormModal: React.FC<Props> = ({ open, editing, saving, onOk, onCancel }) => {
  const [form] = Form.useForm()

  return (
    <Modal
      title={editing ? '编辑随机事件' : '新增随机事件'}
      open={open}
      onOk={async () => {
        const values = await form.validateFields()
        onOk({ ...values, content: asObject(values.content) })
      }}
      confirmLoading={saving}
      afterOpenChange={(o) => {
        if (o) {
          form.resetFields()
          form.setFieldsValue(
            editing
              ? { ...editing, content: asObject(editing.content) }
              : { weight: 100, content: {}, enabled: false }
          )
        }
      }}
      onCancel={onCancel}
      destroyOnHidden
      width={680}
    >
      <Form form={form} layout="vertical" preserve={false}>
        <Form.Item
          name="code"
          label="事件编码"
          tooltip="如 ev_walk_stone；服务端接入后按此定位事件"
          rules={[{ required: true, message: '请输入事件编码' }]}
        >
          <Input placeholder="如 ev_walk_stone" />
        </Form.Item>
        <Form.Item
          name="context"
          label="触发上下文"
          tooltip="值域未定版（如 历险途中 / 喂养后）。请填小写下划线英文码，与服务端接入时保持一致"
          rules={[{ required: true, message: '请输入触发上下文' }]}
        >
          <Input placeholder="如 adventure / feed" />
        </Form.Item>
        <Form.Item
          name="weight"
          label="掷取权重"
          tooltip="同一上下文内相对权重，非百分比；缺省 100"
          rules={[{ required: true, message: '请输入权重' }]}
        >
          <InputNumber min={0} style={{ width: 200 }} />
        </Form.Item>
        <JsonFormItem
          name="content"
          label="事件内容"
          rows={12}
          tooltip="文案 + 2~3 个选项 + 各选项奖惩包；结构未定版，按 JSON 原样存库"
          placeholder={CONTENT_PLACEHOLDER}
        />
        <Form.Item
          name="enabled"
          label="启用"
          valuePropName="checked"
          tooltip="随机事件 RPC 尚未实装，启用仅代表配置就绪"
        >
          <Switch checkedChildren="启用" unCheckedChildren="停用" />
        </Form.Item>
      </Form>
    </Modal>
  )
}

export default EventFormModal
