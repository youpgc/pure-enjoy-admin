import React from 'react'
import { Tag } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import UserDimensionList from '../components/UserDimensionList'
import type { ModuleConfig, RecordItem } from '../components/UserDimensionList'

// ==================== 详情弹窗列定义 ====================

const detailColumns: ColumnsType<RecordItem> = [
  { title: 'ID', dataIndex: 'id', key: 'id', width: 80, ellipsis: true },
  { title: '名称', dataIndex: 'name', key: 'name', ellipsis: true },
  { title: '描述', dataIndex: 'description', key: 'description', ellipsis: true, render: (v: string) => v || '-' },
  {
    title: '目标天数',
    dataIndex: 'target_days',
    key: 'target_days',
    width: 90,
    render: (v: number) => v ? `${v} 天` : '-',
  },
  {
    title: '当前连续',
    dataIndex: 'current_streak',
    key: 'current_streak',
    width: 90,
    render: (v: number) => `${v || 0} 天`,
  },
  {
    title: '最长连续',
    dataIndex: 'longest_streak',
    key: 'longest_streak',
    width: 90,
    render: (v: number) => `${v || 0} 天`,
  },
  {
    title: '是否激活',
    dataIndex: 'is_active',
    key: 'is_active',
    width: 80,
    render: (v: boolean) => <Tag color={v ? 'green' : 'default'}>{v ? '进行中' : '已停用'}</Tag>,
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
  key: 'habits',
  title: '习惯',
  tableName: 'habits',
  detailColumns,
}

// ==================== 组件 ====================

const Habits: React.FC = () => {
  return <UserDimensionList moduleConfig={moduleConfig} />
}

export default Habits
