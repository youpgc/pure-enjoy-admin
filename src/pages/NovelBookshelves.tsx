import React from 'react'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import UserDimensionList from '../components/UserDimensionList'
import type { ModuleConfig, RecordItem } from '../components/UserDimensionList'

// ==================== 详情弹窗列定义 ====================

const detailColumns: ColumnsType<RecordItem> = [
  { title: 'ID', dataIndex: 'id', key: 'id', width: 80, ellipsis: true },
  { title: '小说ID', dataIndex: 'novel_id', key: 'novel_id', width: 80, ellipsis: true },
  {
    title: '最后阅读时间',
    dataIndex: 'last_read_at',
    key: 'last_read_at',
    width: 170,
    render: (v: string) => v ? dayjs(v).format('YYYY-MM-DD HH:mm') : '-',
  },
  {
    title: '阅读进度',
    dataIndex: 'current_chapter',
    key: 'current_chapter',
    width: 100,
    render: (v: string) => v || '-',
  },
  {
    title: '加入时间',
    dataIndex: 'created_at',
    key: 'created_at',
    width: 170,
    render: (v: string) => v ? dayjs(v).format('YYYY-MM-DD HH:mm') : '-',
  },
]

// ==================== 模块配置 ====================

const moduleConfig: ModuleConfig = {
  key: 'user_novels',
  title: '小说书架',
  tableName: 'user_novels',
  detailColumns,
}

// ==================== 组件 ====================

const NovelBookshelves: React.FC = () => {
  return <UserDimensionList moduleConfig={moduleConfig} />
}

export default NovelBookshelves
