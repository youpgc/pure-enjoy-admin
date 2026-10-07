import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import {
  Alert,
  Table,
  Card,
  Space,
  Button,
  Select,
  Input,
  Typography,
  DatePicker,
  Spin,
  Empty,
} from 'antd'
import { ReloadOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import { beijingNow } from '../../utils/format'
import { handleApiError } from '../../utils/apiClient'
import { loadTabFilters, usePersistTabFilters } from '../../utils/tabFilterCache'
import EndlessRoundsExpand, { type EndlessRoundRow } from './EndlessRoundsExpand'
import { usePagination } from '../../hooks/usePagination'
import { useMounted } from '../../hooks/useMounted'
import { useUsernames } from '../../hooks/useUsernames'
import { useGameMeta } from '../../utils/gameMetaCache'
import { userService } from '../../services/userService'
import { useNavigation } from '../../App'
import {
  gameScoreService,
  gameScoreValueService,
  gameEndlessRoundService,
} from '../../services/gameService'
import type {
  DbGameScore,
  DbGameScoreValue,
  DbGameMode,
  DbGameLevel,
} from '../../types/database'
import { buildBestColumns, buildScoreColumns, buildValueColumns } from './columns'
import type { BestOverviewRow } from './types'
import styles from './index.module.css'
import common from '../../styles/common.module.css'

// 列定义与通关条件描述已抽离（审查 P1 单文件超 500 行）：
// ./columns.tsx（三张表格列）/ ./levelCondition.tsx（config → 中文描述）/ ./types.ts

const { RangePicker } = DatePicker
const { Text } = Typography

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
  // 默认排除「放弃」（aborted 仅诊断对局时长用，混入正常成绩列表易误导）
  const [statusFilter, setStatusFilter] = useState<string>(
    (restoredFilters.statusFilter as string) ?? 'not_aborted'
  )
  // 用户名模糊筛选（2026-09-15）：关键字 → 先按 users 表 username/nickname ilike
  // 定位业务 ID（接口查询），再以 id 集合过滤 game_scores
  const [usernameFilter, setUsernameFilter] = useState<string>(
    (restoredFilters.usernameFilter as string) ?? ''
  )
  // 时间筛选：深链（数据概览「今日成绩」卡片带 { dateRange: 'today' }）优先于
  // 页签恢复快照；首挂载直接初始化，避免「默认无筛选 → 今日」双重加载
  const { pageParams } = useNavigation()
  const initSig = pageParams?.['game_scores']
  const initToday =
    ((initSig?.data ?? {}) as { dateRange?: string }).dateRange === 'today'
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(
    initToday
      ? [beijingNow(), beijingNow()]
      : ((restoredFilters.dateRange as [dayjs.Dayjs, dayjs.Dayjs] | null) ?? null)
  )
  // keepalive 复用页签时组件不重挂载：按信号 seq 消费新的带参跳转
  const navSeqRef = useRef(initSig?.seq ?? 0)
  useEffect(() => {
    const sig = pageParams?.['game_scores']
    if (!sig || sig.seq <= navSeqRef.current) return
    navSeqRef.current = sig.seq
    if (((sig.data ?? {}) as { dateRange?: string }).dateRange === 'today') {
      setDateRange([beijingNow(), beijingNow()])
      pager.resetPage()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageParams])

  const [scores, setScores] = useState<DbGameScore[]>([])
  const [loading, setLoading] = useState(false)
  const pager = usePagination()

  // 页签刷新筛选持久化（卸载时写回快照）
  usePersistTabFilters('game_scores', { gameFilter, modeFilter, statusFilter, usernameFilter, dateRange })

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
      // 用户名模糊筛选（2026-09-15）：两步接口查询——先按关键字在 users 表
      // username/nickname ilike 定位业务 ID，再以 id 集合过滤 game_scores
      //（game_scores.user_id 存业务 ID，无法直接按人名过滤）。
      let userIds: string[] | null = null
      const kw = usernameFilter.trim()
      if (kw) {
        const res = await userService.findUserIdsByKeyword(kw)
        if (!res.success) return // service 已统一弹窗 + 记日志
        userIds = res.data ?? []
        if (userIds.length === 0) {
          // 关键字无命中用户：直接空结果，跳过主查询
          if (!mountedRef.current) return
          setScores([])
          pager.setTotal(0)
          return
        }
      }
      const result = await gameScoreService.paginate(
        pager.pagination.current,
        pager.pagination.pageSize,
        (q) => {
          let builder = q
          if (gameFilter !== 'all') builder = builder.eq('game_id', gameFilter)
          if (modeFilter !== 'all') builder = builder.eq('mode_id', modeFilter)
          if (statusFilter === 'not_aborted') builder = builder.neq('status', 'aborted')
          else if (statusFilter !== 'all') builder = builder.eq('status', statusFilter)
          if (userIds) builder = builder.in('user_id', userIds)
          if (dateRange?.[0]) builder = builder.gte('played_at', dateRange[0].format('YYYY-MM-DD'))
          if (dateRange?.[1]) builder = builder.lte('played_at', dateRange[1].format('YYYY-MM-DD') + 'T23:59:59+08:00')
          return builder
        }
      )
      // 读失败：BaseService 内部已统一弹窗+记日志，此处静默返回避免双弹窗
      if (!result.success) return
      if (!mountedRef.current) return
      setScores(result.data?.data || [])
      pager.setTotal(result.data?.total || 0)
    } catch (error) {
      handleApiError(error, 'GameScores-加载')
    } finally {
      setLoading(false)
    }
  }, [gameFilter, modeFilter, statusFilter, usernameFilter, dateRange, pager.pagination.current, pager.pagination.pageSize, pager.setTotal])

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
        // 2026-09-10 审查：裸 supabase.from 下沉到 gameScoreValueService（页面禁直连）
        const res = await gameScoreValueService.findTopByDimension(
          d.id,
          d.aggregate !== 'max'
        )
        if (!res.success) continue
        const list = (res.data as unknown as Array<{
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

  // ========== 展开明细 ==========
  // 2026-09-11 改造：无尽会话不再前端合并——会话主记录（每会话一条）展开时
  // 加载 game_endless_rounds 局明细（独立展开表）；其余行回退维度值表格。
  const handleExpand = async (scoreId: string) => {
    if (expandedValues[scoreId]) return
    setExpandingId(scoreId)
    try {
      const res = await gameScoreValueService.getScoreValues(scoreId)
      if (!mountedRef.current) return
      const vals = (res.success && res.data ? (res.data as DbGameScoreValue[]) : [])
      setExpandedValues((prev) => ({ ...prev, [scoreId]: vals }))
    } catch (error) {
      handleApiError(error, 'GameScores-维度值')
    } finally {
      setExpandingId(null)
    }
  }

  // 无尽局明细加载（独立展开表数据源）
  const [expandRounds, setExpandRounds] = useState<Record<string, EndlessRoundRow[]>>({})
  const [expandingRoundId, setExpandingRoundId] = useState<string | null>(null)
  const loadEndlessRounds = async (scoreId: string) => {
    if (expandRounds[scoreId]) return
    setExpandingRoundId(scoreId)
    try {
      const res = await gameEndlessRoundService.getRoundsByScoreId(scoreId)
      if (!mountedRef.current) return
      const rows = (res.success && res.data ? res.data : []) as unknown as EndlessRoundRow[]
      setExpandRounds((prev) => ({ ...prev, [scoreId]: rows }))
    } catch (error) {
      handleApiError(error, 'GameScores-无尽局明细')
    } finally {
      setExpandingRoundId(null)
    }
  }

  // 2026-09-11 改造：废弃前端合并聚合——无尽会话由 App 端按「一条主记录 +
  // 局明细数组」上传，主表每会话自然一行，展开走独立局明细表（EndlessRoundsExpand）。
  // 旧模型「每局一条」的历史行平铺展示，展开回退维度值表格。
  const displayRows = scores

  const isEndlessRow = (record: DbGameScore) =>
    record.mode_id != null && endlessModeIds.has(record.mode_id)

  const columns = buildScoreColumns({
    userMap,
    gameMap,
    levelMap,
    modeById,
    baseLevelByMode,
    isEndlessRow,
  })

  const valueColumns = buildValueColumns(dimMap)

  return (
    <div>
      <Alert
        type="info"
        showIcon
        className={common.mb16}
        message="成绩看板说明"
        description="成绩按对局记录展示（默认不含「放弃」，可在状态筛选中切换）；「通关条件」列由关卡 config 自动生成中文描述（得分/步数/冰块/收集目标/方块类型等）。左侧「全部最佳成绩」为各游戏主维度全局最佳（服务端聚合）。无尽模式：每段会话一条主记录，展开查看「局明细」表（第N局/得分/步数/用时，App 端总结算时上传）；历史会话（未上传明细）展开为维度值。"
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
            columns={buildBestColumns(userMap)}
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
              { value: 'not_aborted', label: '不含放弃' },
              { value: 'all', label: '全部' },
              { value: 'cleared', label: '通关' },
              { value: 'failed', label: '失败' },
              { value: 'aborted', label: '放弃' },
            ]}
          />
          <Text>用户名：</Text>
          <Input.Search
            className={styles.selW200}
            placeholder="模糊搜索用户名/昵称"
            allowClear
            value={usernameFilter}
            onChange={(e) => {
              // 清空即恢复全量（输入过程不触发查询，回车/点搜索才查询）
              if (!e.target.value && usernameFilter) {
                setUsernameFilter('')
                pager.resetPage()
              }
            }}
            onSearch={(v) => {
              setUsernameFilter(v.trim())
              pager.resetPage()
            }}
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
            // 无尽会话：独立局明细展开表（对局信息/得分/步数/用时 + 合计）
            if (isEndlessRow(record)) {
              const rounds = expandRounds[record.id]
              if (expandingRoundId === record.id && !rounds) {
                return <Spin size="small" />
              }
              if (!rounds || rounds.length === 0) {
                return <Text type="secondary">无局明细（历史会话未上传明细）</Text>
              }
              return <EndlessRoundsExpand rows={rounds} />
            }
            // 其余行：维度值表格（历史回退）
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
            if (!expanded) return
            if (isEndlessRow(record)) {
              loadEndlessRounds(record.id)
            } else {
              handleExpand(record.id)
            }
          },
        }}
      />
    </div>
  )
}

export default GameScores
