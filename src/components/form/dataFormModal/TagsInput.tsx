import React, { useState } from 'react'
import { Input, Button, Space } from 'antd'
import styles from './TagsInput.module.css'
import common from '../../../styles/common.module.css'

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
      <Space.Compact className={`${common.fullWidth} ${common.mb8}`}>
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
      <div className={`${common.flex} ${common.flexWrap} ${common.gap4}`}>
        {value.map((tag) => (
          <Button
            key={tag}
            size="small"
            onClick={() => handleRemove(tag)}
            className={styles.tagBtn}
          >
            {tag} ×
          </Button>
        ))}
      </div>
    </div>
  )
}

export default TagsInput
