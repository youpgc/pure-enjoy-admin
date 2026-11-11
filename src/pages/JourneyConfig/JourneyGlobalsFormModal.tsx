import React from 'react'
import { Form, Input, InputNumber, Modal } from 'antd'
import common from '../../styles/common.module.css'
import type { JourneyGlobalsGroup } from './journeyGlobalsGroups'

interface JourneyGlobalsFormModalProps {
  open: boolean
  group: JourneyGlobalsGroup | null
  initialValues: Record<string, any>
  saving: boolean
  /// 校验通过后回传表单值；表单只注册本组字段，天然只提交本组
  onOk: (values: Record<string, any>) => void
  onCancel: () => void
}

/// 单组参数编辑弹窗：每次打开重新挂载表单并回显本组当前值。
const JourneyGlobalsFormModal: React.FC<JourneyGlobalsFormModalProps> = ({
  open,
  group,
  initialValues,
  saving,
  onOk,
  onCancel,
}) => {
  const [form] = Form.useForm()

  return (
    <Modal
      title={`编辑 · ${group?.title ?? ''}`}
      open={open}
      onOk={async () => {
        let values: Record<string, any>
        try {
          values = await form.validateFields()
        } catch {
          return
        }
        onOk(values)
      }}
      confirmLoading={saving}
      onCancel={onCancel}
      destroyOnHidden
      width={520}
    >
      <Form
        key={group?.key ?? 'none'}
        form={form}
        layout="vertical"
        preserve={false}
        initialValues={initialValues}
      >
        {(group?.fields ?? []).map(({ field }) => (
          <Form.Item
            key={field.name}
            name={field.name}
            label={field.label}
            rules={field.required ? [{ required: true, message: `请填写${field.label}` }] : undefined}
          >
            {field.type === 'number' ? (
              <InputNumber
                className={common.fullWidth}
                min={field.min}
                max={field.max}
                step={field.step}
                placeholder={field.placeholder}
              />
            ) : (
              <Input placeholder={field.placeholder} />
            )}
          </Form.Item>
        ))}
      </Form>
    </Modal>
  )
}

export default JourneyGlobalsFormModal
