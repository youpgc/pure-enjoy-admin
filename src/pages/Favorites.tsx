import React from 'react'
import { Tag } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import EllipsisText from '../components/EllipsisText'
import dayjs from 'dayjs'
import UserDimensionList from '../components/UserDimensionList'
import type { ModuleConfig, RecordItem } from '../components/UserDimensionList'
import { FAVORITE_CATEGORY_MAP } from '../constants'

// ==================== 详情弹窗列定义 ====================

const detailColumns: ColumnsType<RecordItem> = [
  { title: '标题', dataIndex: 'title', key: 'title', render: (v: string) => <EllipsisText text={v} maxWidth={180} /> },
  {
    title: 'URL',
    dataIndex: 'url',
    key: 'url',
    render: (v: string) => v ? <a href={v} target="_blank" rel="noopener noreferrer"><EllipsisText text={v} maxWidth={220} /></a> : '-',
  },
  { title: '描述', dataIndex: 'description', key: 'description', render: (v: string) => <EllipsisText text={v} maxWidth={220} /> },
  {
    title: '分类',
    dataIndex: 'category',
    key: 'category',
    width: 80,
    render: (v: string) => FAVORITE_CATEGORY_MAP[v] || v || '-',
  },
  {
    title: '标签',
    dataIndex: 'tags',
    key: 'tags',
    width: 120,
    render: (v: string[]) => {
      if (!v || !Array.isArray(v)) return '-'
      return v.map((tag) => <Tag key={tag}>{tag}</Tag>)
    },
  },
  {
    title: '置顶',
    dataIndex: 'is_pinned',
    key: 'is_pinned',
    width: 60,
    render: (v: boolean) => v ? <Tag color="blue">是</Tag> : '否',
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
  key: 'user_favorites',
  title: '收藏',
  tableName: 'user_favorites',
  detailColumns,
}

// ==================== 组件 ====================

const Favorites: React.FC = () => {
  return <UserDimensionList moduleConfig={moduleConfig} />
}

export default Favorites
