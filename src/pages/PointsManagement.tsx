import React from 'react'
import { Tag } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import UserDimensionList from '../components/UserDimensionList'
import type { ModuleConfig, RecordItem } from '../components/UserDimensionList'
import { POINT_TYPE_MAP, POINT_STATUS_MAP } from '../constants'

// ==================== 详情弹窗列定义 ====================

const detailColumns: ColumnsType<RecordItem> = [
  {
    title: '类型',
    dataIndex: 'type',
    key: 'type',
    width: 80,
    render: (v: string) => {
      const info = POINT_TYPE_MAP[v] || { color: 'default', label: v }
      return <Tag color={info.color}>{info.label}</Tag>
    },
  },
  {
    title: '积分变动',
    dataIndex: 'amount',
    key: 'amount',
    width: 100,
    render: (v: number) => (
      <span style={{ color: Number(v) >= 0 ? '#52c41a' : '#ff4d4f', fontWeight: 500 }}>
        {Number(v) >= 0 ? '+' : ''}{v}
      </span>
    ),
  },
  { title: '备注', dataIndex: 'remark', key: 'remark', ellipsis: true },
  {
    title: '操作人',
    dataIndex: 'operator_name',
    key: 'operator_name',
    width: 100,
    render: (v: string) => v || '-',
  },
  {
    title: '状态',
    dataIndex: 'status',
    key: 'status',
    width: 80,
    render: (v: string) => {
      const info = POINT_STATUS_MAP[v] || { color: 'default', label: v }
      return <Tag color={info.color}>{info.label}</Tag>
    },
  },
  {
    title: '过期时间',
    dataIndex: 'expires_at',
    key: 'expires_at',
    width: 170,
    render: (v: string) => v ? dayjs(v).format('YYYY-MM-DD HH:mm:ss') : '-',
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
  key: 'point_records',
  title: '积分记录',
  tableName: 'point_records',
  detailColumns,
}

// ==================== 组件 ====================

const PointsManagement: React.FC = () => {
  return <UserDimensionList moduleConfig={moduleConfig} />
}

export default PointsManagement
