import React from 'react'
import { Modal, Form, Input, InputNumber, Select, Switch } from 'antd'
import type { PetQuestRow } from '../../types/pet'
import {
  PET_CONDITION_TYPE_LABELS,
  PET_CONDITION_TYPE_OPTIONS,
  PET_QUEST_TYPE_OPTIONS,
  PET_QUEST_DIFFICULTY_OPTIONS,
} from '../../constants/pet'
import { RewardsEditor } from '../../components/form/pet/editors/QuestEditors'
import { asObject } from '../../components/form/pet/editors/shared'
import common from '../../styles/common.module.css'

// ==================== 任务编辑弹窗（pet_quests，任务池） ====================
//
// 结构与 RPC 消费同源：
// - condition：{type: feed|adventure|hatch, target: int}（draw 取 target 为目标次数，
//   bump 按 type 累计进度；缺省 target=1）；
// - rewards：{gold?, points?, items:[{code,count}]}（claim 发放，与成就共用 schema）。

export interface QuestFormValues {
  code: string
  type: string
  difficulty: string
  condition: Record<string, unknown>
  rewards: Record<string, unknown>
  enabled: boolean
  sort_order: number
}

interface Props {
  open: boolean
  editing: PetQuestRow | null
  saving: boolean
  items: Array<{ item_code: string; name: string; category: string }>
  onOk: (values: QuestFormValues) => void
  onCancel: () => void
}

const QuestFormModal: React.FC<Props> = ({ open, editing, saving, items, onOk, onCancel }) => {
  const [form] = Form.useForm()

  const handleConditionChange = (key: string, v: unknown) => {
    const cur = asObject(form.getFieldValue('condition'))
    const next = { ...cur }
    if (v === null || v === undefined || v === '') delete next[key]
    else next[key] = v
    form.setFieldsValue({ condition: next })
  }

  return (
    <Modal
      title={editing ? '编辑任务' : '新增任务'}
      open={open}
      onOk={async () => {
        const values = await form.validateFields()
        onOk({
          ...values,
          condition: asObject(values.condition),
          rewards: asObject(values.rewards),
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
                  condition: asObject(editing.condition),
                  rewards: asObject(editing.rewards),
                }
              : {
                  type: 'daily',
                  difficulty: 'normal',
                  condition: {},
                  rewards: {},
                  enabled: false,
                  sort_order: 0,
                }
          )
        }
      }}
      onCancel={onCancel}
      destroyOnHidden
      width={620}
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

        <Form.Item name="condition" label="达成条件" rules={[{ required: true, message: '请配置达成条件' }]}>
          <ConditionFields
            options={PET_CONDITION_TYPE_OPTIONS}
            labels={PET_CONDITION_TYPE_LABELS}
            onTypeChange={(v) => handleConditionChange('type', v)}
            onTargetChange={(v) => handleConditionChange('target', v)}
          />
        </Form.Item>

        <Form.Item name="rewards" label="奖励包">
          <RewardsFields items={items} />
        </Form.Item>

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

// ---------- condition 结构化字段 ----------
const ConditionFields: React.FC<{
  value?: unknown
  onChange?: (v: Record<string, unknown>) => void
  options: Array<{ value: string; label: string }>
  labels: Record<string, string>
  onTypeChange: (v: string | undefined) => void
  onTargetChange: (v: number | null) => void
}> = ({ value, onChange, options, labels, onTypeChange, onTargetChange }) => {
  const obj = asObject(value)
  const extraKeysList = Object.keys(obj).filter((k) => !['type', 'target'].includes(k))
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
        <Select
          style={{ width: 200 }}
          value={typeof obj.type === 'string' ? obj.type : undefined}
          placeholder="条件类型（服务端进度键）"
          options={options}
          disabled={!onChange}
          onChange={(v) => onTypeChange(v)}
        />
        <InputNumber
          style={{ width: 140, marginLeft: 8 }}
          min={1}
          placeholder="目标次数"
          value={typeof obj.target === 'number' ? obj.target : undefined}
          disabled={!onChange}
          onChange={(v) => onTargetChange(typeof v === 'number' ? v : null)}
        />
        {typeof obj.type === 'string' && labels[obj.type] && (
          <span style={{ marginLeft: 8, fontSize: 12, color: '#999' }}>{labels[obj.type]}</span>
        )}
      </div>
      {extraKeysList.length > 0 && (
        <span style={{ fontSize: 12, color: '#999' }}>
          其余扩展键已保留：{extraKeysList.join('、')}
        </span>
      )}
    </div>
  )
}

// ---------- rewards 结构化字段（透传 RewardsEditor） ----------
const RewardsFields: React.FC<{
  value?: unknown
  onChange?: (v: Record<string, unknown>) => void
  items: Array<{ item_code: string; name: string; category: string }>
}> = ({ value, onChange, items }) => (
  <RewardsEditor value={value} onChange={onChange} items={items} />
)

export default QuestFormModal
