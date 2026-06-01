import React, { useState, useEffect } from 'react'
import { Modal, Form, Input, InputNumber, Select, DatePicker, Switch, message } from 'antd'
import dayjs from 'dayjs'
import { supabase } from '../utils/supabase'

// ==================== 类型定义 ====================

export interface EditFieldConfig {
  name: string
  label: string
  type: 'text' | 'number' | 'select' | 'date' | 'datetime' | 'switch' | 'textarea' | 'tags'
  required?: boolean
  options?: { value: string; label: string }[]
  placeholder?: string
  min?: number
  max?: number
  step?: number
  showTime?: boolean // 用于 datetime 类型
}

export interface EditRecordModalProps {
  open: boolean
  record: RecordItem | null
  tableName: string
  fields: EditFieldConfig[]
  onClose: () => void
  onSuccess: () => void
}

export interface RecordItem {
  id: string
  user_id: string
  created_at: string
  updated_at?: string
  [key: string]: unknown
}

// ==================== 编辑弹窗组件 ====================

const EditRecordModal: React.FC<EditRecordModalProps> = ({
  open,
  record,
  tableName,
  fields,
  onClose,
  onSuccess,
}) => {
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)

  // 初始化表单值
  useEffect(() => {
    if (open && record) {
      const initialValues: Record<string, unknown> = {}
      fields.forEach((field) => {
        const value = record[field.name]
        if (field.type === 'date' && value) {
          initialValues[field.name] = dayjs(value as string)
        } else if (field.type === 'datetime' && value) {
          initialValues[field.name] = dayjs(value as string)
        } else if (field.type === 'switch') {
          initialValues[field.name] = Boolean(value)
        } else if (field.type === 'tags' && value) {
          // tags 可能是数组或逗号分隔的字符串
          if (Array.isArray(value)) {
            initialValues[field.name] = value.join(', ')
          } else {
            initialValues[field.name] = value
          }
        } else {
          initialValues[field.name] = value ?? (field.type === 'number' ? 0 : '')
        }
      })
      form.setFieldsValue(initialValues)
    }
  }, [open, record, fields, form])

  // 提交表单
  const handleSubmit = async () => {
    if (!record) return
    
    try {
      const values = await form.validateFields()
      setLoading(true)

      // 处理字段值
      const submitData: Record<string, unknown> = {}
      fields.forEach((field) => {
        let value = values[field.name]
        if (field.type === 'date' && value) {
          value = dayjs(value).format('YYYY-MM-DD')
        } else if (field.type === 'datetime' && value) {
          value = dayjs(value).format('YYYY-MM-DD HH:mm:ss')
        } else if (field.type === 'tags' && value) {
          // 将逗号分隔的字符串转为数组
          value = typeof value === 'string' 
            ? value.split(',').map((t: string) => t.trim()).filter(Boolean)
            : value
        } else if (field.type === 'switch') {
          value = Boolean(value)
        }
        submitData[field.name] = value
      })

      // 添加更新时间
      submitData.updated_at = dayjs().toISOString()

      const { error } = await supabase
        .from(tableName)
        .update(submitData)
        .eq('id', record.id)

      if (error) throw error

      message.success('更新成功')
      onSuccess()
      onClose()
    } catch (error) {
      console.error('更新失败:', error)
      message.error('更新失败')
    } finally {
      setLoading(false)
    }
  }

  // 渲染表单字段
  const renderField = (field: EditFieldConfig) => {
    switch (field.type) {
      case 'text':
        return (
          <Input
            placeholder={field.placeholder || `请输入${field.label}`}
          />
        )
      case 'number':
        return (
          <InputNumber
            placeholder={field.placeholder || `请输入${field.label}`}
            min={field.min}
            max={field.max}
            step={field.step || 1}
            style={{ width: '100%' }}
          />
        )
      case 'textarea':
        return (
          <Input.TextArea
            placeholder={field.placeholder || `请输入${field.label}`}
            rows={4}
          />
        )
      case 'select':
        return (
          <Select
            placeholder={field.placeholder || `请选择${field.label}`}
            options={field.options}
          />
        )
      case 'date':
        return (
          <DatePicker
            placeholder={field.placeholder || `请选择${field.label}`}
            style={{ width: '100%' }}
            format="YYYY-MM-DD"
          />
        )
      case 'datetime':
        return (
          <DatePicker
            placeholder={field.placeholder || `请选择${field.label}`}
            style={{ width: '100%' }}
            format="YYYY-MM-DD HH:mm"
            showTime={field.showTime}
          />
        )
      case 'switch':
        return (
          <Switch checkedChildren="是" unCheckedChildren="否" />
        )
      case 'tags':
        return (
          <Input
            placeholder={field.placeholder || '多个标签用逗号分隔，如：标签1, 标签2'}
          />
        )
      default:
        return <Input />
    }
  }

  return (
    <Modal
      title="编辑记录"
      open={open}
      onCancel={onClose}
      onOk={handleSubmit}
      confirmLoading={loading}
      width={600}
      destroyOnClose
    >
      <Form
        form={form}
        layout="vertical"
        preserve={false}
      >
        {fields.map((field) => (
          <Form.Item
            key={field.name}
            name={field.name}
            label={field.label}
            rules={field.required ? [{ required: true, message: `请输入${field.label}` }] : []}
          >
            {renderField(field)}
          </Form.Item>
        ))}
      </Form>
    </Modal>
  )
}

export default EditRecordModal