import React from 'react'
import type { ColumnsType } from 'antd/es/table'
import EllipsisText from '../components/EllipsisText'
import dayjs from 'dayjs'
import UserDimensionList from '../components/UserDimensionList'
import type { ModuleConfig, RecordItem } from '../components/UserDimensionList'
import { NOTE_CATEGORY_MAP } from '../constants'

// ==================== 详情弹窗列定义 ====================

const detailColumns: ColumnsType<RecordItem> = [
  { title: '标题', dataIndex: 'title', key: 'title', render: (v: string) => <EllipsisText text={v} maxWidth={180} /> },
  { title: '内容', dataIndex: 'content', key: 'content', render: (v: string) => <EllipsisText text={v} maxWidth={240} /> },
  {
    title: '分类',
    dataIndex: 'category',
    key: 'category',
    width: 80,
    render: (v: string) => NOTE_CATEGORY_MAP[v] || v || '-',
  },
  {
    title: '颜色',
    dataIndex: 'color',
    key: 'color',
    width: 80,
    render: (v: string) => v ? <span style={{ display: 'inline-block', width: 16, height: 16, backgroundColor: v, borderRadius: 4, verticalAlign: 'middle', marginRight: 4 }} /> : '-',
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
  key: 'notes',
  title: '便签',
  tableName: 'notes',
  detailColumns,
}

// ==================== 组件 ====================

const Notes: React.FC = () => {
  return <UserDimensionList moduleConfig={moduleConfig} />
}

export default Notes
