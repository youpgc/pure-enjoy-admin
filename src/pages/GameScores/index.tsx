import React, { useState, useEffect, useCallback, useMemo } from 'react'
import {
  Alert,
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
import { loadTabFilters, usePersistTabFilters } from '../../utils/tabFilterCache'
import { usePagination } from '../../hooks/usePagination'
import { useMounted } from '../../hooks/useMounted'
import { useUsernames } from '../../hooks/useUsernames'
import { UserName } from '../../components/common/UserName'
import { useGameMeta } from '../../utils/gameMetaCache'
import { GAME_STATUS_MAP } from '../../constants'
import { supabase } from '../../utils/supabase'
import {
  gameScoreService,
  gameScoreValueService,
} from '../../services/gameService'
import type {
  DbGameScore,
  DbGameScoreValue,
  DbGameMode,
  DbGameLevel,
} from '../../types/database'
import styles from './index.module.css'
import common from '../../styles/common.module.css'

const { Text } = Typography

/// 按关卡 config/target 生成通关条件中文描述（各模式键见游戏模块配置参考文档 §3.3/§6）
///
/// [gameCode] 用于区分语义：g2048 的 target 是「合成目标方块」而非得分。
/// 注意：config 里的 types（方块种类数）/layers（堆叠深度）是难度旋钮而非
/// 通关条件，不进入描述（2026-09-10 用户反馈展示内容不符）。
function levelConditionDesc(
  lv: Record<string, any> | undefined,
  gameCode?: string
): string {
  if (!lv) return '-'
  const c = (lv.config ?? {}) as Record<string, any>
  const parts: string[] = []
  if (c.time_limit) parts.push(`限时 ${c.time_limit}s`)
  else if (c.timeLimit) parts.push(`限时 ${c.timeLimit}s`)
  if (c.moves || c.max_moves) parts.push(`限 ${c.moves ?? c.max_moves} 步`)
  if (c.goal) parts.push(`得分≥${c.goal}`)
  if (c.jelly || c.jelly_layers) parts.push(`果冻 ${c.jelly ?? c.jelly_layers} 层`)
  // 颜色收集目标（新数组口径 / 旧单值口径）
  const collectDesc = (arr: any[]): string =>
    arr
      .map((g) => `${'●'}${g.type}×${g.count}`)
      .join(' + ')
  if (Array.isArray(c.collect) && c.collect.length) parts.push(collectDesc(c.collect))
  else if (c.ingredients) parts.push(`收集 ${c.ingredients} 个`)
  if (c.orders) parts.push(`收集 ${c.orders} 个`)
  if (c.ice) parts.push(`冰块 ${c.ice}`)
  if (Array.isArray(c.iceCollect) && c.iceCollect.length) parts.push(collectDesc(c.iceCollect))
  if (typeof c.target === 'number') {
    // g2048 的 target = 合成目标方块（256/512/…/2048），与得分无关
    parts.push(gameCode === 'g2048' ? `合成 ${c.target}` : `目标 ${c.target}`)
  }
  const t = lv.target as Record<string, any> | null
  if (!parts.length && t?.score) parts.push(`得分≥${t.score}`)
  if (!parts.length && t?.type === 'none') parts.push('合成目标方块')
  return parts.length ? parts.join(' · ') : '-'
}
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

  // ===== 无尽模式会话聚合（2026-09-10）=====
  // 无尽链式对局每局一条 score（level_id 为空，合成关非 uuid），明细行显示
  // 「关卡 - / 条件 -」且未聚合成会话。此处按 App 游戏记录同口径聚合：
  // 同用户、同无尽模式、相邻两局 played_at ≤ 30min → 合并为一行（N 局/累计）。
  const modeById = useMemo(() => {
    const m: Record<string, DbGameMode> = {}
    ;(meta?.modes ?? []).forEach((x) => (m[x.id] = x))
    return m
  }, [meta])
  const endlessModeIds = useMemo(
    () =>
      new Set(
        (meta?.modes ?? []).filter((x) => x.code === 'endless').map((x) => x.id)
      ),
    [meta]
  )
  // level_id 为空的行（无尽/部分 2048 对局）用该模式 L001 的 config 兜底展示条件
  const baseLevelByMode = useMemo(() => {
    const m: Record<string, DbGameLevel> = {}
    ;(meta?.levels ?? []).forEach((l) => {
      if (l.mode_id == null) return
      const cur = m[l.mode_id]
      if (!cur || l.level_no < cur.level_no) m[l.mode_id] = l
    })
    return m
  }, [meta])

  // 页签刷新筛选恢复（tabs 右键刷新=重挂载，保持用户当前筛选）
  const restoredFilters = loadTabFilters('game_scores')
  const [gameFilter, setGameFilter] = useState<string>(
    (restoredFilters.gameFilter as string) ?? 'all'
  )
  // 模式筛选与游戏联动：选「全部」时禁用；切换游戏时重置为全部
  const [modeFilter, setModeFilter] = useState<string>(
    (restoredFilters.modeFilter as string) ?? 'all'
  )
  const [statusFilter, setStatusFilter] = useState<string>(
    (restoredFilters.statusFilter as string) ?? 'all'
  )
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(
    (restoredFilters.dateRange as [dayjs.Dayjs, dayjs.Dayjs] | null) ?? null
  )

  const [scores, setScores] = useState<DbGameScore[]>([])
  const [loading, setLoading] = useState(false)
  const pager = usePagination()

  // 页签刷新筛选持久化（卸载时写回快照）
  usePersistTabFilters('game_scores', { gameFilter, modeFilter, statusFilter, dateRange })

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
          if (modeFilter !== 'all') builder = builder.eq('mode_id', modeFilter)
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
  }, [gameFilter, modeFilter, statusFilter, dateRange, pager.pagination.current, pager.pagination.pageSize, pager.setTotal])

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
  // 无尽会话聚合行：拉取合并范围内全部明细，按维度聚合口径合并
  // （sum→累计、max→取最大、min→取最小、latest/其它→首局值）
  const handleExpand = async (scoreId: string, mergedIds?: string[]) => {
    const ids = mergedIds ?? [scoreId]
    if (expandedValues[scoreId]) return
    setExpandingId(scoreId)
    try {
      const lists = await Promise.all(ids.map((id) => gameScoreValueService.getScoreValues(id)))
      if (!mountedRef.current) return
      const all: DbGameScoreValue[] = []
      lists.forEach((res) => {
        if (res.success && res.data) all.push(...(res.data as DbGameScoreValue[]))
      })
      // 按 dimension_id 合并
      const byDim: Record<string, { row: DbGameScoreValue; values: number[] }> = {}
      for (const v of all) {
        let slot = byDim[v.dimension_id]
        if (!slot) {
          slot = { row: v, values: [] }
          byDim[v.dimension_id] = slot
        }
        slot.values.push(Number(v.value))
      }
      const mergedVals = Object.values(byDim).map(({ row, values }) => {
        const agg = dimMap[row.dimension_id]?.aggregate
        let value: number
        if (agg === 'sum') value = values.reduce((a, b) => a + b, 0)
        else if (agg === 'max') value = Math.max(...values)
        else if (agg === 'min') value = Math.min(...values)
        else value = values[0] ?? 0
        return { ...row, value }
      })
      setExpandedValues((prev) => ({ ...prev, [scoreId]: mergedVals }))
    } catch (error) {
      handleApiError(error, 'GameScores-维度值')
    } finally {
      setExpandingId(null)
    }
  }

  const displayRows = useMemo(() => {
    type Merged = DbGameScore & {
      _mergedIds: string[]
      _rounds: number
      _endPlayed: string | null
      _totalMs: number | null
    }
    const sorted = [...scores].sort((a, b) =>
      (a.played_at ?? '').localeCompare(b.played_at ?? '')
    )
    const out: Merged[] = []
    let cur: Merged | null = null
    const flush = () => {
      if (cur) out.push(cur)
      cur = null
    }
    for (const r of sorted) {
      const isEndless = r.mode_id != null && endlessModeIds.has(r.mode_id)
      if (!isEndless) {
        flush()
        out.push(r as Merged)
        continue
      }
      const t = r.played_at ? dayjs(r.played_at) : null
      const prevT = cur?.played_at ? dayjs(cur.played_at) : null
      const continuable =
        cur &&
        cur.user_id === r.user_id &&
        cur.mode_id === r.mode_id &&
        t &&
        prevT &&
        t.diff(prevT, 'minute') <= 30
      if (continuable && cur) {
        cur._mergedIds.push(r.id)
        cur._rounds += 1
        cur._endPlayed = r.played_at
        if (r.duration_ms != null) {
          cur._totalMs = (cur._totalMs ?? 0) + r.duration_ms
        }
      } else {
        flush()
        cur = {
          ...r,
          _mergedIds: [r.id],
          _rounds: 1,
          _endPlayed: r.played_at,
          _totalMs: r.duration_ms,
        }
      }
    }
    flush()
    // 按游玩时间倒序还原展示顺序
    return out.sort((a, b) =>
      (b.played_at ?? '').localeCompare(a.played_at ?? '')
    )
  }, [scores, endlessModeIds])

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
      width: 200,
      render: (v: string | null, record) => {
        // 无尽会话聚合行：显示「无尽模式 · N 局」
        const merged = record as DbGameScore & { _rounds?: number }
        if (merged._rounds && merged._rounds > 1) {
          const modeName =
            (merged.mode_id != null ? modeById[merged.mode_id]?.name : null) ??
            '无尽模式'
          return `${modeName} · ${merged._rounds} 局`
        }
        if (v) return levelMap[v]?.name ?? '关卡'
        // 无 level_id（2048 等无关卡感对局）：回退模式名，不再显示 '-'
        return record.mode_id != null
          ? modeById[record.mode_id]?.name ?? '-'
          : '-'
      },
    },
    {
      title: '通关条件',
      key: 'level_condition',
      render: (_: unknown, record) => {
        const merged = record as DbGameScore & { _rounds?: number }
        // 无尽会话聚合行：条件为链式累计（每局目标随关卡阶梯上升）
        if (merged._rounds && merged._rounds > 1) {
          return `链式会话累计（${merged._rounds} 局合计）`
        }
        const gameCode = gameMap[record.game_id]?.code
        // 有 level_id 用该关 config；无 level_id 用该模式 L001 的 config 兜底
        const lv = record.level_id
          ? levelMap[record.level_id]
          : record.mode_id != null
            ? baseLevelByMode[record.mode_id]
            : null
        if (!lv) return '-'
        return levelConditionDesc(lv, gameCode)
      },
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
      render: (v: number | null, record) => {
        // 无尽会话聚合行：显示整段会话累计耗时
        const merged = record as DbGameScore & { _totalMs?: number | null }
        const ms = merged._totalMs ?? v
        return ms == null ? '-' : `${(ms / 1000).toFixed(1)}s`
      },
    },
    {
      title: '游玩时间',
      dataIndex: 'played_at',
      key: 'played_at',
      render: (d: string, record) => {
        // 无尽会话聚合行：显示会话起止时间
        const merged = record as DbGameScore & {
          _rounds?: number
          _endPlayed?: string | null
        }
        if (merged._rounds && merged._rounds > 1 && merged._endPlayed) {
          const start = dayjs(d)
          const end = dayjs(merged._endPlayed)
          const fmt = (t: dayjs.Dayjs) =>
            start.isSame(end, 'day')
              ? t.format('HH:mm:ss')
              : t.format('MM-DD HH:mm:ss')
          return `${start.format('MM-DD HH:mm:ss')} ~ ${fmt(end)}`
        }
        return dayjs(d).format('YYYY-MM-DD HH:mm:ss')
      },
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
    <div>
      <Alert
        type="info"
        showIcon
        className={common.mb16}
        message="成绩看板说明"
        description="成绩按对局记录展示（不含「放弃」）；「通关条件」列由关卡 config 自动生成中文描述（得分/步数/冰块/收集目标/方块类型等）。左侧「全部最佳成绩」为各游戏主维度全局最佳（服务端聚合）；明细行可展开查看各维度取值；无尽模式会话在本看板已按 App 同口径聚合展示（同用户相邻 ≤30 分钟合并为「N 局」会话行，展开为累计维度值；跨分页的会话会在页边界拆分）。"
      />
      {/* 最佳成绩概览 */}
      <Card
        title="最佳成绩概览（各游戏主维度全局最佳）"
        className={common.mb16}
        extra={
          <Button size="small" icon={<ReloadOutlined />} onClick={loadBestOverview} loading={overviewLoading}>
            刷新
          </Button>
        }
      >
        {overviewLoading ? (
          <div className={styles.centerSpin}>
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
                render: (d: string | null) => (d ? dayjs(d).format('YYYY-MM-DD HH:mm:ss') : '-'),
              },
            ]}
          />
        ) : (
          <Empty description="暂无成绩数据" />
        )}
      </Card>

      {/* 筛选栏 */}
      <Card className={common.mb16}>
        <Space wrap>
          <Text>游戏：</Text>
          <Select
            className={styles.selW200}
            value={gameFilter}
            onChange={(v) => {
              setGameFilter(v)
              // 联动：切换游戏时重置模式筛选（原模式可能不属于新游戏）
              setModeFilter('all')
              pager.resetPage()
            }}
            options={[{ value: 'all', label: '全部' }, ...games.map((g) => ({ value: g.id, label: g.name }))]}
          />
          <Text>模式：</Text>
          <Select
            className={styles.selW200}
            value={modeFilter}
            disabled={gameFilter === 'all'}
            placeholder={gameFilter === 'all' ? '先选游戏' : undefined}
            onChange={(v) => {
              setModeFilter(v)
              pager.resetPage()
            }}
            options={[
              { value: 'all', label: '全部' },
              ...(meta?.modesByGameId[gameFilter] ?? []).map((m) => ({ value: m.id, label: m.name })),
            ]}
          />
          <Text>状态：</Text>
          <Select
            className={styles.selW140}
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
        dataSource={displayRows}
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
            const merged = record as DbGameScore & { _mergedIds?: string[] }
            if (expanded) handleExpand(record.id, merged._mergedIds)
          },
        }}
      />
    </div>
  )
}

export default GameScores
