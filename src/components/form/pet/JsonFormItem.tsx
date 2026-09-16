import React from 'react'
import { Form, Input } from 'antd'
import { stringifyJson } from '../../../utils/petJson'

// ==================== JSON 编辑表单项（pet_* jsonb 列统一） ====================
//
// 与 petJson.parseJsonText 配套：回显格式化 JSON，保存前由调用方 parse 校验。
// rows 可按字段体量调整；placeholder 给出该列在 DDL 中的语义示例。

interface JsonFormItemProps {
  name: string
  label: string
  placeholder?: string
  rows?: number
  tooltip?: string
  required?: boolean
}

export const JsonFormItem: React.FC<JsonFormItemProps> = ({
  name,
  label,
  placeholder,
  rows = 4,
  tooltip,
  required,
}) => (
  <Form.Item
    name={name}
    label={label}
    tooltip={tooltip}
    rules={required ? [{ required: true, message: `请输入${label}` }] : undefined}
    normalize={(v: string) => (typeof v === 'string' ? v : stringifyJson(v))}
  >
    <Input.TextArea rows={rows} placeholder={placeholder} />
  </Form.Item>
)
