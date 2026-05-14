import React, { useState } from 'react'
import { Tag } from 'antd'
import DataTable from '../components/DataTable'
import type { DataType } from '../components/DataTable'
import { mockWeightRecords } from '../utils/mockData'
import dayjs from 'dayjs'

const getBmiColor = (bmi: number): string => {
  if (bmi < 18.5) return 'orange'
  if (bmi < 24) return 'green'
  if (bmi < 28) return 'blue'
  return 'red'
}

const getBmiLabel = (bmi: number): string => {
  if (bmi < 18.5) return '偏瘦'
  if (bmi < 24) return '正常'
  if (bmi < 28) return '偏胖'
  return '肥胖'
}

const WeightRecords: React.FC = () => {
  const [data, setData] = useState<DataType[]>(mockWeightRecords as unknown as DataType[])

  const columns = [
    { title: '用户ID', dataIndex: 'user_id', key: 'user_id', width: 200, sorter: (a: DataType, b: DataType) => String(a.user_id).localeCompare(String(b.user_id)) },
    {
      title: '体重',
      dataIndex: 'weight',
      key: 'weight',
      sorter: (a: DataType, b: DataType) => Number(a.weight) - Number(b.weight),
      render: (weight: number) => <Tag color="blue">{weight} kg</Tag>,
    },
    {
      title: 'BMI',
      dataIndex: 'weight',
      key: 'bmi',
      render: (weight: number) => {
        const bmi = parseFloat((weight / (1.75 * 1.75)).toFixed(1))
        return <Tag color={getBmiColor(bmi)}>{bmi} ({getBmiLabel(bmi)})</Tag>
      },
    },
    { title: '备注', dataIndex: 'note', key: 'note' },
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
      title="体重记录管理"
      columns={columns}
      data={data}
      onDelete={handleDelete}
      searchPlaceholder="搜索用户ID或备注"
    />
  )
}

export default WeightRecords
