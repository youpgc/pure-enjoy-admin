import React from 'react'
import { Tag } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import UserDimensionList from '../components/UserDimensionList'
import type { ModuleConfig, RecordItem } from '../components/UserDimensionList'

// ==================== 状态映射 ====================

const FEEDBACK_STATUS_MAP: Record<string, { color: string; label: string }> = {
  pending: { color: 'orange', label: '待处理' },
  processing: { color: 'blue', label: '处理中' },
  confirmed: { color: 'cyan', label: '已确认' },
  in_progress: { color: 'blue', label: '处理中' },
  resolved: { color: 'green', label: '已解决' },
  rejected: { color: 'red', label: '已拒绝' },
  delayed: { color: 'gold', label: '已延期' },
}

// ==================== 详情弹窗列定义 ====================

const detailColumns: ColumnsType<RecordItem> = [
  { title: 'ID', dataIndex: 'id', key: 'id', width: 80, ellipsis: true },
  { title: '标题', dataIndex: 'title', key: 'title', ellipsis: true },
  { title: '描述', dataIndex: 'description', key: 'description', ellipsis: true },
  {
    title: '分类',
    dataIndex: 'category',
    key: 'category',
    width: 80,
    render: (v: string) => v || '-',
  },
  {
    title: '状态',
    dataIndex: 'status',
    key: 'status',
    width: 80,
    render: (v: string) => {
      const info = FEEDBACK_STATUS_MAP[v] || { color: 'default', label: v }
      return <Tag color={info.color}>{info.label}</Tag>
    },
  },
  { title: '管理员回复', dataIndex: 'admin_reply', key: 'admin_reply', ellipsis: true, render: (v: string) => v || '-' },
  {
    title: '创建时间',
    dataIndex: 'created_at',
    key: 'created_at',
    width: 170,
    render: (v: string) => v ? dayjs(v).format('YYYY-MM-DD HH:mm') : '-',
  },
]

// ==================== 模块配置 ====================

const moduleConfig: ModuleConfig = {
  key: 'user_feedback',
  title: '反馈',
  tableName: 'user_feedback',
  detailColumns,
}

// ==================== 组件 ====================

const Feedback: React.FC = () => {
  return <UserDimensionList moduleConfig={moduleConfig} />
}

export default Feedback
