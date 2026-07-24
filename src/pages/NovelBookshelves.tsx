import React from 'react'
import type { ColumnsType } from 'antd/es/table'
import EllipsisText from '../components/EllipsisText'
import dayjs from 'dayjs'
import UserDimensionList from '../components/UserDimensionList'
import type { ModuleConfig, RecordItem } from '../components/UserDimensionList'

// ==================== 详情弹窗列定义 ====================

const detailColumns: ColumnsType<RecordItem> = [
  {
    title: '小说名称',
    dataIndex: 'novel_id',
    key: 'novel_name',
    width: 120,
    render: (_: string, record: RecordItem) => {
      const name = record.novel_name || record.title || record.name
      if (name) return <EllipsisText text={String(name)} maxWidth={200} />
      const id = String(record.novel_id || '')
      return id ? <EllipsisText text={id} maxWidth={200} /> : '-'
    },
  },
  {
    title: '最后阅读时间',
    dataIndex: 'last_read_at',
    key: 'last_read_at',
    width: 170,
    render: (v: string) => v ? dayjs(v).format('YYYY-MM-DD HH:mm:ss') : '-',
  },
  {
    title: '阅读进度',
    dataIndex: 'last_chapter',
    key: 'last_chapter',
    width: 100,
    render: (v: string) => v || '-',
  },
  {
    title: '加入时间',
    dataIndex: 'created_at',
    key: 'created_at',
    width: 170,
    render: (v: string) => v ? dayjs(v).format('YYYY-MM-DD HH:mm:ss') : '-',
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
