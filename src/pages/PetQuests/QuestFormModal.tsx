import React from 'react'
import { Modal, Form, Input, InputNumber, Select, Switch, message } from 'antd'
import type { PetQuestRow } from '../../types/pet'
import {
  PET_QUEST_TYPE_OPTIONS,
  PET_QUEST_DIFFICULTY_OPTIONS,
} from '../../constants/pet'
import { JsonFormItem } from '../../components/form/pet/JsonFormItem'
import { parseJsonText, stringifyJson } from '../../utils/petJson'
import common from '../../styles/common.module.css'

// ==================== 任务编辑弹窗（pet_quests，任务池） ====================

export interface QuestFormValues {
  code: string
  type: string
  difficulty: string
  condition: string
  rewards: string
  enabled: boolean
  sort_order: number
}

interface Props {
  open: boolean
  editing: PetQuestRow | null
  saving: boolean
  onOk: (values: QuestFormValues) => void
  onCancel: () => void
}

const QuestFormModal: React.FC<Props> = ({ open, editing, saving, onOk, onCancel }) => {
  const [form] = Form.useForm()

  const initialValues = (): Record<string, unknown> => {
    if (editing) {
      return {
        ...editing,
        condition: stringifyJson(editing.condition),
        rewards: stringifyJson(editing.rewards),
      }
    }
    return { type: 'daily', difficulty: 'normal', condition: '{}', rewards: '{}', enabled: false, sort_order: 0 }
  }

  const handleOk = async () => {
    const values = await form.validateFields()
    const condition = parseJsonText(values.condition)
    if (!condition.ok) return void message.error(`达成条件：${condition.error}`)
    const rewards = parseJsonText(values.rewards)
    if (!rewards.ok) return void message.error(`奖励包：${rewards.error}`)
    onOk({
      ...values,
      condition: condition.value as unknown as string,
      rewards: rewards.value as unknown as string,
    })
  }

  return (
    <Modal
      title={editing ? '编辑任务' : '新增任务'}
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
      width={600}
    >
      <Form form={form} layout="vertical" preserve={false}>
        <Form.Item name="code" label="任务编码" rules={[{ required: true, message: '请输入任务编码' }]}>
          <Input placeholder="如 daily_feed_3" />
        </Form.Item>
        <Form.Item name="type" label="类型" rules={[{ required: true, message: '请选择类型' }]}>
          <Select options={PET_QUEST_TYPE_OPTIONS} />
        </Form.Item>
        <Form.Item name="difficulty" label="难度" rules={[{ required: true, message: '请选择难度' }]}>
          <Select options={PET_QUEST_DIFFICULTY_OPTIONS} />
        </Form.Item>
        <JsonFormItem
          name="condition"
          label="达成条件（jsonb）"
          tooltip="条件类型 + 阈值，App/RPC 按此判定进度"
          placeholder='{"type":"feed_count","value":3}'
          rows={3}
        />
        <JsonFormItem
          name="rewards"
          label="奖励包（jsonb）"
          tooltip="金币/经验/道具/亲密度组合包，与成就奖励共用 schema"
          placeholder='{"gold":20,"exp":10}'
          rows={4}
        />
        <Form.Item name="sort_order" label="排序号">
          <InputNumber min={0} className={common.fullWidth} />
        </Form.Item>
        <Form.Item name="enabled" label="启用" valuePropName="checked" tooltip="关闭后不会被抽入每日任务">
          <Switch checkedChildren="启用" unCheckedChildren="停用" />
        </Form.Item>
      </Form>
    </Modal>
  )
}

export default QuestFormModal
