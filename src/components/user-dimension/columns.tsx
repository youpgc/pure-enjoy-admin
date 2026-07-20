// UserDimensionList 汇总表格列定义（从 components/UserDimensionList.tsx 抽取，行为保持）
import { Tag } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { EyeOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import { getActionColumn } from '../../components/ActionColumn'
import type { UserSummary } from './types'

interface UserDimensionColumnParams {
  userMap: Map<string, { nickname: string; username: string }>
  onViewDetail: (record: UserSummary) => void
}

export function buildUserDimensionColumns({ userMap, onViewDetail }: UserDimensionColumnParams): ColumnsType<UserSummary> {
  return [
    {
      title: '用户名',
      key: 'username',
      width: 140,
      render: (_, record) => {
        const userInfo = userMap.get(record.user_id)
        return userInfo?.username || record.user_nickname || '-'
      },
    },
    {
      title: '昵称',
      key: 'nickname',
      width: 140,
      render: (_, record) => {
        const userInfo = userMap.get(record.user_id)
        return userInfo?.nickname || '-'
      },
    },
    {
      title: '记录数',
      dataIndex: 'total_count',
      key: 'total_count',
      width: 100,
      sorter: (a, b) => a.total_count - b.total_count,
      render: (count: number) => (
        <Tag color="blue">{count} 条</Tag>
      ),
    },
    {
      title: '最新记录时间',
      dataIndex: 'latest_date',
      key: 'latest_date',
      width: 180,
      sorter: (a, b) => {
        if (!a.latest_date) return 1
        if (!b.latest_date) return -1
        return new Date(b.latest_date).getTime() - new Date(a.latest_date).getTime()
      },
      render: (date: string) => (
        date ? dayjs(date).format('YYYY-MM-DD HH:mm') : '-'
      ),
    },
    getActionColumn<UserSummary>(
      (record) => [
        {
          key: 'view',
          label: '查看详情',
          icon: <EyeOutlined />,
          type: 'primary',
          onClick: () => onViewDetail(record),
        },
      ],
      { width: 240, maxVisible: 2 }
    ),
  ]
}
