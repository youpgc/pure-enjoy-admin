import React, { useState } from 'react'
import { Tag } from 'antd'
import DataTable from '../components/DataTable'
import type { DataType } from '../components/DataTable'
import { mockNotes } from '../utils/mockData'
import dayjs from 'dayjs'

const Notes: React.FC = () => {
  const [data, setData] = useState<DataType[]>(mockNotes as unknown as DataType[])

  const columns = [
    { title: '用户ID', dataIndex: 'user_id', key: 'user_id', width: 200, sorter: (a: DataType, b: DataType) => String(a.user_id).localeCompare(String(b.user_id)) },
    { title: '标题', dataIndex: 'title', key: 'title', sorter: (a: DataType, b: DataType) => String(a.title).localeCompare(String(b.title)) },
    {
      title: '内容',
      dataIndex: 'content',
      key: 'content',
      ellipsis: true,
      width: 300,
    },
    {
      title: '分类',
      dataIndex: 'category',
      key: 'category',
      render: (category: string) => <Tag color="blue">{category}</Tag>,
    },
    {
      title: '置顶',
      dataIndex: 'tags',
      key: 'pinned',
      render: (tags: string[]) => tags.includes('置顶') ? <Tag color="gold">置顶</Tag> : null,
    },
    {
      title: '更新时间',
      dataIndex: 'updated_at',
      key: 'updated_at',
      sorter: (a: DataType, b: DataType) => String(a.updated_at).localeCompare(String(b.updated_at)),
      render: (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm'),
    },
  ]

  const handleDelete = (ids: string[]) => {
    setData(prev => prev.filter(item => !ids.includes(item.id)))
  }

  return (
    <DataTable
      title="笔记本管理"
      columns={columns}
      data={data}
      onDelete={handleDelete}
      searchPlaceholder="搜索标题或内容"
    />
  )
}

export default Notes
