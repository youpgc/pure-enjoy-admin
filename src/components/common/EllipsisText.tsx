import React from 'react'
import { Typography } from 'antd'

const { Text } = Typography

export interface EllipsisTextProps {
  /** 待展示的文本（支持字符串；非字符串会转成字符串） */
  text?: string | null
  /** 单元格最大宽度，超出即省略（px） */
  maxWidth?: number
  /** 是否对 HTML 内容自动去标签（默认 true，避免 tooltip 展示一堆标签） */
  stripHtml?: boolean
  /** 截断时鼠标移入是否显示完整内容 tooltip（默认 true） */
  tooltip?: boolean
}

/// 长文本单元格统一渲染：超出 maxWidth 省略，截断时鼠标移入 tooltip 显示完整内容。
/// HTML 内容自动去标签；空值显示 '-'。全后台长文本列统一复用，避免各页面手写不一致。
const EllipsisText: React.FC<EllipsisTextProps> = ({
  text,
  maxWidth = 200,
  stripHtml = true,
  tooltip = true,
}) => {
  if (text === null || text === undefined || String(text).trim() === '') {
    return <Text type="secondary">-</Text>
  }
  const raw = String(text)
  const display = stripHtml && /<[a-z][\s\S]*>/i.test(raw)
    ? raw.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
    : raw
  return (
    <Text
      ellipsis={tooltip ? { tooltip: true } : true}
      style={{ display: 'inline-block', maxWidth, verticalAlign: 'bottom' }}
    >
      {display}
    </Text>
  )
}

export default EllipsisText
