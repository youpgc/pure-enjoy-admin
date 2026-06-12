import React from 'react'
import { Tag, Badge } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import UserDimensionList from '../components/UserDimensionList'
import type { ModuleConfig, RecordItem } from '../components/UserDimensionList'

// ==================== 类型映射 ====================

const NOTIFICATION_TYPE_MAP: Record<string, { color: string; label: string }> = {
  system: { color: 'blue', label: '系统' },
  user: { color: 'green', label: '用户' },
  novel: { color: 'purple', label: '小说' },
  activity: { color: 'orange', label: '活动' },
}

// ==================== 详情弹窗列定义 ====================

const detailColumns: ColumnsType<RecordItem> = [
  { title: 'ID', dataIndex: 'id', key: 'id', width: 80, ellipsis: true },
  {
    title: '类型',
    dataIndex: 'type',
    key: 'type',
    width: 80,
    render: (v: string) => {
      const info = NOTIFICATION_TYPE_MAP[v] || { color: 'default', label: v }
      return <Tag color={info.color}>{info.label}</Tag>
    },
  },
  { title: '标题', dataIndex: 'title', key: 'title', ellipsis: true },
  { title: '内容', dataIndex: 'body', key: 'body', ellipsis: true },
  {
    title: '图标',
    dataIndex: 'icon',
    key: 'icon',
    width: 80,
    render: (v: string) => v || '-',
  },
  {
    title: '是否已读',
    dataIndex: 'is_read',
    key: 'is_read',
    width: 80,
    render: (v: boolean) => (
      <Badge status={v ? 'success' : 'processing'} text={v ? '已读' : '未读'} />
    ),
  },
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
  key: 'notifications',
  title: '通知',
  tableName: 'notifications',
  detailColumns,
}

// ==================== 组件 ====================

const Notifications: React.FC = () => {
  return <UserDimensionList moduleConfig={moduleConfig} />
}

export default Notifications
