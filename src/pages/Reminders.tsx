import React from 'react'
import { Tag } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import UserDimensionList from '../components/UserDimensionList'
import type { ModuleConfig, RecordItem } from '../components/UserDimensionList'

// ==================== 重复类型映射 ====================

const REPEAT_TYPE_MAP: Record<string, string> = {
  none: '不重复',
  daily: '每天',
  weekly: '每周',
  monthly: '每月',
  yearly: '每年',
  weekday: '工作日',
  weekend: '周末',
  custom: '自定义',
}

// ==================== 详情弹窗列定义 ====================

const detailColumns: ColumnsType<RecordItem> = [
  { title: '标题', dataIndex: 'title', key: 'title', ellipsis: true },
  { title: '描述', dataIndex: 'description', key: 'description', ellipsis: true, render: (v: string) => v || '-' },
  {
    title: '提醒时间',
    dataIndex: 'remind_at',
    key: 'remind_at',
    width: 170,
    render: (v: string) => v ? dayjs(v).format('YYYY-MM-DD HH:mm:ss') : '-',
  },
  {
    title: '是否完成',
    dataIndex: 'is_completed',
    key: 'is_completed',
    width: 80,
    render: (v: boolean) => v ? <Tag color="green">已完成</Tag> : <Tag>未完成</Tag>,
  },
  {
    title: '是否重复',
    dataIndex: 'is_repeated',
    key: 'is_repeated',
    width: 80,
    render: (v: boolean) => v ? '是' : '否',
  },
  {
    title: '重复类型',
    dataIndex: 'repeat_type',
    key: 'repeat_type',
    width: 80,
    render: (v: string) => REPEAT_TYPE_MAP[v] || v || '-',
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
  key: 'reminders',
  title: '提醒',
  tableName: 'reminders',
  detailColumns,
}

// ==================== 组件 ====================

const Reminders: React.FC = () => {
  return <UserDimensionList moduleConfig={moduleConfig} />
}

export default Reminders
