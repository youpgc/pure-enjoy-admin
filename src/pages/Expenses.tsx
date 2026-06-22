import React from 'react'
import { Tag } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import UserDimensionList from '../components/UserDimensionList'
import type { ModuleConfig, RecordItem } from '../components/UserDimensionList'

// ==================== 分类映射 ====================

const CATEGORY_MAP: Record<string, string> = {
  food: '餐饮',
  transport: '交通',
  communication: '通讯',
  shopping: '购物',
  entertainment: '娱乐',
  health: '医疗',
  housing: '居住',
  education: '教育',
  other: '其他',
}

// ==================== 详情弹窗列定义 ====================

const detailColumns: ColumnsType<RecordItem> = [
  {
    title: '金额',
    dataIndex: 'amount',
    key: 'amount',
    width: 100,
    render: (v: number) => <Tag color="red">{`¥${Number(v).toFixed(2)}`}</Tag>,
  },
  {
    title: '分类',
    dataIndex: 'category',
    key: 'category',
    width: 80,
    render: (v: string) => CATEGORY_MAP[v] || v || '-',
  },
  { title: '描述', dataIndex: 'description', key: 'description', ellipsis: true },
  { title: '笔记', dataIndex: 'note', key: 'note', ellipsis: true, render: (v: string) => v || '-' },
  {
    title: '日期',
    dataIndex: 'date',
    key: 'date',
    width: 110,
    render: (v: string) => v ? dayjs(v).format('YYYY-MM-DD') : '-',
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
  key: 'expenses',
  title: '消费记录',
  tableName: 'expenses',
  detailColumns,
}

// ==================== 组件 ====================

const Expenses: React.FC = () => {
  return <UserDimensionList moduleConfig={moduleConfig} />
}

export default Expenses
