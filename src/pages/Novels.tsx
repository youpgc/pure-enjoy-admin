import React, { useState } from 'react'
import { Tag, Progress } from 'antd'
import DataTable from '../components/DataTable'
import type { DataType } from '../components/DataTable'
import { mockNovels } from '../utils/mockData'
import dayjs from 'dayjs'

const Novels: React.FC = () => {
  const [data, setData] = useState<DataType[]>(mockNovels as unknown as DataType[])

  const columns = [
    { title: '用户ID', dataIndex: 'id', key: 'id', width: 200, sorter: (a: DataType, b: DataType) => String(a.id).localeCompare(String(b.id)) },
    { title: '书名', dataIndex: 'title', key: 'title', sorter: (a: DataType, b: DataType) => String(a.title).localeCompare(String(b.title)) },
    { title: '作者', dataIndex: 'author', key: 'author' },
    {
      title: '来源',
      dataIndex: 'category',
      key: 'category',
      render: (category: string) => <Tag color="purple">{category}</Tag>,
    },
    {
      title: '进度',
      dataIndex: 'rating',
      key: 'progress',
      render: (rating: number) => (
        <Progress percent={Math.round(rating * 10)} size="small" />
      ),
    },
    {
      title: '最后阅读时间',
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
      title="小说书架管理"
      columns={columns}
      data={data}
      onDelete={handleDelete}
      searchPlaceholder="搜索书名或作者"
    />
  )
}

export default Novels
