// Dashboard 表格列定义（从 Dashboard.tsx 抽取，行为保持）
import { Space, Avatar, Typography } from 'antd'
import EllipsisText from '../../components/EllipsisText'
import type { ColumnsType } from 'antd/es/table'
import { UserOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import { formatDateTime } from '../../utils/format'
import { formatNumber } from './format'
import type { CommentItem, NovelListItem } from './types'

const { Text } = Typography

// 小说列表列
export function buildNovelColumns(): ColumnsType<NovelListItem> {
  return [
    {
      title: '标题',
      dataIndex: 'title',
      key: 'title',
      render: (title: string) => <EllipsisText text={title} maxWidth={180} />,
    },
    {
      title: '作者',
      dataIndex: 'author',
      key: 'author',
      render: (author: string | null) => author || '-',
    },
    {
      title: '分类',
      dataIndex: 'category',
      key: 'category',
      render: (category: string | null) => category || '-',
    },
    {
      title: '阅读量',
      dataIndex: 'read_count',
      key: 'read_count',
      render: (count: number | null) => formatNumber(count || 0),
      sorter: (a, b) => (a.read_count || 0) - (b.read_count || 0),
    },
    {
      title: '评分',
      dataIndex: 'rating',
      key: 'rating',
      render: (rating: number | null) => rating ? `${rating.toFixed(1)} ⭐` : '-',
      sorter: (a, b) => (a.rating || 0) - (b.rating || 0),
    },
    {
      title: '发布时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date: string) => formatDateTime(date),
      sorter: (a, b) => dayjs(a.created_at).unix() - dayjs(b.created_at).unix(),
    },
  ]
}

// 评论列表列
export function buildCommentColumns(): ColumnsType<CommentItem> {
  return [
    {
      title: '用户',
      key: 'user',
      width: 120,
      render: (_, record) => (
        <Space>
          <Avatar size="small" icon={<UserOutlined />} />
          <Text>{record.user_nickname || '匿名用户'}</Text>
        </Space>
      ),
    },
    {
      title: '小说',
      dataIndex: 'novel_title',
      key: 'novel_title',
      render: (title: string | null) => (
        <EllipsisText text={title || '未知小说'} maxWidth={150} />
      ),
    },
    {
      title: '评论内容',
      dataIndex: 'content',
      key: 'content',
      render: (content: string) => <EllipsisText text={content} maxWidth={240} />,
    },
    {
      title: '评分',
      dataIndex: 'rating',
      key: 'rating',
      width: 80,
      render: (rating: number | null) => rating ? `${rating} ⭐` : '-',
    },
    {
      title: '评论时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 160,
      render: (date: string) => formatDateTime(date),
    },
  ]
}
