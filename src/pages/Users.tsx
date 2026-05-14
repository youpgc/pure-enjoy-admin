import React, { useState } from 'react'
import { Tag } from 'antd'
import DataTable from '../components/DataTable'
import type { DataType } from '../components/DataTable'
import { mockUsers } from '../utils/mockData'
import dayjs from 'dayjs'

const Users: React.FC = () => {
  const [data, setData] = useState<DataType[]>(mockUsers as unknown as DataType[])

  const columns = [
    { title: 'ID', dataIndex: 'id', key: 'id', width: 280, sorter: (a: DataType, b: DataType) => String(a.id).localeCompare(String(b.id)) },
    { title: '邮箱', dataIndex: 'email', key: 'email', sorter: (a: DataType, b: DataType) => String(a.email).localeCompare(String(b.email)) },
    { title: '昵称', dataIndex: 'name', key: 'name' },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const colorMap: Record<string, string> = { active: 'green', inactive: 'default', banned: 'red' }
        const labelMap: Record<string, string> = { active: '正常', inactive: '未激活', banned: '已封禁' }
        return <Tag color={colorMap[status]}>{labelMap[status] || status}</Tag>
      },
    },
    {
      title: '注册时间',
      dataIndex: 'created_at',
      key: 'created_at',
      sorter: (a: DataType, b: DataType) => new Date(String(a.created_at)).getTime() - new Date(String(b.created_at)).getTime(),
      render: (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm'),
    },
  ]

  const handleDelete = (ids: string[]) => {
    setData(prev => prev.filter(item => !ids.includes(item.id)))
  }

  return (
    <DataTable
      title="用户管理"
      columns={columns}
      data={data}
      onDelete={handleDelete}
      searchPlaceholder="搜索邮箱或昵称"
    />
  )
}

export default Users
