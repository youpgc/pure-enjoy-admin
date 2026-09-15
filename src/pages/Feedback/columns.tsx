// Feedback 表格列定义（从 Feedback.tsx 抽取，行为保持）
import { Tag } from 'antd'
import EllipsisText from '../../components/common/EllipsisText'
import type { ColumnsType } from 'antd/es/table'
import { formatDateTime } from '../../utils/format'
import type { UserInfo } from '../../hooks/useUsernames'
import { UserName } from '../../components/common/UserName'
import { getActionColumn } from '../../components/common/ActionColumn'
import type { ActionButton } from '../../components/common/ActionColumn'
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
  /** 用户名解析结果（统一口径，见 utils/userDisplay.ts） */
  userMap: Map<string, UserInfo>
}

export function buildFeedbackColumns({
  statusOptions,
  categoryOptions,
  getStatusColor,
  getCategoryColor,
  buildActions,
  userMap,
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
      // 统一口径（共享组件）：username → nickname → 未知用户。此前兜底为
      // 「用户{id 前 6 位}」，与其它页面不一致，且把 ID 片段当人名展示。
      render: (nickname: string, record) =>
        nickname || <UserName userId={record.user_id} userMap={userMap} />,
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
