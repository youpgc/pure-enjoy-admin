import React, { useEffect, useRef, useState } from 'react'
import { Form, Input } from 'antd'
import type { Json } from '../../../types/database'
import { parseJsonText, stringifyJson } from '../../../utils/petJson'

// ==================== JSON 编辑表单项（pet_* jsonb 列统一） ====================
//
// 与 petJson.parseJsonText 配套：回显格式化 JSON，表单值 = 解析后的对象/数组（jsonb 列直存结构）；
// 解析失败时表单值保留原始文本并由校验报错，不静默把字符串写进 jsonb。
// rows 可按字段体量调整；placeholder 给出该列在 DDL 中的语义示例。

interface JsonFormItemProps {
  name: string
  label: string
  placeholder?: string
  rows?: number
  tooltip?: string
  required?: boolean
}

/// TextArea ↔ 表单值桥接：编辑中保留草稿文本，解析成功即向表单提交对象
const JsonTextArea: React.FC<{
  value?: unknown
  onChange?: (v: unknown) => void
  rows?: number
  placeholder?: string
}> = ({ value, onChange, rows = 4, placeholder }) => {
  const [text, setText] = useState(() =>
    typeof value === 'string' ? value : stringifyJson(value as Json)
  )
  const lastEmitted = useRef<unknown>(value)
  // 外部回显（initialValues / setFieldsValue 传入对象）→ 重新序列化为可读文本
  useEffect(() => {
    if (value !== lastEmitted.current) {
      lastEmitted.current = value
      setText(typeof value === 'string' ? value : stringifyJson(value as Json))
    }
  }, [value])
  return (
    <Input.TextArea
      rows={rows}
      placeholder={placeholder}
      value={text}
      onChange={(e) => {
        const raw = e.target.value
        setText(raw)
        const parsed = parseJsonText(raw)
        const next = parsed.ok ? parsed.value : raw
        lastEmitted.current = next
        onChange?.(next)
      }}
    />
  )
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
    rules={[
      ...(required ? [{ required: true, message: `请输入${label}` }] : []),
      {
        validator: (_: unknown, v: unknown) => {
          if (typeof v !== 'string') return Promise.resolve()
          const r = parseJsonText(v)
          return r.ok ? Promise.resolve() : Promise.reject(new Error(r.error ?? 'JSON 格式错误'))
        },
      },
    ]}
  >
    <JsonTextArea rows={rows} placeholder={placeholder} />
  </Form.Item>
)
