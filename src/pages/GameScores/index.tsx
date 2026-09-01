import React, { useState, useEffect, useCallback } from 'react'
import {
  Table,
  Tag,
  Card,
  Space,
  Button,
  Select,
  Typography,
  DatePicker,
  Spin,
  Empty,
} from 'antd'
import { ReloadOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import { handleApiError } from '../../utils/apiClient'
import { usePagination } from '../../hooks/usePagination'
import { useMounted } from '../../hooks/useMounted'
import { useUsernames } from '../../hooks/useUsernames'
import { UserName } from '../../components/UserName'
import { useGameMeta } from '../../utils/gameMetaCache'
import { GAME_STATUS_MAP } from '../../constants'
import { supabase } from '../../utils/supabase'
import {
  gameScoreService,
  gameScoreValueService,
} from '../../services/gameService'
import type { DbGameScore, DbGameScoreValue } from '../../types/database'

const { Text } = Typography
const { RangePicker } = DatePicker

// 毫秒类维度（value_type=duration_ms 或 unit=ms）统一按秒展示
const isMsDim = (dim?: { value_type?: string; unit?: string | null }) =>
  dim?.value_type === 'duration_ms' || dim?.unit === 'ms'

interface BestOverviewRow {
  gameId: string
  gameName: string
  dimName: string
  unit: string | null
  value: number
  userId: string
  playedAt: string | null
}

const GameScores: React.FC = () => {
  const mountedRef = useMounted()

  // 全局游戏元数据（games/levels/dimensions 仅请求一次，跨页复用，消除看板闪烁）。
  const meta = useGameMeta()
  const gameMap = meta?.gameMapById ?? {}
  const levelMap = meta?.levelMap ?? {}
  const dimMap = meta?.dimMap ?? {}
  const games = meta?.games ?? []

  const [gameFilter, setGameFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null)

  const [scores, setScores] = useState<DbGameScore[]>([])
  const [loading, setLoading] = useState(false)
  const pager = usePagination()

  const [expandedValues, setExpandedValues] = useState<Record<string, DbGameScoreValue[]>>({})
  const [expandingId, setExpandingId] = useState<string | null>(null)

  const [bestRows, setBestRows] = useState<BestOverviewRow[]>([])
  const [overviewLoading, setOverviewLoading] = useState(false)

  const userIds = Array.from(new Set(scores.map((s) => s.user_id).concat(bestRows.map((b) => b.userId))))
  const userMap = useUsernames(userIds)

  // ========== 加载成绩列表 ==========
  const loadScores = useCallback(async () => {
    setLoading(true)
    try {
      const result = await gameScoreService.paginate(
        pager.pagination.current,
        pager.pagination.pageSize,
        (q) => {
          let builder = q
          if (gameFilter !== 'all') builder = builder.eq('game_id', gameFilter)
          if (statusFilter !== 'all') builder = builder.eq('status', statusFilter)
          if (dateRange?.[0]) builder = builder.gte('played_at', dateRange[0].format('YYYY-MM-DD'))
          if (dateRange?.[1]) builder = builder.lte('played_at', dateRange[1].format('YYYY-MM-DD') + 'T23:59:59')
          return builder
        }
      )
      if (!result.success) {
        handleApiError(result.errorMessage, 'GameScores-加载')
        return
      }
      if (!mountedRef.current) return
      setScores(result.data?.data || [])
      pager.setTotal(result.data?.total || 0)
    } catch (error) {
      handleApiError(error, 'GameScores-加载')
    } finally {
      setLoading(false)
    }
  }, [gameFilter, statusFilter, dateRange, pager.pagination.current, pager.pagination.pageSize, pager.setTotal])

  // ========== 最佳成绩概览（各游戏主维度全局最佳） ==========
  // 主维度直接取自全局缓存 meta.dimensions（不再额外请求接口）；
  // 仅 game_score_values 的「数据」查询按维度循环，这是数据而非配置，无法避免。
  const loadBestOverview = useCallback(async () => {
    if (!meta) return
    setOverviewLoading(true)
    try {
      const primaryDims = meta.dimensions.filter((d) => d.is_primary)
      const rows: BestOverviewRow[] = []
      for (const d of primaryDims) {
        // EAV：按聚合方向取最优一条，并附带所属 game_scores（用于取 user_id / status 过滤）
        const { data } = await (supabase as any)
          .from('game_score_values')
          .select('value, score:score_id(game_id, user_id, status, played_at)')
          .eq('dimension_id', d.id)
          .order('value', { ascending: d.aggregate !== 'max' })
          .limit(100)
        const list = (data as unknown as Array<{
          value: number
          score: { game_id: string; user_id: string; status: string; played_at: string | null } | null
        }> | null) || []
        const cleared = list.filter((r) => r.score?.status === 'cleared')
        const best = cleared[0] || list[0]
        if (best?.score) {
          rows.push({
            gameId: best.score.game_id,
            gameName: meta.gameMapById[best.score.game_id]?.name || '未知游戏',
            dimName: d.name,
            unit: d.unit,
            value: best.value,
            userId: best.score.user_id,
            playedAt: best.score.played_at,
          })
        }
      }
      if (!mountedRef.current) return
      setBestRows(rows)
    } catch (error) {
      handleApiError(error, 'GameScores-最佳成绩概览')
    } finally {
      setOverviewLoading(false)
    }
  }, [meta, mountedRef])

  useEffect(() => {
    loadScores()
  }, [loadScores])

  // 最佳概览随 meta 就绪加载一次；filter 变化只重查成绩列表，不再连带动重查概览。
  // 手动「刷新」按钮直接调用 loadBestOverview()（见 Card extra）。
  useEffect(() => {
    loadBestOverview()
  }, [loadBestOverview])

  // ========== 展开维度值 ==========
  const handleExpand = async (scoreId: string) => {
    if (expandedValues[scoreId]) return
    setExpandingId(scoreId)
    try {
      const res = await gameScoreValueService.getScoreValues(scoreId)
      if (!mountedRef.current) return
      if (res.success && res.data) {
        setExpandedValues((prev) => ({ ...prev, [scoreId]: res.data as DbGameScoreValue[] }))
      }
    } catch (error) {
      handleApiError(error, 'GameScores-维度值')
    } finally {
      setExpandingId(null)
    }
  }

  const columns: ColumnsType<DbGameScore> = [    {
      title: '用户',
      dataIndex: 'user_id',
      key: 'user_id',
      width: 140,
      render: (v: string) => <UserName userId={v} userMap={userMap} />,
    },
    {
      title: '游戏',
      dataIndex: 'game_id',
      key: 'game_id',
      width: 140,
      render: (v: string) => gameMap[v]?.name || v,
    },
    {
      title: '关卡',
      dataIndex: 'level_id',
      key: 'level_id',
      width: 120,
      render: (v: string | null) => (v ? (levelMap[v]?.name ?? '关卡') : '-'),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 90,
      render: (v: string) => {
        const info = GAME_STATUS_MAP[v] || { color: 'default', label: v }
        return <Tag color={info.color}>{info.label}</Tag>
      },
    },
    {
      title: '耗时(s)',
      dataIndex: 'duration_ms',
      key: 'duration_ms',
      width: 110,
      render: (v: number | null) => (v == null ? '-' : `${(v / 1000).toFixed(1)}s`),
    },
    {
      title: '游玩时间',
      dataIndex: 'played_at',
      key: 'played_at',
      render: (d: string) => dayjs(d).format('YYYY-MM-DD HH:mm:ss'),
    },
  ]

  const valueColumns = [
    { title: '维度', dataIndex: 'dimension_id', key: 'dimension_id', render: (id: string) => dimMap[id]?.name || id },
    {
      title: '数值',
      dataIndex: 'value',
      key: 'value',
      render: (v: number, row: DbGameScoreValue) => {
        const dim = dimMap[row.dimension_id]
        return isMsDim(dim) ? `${(v / 1000).toFixed(1)}s` : v
      },
    },
    {
      title: '单位',
      dataIndex: 'dimension_id',
      key: 'unit',
      render: (id: string) => {
        const dim = dimMap[id]
        if (isMsDim(dim)) return 's'
        return dim?.unit || '-'
      },
    },
  ]

  return (
    <div style={{ padding: 24 }}>
      {/* 最佳成绩概览 */}
      <Card
        title="最佳成绩概览（各游戏主维度全局最佳）"
        style={{ marginBottom: 16 }}
        extra={
          <Button size="small" icon={<ReloadOutlined />} onClick={loadBestOverview} loading={overviewLoading}>
            刷新
          </Button>
        }
      >
        {overviewLoading ? (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <Spin />
          </div>
        ) : bestRows.length > 0 ? (
          <Table
            dataSource={bestRows}
            rowKey={(r) => `${r.gameId}-${r.dimName}`}
            pagination={false}
            size="small"
            columns={[
              { title: '游戏', dataIndex: 'gameName', key: 'gameName' },
              { title: '主维度', dataIndex: 'dimName', key: 'dimName' },
              {
                title: '最佳值',
                key: 'value',
                render: (_, r) => {
                  const ms = r.unit === 'ms'
                  return (
                    <Text strong>
                      {ms ? `${(r.value / 1000).toFixed(1)}s` : r.value}{' '}
                      {ms ? '' : r.unit || ''}
                    </Text>
                  )
                },
              },
              {
                title: '达成用户',
                dataIndex: 'userId',
                key: 'userId',
                render: (v: string) => <UserName userId={v} userMap={userMap} />,
              },
              {
                title: '达成时间',
                dataIndex: 'playedAt',
                key: 'playedAt',
                render: (d: string | null) => (d ? dayjs(d).format('YYYY-MM-DD HH:mm') : '-'),
              },
            ]}
          />
        ) : (
          <Empty description="暂无成绩数据" />
        )}
      </Card>

      {/* 筛选栏 */}
      <Card style={{ marginBottom: 16 }}>
        <Space wrap>
          <Text>游戏：</Text>
          <Select
            style={{ width: 200 }}
            value={gameFilter}
            onChange={(v) => {
              setGameFilter(v)
              pager.resetPage()
            }}
            options={[{ value: 'all', label: '全部' }, ...games.map((g) => ({ value: g.id, label: g.name }))]}
          />
          <Text>状态：</Text>
          <Select
            style={{ width: 140 }}
            value={statusFilter}
            onChange={(v) => {
              setStatusFilter(v)
              pager.resetPage()
            }}
            options={[
              { value: 'all', label: '全部' },
              { value: 'cleared', label: '通关' },
              { value: 'failed', label: '失败' },
              { value: 'aborted', label: '放弃' },
            ]}
          />
          <RangePicker value={dateRange} onChange={(d) => {
            setDateRange(d as [dayjs.Dayjs, dayjs.Dayjs] | null)
            pager.resetPage()
          }} />
          <Button icon={<ReloadOutlined />} onClick={loadScores} loading={loading}>
            刷新
          </Button>
        </Space>
      </Card>

      <Table
        columns={columns}
        dataSource={scores}
        rowKey="id"
        loading={loading}
        pagination={pager.tablePagination}
        scroll={{ x: 'max-content' }}
        expandable={{
          expandedRowRender: (record) => {
            const vals = expandedValues[record.id]
            if (expandingId === record.id && !vals) {
              return <Spin size="small" />
            }
            if (!vals || vals.length === 0) {
              return <Text type="secondary">无维度值</Text>
            }
            return (
              <Table
                dataSource={vals}
                rowKey="id"
                pagination={false}
                size="small"
                columns={valueColumns}
              />
            )
          },
          onExpand: (expanded, record) => {
            if (expanded) handleExpand(record.id)
          },
        }}
      />
    </div>
  )
}

export default GameScores
