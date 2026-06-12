import React from 'react'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import UserDimensionList from '../components/UserDimensionList'
import type { ModuleConfig, RecordItem } from '../components/UserDimensionList'

// ==================== 分类映射 ====================

const NOTE_CATEGORY_MAP: Record<string, string> = {
  work: '工作',
  life: '生活',
  study: '学习',
  idea: '灵感',
  travel: '旅行',
  other: '其他',
}

// ==================== 详情弹窗列定义 ====================

const detailColumns: ColumnsType<RecordItem> = [
  { title: 'ID', dataIndex: 'id', key: 'id', width: 80, ellipsis: true },
  { title: '标题', dataIndex: 'title', key: 'title', ellipsis: true },
  { title: '内容', dataIndex: 'content', key: 'content', ellipsis: true },
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
    render: (v: string) => v ? dayjs(v).format('YYYY-MM-DD HH:mm') : '-',
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
