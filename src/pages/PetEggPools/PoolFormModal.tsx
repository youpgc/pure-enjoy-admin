import React from 'react'
import { Modal, Form, Input, InputNumber, Switch, message } from 'antd'
import type { PetEggPoolRow } from '../../types/pet'
import { JsonFormItem } from '../../components/form/pet/JsonFormItem'
import { parseJsonText, stringifyJson } from '../../utils/petJson'

// ==================== 蛋池编辑弹窗（pet_egg_pools，概率配置） ====================

export interface PoolFormValues {
  pool_code: string
  config_version: number
  weights: string
  published: boolean
}

interface Props {
  open: boolean
  editing: PetEggPoolRow | null
  saving: boolean
  onOk: (values: PoolFormValues) => void
  onCancel: () => void
}

const PoolFormModal: React.FC<Props> = ({ open, editing, saving, onOk, onCancel }) => {
  const [form] = Form.useForm()

  const initialValues = (): Record<string, unknown> => {
    if (editing) {
      return {
        pool_code: editing.pool_code,
        config_version: editing.config_version,
        weights: stringifyJson(editing.weights),
        published: editing.published,
      }
    }
    return { config_version: 1, weights: '{}', published: false }
  }

  const handleOk = async () => {
    const values = await form.validateFields()
    const weights = parseJsonText(values.weights)
    if (!weights.ok) return void message.error(`概率权重：${weights.error}`)
    onOk({ ...values, weights: weights.value as unknown as string })
  }

  return (
    <Modal
      title={editing ? '编辑蛋池' : '新增蛋池'}
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
          name="pool_code"
          label="池编码"
          tooltip="initial_ssr（初始蛋）/ egg_n / egg_r / egg_sr / egg_ssr 等；App 公示与判定同源键"
          rules={[{ required: true, message: '请输入池编码' }]}
        >
          <Input placeholder="如 egg_n" disabled={!!editing} />
        </Form.Item>
        <Form.Item
          name="config_version"
          label="配置版本"
          tooltip="概率变更必须递增版本：每次孵化审计记录判定所用版本，公示与判定同源"
          rules={[{ required: true, message: '请输入配置版本' }]}
        >
          <InputNumber min={1} style={{ width: '100%' }} />
        </Form.Item>
        <JsonFormItem
          name="weights"
          label="概率权重（jsonb）"
          tooltip="体系权重 / 评级概率 / 父母加成 / 性别比，结构与 App 公示页共用"
          placeholder={'{\n  "families": {"cat": 40, "dog": 30, "rabbit": 20, "mouse": 10},\n  "gender": {"male": 50, "female": 50}\n}'}
          rows={8}
        />
        <Form.Item
          name="published"
          label="已发布"
          valuePropName="checked"
          tooltip="仅已发布版本对 App 公示可见；草稿态可反复编辑"
        >
          <Switch checkedChildren="已发布" unCheckedChildren="草稿" />
        </Form.Item>
      </Form>
    </Modal>
  )
}

export default PoolFormModal
