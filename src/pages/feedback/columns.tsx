// Feedback 表格列定义（从 Feedback.tsx 抽取，行为保持）
import { Tag } from 'antd'
import EllipsisText from '../../components/EllipsisText'
import type { ColumnsType } from 'antd/es/table'
import { formatDateTime } from '../../utils/format'
import { getActionColumn } from '../../components/ActionColumn'
import type { ActionButton } from '../../components/ActionColumn'
import {
  FEEDBACK_STATUS_MAP,
  FEEDBACK_CATEGORY_MAP,
} from '../../constants'
import type { FeedbackRecord } from './types'

interface FeedbackColumnParams {
  statusOptions: { value: string; label: string }[]
  categoryOptions: { value: string; label: string }[]
  getStatusColor: (value: string) => string | undefined
  getCategoryColor: (value: string) => string | undefined
  buildActions: (record: FeedbackRecord) => ActionButton[]
}

export function buildFeedbackColumns({
  statusOptions,
  categoryOptions,
  getStatusColor,
  getCategoryColor,
  buildActions,
}: FeedbackColumnParams): ColumnsType<FeedbackRecord> {
  return [
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 90,
      fixed: 'left',
      filters: statusOptions.length > 0
        ? statusOptions.map(opt => ({ text: opt.label, value: opt.value }))
        : Object.entries(FEEDBACK_STATUS_MAP).map(([value, { label }]) => ({ text: label, value })),
      onFilter: (value, record) => record.status === value,
      render: (status: string) => {
        const dictOpt = statusOptions.find(opt => opt.value === status)
        const fallback = FEEDBACK_STATUS_MAP[status]
        const label = dictOpt?.label || fallback?.label || status
        const color = getStatusColor(status) || fallback?.color || 'default'
        return <Tag color={color}>{label}</Tag>
      },
    },
    {
      title: '标题',
      dataIndex: 'title',
      key: 'title',
      width: 180,
      render: (title: string) => <EllipsisText text={title} maxWidth={180} />,
    },
    {
      title: '用户',
      dataIndex: 'user_nickname',
      key: 'user_nickname',
      width: 120,
      render: (nickname: string, record) => nickname || `用户${record.user_id?.substring(0, 6)}`,
    },
    {
      title: '分类',
      dataIndex: 'category',
      key: 'category',
      width: 100,
      filters: categoryOptions.length > 0
        ? categoryOptions.map(opt => ({ text: opt.label, value: opt.value }))
        : Object.entries(FEEDBACK_CATEGORY_MAP).map(([value, { label }]) => ({ text: label, value })),
      onFilter: (value, record) => record.category === value,
      render: (category: string) => {
        const dictOpt = categoryOptions.find(opt => opt.value === category)
        const fallback = FEEDBACK_CATEGORY_MAP[category]
        const label = dictOpt?.label || fallback?.label || category
        const color = getCategoryColor(category) || fallback?.color || 'default'
        return <Tag color={color}>{label}</Tag>
      },
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      width: 220,
      render: (desc: string) => <EllipsisText text={desc} maxWidth={220} />,
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 160,
      render: (date: string) => formatDateTime(date),
    },
    getActionColumn<FeedbackRecord>(buildActions, { width: 280, maxVisible: 2 }),
  ]
}
