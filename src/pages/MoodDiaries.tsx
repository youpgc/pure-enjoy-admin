import React from 'react'
import { Tag } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import UserDimensionList from '../components/UserDimensionList'
import type { ModuleConfig, RecordItem } from '../components/UserDimensionList'

// ==================== 心情映射 ====================

const MOOD_TYPE_MAP: Record<string, string> = {
  happy: '开心',
  excited: '兴奋',
  calm: '平静',
  neutral: '一般',
  sad: '难过',
  anxious: '焦虑',
  angry: '生气',
  tired: '疲惫',
  grateful: '感恩',
}

const MOOD_COLOR_MAP: Record<string, string> = {
  happy: '#52c41a',
  sad: '#1890ff',
  angry: '#ff4d4f',
  anxious: '#faad14',
  calm: '#13c2c2',
  excited: '#eb2f96',
}

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
  { title: '内容', dataIndex: 'content', key: 'content', ellipsis: true },
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
