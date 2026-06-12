import React from 'react'
import { Tag } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import UserDimensionList from '../components/UserDimensionList'
import type { ModuleConfig, RecordItem } from '../components/UserDimensionList'

// ==================== 级别映射 ====================

const LEVEL_MAP: Record<string, { color: string; label: string }> = {
  error: { color: 'red', label: 'ERROR' },
  warning: { color: 'orange', label: 'WARNING' },
  info: { color: 'blue', label: 'INFO' },
}

// ==================== 详情弹窗列定义 ====================

const detailColumns: ColumnsType<RecordItem> = [
  { title: 'ID', dataIndex: 'id', key: 'id', width: 80, ellipsis: true },
  {
    title: '级别',
    dataIndex: 'level',
    key: 'level',
    width: 80,
    render: (v: string) => {
      const info = LEVEL_MAP[v] || { color: 'default', label: v?.toUpperCase() }
      return <Tag color={info.color}>{info.label}</Tag>
    },
  },
  {
    title: '模块',
    dataIndex: 'module',
    key: 'module',
    width: 100,
    render: (v: string) => <Tag>{v}</Tag>,
  },
  { title: '消息', dataIndex: 'message', key: 'message', ellipsis: true },
  {
    title: '详情',
    dataIndex: 'detail',
    key: 'detail',
    ellipsis: true,
    render: (v: Record<string, unknown>) => {
      if (!v) return '-'
      try {
        return JSON.stringify(v)
      } catch {
        return String(v)
      }
    },
  },
  {
    title: '用户ID',
    dataIndex: 'user_id',
    key: 'user_id',
    width: 200,
    ellipsis: true,
    render: (v: string) => v || '-',
  },
  {
    title: '创建时间',
    dataIndex: 'created_at',
    key: 'created_at',
    width: 170,
    render: (v: string) => v ? dayjs(v).format('YYYY-MM-DD HH:mm:ss') : '-',
  },
]

// ==================== 模块配置 ====================

const moduleConfig: ModuleConfig = {
  key: 'error_logs',
  title: '错误日志',
  tableName: 'error_logs',
  detailColumns,
}

// ==================== 组件 ====================

const ErrorLogs: React.FC = () => {
  return <UserDimensionList moduleConfig={moduleConfig} />
}

export default ErrorLogs
