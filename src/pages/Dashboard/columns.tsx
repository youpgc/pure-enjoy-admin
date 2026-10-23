// Dashboard 表格列定义（从 Dashboard.tsx 抽取，行为保持）
import { Space, Typography, Tag } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { formatNumber } from './format'
import { GAME_ENGINE_MAP } from '../../constants'
import type { GameOverviewRow } from './types'

const { Text } = Typography

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
