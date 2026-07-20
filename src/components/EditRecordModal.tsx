import React, { useState, useEffect } from 'react'
import {
  Modal,
  Form,
  Input,
  Select,
  DatePicker,
  InputNumber,
  Switch,
  message,
  Spin,
} from 'antd'
import dayjs from 'dayjs'
import { supabase } from '../utils/supabase'
import { apiQuery, apiExecute, handleApiError } from '../utils/apiClient'

interface EditRecordModalProps {
  open: boolean
  tableName: string
  recordId: string
  columns: ColumnConfig[]
  onCancel: () => void
  onSuccess: () => void
}

export interface ColumnConfig {
  name: string
  label: string
  type: 'text' | 'number' | 'date' | 'select' | 'boolean' | 'textarea'
  options?: { label: string; value: any }[]
  rules?: any[]
}

const EditRecordModal: React.FC<EditRecordModalProps> = ({
  open,
  tableName,
  recordId,
  columns,
  onCancel,
  onSuccess,
}) => {
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  // 加载记录数据
  useEffect(() => {
    if (open && recordId) {
      loadRecord()
    }
  }, [open, recordId])

  const loadRecord = async () => {
    setLoading(true)
    try {
      const result = await apiQuery(
        () => supabase.from(tableName).select(columns.map(c => c.name).join(',')).eq('id', recordId).single() as any,
        'EditRecordModal-加载记录'
      )
      if (!result.success) {
        handleApiError(result.errorMessage, 'EditRecordModal-加载记录')
        return
      }

      const record = result.data as any
      // 转换日期字段
      const formValues: Record<string, any> = {}
      columns.forEach((col) => {
        const value = record[col.name]
        if (col.type === 'date' && value) {
          formValues[col.name] = dayjs(value)
        } else {
          formValues[col.name] = value
        }
      })
      form.setFieldsValue(formValues)
    } catch (error) {
      handleApiError(error, 'EditRecordModal-加载记录')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async () => {
    if (saving) return
    try {
      const values = await form.validateFields()
      setSaving(true)

      // 转换日期字段
      const updateData: Record<string, any> = {}
      columns.forEach((col) => {
        const value = values[col.name]
        if (col.type === 'date' && value) {
          updateData[col.name] = value.format('YYYY-MM-DD')
        } else {
          updateData[col.name] = value
        }
      })

      const result = await apiExecute(
        () => (supabase.from(tableName) as any).update(updateData).eq('id', recordId),
        'EditRecordModal-保存记录'
      )

      if (!result.success) {
        handleApiError(result.errorMessage, 'EditRecordModal-保存记录')
        return
      }

      message.success('保存成功')
      onSuccess()
    } catch (error) {
      handleApiError(error, 'EditRecordModal-保存记录')
    } finally {
      setSaving(false)
    }
  }

  const renderFormItem = (column: ColumnConfig) => {
    switch (column.type) {
      case 'text':
        return <Input placeholder={`请输入${column.label}`} />
      case 'textarea':
        return <Input.TextArea rows={4} placeholder={`请输入${column.label}`} />
      case 'number':
        return <InputNumber style={{ width: '100%' }} placeholder={`请输入${column.label}`} />
      case 'date':
        return <DatePicker style={{ width: '100%' }} placeholder={`请选择${column.label}`} />
      case 'select':
        return (
          <Select placeholder={`请选择${column.label}`} options={column.options} />
        )
      case 'boolean':
        return <Switch />
      default:
        return <Input placeholder={`请输入${column.label}`} />
    }
  }

  return (
    <Modal
      title="编辑记录"
      open={open}
      onOk={handleSubmit}
      onCancel={onCancel}
      confirmLoading={saving}
      destroyOnClose
    >
      <Spin spinning={loading}>
        <Form form={form} layout="vertical">
          {columns.map((column) => (
            <Form.Item
              key={column.name}
              name={column.name}
              label={column.label}
              rules={column.rules}
              valuePropName={column.type === 'boolean' ? 'checked' : 'value'}
            >
              {renderFormItem(column)}
            </Form.Item>
          ))}
        </Form>
      </Spin>
    </Modal>
  )
}

export default EditRecordModal
