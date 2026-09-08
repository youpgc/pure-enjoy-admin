// Dashboard 表格列定义（从 Dashboard.tsx 抽取，行为保持）
import { Space, Typography, Tag } from 'antd'
// import { Avatar } from 'antd' // 评论列下线，注释保留可恢复
import EllipsisText from '../../components/common/EllipsisText'
import type { ColumnsType } from 'antd/es/table'
// import { UserOutlined } from '@ant-design/icons' // 评论列下线，注释保留可恢复
import dayjs from 'dayjs'
import { formatDateTime } from '../../utils/format'
import { formatNumber } from './format'
import { GAME_ENGINE_MAP } from '../../constants'
import type { NovelListItem, GameOverviewRow } from './types'
// import type { CommentItem } from './types' // 评论列下线，注释保留可恢复

const { Text } = Typography

// 小说列表列（小说模块卡片/榜单已下线，列定义保留备用）
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

// // 评论列表列（小说模块下线，列定义保留备用）
// export function buildCommentColumns(): ColumnsType<CommentItem> {
//   return [
//     {
//       title: '用户',
//       key: 'user',
//       width: 120,
//       render: (_, record) => (
//         <Space>
//           <Avatar size="small" icon={<UserOutlined />} />
//           <Text>{record.user_nickname || '匿名用户'}</Text>
//         </Space>
//       ),
//     },
//     {
//       title: '小说',
//       dataIndex: 'novel_title',
//       key: 'novel_title',
//       render: (title: string | null) => (
//         <EllipsisText text={title || '未知小说'} maxWidth={150} />
//       ),
//     },
//     {
//       title: '评论内容',
//       dataIndex: 'content',
//       key: 'content',
//       render: (content: string) => <EllipsisText text={content} maxWidth={240} />,
//     },
//     {
//       title: '评分',
//       dataIndex: 'rating',
//       key: 'rating',
//       width: 80,
//       render: (rating: number | null) => rating ? `${rating} ⭐` : '-',
//     },
//     {
//       title: '评论时间',
//       dataIndex: 'created_at',
//       key: 'created_at',
//       width: 160,
//       render: (date: string) => formatDateTime(date),
//     },
//   ]
// }

// ==================== 游戏模块（数据概览表） ====================

/// 游戏数据概览列（按游戏聚合：成绩/活跃玩家/积分发放）
export function buildGameOverviewColumns(): ColumnsType<GameOverviewRow> {
  return [
    {
      title: '游戏',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: GameOverviewRow) => (
        <Space size={8}>
          <Text strong>{name}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>{record.code}</Text>
        </Space>
      ),
    },
    {
      title: '引擎',
      dataIndex: 'engine',
      key: 'engine',
      width: 110,
      render: (v: string) => {
        const info = GAME_ENGINE_MAP[v] || { color: 'default', label: v }
        return <Tag color={info.color}>{info.label}</Tag>
      },
    },
    {
      title: '状态',
      dataIndex: 'enabled',
      key: 'enabled',
      width: 80,
      render: (v: boolean) => (v ? <Tag color="green">启用</Tag> : <Tag>停用</Tag>),
    },
    {
      title: '累计成绩',
      dataIndex: 'scoresTotal',
      key: 'scoresTotal',
      width: 110,
      sorter: (a, b) => a.scoresTotal - b.scoresTotal,
      render: (v: number) => formatNumber(v),
    },
    {
      title: '今日成绩',
      dataIndex: 'scoresToday',
      key: 'scoresToday',
      width: 110,
      sorter: (a, b) => a.scoresToday - b.scoresToday,
      render: (v: number) => formatNumber(v),
    },
    {
      title: '今日活跃玩家',
      dataIndex: 'playersToday',
      key: 'playersToday',
      width: 130,
      sorter: (a, b) => a.playersToday - b.playersToday,
      render: (v: number) => formatNumber(v),
    },
    {
      title: '今日积分发放',
      dataIndex: 'pointsToday',
      key: 'pointsToday',
      width: 130,
      sorter: (a, b) => a.pointsToday - b.pointsToday,
      render: (v: number) => formatNumber(v),
    },
  ]
}
