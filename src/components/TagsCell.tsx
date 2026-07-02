import React from 'react'
import { Tag, Space } from 'antd'

interface TagsCellProps {
  tags: string[] | string | null | undefined
  color?: string
  max?: number
}

const TagsCell: React.FC<TagsCellProps> = ({ tags, color = 'blue', max = 3 }) => {
  if (!tags) return <span>-</span>
  const tagList = Array.isArray(tags) ? tags : (typeof tags === 'string' ? tags.split(',').filter(Boolean) : [])
  return (
    <Space size={4} wrap>
      {tagList.slice(0, max).map((tag, index) => (
        <Tag key={index} color={color} style={{ margin: 0 }}>{String(tag).trim()}</Tag>
      ))}
      {tagList.length > max && <Tag style={{ margin: 0 }}>+{tagList.length - max}</Tag>}
    </Space>
  )
}

export default TagsCell
