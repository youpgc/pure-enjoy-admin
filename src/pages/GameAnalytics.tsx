import React, { useState, useEffect, useCallback } from 'react'
import {
  Card,
  Row,
  Col,
  Table,
  Tag,
  Spin,
  Empty,
  DatePicker,
  Button,
  Space,
  Typography,
  Statistic,
} from 'antd'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import { ReloadOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import { handleApiError } from '../utils/apiClient'
import { useMounted } from '../hooks/useMounted'
import {
  GAME_REWARD_RULE_TYPE_MAP,
} from '../constants'
import {
  gameService,
  gameScoreService,
  gameRewardClaimService,
  gameRewardRuleService,
  userGameAchievementService,
  gameAchievementService,
} from '../services/gameService'
import type { DbGame, DbGameScore, DbGameRewardClaim, DbUserGameAchievement, DbGameAchievement, DbGameRewardRule } from '../types/database'

const { Title } = Typography
const { RangePicker } = DatePicker

const COLORS = ['#ff4d4f', '#faad14', '#52c41a', '#1890ff', '#722ed1', '#13c2c2']

/// 分批拉全量（不受分页影响，本地聚合；supabase 默认单次上限 1000）
async function loadAllRows<T>(
  svc: { findAll: (q?: any) => Promise<{ success: boolean; errorMessage?: string | null; data?: T[] | null }> }
): Promise<T[]> {
  const all: T[] = []
  let offset = 0
  const batch = 1000
  let hasMore = true
  while (hasMore) {
    const res = await svc.findAll((q: any) => q.range(offset, offset + batch - 1))
    if (!res.success) {
      handleApiError(res.errorMessage, 'GameAnalytics-批量加载')
      break
    }
    const rows = (res.data || []) as T[]
    if (rows.length === 0) hasMore = false
    else {
      all.push(...rows)
      if (rows.length < batch) hasMore = false
      offset += batch
    }
  }
  return all
}

const GameAnalytics: React.FC = () => {
  const mountedRef = useMounted()
  const [loading, setLoading] = useState(false)
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs]>([
    dayjs().subtract(29, 'day'),
    dayjs(),
  ])

  const [gameMap, setGameMap] = useState<Record<string, DbGame>>({})
  const [achMap, setAchMap] = useState<Record<string, DbGameAchievement>>({})
  const [ruleMap, setRuleMap] = useState<Record<string, DbGameRewardRule>>({})

  // 指标
  const [totalScores, setTotalScores] = useState(0)
  const [totalUsers, setTotalUsers] = useState(0)
  const [clearRate, setClearRate] = useState(0)
  const [totalPoints, setTotalPoints] = useState(0)

  // 图表数据
  const [perGameData, setPerGameData] = useState<{ game: string; count: number }[]>([])
  const [clearRateData, setClearRateData] = useState<{ game: string; rate: number }[]>([])
  const [trendData, setTrendData] = useState<{ date: string; count: number }[]>([])
  const [rewardData, setRewardData] = useState<{ name: string; value: number }[]>([])
  const [achTopData, setAchTopData] = useState<{ name: string; count: number }[]>([])

  // 加载映射（游戏/成就/奖励规则）
  const loadMaps = useCallback(async () => {
    const gRes = await gameService.findAll()
    const aRes = await gameAchievementService.findAll()
    const rRes = await gameRewardRuleService.findAll()
    if (!mountedRef.current) return
    if (gRes.success && gRes.data) {
      const gm: Record<string, DbGame> = {}
      gRes.data.forEach((g) => (gm[g.id] = g))
      setGameMap(gm)
    }
    if (aRes.success && aRes.data) {
      const am: Record<string, DbGameAchievement> = {}
      aRes.data.forEach((a) => (am[a.id] = a))
      setAchMap(am)
    }
    if (rRes.success && rRes.data) {
      const rm: Record<string, DbGameRewardRule> = {}
      rRes.data.forEach((r) => (rm[r.id] = r))
      setRuleMap(rm)
    }
  }, [mountedRef])

  const loadAnalytics = useCallback(async () => {
    setLoading(true)
    try {
      const [scores, claims, achs] = await Promise.all([
        loadAllRows<DbGameScore>(gameScoreService),
        loadAllRows<DbGameRewardClaim>(gameRewardClaimService),
        loadAllRows<DbUserGameAchievement>(userGameAchievementService),
      ])

      // 日期窗口过滤（按 played_at）
      const start = dateRange[0].startOf('day')
      const end = dateRange[1].endOf('day')
      const inRange = (iso: string) => {
        const d = dayjs(iso)
        return d.isAfter(start) && d.isBefore(end)
      }
      const windowScores = scores.filter((s) => inRange(s.played_at))

      if (!mountedRef.current) return

      // 指标卡
      const userSet = new Set(windowScores.map((s) => s.user_id))
      const cleared = windowScores.filter((s) => s.status === 'cleared').length
      setTotalScores(windowScores.length)
      setTotalUsers(userSet.size)
      setClearRate(windowScores.length ? Math.round((cleared / windowScores.length) * 1000) / 10 : 0)
      setTotalPoints(claims.reduce((sum, c) => sum + c.points, 0))

      // 各游戏对局数 + 通关率
      const gameCount: Record<string, number> = {}
      const gameCleared: Record<string, number> = {}
      windowScores.forEach((s) => {
        gameCount[s.game_id] = (gameCount[s.game_id] || 0) + 1
        if (s.status === 'cleared') gameCleared[s.game_id] = (gameCleared[s.game_id] || 0) + 1
      })
      const perGame = Object.entries(gameCount).map(([gid, count]) => ({
        game: gameMap[gid]?.name || gid,
        count,
      }))
      const clearRates = Object.entries(gameCount).map(([gid, count]) => ({
        game: gameMap[gid]?.name || gid,
        rate: count ? Math.round(((gameCleared[gid] || 0) / count) * 1000) / 10 : 0,
      }))
      setPerGameData(perGame)
      setClearRateData(clearRates)

      // 近30天每日对局趋势
      const days = end.diff(start, 'day') + 1
      const trendMap: Record<string, number> = {}
      for (let i = 0; i < days; i++) {
        trendMap[start.add(i, 'day').format('MM-DD')] = 0
      }
      windowScores.forEach((s) => {
        const key = dayjs(s.played_at).format('MM-DD')
        trendMap[key] = (trendMap[key] || 0) + 1
      })
      setTrendData(Object.entries(trendMap).map(([date, count]) => ({ date, count })))

      // 积分发放构成（按 rule_type：claims 仅存 rule_id，需经奖励规则表映射）
      const rulePoints: Record<string, number> = {}
      claims.forEach((c) => {
        const type = (c.rule_id && ruleMap[c.rule_id]?.rule_type) || 'unknown'
        rulePoints[type] = (rulePoints[type] || 0) + c.points
      })
      setRewardData(
        Object.entries(rulePoints).map(([type, value]) => ({
          name: GAME_REWARD_RULE_TYPE_MAP[type]?.label || type,
          value,
        }))
      )

      // 成就解锁 Top
      const achCount: Record<string, number> = {}
      achs.forEach((a) => {
        achCount[a.achievement_id] = (achCount[a.achievement_id] || 0) + 1
      })
      const achTop = Object.entries(achCount)
        .map(([aid, count]) => ({ name: achMap[aid]?.name || '未知成就', count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10)
      setAchTopData(achTop)
    } catch (error) {
      handleApiError(error, 'GameAnalytics-加载统计')
    } finally {
      setLoading(false)
    }
  }, [dateRange, gameMap, achMap, ruleMap])

  useEffect(() => {
    loadMaps()
  }, [loadMaps])

  useEffect(() => {
    loadAnalytics()
  }, [loadAnalytics])

  return (
    <div style={{ padding: 24 }}>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Title level={4} style={{ margin: 0 }}>
          游戏数据分析
        </Title>
        <Space>
          <RangePicker value={dateRange} onChange={(d) => {
            if (d && d[0] && d[1]) setDateRange([d[0], d[1]])
          }} />
          <Button icon={<ReloadOutlined />} onClick={loadAnalytics} loading={loading}>
            刷新
          </Button>
        </Space>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 100 }}>
          <Spin size="large" />
        </div>
      ) : (
        <>
          {/* 指标卡 */}
          <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
            <Col xs={12} lg={6}>
              <Card>
                <Statistic title="参与用户数" value={totalUsers} suffix="人" />
              </Card>
            </Col>
            <Col xs={12} lg={6}>
              <Card>
                <Statistic title="总对局数" value={totalScores} suffix="局" />
              </Card>
            </Col>
            <Col xs={12} lg={6}>
              <Card>
                <Statistic title="通关率" value={clearRate} suffix="%" />
              </Card>
            </Col>
            <Col xs={12} lg={6}>
              <Card>
                <Statistic title="累计发放积分" value={totalPoints} suffix="分" />
              </Card>
            </Col>
          </Row>

          <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
            <Col xs={24} lg={12}>
              <Card title="各游戏对局数对比">
                {perGameData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={perGameData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="game" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="count" name="对局数" fill="#1890ff" maxBarSize={40} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <Empty description="暂无数据" />
                )}
              </Card>
            </Col>
            <Col xs={24} lg={12}>
              <Card title="每日对局趋势">
                {trendData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={trendData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="count" name="对局数" fill="#52c41a" maxBarSize={40} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <Empty description="暂无数据" />
                )}
              </Card>
            </Col>
          </Row>

          <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
            <Col xs={24} lg={12}>
              <Card title="各游戏通关率">
                {clearRateData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={clearRateData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="game" />
                      <YAxis unit="%" />
                      <Tooltip />
                      <Bar dataKey="rate" name="通关率" fill="#722ed1" maxBarSize={40} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <Empty description="暂无数据" />
                )}
              </Card>
            </Col>
            <Col xs={24} lg={12}>
              <Card title="积分发放构成（按规则类型）">
                {rewardData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={rewardData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        dataKey="value"
                        nameKey="name"
                        label={({ name, value }) => `${name}: ${value}`}
                      >
                        {rewardData.map((_, i) => (
                          <Cell key={`cell-${i}`} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <Empty description="暂无数据" />
                )}
              </Card>
            </Col>
          </Row>

          <Row gutter={[16, 16]}>
            <Col xs={24}>
              <Card title="成就解锁 Top 10">
                {achTopData.length > 0 ? (
                  <Table
                    dataSource={achTopData}
                    rowKey="name"
                    pagination={false}
                    size="small"
                    columns={[
                      { title: '排名', key: 'rank', width: 60, render: (_: any, __: any, i: number) => i + 1 },
                      { title: '成就', dataIndex: 'name', key: 'name' },
                      { title: '解锁人数', dataIndex: 'count', key: 'count', render: (v: number) => <Tag color="gold">{v}</Tag> },
                    ]}
                  />
                ) : (
                  <Empty description="暂无成就解锁数据" />
                )}
              </Card>
            </Col>
          </Row>
        </>
      )}
    </div>
  )
}

export default GameAnalytics
