// Dashboard 统计卡片（从 Dashboard.tsx 抽取，行为保持）
import { Card, Row, Col, Tag, Typography, theme } from 'antd'
import type { ReactNode } from 'react'
import { useMemo } from 'react'
import {
  UserOutlined, RiseOutlined, FireOutlined,
  // BookOutlined, EyeOutlined, // 小说模块下线，注释保留可恢复
  ClockCircleOutlined, ArrowUpOutlined, ArrowDownOutlined,
  TrophyOutlined, ThunderboltOutlined, TeamOutlined, GoldOutlined,
} from '@ant-design/icons'
import { formatNumber } from './format'
// import type { NovelStats, UserStats } from './types' // 小说模块下线，注释保留可恢复
import type { UserStats, GameStats } from './types'
import type { PageKey } from '../../App'
import styles from './StatsCards.module.css'
import common from '../../styles/common.module.css'

interface StatCard {
  title: string
  value: number | string
  icon: ReactNode
  change?: number
  changeLabel: string
  isPercentage?: boolean
  link: PageKey
}

interface StatsCardsProps {
  userStats: UserStats
  // novelStats: NovelStats // 小说模块下线，注释保留可恢复
  gameStats: GameStats
  onNavigate: (page: PageKey) => void
}

// 统计卡片图标装饰色（多色品牌调色板，集中定义避免内联 hex；无对应 antd token 故保留原值）
const STAT_CARD_ICON_COLORS = [
  '#1890ff',
  '#52c41a',
  '#fa8c16',
  '#722ed1',
  '#13c2c2',
  '#eb2f96',
]

// 分组标题（用户数据 / 游戏数据两组概览）
function SectionTitle({ text }: { text: string }) {
  return (
    <Col span={24}>
      <Typography.Text type="secondary" strong style={{ fontSize: 13 }}>
        {text}
      </Typography.Text>
    </Col>
  )
}

export function StatsCards({ userStats, gameStats, onNavigate }: StatsCardsProps) {
  const { token } = theme.useToken()
  const { Text } = Typography

  // 用户数据卡片（小说模块两张卡片下线，注释保留可恢复）
  const userCards = useMemo<StatCard[]>(() => [
    {
      title: '总用户数',
      value: userStats.total,
      icon: <UserOutlined style={{ fontSize: 24, color: STAT_CARD_ICON_COLORS[0] }} />,
      change: userStats.newWeek,
      changeLabel: '本周新增',
      link: 'users',
    },
    {
      title: '今日新增用户',
      value: userStats.newToday,
      icon: <RiseOutlined style={{ fontSize: 24, color: STAT_CARD_ICON_COLORS[1] }} />,
      change: userStats.activeToday,
      changeLabel: '今日活跃',
      link: 'users',
    },
    {
      title: '本周活跃用户',
      value: userStats.activeWeek,
      icon: <FireOutlined style={{ fontSize: 24, color: STAT_CARD_ICON_COLORS[2] }} />,
      change: userStats.newWeek,
      changeLabel: '本周新增',
      link: 'users',
    },
    // {
    //   title: '小说总数',
    //   value: novelStats.total,
    //   icon: <BookOutlined style={{ fontSize: 24, color: STAT_CARD_ICON_COLORS[3] }} />,
    //   change: novelStats.totalRead,
    //   changeLabel: '总阅读',
    //   link: 'novels',
    // },
    // {
    //   title: '活跃读者',
    //   value: novelStats.readers,
    //   icon: <EyeOutlined style={{ fontSize: 24, color: STAT_CARD_ICON_COLORS[4] }} />,
    //   change: novelStats.newReaders,
    //   changeLabel: '今日新增',
    //   link: 'novels',
    // },
    {
      title: '留存率',
      value: `${userStats.retention}%`,
      icon: <ClockCircleOutlined style={{ fontSize: 24, color: STAT_CARD_ICON_COLORS[5] }} />,
      change: userStats.retentionChange,
      changeLabel: '环比',
      isPercentage: true,
      link: 'users',
    },
  ], [userStats])

  // 游戏数据卡片
  const gameCards = useMemo<StatCard[]>(() => [
    {
      title: '游戏总数',
      value: gameStats.total,
      icon: <TrophyOutlined style={{ fontSize: 24, color: STAT_CARD_ICON_COLORS[3] }} />,
      change: gameStats.enabled,
      changeLabel: '启用中',
      link: 'game_configs',
    },
    {
      title: '今日成绩',
      value: gameStats.scoresToday,
      icon: <ThunderboltOutlined style={{ fontSize: 24, color: STAT_CARD_ICON_COLORS[0] }} />,
      change: gameStats.scoresTotal,
      changeLabel: '累计成绩',
      link: 'game_scores',
    },
    {
      title: '今日活跃玩家',
      value: gameStats.playersToday,
      icon: <TeamOutlined style={{ fontSize: 24, color: STAT_CARD_ICON_COLORS[1] }} />,
      change: gameStats.playersWeek,
      changeLabel: '本周活跃',
      link: 'game_analytics',
    },
    {
      title: '今日积分发放',
      value: gameStats.pointsToday,
      icon: <GoldOutlined style={{ fontSize: 24, color: STAT_CARD_ICON_COLORS[2] }} />,
      changeLabel: '',
      link: 'game_reward_records',
    },
  ], [gameStats])

  const renderCard = (card: StatCard, index: number) => (
    <Col xs={24} sm={12} lg={8} xl={6} key={index}>
      <Card
        hoverable
        onClick={() => onNavigate(card.link)}
        styles={{ body: { padding: 16 } }}
      >
        <div className={styles.statHead}>
          {card.icon}
          <Text type="secondary" className={styles.statTitle}>{card.title}</Text>
        </div>
        <div className={styles.statBody}>
          <Text style={{ fontSize: 28, fontWeight: 700, color: token.colorText }}>
            {typeof card.value === 'number' ? formatNumber(card.value) : card.value}
          </Text>
          {card.change !== undefined && (
            <Tag
              color={card.change >= 0 ? 'success' : 'error'}
              className={styles.statTag}
            >
              {card.change >= 0 ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
              {card.isPercentage ? `${Math.abs(card.change)}%` : Math.abs(card.change)}
              {card.changeLabel}
            </Tag>
          )}
        </div>
      </Card>
    </Col>
  )

  return (
    <Row gutter={[16, 16]} className={common.mb24}>
      <SectionTitle text="用户数据" />
      {userCards.map(renderCard)}
      <SectionTitle text="游戏数据" />
      {gameCards.map(renderCard)}
    </Row>
  )
}
