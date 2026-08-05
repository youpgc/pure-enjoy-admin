import React, { useState } from 'react'
import { Input, Button, Space } from 'antd'

interface TagsInputProps {
  value?: string[]
  onChange?: (value: string[]) => void
  placeholder?: string
}

const TagsInput: React.FC<TagsInputProps> = ({ value = [], onChange, placeholder }) => {
  const [inputValue, setInputValue] = useState('')

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

export default TagsInput
