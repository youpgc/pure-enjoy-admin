import React from 'react'
import { Button, Card, Form, Input, InputNumber, Modal, Select, Space, Switch } from 'antd'
import { MinusCircleOutlined, PlusOutlined } from '@ant-design/icons'
import type { PetRandomEventRow } from '../../types/pet'
import {
  PET_EVENT_CONTEXT_OPTIONS,
  PET_EVENT_REWARD_FIELDS,
} from '../../constants/pet'

// ==================== 随机事件编辑弹窗（pet_random_events） ====================
//
// 2026-10-08 随机事件实装（feature_pet_random_events_20261008.sql）后结构化定版：
// - context 值域 = 服务端 rpc_pet_event_roll 代码枚举（home_open / action_done）；
// - content 结构 = {title, text, options:[{label, rewards}]}，2~3 个选项；
// - rewards 数值键零值不入库；item_code 非空才带 item_count。
// 表单结构与服务端 RPC 消费同源，改口径须两端同步。

export interface EventFormValues {
  code: string
  context: string
  weight: number
  content: Record<string, unknown>
  enabled: boolean
}

interface OptionFormValue {
  label?: string
  rewards?: Record<string, unknown>
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

  // content(jsonb) → 表单结构（缺键兜零值，旧手填数据容忍解析）
  const contentToForm = (raw: unknown) => {
    const c = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
    const optionsRaw = Array.isArray(c.options) ? c.options : []
    const options: OptionFormValue[] = optionsRaw.map((o) => {
      const opt = (o && typeof o === 'object' ? o : {}) as Record<string, unknown>
      const rewardsRaw =
        opt.rewards && typeof opt.rewards === 'object'
          ? (opt.rewards as Record<string, unknown>)
          : {}
      const rewards: Record<string, number | string | undefined> = {}
      for (const f of PET_EVENT_REWARD_FIELDS) {
        const v = rewardsRaw[f.key]
        if (typeof v === 'number') rewards[f.key] = v
      }
      if (typeof rewardsRaw.item_code === 'string' && rewardsRaw.item_code) {
        rewards.item_code = rewardsRaw.item_code
        const n = rewardsRaw.item_count
        rewards.item_count = typeof n === 'number' && n > 0 ? n : 1
      }
      return { label: typeof opt.label === 'string' ? opt.label : '', rewards }
    })
    return {
      title: typeof c.title === 'string' ? c.title : '',
      text: typeof c.text === 'string' ? c.text : '',
      options: options.length >= 2 ? options : [...options, {}, {}].slice(0, 2),
    }
  }

  // 表单结构 → content(jsonb)；数值键零值剔除，item_code 空剔除
  const formToContent = (vals: {
    title: string
    text: string
    options: OptionFormValue[]
  }) => ({
    title: (vals.title || '').trim(),
    text: (vals.text || '').trim(),
    options: (vals.options || []).map((o) => {
      const rewards: Record<string, unknown> = {}
      for (const f of PET_EVENT_REWARD_FIELDS) {
        const v = o.rewards?.[f.key]
        if (typeof v === 'number' && v !== 0) rewards[f.key] = v
      }
      const itemCode = o.rewards?.item_code
      if (typeof itemCode === 'string' && itemCode.trim()) {
        rewards.item_code = itemCode.trim()
        rewards.item_count =
          typeof o.rewards?.item_count === 'number' && (o.rewards.item_count as number) > 0
            ? o.rewards.item_count
            : 1
      }
      return { label: (o.label || '').trim(), rewards }
    }),
  })

  return (
    <Modal
      title={editing ? '编辑随机事件' : '新增随机事件'}
      open={open}
      onOk={async () => {
        const values = await form.validateFields()
        onOk({ ...values, content: formToContent(values.content) })
      }}
      confirmLoading={saving}
      afterOpenChange={(o) => {
        if (o) {
          form.resetFields()
          form.setFieldsValue(
            editing
              ? { ...editing, content: contentToForm(editing.content) }
              : {
                  weight: 100,
                  enabled: false,
                  content: { title: '', text: '', options: [{}, {}] },
                }
          )
        }
      }}
      onCancel={onCancel}
      destroyOnHidden
      width={760}
    >
      <Form form={form} layout="vertical" preserve={false}>
        <Form.Item
          name="code"
          label="事件编码"
          tooltip="唯一键；建议 ev_<context>_<语义>，如 ev_open_yarn"
          rules={[{ required: true, message: '请输入事件编码' }]}
        >
          <Input placeholder="如 ev_open_yarn" maxLength={40} />
        </Form.Item>
        <Space size="large" style={{ display: 'flex' }} align="start">
          <Form.Item
            name="context"
            label="触发上下文"
            tooltip="与服务端触发时机一一对应：打开宠物页 / 照料动作（喂养·抚摸·道具喂养）成功后"
            rules={[{ required: true, message: '请选择触发上下文' }]}
            style={{ minWidth: 220 }}
          >
            <Select options={PET_EVENT_CONTEXT_OPTIONS} placeholder="选择触发时机" />
          </Form.Item>
          <Form.Item
            name="weight"
            label="掷取权重"
            tooltip="同一上下文内相对权重，非百分比；缺省 100"
            rules={[{ required: true, message: '请输入权重' }]}
          >
            <InputNumber min={0} style={{ width: 160 }} />
          </Form.Item>
          <Form.Item
            name="enabled"
            label="启用"
            valuePropName="checked"
            tooltip="停用事件不参与掷取"
          >
            <Switch checkedChildren="启用" unCheckedChildren="停用" />
          </Form.Item>
        </Space>

        {/* ---- content 结构化编辑 ---- */}
        <Form.Item
          name={['content', 'title']}
          label="标题"
          rules={[
            { required: true, message: '请输入标题' },
            { max: 20, message: '标题不超过 20 字' },
          ]}
        >
          <Input placeholder="如 滚过来的毛线球" maxLength={20} showCount />
        </Form.Item>
        <Form.Item
          name={['content', 'text']}
          label="正文"
          rules={[
            { required: true, message: '请输入正文' },
            { max: 120, message: '正文不超过 120 字' },
          ]}
        >
          <Input.TextArea
            rows={3}
            placeholder="一段轻量插叙文案，结尾留向选项"
            maxLength={120}
            showCount
          />
        </Form.Item>

        <Form.List
          name={['content', 'options']}
          rules={[
            {
              validator: async (_, v) => {
                if (!v || v.length < 2) throw new Error('至少 2 个选项')
                if (v.length > 3) throw new Error('最多 3 个选项')
              },
            },
          ]}
        >
          {(fields, { add, remove }, { errors }) => (
            <>
              {fields.map(({ key, name, ...restField }) => (
                <Card
                  key={key}
                  size="small"
                  style={{ marginBottom: 8 }}
                  title={`选项 ${name + 1}`}
                  extra={
                    fields.length > 2 ? (
                      <MinusCircleOutlined onClick={() => remove(name)} />
                    ) : null
                  }
                >
                  <Form.Item
                    {...restField}
                    name={[name, 'label']}
                    label="选项文案"
                    rules={[
                      { required: true, message: '请输入选项文案' },
                      { max: 12, message: '选项不超过 12 字' },
                    ]}
                    style={{ marginBottom: 8 }}
                  >
                    <Input placeholder="如 玩一会儿" maxLength={12} />
                  </Form.Item>
                  <Space size="small" wrap style={{ display: 'flex' }}>
                    {PET_EVENT_REWARD_FIELDS.map((f) => (
                      <Form.Item
                        key={f.key}
                        {...restField}
                        name={[name, 'rewards', f.key]}
                        label={f.label}
                        style={{ marginBottom: 8 }}
                      >
                        <InputNumber
                          min={f.min}
                          max={999}
                          step={1}
                          placeholder="0"
                          style={{ width: 90 }}
                        />
                      </Form.Item>
                    ))}
                    <Form.Item
                      {...restField}
                      name={[name, 'rewards', 'item_code']}
                      label="道具编码"
                      tooltip="选填；对应 pet_items.item_code，如 snack_fish"
                      style={{ marginBottom: 8 }}
                    >
                      <Input placeholder="选填" style={{ width: 130 }} maxLength={40} />
                    </Form.Item>
                    <Form.Item noStyle shouldUpdate={(p, c) => p !== c} style={{ marginBottom: 8 }}>
                      {({ getFieldValue }) =>
                        getFieldValue(['content', 'options', name, 'rewards', 'item_code']) ? (
                          <Form.Item
                            {...restField}
                            name={[name, 'rewards', 'item_count']}
                            label="道具数量"
                            style={{ marginBottom: 8 }}
                          >
                            <InputNumber min={1} max={99} style={{ width: 80 }} />
                          </Form.Item>
                        ) : null
                      }
                    </Form.Item>
                  </Space>
                </Card>
              ))}
              <Button
                type="dashed"
                onClick={() => add()}
                block
                icon={<PlusOutlined />}
                disabled={fields.length >= 3}
              >
                添加选项（最多 3 个）
              </Button>
              <Form.ErrorList errors={errors} />
            </>
          )}
        </Form.List>
      </Form>
    </Modal>
  )
}

export default EventFormModal
