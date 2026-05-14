import React, { useState } from 'react'
import { Tag } from 'antd'
import DataTable from '../components/DataTable'
import type { DataType } from '../components/DataTable'
import { mockMoodDiaries } from '../utils/mockData'
import dayjs from 'dayjs'

const moodEmojiMap: Record<string, string> = {
  '开心': '😊',
  '平静': '😌',
  '一般': '😐',
  '难过': '😢',
  '焦虑': '😰',
}

const MoodDiaries: React.FC = () => {
  const [data, setData] = useState<DataType[]>(mockMoodDiaries as unknown as DataType[])

  const columns = [
    { title: '用户ID', dataIndex: 'user_id', key: 'user_id', width: 200, sorter: (a: DataType, b: DataType) => String(a.user_id).localeCompare(String(b.user_id)) },
    {
      title: '心情',
      dataIndex: 'mood',
      key: 'mood',
      render: (mood: string) => (
        <span style={{ fontSize: 24 }}>{moodEmojiMap[mood] || mood}</span>
      ),
    },
    {
      title: '标签',
      dataIndex: 'mood',
      key: 'mood_tag',
      render: (mood: string) => <Tag color="blue">{mood}</Tag>,
    },
    {
      title: '内容',
      dataIndex: 'content',
      key: 'content',
      ellipsis: true,
      width: 300,
    },
    {
      title: '日期',
      dataIndex: 'date',
      key: 'date',
      sorter: (a: DataType, b: DataType) => String(a.date).localeCompare(String(b.date)),
      render: (date: string) => dayjs(date).format('YYYY-MM-DD'),
    },
  ]

  const handleDelete = (ids: string[]) => {
    setData(prev => prev.filter(item => !ids.includes(item.id)))
  }

  return (
    <DataTable
      title="心情日记管理"
      columns={columns}
      data={data}
      onDelete={handleDelete}
      searchPlaceholder="搜索心情或内容"
    />
  )
}

export default MoodDiaries
