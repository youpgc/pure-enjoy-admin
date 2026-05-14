import React, { useState } from 'react'
import { Tag } from 'antd'
import DataTable from '../components/DataTable'
import type { DataType } from '../components/DataTable'
import { mockExpenses } from '../utils/mockData'
import dayjs from 'dayjs'

const Expenses: React.FC = () => {
  const [data, setData] = useState<DataType[]>(mockExpenses as unknown as DataType[])

  const columns = [
    { title: '用户ID', dataIndex: 'user_id', key: 'user_id', width: 200, sorter: (a: DataType, b: DataType) => String(a.user_id).localeCompare(String(b.user_id)) },
    {
      title: '金额',
      dataIndex: 'amount',
      key: 'amount',
      sorter: (a: DataType, b: DataType) => Number(a.amount) - Number(b.amount),
      render: (amount: number) => <Tag color="red">¥{amount.toFixed(2)}</Tag>,
    },
    { title: '分类', dataIndex: 'category', key: 'category' },
    { title: '备注', dataIndex: 'description', key: 'description' },
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
      title="消费记录管理"
      columns={columns}
      data={data}
      onDelete={handleDelete}
      searchPlaceholder="搜索分类或备注"
    />
  )
}

export default Expenses
