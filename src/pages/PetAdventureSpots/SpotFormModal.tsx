import React from 'react'
import { Modal, Form, Input, InputNumber, Switch, message } from 'antd'
import type { PetAdventureSpotRow } from '../../types/pet'
import { JsonFormItem } from '../../components/form/pet/JsonFormItem'
import { parseJsonText, stringifyJson } from '../../utils/petJson'
import common from '../../styles/common.module.css'

// ==================== 历险地编辑弹窗（pet_adventure_spots） ====================

export interface SpotFormValues {
  code: string
  name: string
  unlock_conditions: string
  result_weights: string
  drop_table: string
  rescue_params: string
  enabled: boolean
  sort_order: number
}

interface Props {
  open: boolean
  editing: PetAdventureSpotRow | null
  saving: boolean
  onOk: (values: SpotFormValues) => void
  onCancel: () => void
}

const SpotFormModal: React.FC<Props> = ({ open, editing, saving, onOk, onCancel }) => {
  const [form] = Form.useForm()

  const initialValues = (): Record<string, unknown> => {
    if (editing) {
      return {
        ...editing,
        unlock_conditions: stringifyJson(editing.unlock_conditions, '[]'),
        result_weights: stringifyJson(editing.result_weights),
        drop_table: stringifyJson(editing.drop_table),
        rescue_params: stringifyJson(editing.rescue_params),
      }
    }
    return {
      unlock_conditions: '[]',
      result_weights: '{}',
      drop_table: '{}',
      rescue_params: '{}',
      enabled: false,
      sort_order: 0,
    }
  }

  const handleOk = async () => {
    const values = await form.validateFields()
    const unlock = parseJsonText(values.unlock_conditions)
    if (!unlock.ok) return void message.error(`解锁条件：${unlock.error}`)
    const weights = parseJsonText(values.result_weights)
    if (!weights.ok) return void message.error(`结果权重：${weights.error}`)
    const drops = parseJsonText(values.drop_table)
    if (!drops.ok) return void message.error(`掉落包：${drops.error}`)
    const rescue = parseJsonText(values.rescue_params)
    if (!rescue.ok) return void message.error(`救助参数：${rescue.error}`)
    onOk({
      ...values,
      unlock_conditions: unlock.value as unknown as string,
      result_weights: weights.value as unknown as string,
      drop_table: drops.value as unknown as string,
      rescue_params: rescue.value as unknown as string,
    })
  }

  return (
    <Modal
      title={editing ? '编辑历险地' : '新增历险地'}
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
      width={680}
    >
      <Form form={form} layout="vertical" preserve={false}>
        <Form.Item name="code" label="地点编码" rules={[{ required: true, message: '请输入地点编码' }]}>
          <Input placeholder="如 spot_garden" />
        </Form.Item>
        <Form.Item name="name" label="名称" rules={[{ required: true, message: '请输入名称' }]}>
          <Input placeholder="如 云端花园" />
        </Form.Item>
        <JsonFormItem
          name="unlock_conditions"
          label="解锁条件（jsonb 数组）"
          tooltip="历险按等级/条件解锁（后台配置），不使用道具解锁"
          placeholder='[{"type":"level","value":3}]'
          rows={3}
        />
        <JsonFormItem
          name="result_weights"
          label="结果权重（jsonb）"
          tooltip="play 游玩 / danger 遇险 / help 帮助 / memory 纪念 四类权重，服务端 RPC 按此判定并写审计"
          placeholder='{"play":60,"danger":20,"help":10,"memory":10}'
          rows={4}
        />
        <JsonFormItem
          name="drop_table"
          label="掉落包（jsonb）"
          tooltip="各结果对应的掉落配置（金币/经验/道具）"
          placeholder='{"play":{"gold":[5,15]},"danger":{"consolation_gold":2}}'
          rows={5}
        />
        <JsonFormItem
          name="rescue_params"
          label="救助参数（jsonb）"
          tooltip="自救窗口时长等；遇险后先自救，超时 NPC 兜底"
          placeholder='{"rescue_window_minutes":120,"npc_consolation_gold":1}'
          rows={3}
        />
        <Form.Item name="sort_order" label="排序号">
          <InputNumber min={0} className={common.fullWidth} />
        </Form.Item>
        <Form.Item name="enabled" label="启用" valuePropName="checked" tooltip="关闭后 App 历险地列表不可见">
          <Switch checkedChildren="启用" unCheckedChildren="停用" />
        </Form.Item>
      </Form>
    </Modal>
  )
}

export default SpotFormModal
