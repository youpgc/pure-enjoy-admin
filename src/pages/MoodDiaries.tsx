import React from 'react'
import { Tag } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import EllipsisText from '../components/EllipsisText'
import dayjs from 'dayjs'
import UserDimensionList from '../components/UserDimensionList'
import type { ModuleConfig, RecordItem } from '../components/UserDimensionList'
import { MOOD_TYPE_MAP, MOOD_COLOR_MAP } from '../constants'

// ==================== 详情弹窗列定义 ====================

const detailColumns: ColumnsType<RecordItem> = [
  {
    title: '心情',
    dataIndex: 'mood',
    key: 'mood',
    width: 80,
    render: (v: string) => (
      <Tag color={MOOD_COLOR_MAP[v] || '#999'}>{MOOD_TYPE_MAP[v] || v}</Tag>
    ),
  },
  {
    title: '心情标签',
    dataIndex: 'mood_label',
    key: 'mood_label',
    width: 100,
    render: (v: string) => v || '-',
  },
  { title: '内容', dataIndex: 'content', key: 'content', render: (v: string) => <EllipsisText text={v} maxWidth={240} /> },
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
  key: 'mood_diaries',
  title: '心情日记',
  tableName: 'mood_diaries',
  detailColumns,
}

// ==================== 组件 ====================

const MoodDiaries: React.FC = () => {
  return <UserDimensionList moduleConfig={moduleConfig} />
}

export default MoodDiaries
