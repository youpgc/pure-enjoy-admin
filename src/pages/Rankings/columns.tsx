// 排行榜表格列定义（从 Rankings.tsx 抽离，审查 P1 膨胀）
// 列渲染依赖 intervention（置顶图标）与行内操作按钮，故通过参数注入，避免逻辑裸露在页面。
import type { ColumnsType } from 'antd/es/table'
import { Tag, Tooltip, Space } from 'antd'
import { PushpinOutlined } from '@ant-design/icons'
import { getActionColumn, type ActionButton } from '../../components/common/ActionColumn'
import EllipsisText from '../../components/common/EllipsisText'
import type { RankingItem, Intervention } from './types'
import styles from './columns.module.css'
import common from '../../styles/common.module.css'

const RankBadge = ({ rank }: { rank: number }) => {
  if (rank === 1) return <Tag color='gold' className={`${styles.rankBadge} ${common.bold700}`}>🥇</Tag>
  if (rank === 2) return <Tag color='silver' className={`${styles.rankBadge} ${common.bold700}`}>🥈</Tag>
  if (rank === 3) return <Tag color='orange' className={`${styles.rankBadge} ${common.bold700}`}>🥉</Tag>
  return <span className={`${styles.rankText} ${common.bold500}`}>{rank}</span>
}

export const buildRankingColumns = (params: {
  intervention: Intervention
  renderActions: (record: RankingItem) => ActionButton[]
}): ColumnsType<RankingItem> => {
  const { intervention, renderActions } = params
  return [
    {
      title: '#',
      key: 'rank',
      width: 60,
      align: 'center',
      render: (_: unknown, __: unknown, index: number) => <RankBadge rank={index + 1} />,
    },
    {
      title: '小说名称',
      dataIndex: 'title',
      key: 'title',
      render: (title: string, record) => (
        <Space>
          {intervention.pin_ids.includes(record.novel_id) && (
            <PushpinOutlined className={styles.pinIcon} />
          )}
          <EllipsisText text={title} maxWidth={200} />
        </Space>
      ),
    },
    {
      title: '作者',
      dataIndex: 'author',
      key: 'author',
      width: 120,
      render: (v: string | null) => v || '-',
    },
    {
      title: '分类',
      dataIndex: 'category',
      key: 'category',
      width: 100,
      render: (v: string | null) => v || '-',
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 80,
      render: (v: string | null) => (
        <Tag color={v === 'completed' ? 'success' : 'blue'}>
          {v === 'completed' ? '已完结' : '连载中'}
        </Tag>
      ),
    },
    {
      title: '日阅读',
      dataIndex: 'daily_reads',
      key: 'daily_reads',
      width: 90,
      align: 'right',
      render: (v: number) => <Tag color='blue'>{v || 0}</Tag>,
    },
    {
      title: '周阅读',
      dataIndex: 'weekly_reads',
      key: 'weekly_reads',
      width: 90,
      align: 'right',
      render: (v: number) => <Tag color='cyan'>{v || 0}</Tag>,
    },
    {
      title: '月阅读',
      dataIndex: 'monthly_reads',
      key: 'monthly_reads',
      width: 90,
      align: 'right',
      render: (v: number) => <Tag color='geekblue'>{v || 0}</Tag>,
    },
    {
      title: '总阅读',
      dataIndex: 'total_reads',
      key: 'total_reads',
      width: 90,
      align: 'right',
      render: (v: number) => <Tag color='purple'>{v || 0}</Tag>,
    },
    {
      title: '总收藏',
      dataIndex: 'total_collects',
      key: 'total_collects',
      width: 90,
      align: 'right',
      render: (v: number) => <Tag color='magenta'>{v || 0}</Tag>,
    },
    {
      title: '评分',
      dataIndex: 'avg_rating',
      key: 'avg_rating',
      width: 80,
      align: 'right',
      render: (v: number, r: RankingItem) => (
        <Tooltip title={`${r.rating_count} 人评分`}>
          <Tag color='orange'>{(v || 0).toFixed(1)}</Tag>
        </Tooltip>
      ),
    },
    getActionColumn<RankingItem>(renderActions, { width: 220, maxVisible: 2 }),
  ]
}
