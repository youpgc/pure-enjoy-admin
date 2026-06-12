import React from 'react'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import UserDimensionList from '../components/UserDimensionList'
import type { ModuleConfig, RecordItem } from '../components/UserDimensionList'

// ==================== 类型映射 ====================

const ANNIVERSARY_TYPE_MAP: Record<string, string> = {
  birthday: '生日',
  anniversary: '纪念日',
  holiday: '节日',
  other: '其他',
}

// ==================== 详情弹窗列定义 ====================

const detailColumns: ColumnsType<RecordItem> = [
  { title: 'ID', dataIndex: 'id', key: 'id', width: 80, ellipsis: true },
  { title: '标题', dataIndex: 'title', key: 'title', ellipsis: true },
  {
    title: '日期',
    dataIndex: 'date',
    key: 'date',
    width: 110,
    render: (v: string) => v ? dayjs(v).format('YYYY-MM-DD') : '-',
  },
  {
    title: '类型',
    dataIndex: 'type',
    key: 'type',
    width: 80,
    render: (v: string) => ANNIVERSARY_TYPE_MAP[v] || v || '-',
  },
  { title: '描述', dataIndex: 'description', key: 'description', ellipsis: true, render: (v: string) => v || '-' },
  {
    title: '每年重复',
    dataIndex: 'repeat_yearly',
    key: 'repeat_yearly',
    width: 80,
    render: (v: boolean) => v ? '是' : '否',
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
  key: 'user_anniversaries',
  title: '纪念日',
  tableName: 'user_anniversaries',
  detailColumns,
}

// ==================== 组件 ====================

const Anniversaries: React.FC = () => {
  return <UserDimensionList moduleConfig={moduleConfig} />
}

export default Anniversaries
