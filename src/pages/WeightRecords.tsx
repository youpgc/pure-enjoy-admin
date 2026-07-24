import React from 'react'
import type { ColumnsType } from 'antd/es/table'
import EllipsisText from '../components/EllipsisText'
import dayjs from 'dayjs'
import UserDimensionList from '../components/UserDimensionList'
import type { ModuleConfig, RecordItem } from '../components/UserDimensionList'

// ==================== 详情弹窗列定义 ====================

const detailColumns: ColumnsType<RecordItem> = [
  {
    title: '体重(kg)',
    dataIndex: 'weight',
    key: 'weight',
    width: 100,
    render: (v: number) => v != null ? v : '-',
  },
  {
    title: '体脂(%)',
    dataIndex: 'body_fat',
    key: 'body_fat',
    width: 90,
    render: (v: number) => v != null ? v : '-',
  },
  {
    title: 'BMI',
    dataIndex: 'bmi',
    key: 'bmi',
    width: 80,
    render: (v: number) => v != null ? v : '-',
  },
  { title: '备注', dataIndex: 'note', key: 'note', render: (v: string) => <EllipsisText text={v} maxWidth={220} /> },
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
  key: 'weight_records',
  title: '体重记录',
  tableName: 'weight_records',
  detailColumns,
}

// ==================== 组件 ====================

const WeightRecords: React.FC = () => {
  return <UserDimensionList moduleConfig={moduleConfig} />
}

export default WeightRecords
