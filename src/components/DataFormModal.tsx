import React from 'react'
import {
  Modal,
  Form,
  Input,
  InputNumber,
  Select,
  DatePicker,
  Switch,
  Button,
  Space,
} from 'antd'
import type { FormInstance, Rule } from 'antd/es/form'
import dayjs from 'dayjs'

const { TextArea } = Input
const { RangePicker } = DatePicker

// ==================== 类型定义 ====================

export type FieldType =
  | 'text'
  | 'number'
  | 'textarea'
  | 'select'
  | 'date'
  | 'dateRange'
  | 'switch'
  | 'emoji'
  | 'tags'

export interface FormField {
  name: string
  label: string
  type: FieldType
  placeholder?: string
  required?: boolean
  rules?: Rule[]
  options?: { label: string; value: string | number }[]
  min?: number
  max?: number
  precision?: number
  rows?: number
  disabled?: boolean
  defaultValue?: unknown
  span?: number // 栅格占位
  dependencies?: string[] // 依赖字段
  tooltip?: string
  render?: (form: FormInstance, field: FormField) => React.ReactNode // 自定义渲染
}

export interface DataFormModalProps {
  open: boolean
  title: string
  mode: 'create' | 'edit'
  fields: FormField[]
  initialValues?: Record<string, unknown>
  onOk: (values: Record<string, unknown>) => Promise<void> | void
  onCancel: () => void
  confirmLoading?: boolean
  width?: number | string
  destroyOnClose?: boolean
  layout?: 'horizontal' | 'vertical' | 'inline'
  labelCol?: { span: number }
  wrapperCol?: { span: number }
}

// ==================== Emoji 选择器 ====================

const EMOJI_OPTIONS = [
  { label: '😊 开心', value: '开心' },
  { label: '😌 平静', value: '平静' },
  { label: '😐 一般', value: '一般' },
  { label: '😢 难过', value: '难过' },
  { label: '😰 焦虑', value: '焦虑' },
]

const EmojiSelect: React.FC<{
  value?: string
  onChange?: (value: string) => void
}> = ({ value, onChange }) => {
  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      {EMOJI_OPTIONS.map((option) => (
        <Button
          key={option.value}
          type={value === option.value ? 'primary' : 'default'}
          onClick={() => onChange?.(option.value as string)}
          style={{ fontSize: 18, padding: '4px 12px' }}
        >
          {option.label}
        </Button>
      ))}
    </div>
  )
}

// ==================== 标签输入组件 ====================

const TagsInput: React.FC<{
  value?: string[]
  onChange?: (value: string[]) => void
  placeholder?: string
}> = ({ value = [], onChange, placeholder }) => {
  const [inputValue, setInputValue] = React.useState('')

  const handleAdd = () => {
    const tag = inputValue.trim()
    if (tag && !value.includes(tag)) {
      onChange?.([...value, tag])
      setInputValue('')
    }
  }

  const handleRemove = (tag: string) => {
    onChange?.(value.filter((t) => t !== tag))
  }

  return (
    <div>
      <Space.Compact style={{ width: '100%', marginBottom: 8 }}>
        <Input
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder={placeholder || '输入标签后按回车或点击添加'}
          onPressEnter={handleAdd}
        />
        <Button type="primary" onClick={handleAdd}>
          添加
        </Button>
      </Space.Compact>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
        {value.map((tag) => (
          <Button
            key={tag}
            size="small"
            onClick={() => handleRemove(tag)}
            style={{ borderRadius: 4 }}
          >
            {tag} ×
          </Button>
        ))}
      </div>
    </div>
  )
}

// ==================== 主组件 ====================

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
  destroyOnClose = true,
  layout = 'vertical',
  labelCol,
  wrapperCol,
}) => {
  const [form] = Form.useForm()

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
    try {
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
        return (
          <EmojiSelect />
        )

      case 'tags':
        return (
          <TagsInput
            placeholder={field.placeholder || '输入标签后按回车添加'}
          />
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
      confirmLoading={confirmLoading}
      destroyOnClose={destroyOnClose}
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
