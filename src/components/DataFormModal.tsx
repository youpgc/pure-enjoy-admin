import React, { useState } from 'react'
import {
  Modal,
  Form,
  Input,
  InputNumber,
  Select,
  DatePicker,
  Switch,
} from 'antd'
import type { Rule } from 'antd/es/form'
import dayjs from 'dayjs'
import type { DataFormModalProps, FormField } from './dataFormModal/types'
import EmojiSelect from './dataFormModal/EmojiSelect'
import TagsInput from './dataFormModal/TagsInput'

// 保留对外类型导出（拆分前由本文件直接 export，避免破坏任何潜在调用方）
export type { FieldType, FormField, DataFormModalProps } from './dataFormModal/types'

const { TextArea } = Input
const { RangePicker } = DatePicker

const DataFormModal: React.FC<DataFormModalProps> = ({
  open,
  title,
  mode,
  fields,
  initialValues,
  onOk,
  onCancel,
  confirmLoading = false,
  width = 600,
  destroyOnHidden = true,
  layout = 'vertical',
  labelCol,
  wrapperCol,
}) => {
  const [form] = Form.useForm()
  const [submitting, setSubmitting] = useState(false)

  // 当打开弹窗或初始值变化时，重置表单
  React.useEffect(() => {
    if (open) {
      if (initialValues) {
        // 处理日期类型的初始值
        const processedValues: Record<string, unknown> = {}
        fields.forEach((field) => {
          const val = initialValues[field.name]
          if (val !== undefined && val !== null) {
            if (field.type === 'date' && typeof val === 'string') {
              processedValues[field.name] = dayjs(val)
            } else if (field.type === 'dateRange' && Array.isArray(val)) {
              processedValues[field.name] = val.map((v) => (typeof v === 'string' ? dayjs(v) : v))
            } else {
              processedValues[field.name] = val
            }
          } else if (field.defaultValue !== undefined) {
            processedValues[field.name] = field.defaultValue
          }
        })
        form.setFieldsValue(processedValues)
      } else {
        // 设置默认值
        const defaultValues: Record<string, unknown> = {}
        fields.forEach((field) => {
          if (field.defaultValue !== undefined) {
            defaultValues[field.name] = field.defaultValue
          }
        })
        form.setFieldsValue(defaultValues)
      }
    }
  }, [open, initialValues, fields, form])

  // 关闭时重置
  const handleCancel = () => {
    form.resetFields()
    onCancel()
  }

  // 提交
  const handleOk = async () => {
    if (submitting) return
    try {
      setSubmitting(true)
      const values = await form.validateFields()
      // 处理日期类型的值
      const processedValues: Record<string, unknown> = {}
      fields.forEach((field) => {
        const val = values[field.name]
        if (val !== undefined && val !== null) {
          if (field.type === 'date' && dayjs.isDayjs(val)) {
            processedValues[field.name] = val.format('YYYY-MM-DD')
          } else if (field.type === 'dateRange' && Array.isArray(val)) {
            processedValues[field.name] = val.map((v: dayjs.Dayjs) => v.format('YYYY-MM-DD'))
          } else {
            processedValues[field.name] = val
          }
        }
      })
      await onOk(processedValues)
      form.resetFields()
    } catch (error) {
      console.error('Form validation failed:', error)
    } finally {
      setSubmitting(false)
    }
  }

  // 渲染表单字段
  const renderField = (field: FormField) => {
    // 自定义渲染
    if (field.render) {
      return field.render(form, field)
    }

    switch (field.type) {
      case 'text':
        return (
          <Input
            placeholder={field.placeholder || `请输入${field.label}`}
            disabled={field.disabled}
          />
        )

      case 'number':
        return (
          <InputNumber
            placeholder={field.placeholder || `请输入${field.label}`}
            min={field.min}
            max={field.max}
            precision={field.precision ?? 2}
            disabled={field.disabled}
            style={{ width: '100%' }}
          />
        )

      case 'textarea':
        return (
          <TextArea
            placeholder={field.placeholder || `请输入${field.label}`}
            rows={field.rows ?? 4}
            disabled={field.disabled}
            showCount
          />
        )

      case 'select':
        return (
          <Select
            placeholder={field.placeholder || `请选择${field.label}`}
            options={field.options}
            disabled={field.disabled}
            allowClear
          />
        )

      case 'date':
        return (
          <DatePicker
            placeholder={field.placeholder || `请选择${field.label}`}
            disabled={field.disabled}
            style={{ width: '100%' }}
            format="YYYY-MM-DD"
          />
        )

      case 'dateRange':
        return (
          <RangePicker
            placeholder={field.placeholder ? [field.placeholder, field.placeholder] : ['开始日期', '结束日期']}
            disabled={field.disabled}
            style={{ width: '100%' }}
            format="YYYY-MM-DD"
          />
        )

      case 'switch':
        return (
          <Switch
            checkedChildren="是"
            unCheckedChildren="否"
            disabled={field.disabled}
          />
        )

      case 'emoji':
        return <EmojiSelect />

      case 'tags':
        return (
          <TagsInput placeholder={field.placeholder || '输入标签后按回车添加'} />
        )

      default:
        return null
    }
  }

  // 构建表单规则
  const buildRules = (field: FormField): Rule[] => {
    const rules: Rule[] = []

    if (field.required) {
      rules.push({
        required: true,
        message: `请${field.type === 'select' ? '选择' : '输入'}${field.label}`,
      })
    }

    if (field.rules) {
      rules.push(...field.rules)
    }

    return rules
  }

  return (
    <Modal
      open={open}
      title={title}
      onOk={handleOk}
      onCancel={handleCancel}
      confirmLoading={submitting || confirmLoading}
      destroyOnHidden={destroyOnHidden}
      width={width}
      okText={mode === 'create' ? '创建' : '保存'}
      cancelText="取消"
    >
      <Form
        form={form}
        layout={layout}
        labelCol={labelCol}
        wrapperCol={wrapperCol}
        style={{ marginTop: 24 }}
      >
        {fields.map((field) => (
          <Form.Item
            key={field.name}
            name={field.name}
            label={field.label}
            rules={buildRules(field)}
            dependencies={field.dependencies}
            tooltip={field.tooltip}
            valuePropName={field.type === 'switch' ? 'checked' : 'value'}
          >
            {renderField(field)}
          </Form.Item>
        ))}
      </Form>
    </Modal>
  )
}

export default DataFormModal
