import React from 'react'
import { Tag } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import EllipsisText from '../../components/common/EllipsisText'
import UserDimensionList from '../../components/user/UserDimensionList'
import type { ModuleConfig, RecordItem } from '../../components/user/UserDimensionList'
import { EXPENSE_CATEGORY_MAP } from '../../constants'
import { formatDate, formatDateTime } from '../../utils/format'

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
  { title: '备注', dataIndex: 'description', key: 'description', render: (v: string) => <EllipsisText text={v} maxWidth={220} /> },
  {
    title: '日期',
    dataIndex: 'date',
    key: 'date',
    width: 110,
    render: (v: string) => v ? formatDate(v) : '-',
  },
  {
    title: '创建时间',
    dataIndex: 'created_at',
    key: 'created_at',
    width: 170,
    render: (v: string) => v ? formatDateTime(v) : '-',
  },
]

// ==================== 模块配置 ====================

const moduleConfig: ModuleConfig = {
  key: 'expenses',
  title: '消费记录',
  tableName: 'expenses',
  detailColumns,
  enableDelete: true,
}

// ==================== 组件 ====================

const Expenses: React.FC = () => {
  return <UserDimensionList moduleConfig={moduleConfig} />
}

export default Expenses
