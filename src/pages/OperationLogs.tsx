import React from 'react'
import { Tag } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import UserDimensionList from '../components/UserDimensionList'
import type { ModuleConfig, RecordItem } from '../components/UserDimensionList'

// ==================== 模块图标映射 ====================

const MODULE_MAP: Record<string, { color: string; label: string }> = {
  user: { color: 'blue', label: '用户' },
  system: { color: 'purple', label: '系统' },
  novel: { color: 'green', label: '小说' },
  content: { color: 'orange', label: '内容' },
}

// ==================== 详情弹窗列定义 ====================

const detailColumns: ColumnsType<RecordItem> = [
  { title: 'ID', dataIndex: 'id', key: 'id', width: 80, ellipsis: true },
  {
    title: '操作',
    dataIndex: 'action',
    key: 'action',
    width: 80,
    render: (v: string) => <Tag color="blue">{v}</Tag>,
  },
  {
    title: '模块',
    dataIndex: 'module',
    key: 'module',
    width: 80,
    render: (v: string) => {
      const info = MODULE_MAP[v] || { color: 'default', label: v }
      return <Tag color={info.color}>{info.label}</Tag>
    },
  },
  {
    title: '目标ID',
    dataIndex: 'target_id',
    key: 'target_id',
    width: 120,
    render: (v: string) => v || '-',
  },
  {
    title: '详情',
    dataIndex: 'details',
    key: 'details',
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
    title: 'IP',
    dataIndex: 'ip',
    key: 'ip',
    width: 130,
    render: (v: string) => v || '-',
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
  key: 'operation_logs',
  title: '操作日志',
  tableName: 'operation_logs',
  detailColumns,
}

// ==================== 组件 ====================

const OperationLogs: React.FC = () => {
  return <UserDimensionList moduleConfig={moduleConfig} />
}

export default OperationLogs
