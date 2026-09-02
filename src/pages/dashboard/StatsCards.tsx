// Dashboard 统计卡片（从 Dashboard.tsx 抽取，行为保持）
import { Card, Row, Col, Tag, Typography, theme } from 'antd'
import type { ReactNode } from 'react'
import { useMemo } from 'react'
import {
  UserOutlined, RiseOutlined, BookOutlined, FireOutlined,
  EyeOutlined, ClockCircleOutlined, ArrowUpOutlined, ArrowDownOutlined,
} from '@ant-design/icons'
import { formatNumber } from './format'
import type { NovelStats, UserStats } from './types'
import type { PageKey } from '../../App'

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
  novelStats: NovelStats
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

export function StatsCards({ userStats, novelStats, onNavigate }: StatsCardsProps) {
  const { token } = theme.useToken()
  const { Text } = Typography

  const statsCards = useMemo<StatCard[]>(() => [
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
    {
      title: '小说总数',
      value: novelStats.total,
      icon: <BookOutlined style={{ fontSize: 24, color: STAT_CARD_ICON_COLORS[3] }} />,
      change: novelStats.totalRead,
      changeLabel: '总阅读',
      link: 'novels',
    },
    {
      title: '活跃读者',
      value: novelStats.readers,
      icon: <EyeOutlined style={{ fontSize: 24, color: STAT_CARD_ICON_COLORS[4] }} />,
      change: novelStats.newReaders,
      changeLabel: '今日新增',
      link: 'novels',
    },
    {
      title: '留存率',
      value: `${userStats.retention}%`,
      icon: <ClockCircleOutlined style={{ fontSize: 24, color: STAT_CARD_ICON_COLORS[5] }} />,
      change: userStats.retentionChange,
      changeLabel: '环比',
      isPercentage: true,
      link: 'users',
    },
  ], [userStats, novelStats])

  return (
    <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
      {statsCards.map((card, index) => (
        <Col xs={24} sm={12} lg={8} xl={8} key={index}>
          <Card
            hoverable
            onClick={() => onNavigate(card.link)}
            styles={{ body: { padding: 16 } }}
          >
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
              {card.icon}
              <Text type="secondary" style={{ marginLeft: 8, fontSize: 14 }}>{card.title}</Text>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <Text style={{ fontSize: 28, fontWeight: 700, color: token.colorText }}>
                {typeof card.value === 'number' ? formatNumber(card.value) : card.value}
              </Text>
              {card.change !== undefined && (
                <Tag
                  color={card.change >= 0 ? 'success' : 'error'}
                  style={{ fontSize: 12 }}
                >
                  {card.change >= 0 ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
                  {card.isPercentage ? `${Math.abs(card.change)}%` : Math.abs(card.change)}
                  {card.changeLabel}
                </Tag>
              )}
            </div>
          </Card>
        </Col>
      ))}
    </Row>
  )
}
