import type { FormInstance, Rule } from 'antd/es/form'
import type { ReactNode } from 'react'

// 表单字段类型
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

// 单个表单字段定义
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
  render?: (form: FormInstance, field: FormField) => ReactNode // 自定义渲染
}

// DataFormModal 对外 Props
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
  destroyOnHidden?: boolean
  layout?: 'horizontal' | 'vertical' | 'inline'
  labelCol?: { span: number }
  wrapperCol?: { span: number }
}

// 心情选项（EmojiSelect 使用）
export interface MoodOption {
  label: string
  value: string
}
