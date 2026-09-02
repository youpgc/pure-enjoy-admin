import { useState, useEffect, useCallback } from 'react'
import {
  Table,
  Tabs,
  Button,
  Tag,
  Card,
  Statistic,
  Row,
  Col,
  Segmented,
} from 'antd'
import { ReloadOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import { supabase } from '../../utils/supabase'
import { handleApiError } from '../../utils/apiClient'
import { usePagination } from '../../hooks/usePagination'
import { useMounted } from '../../hooks/useMounted'
import dayjs from 'dayjs'
import styles from './index.module.css'
import common from '../../styles/common.module.css'

type DbPointRecord = {
  id: string
  user_id: string
  type: string
  amount: number
  remark: string | null
  created_at: string
}
type DbRewardClaim = {
  id: string
  user_id: string
  game_id: string | null
  rule_id: string | null
  claim_key: string | null
  points: number
  claimed_at: string
}
type DbUser = { id: string; nickname: string | null; phone: string | null }
type DbGame = { id: string; name: string }
type DbRewardRule = { id: string; name: string | null; rule_type: string }
type DbAchievement = { code: string; name: string }

const fmtLocal = (iso: string | null) =>
  iso ? dayjs(iso).format('YYYY-MM-DD HH:mm') : '-'

const userName = (id: string, map: Record<string, string>) => map[id] || id.slice(0, 8)

export default function GameRewardRecords() {
  const mountedRef = useMounted()
  const [tab, setTab] = useState<'flow' | 'claims'>('flow')
  const [loading, setLoading] = useState(false)
  // 服务端分页（默认 10 条/页，切换 Tab 时归首页）
  const pager = usePagination()

  const [gameMap, setGameMap] = useState<Record<string, string>>({})
  const [userMap, setUserMap] = useState<Record<string, string>>({})
  const [ruleMap, setRuleMap] = useState<Record<string, string>>({})
  const [achievementMap, setAchievementMap] = useState<Record<string, string>>({})

  const [flowType, setFlowType] = useState<string>('all')

  const [flow, setFlow] = useState<DbPointRecord[]>([])
  const [claims, setClaims] = useState<DbRewardClaim[]>([])
  const [earnTotal, setEarnTotal] = useState(0)
  const [spendTotal, setSpendTotal] = useState(0)

  const loadMaps = useCallback(async () => {
    const [gRes, uRes, rRes, aRes] = await Promise.all([
      supabase.from('games').select('id,name'),
      supabase.from('users').select('id,nickname,phone') as any,
      supabase.from('game_reward_rules').select('id,name,rule_type') as any,
      supabase.from('game_achievements').select('code,name') as any,
    ])
    if (!mountedRef.current) return
    if (gRes.data) {
      const gm: Record<string, string> = {}
      gRes.data.forEach((g: DbGame) => (gm[g.id] = g.name))
      setGameMap(gm)
    }
    if (uRes.data) {
      const um: Record<string, string> = {}
      uRes.data.forEach((u: DbUser) => (um[u.id] = u.nickname || u.phone || u.id.slice(0, 8)))
      setUserMap(um)
    }
    if (rRes.data) {
      const rm: Record<string, string> = {}
      rRes.data.forEach((r: DbRewardRule) => (rm[r.id] = r.name || r.rule_type))
      setRuleMap(rm)
    }
    if (aRes.data) {
      const am: Record<string, string> = {}
      aRes.data.forEach((a: DbAchievement) => (am[a.code] = a.name))
      setAchievementMap(am)
    }
  }, [mountedRef])

  const loadFlow = useCallback(async () => {
    setLoading(true)
    try {
      const from = (pager.pagination.current - 1) * pager.pagination.pageSize
      const to = from + pager.pagination.pageSize - 1
      let q = supabase
        .from('point_records')
        .select('id,user_id,type,amount,remark,created_at', { count: 'exact' })
        .in('type', ['game_earn', 'game_spend'])
        .order('created_at', { ascending: false })
        .range(from, to) as any
      const { data, error, count } = await q
      if (error) {
        handleApiError(error, 'GameRewardRecords-积分流水')
        return
      }
      if (!mountedRef.current) return
      const list = (data || []) as DbPointRecord[]
      setFlow(list)
      if (count != null) pager.setTotal(count)
      setEarnTotal(list.filter((r) => r.type === 'game_earn').reduce((s, r) => s + r.amount, 0))
      setSpendTotal(
        list.filter((r) => r.type === 'game_spend').reduce((s, r) => s + Math.abs(r.amount), 0)
      )
    } finally {
      setLoading(false)
    }
  }, [mountedRef, pager.pagination.current, pager.pagination.pageSize, pager.setTotal])

  // 奖励领取：流水来自 game_reward_claims（含成就与规则发放，point_records 已含对应 game_earn）
  const loadClaims = useCallback(async () => {
    setLoading(true)
    try {
      const from = (pager.pagination.current - 1) * pager.pagination.pageSize
      const to = from + pager.pagination.pageSize - 1
      let q = supabase
        .from('game_reward_claims')
        .select('id,user_id,game_id,rule_id,claim_key,points,claimed_at', { count: 'exact' })
        .order('claimed_at', { ascending: false })
        .range(from, to) as any
      const { data, error, count } = await q
      if (error) {
        handleApiError(error, 'GameRewardRecords-奖励领取')
        return
      }
      if (!mountedRef.current) return
      setClaims((data || []) as DbRewardClaim[])
      if (count != null) pager.setTotal(count)
    } finally {
      setLoading(false)
    }
  }, [mountedRef, pager.pagination.current, pager.pagination.pageSize, pager.setTotal])

  useEffect(() => {
    loadMaps()
  }, [loadMaps])

  useEffect(() => {
    // 切 Tab 归首页，避免两个 Tab 共用 pager 串页
    pager.resetPage()
  }, [tab, pager.resetPage])

  useEffect(() => {
    if (tab === 'flow') loadFlow()
    else loadClaims()
  }, [tab, loadFlow, loadClaims])

  const flowColumns: ColumnsType<DbPointRecord> = [
    { title: '用户', dataIndex: 'user_id', key: 'user_id', render: (id: string) => userName(id, userMap) },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      width: 110,
      render: (t: string) =>
        t === 'game_earn' ? <Tag color="green">获取</Tag> : <Tag color="red">消费</Tag>,
    },
    {
      title: '积分',
      dataIndex: 'amount',
      key: 'amount',
      width: 100,
      render: (v: number, r) => (
        <span style={{ color: r.type === 'game_earn' ? '#389e0d' : '#cf1322', fontWeight: 600 }}>
          {r.type === 'game_earn' ? `+${v}` : v}
        </span>
      ),
    },
    { title: '备注', dataIndex: 'remark', key: 'remark', render: (v: string | null) => v || '-' },
    {
      title: '时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 160,
      render: (v: string) => fmtLocal(v),
    },
  ]

  // 按 claim_key 解析「用户具体达成了哪条规则/成就」。
  // claim_key 格式（与 App GameRewardService 一致）：
  //   achievement:{code}          -> 成就达成（取 game_achievements.name）
  //   daily_first_clear:{date}    -> 每日首次通关
  //   score_range:{gameCode}:{ruleId} -> 成绩区间规则（取 game_reward_rules.name）
  //   level_clear[:once]:{levelId}[:uuid] -> 每关通关奖励
  // 旧数据无 claim_key 时回退到 rule_id 映射。
  const renderClaimTarget = (claim: DbRewardClaim) => {
    const key = claim.claim_key
    if (key) {
      if (key.startsWith('achievement:')) {
        const code = key.slice('achievement:'.length)
        const name = achievementMap[code]
        return <Tag color="gold">成就：{name || code}</Tag>
      }
      if (key.startsWith('daily_first_clear:')) {
        return <Tag color="blue">每日首次通关</Tag>
      }
      if (key.startsWith('score_range:')) {
        const parts = key.split(':')
        const ruleId = parts.length >= 3 ? parts[2] : ''
        const name = ruleId ? ruleMap[ruleId] || '成绩达标' : '成绩达标'
        return <Tag color="cyan">{name}</Tag>
      }
      if (key.startsWith('level_clear')) {
        return <Tag color="green">通关奖励</Tag>
      }
    }
    // 兜底：无 claim_key 的历史数据
    return claim.rule_id ? (
      ruleMap[claim.rule_id] || claim.rule_id
    ) : (
      <Tag color="gold">成就达成</Tag>
    )
  }

  const claimColumns: ColumnsType<DbRewardClaim> = [
    { title: '用户', dataIndex: 'user_id', key: 'user_id', render: (id: string) => userName(id, userMap) },
    {
      title: '游戏',
      dataIndex: 'game_id',
      key: 'game_id',
      width: 110,
      render: (id: string | null) => (id ? gameMap[id] || id : <Tag>全局</Tag>),
    },
    {
      title: '规则/成就',
      key: 'claim_target',
      render: (_: unknown, r: DbRewardClaim) => renderClaimTarget(r),
    },
    {
      title: '积分',
      dataIndex: 'points',
      key: 'points',
      width: 90,
      render: (v: number) => <span className={styles.claimPoints}>+{v}</span>,
    },
    {
      title: '时间',
      dataIndex: 'claimed_at',
      key: 'claimed_at',
      width: 160,
      render: (v: string) => fmtLocal(v),
    },
  ]

  const filteredFlow = flowType === 'all'
    ? flow
    : flow.filter((r) => r.type === (flowType === 'earn' ? 'game_earn' : 'game_spend'))

  return (
    <div className={common.p24}>
      <Card
        title="游戏奖励记录"
        extra={
          <Button
            icon={<ReloadOutlined />}
            onClick={() => (tab === 'flow' ? loadFlow() : loadClaims())}
            loading={loading}
          >
            刷新
          </Button>
        }
      >
        <Tabs
          activeKey={tab}
          onChange={(k) => setTab(k as 'flow' | 'claims')}
          items={[
            {
              key: 'flow',
              label: '积分流水（获取/消费）',
              children: (
                <>
                  <Row gutter={16} className={common.mb16}>
                    <Col span={8}>
                      <Statistic title="累计获取（游戏）" value={earnTotal} suffix="分" className={styles.statEarn} />
                    </Col>
                    <Col span={8}>
                      <Statistic title="累计消费（游戏）" value={spendTotal} suffix="分" className={styles.statSpend} />
                    </Col>
                    <Col span={8}>
                      <Segmented
                        value={flowType}
                        onChange={(v) => setFlowType(v as string)}
                        options={[
                          { label: '全部', value: 'all' },
                          { label: '获取', value: 'earn' },
                          { label: '消费', value: 'spend' },
                        ]}
                      />
                    </Col>
                  </Row>
                  <Table
                    rowKey="id"
                    loading={loading}
                    columns={flowColumns}
                    dataSource={filteredFlow}
                    pagination={pager.tablePagination}
                    size="middle"
                  />
                </>
              ),
            },
            {
              key: 'claims',
              label: '游戏奖励领取',
              children: (
                <Table
                  rowKey="id"
                  loading={loading}
                  columns={claimColumns}
                  dataSource={claims}
                  pagination={pager.tablePagination}
                  size="middle"
                />
              ),
            },
          ]}
        />
      </Card>
    </div>
  )
}
