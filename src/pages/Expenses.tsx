import React from 'react'
import { Tag } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import EllipsisText from '../components/EllipsisText'
import dayjs from 'dayjs'
import UserDimensionList from '../components/UserDimensionList'
import type { ModuleConfig, RecordItem } from '../components/UserDimensionList'
import { EXPENSE_CATEGORY_MAP } from '../constants'

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
    render: (v: string) => EXPENSE_CATEGORY_MAP[v] || v || '-',
  },
  { title: '描述', dataIndex: 'description', key: 'description', render: (v: string) => <EllipsisText text={v} maxWidth={220} /> },
  { title: '笔记', dataIndex: 'note', key: 'note', render: (v: string) => <EllipsisText text={v} maxWidth={220} /> },
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
