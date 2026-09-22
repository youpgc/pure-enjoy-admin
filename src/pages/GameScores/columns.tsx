import { Tag, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { formatDurationSmart } from '../../utils/durationFormat'
import { formatDateTime } from '../../utils/format'
import { UserName } from '../../components/common/UserName'
import { useUsernames } from '../../hooks/useUsernames'
import { useGameMeta } from '../../utils/gameMetaCache'
import { GAME_STATUS_MAP } from '../../constants'
import type {
  DbGameScore,
  DbGameScoreValue,
  DbGameMode,
  DbGameLevel,
} from '../../types/database'
import { levelConditionDesc } from './levelCondition'
import type { BestOverviewRow } from './types'

// GameScores 三张表格的列定义（从 index.tsx 抽离，审查 P1 单文件超 500 行）
// 纯代码搬迁，渲染逻辑与文案零变更。

const { Text } = Typography

type GameMeta = NonNullable<ReturnType<typeof useGameMeta>>
type UserMap = ReturnType<typeof useUsernames>

// 毫秒类维度（value_type=duration_ms 或 unit=ms）统一按秒展示
const isMsDim = (dim?: { value_type?: string; unit?: string | null }) =>
  dim?.value_type === 'duration_ms' || dim?.unit === 'ms'

interface ScoreColumnsParams {
  userMap: UserMap
  gameMap: GameMeta['gameMapById']
  levelMap: GameMeta['levelMap']
  modeById: Record<string, DbGameMode>
  baseLevelByMode: Record<string, DbGameLevel>
  isEndlessRow: (record: DbGameScore) => boolean
}

/// 成绩主表列
export function buildScoreColumns(
  params: ScoreColumnsParams
): ColumnsType<DbGameScore> {
  const { userMap, gameMap, levelMap, modeById, baseLevelByMode, isEndlessRow } =
    params
  return [
    {
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
        if (v) {
          // 关卡名种子自带「游戏·模式」前缀（如「2048·经典模式 L001」），
          // 「游戏」列已展示游戏名，此处剥掉前缀避免重复
          const raw = levelMap[v]?.name
          if (!raw) return '关卡'
          const gameName = gameMap[record.game_id]?.name
          const prefix = gameName ? `${gameName}·` : ''
          return prefix && raw.startsWith(prefix) ? raw.slice(prefix.length) : raw
        }
        // 无 level_id（无尽会话 / 2048 等无关卡感对局）：回退模式名
        return record.mode_id != null
          ? modeById[record.mode_id]?.name ?? '-'
          : '-'
      },
    },
    {
      title: '通关条件',
      key: 'level_condition',
      render: (_: unknown, record) => {
        // 无尽会话主行：链式累计得分（每局目标随关卡阶梯上升，逐局见局明细展开表）
        if (isEndlessRow(record)) return '无尽模式 · 累计得分'
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
      title: '耗时',
      dataIndex: 'duration_ms',
      key: 'duration_ms',
      width: 130,
      // 进阶时间单位（2026-09-11）：秒→分秒→时分秒，与 App 端同口径
      render: (v: number | null) => (v == null ? '-' : formatDurationSmart(v)),
    },
    {
      title: '游玩时间',
      dataIndex: 'played_at',
      key: 'played_at',
      render: (d: string) => formatDateTime(d),
    },
  ]
}

/// 维度值展开表列（历史行回退）
export function buildValueColumns(
  dimMap: GameMeta['dimMap']
): ColumnsType<DbGameScoreValue> {
  return [
    {
      title: '维度',
      dataIndex: 'dimension_id',
      key: 'dimension_id',
      render: (id: string) => dimMap[id]?.name || id,
    },
    {
      title: '数值',
      dataIndex: 'value',
      key: 'value',
      render: (v: number, row: DbGameScoreValue) => {
        const dim = dimMap[row.dimension_id]
        return isMsDim(dim) ? formatDurationSmart(v) : v
      },
    },
    {
      title: '单位',
      dataIndex: 'dimension_id',
      key: 'unit',
      render: (id: string) => {
        const dim = dimMap[id]
        // 时间类维度值已带进阶单位，单位列不再重复标注
        if (isMsDim(dim)) return '-'
        return dim?.unit || '-'
      },
    },
  ]
}

/// 最佳成绩概览列
export function buildBestColumns(
  userMap: UserMap
): ColumnsType<BestOverviewRow> {
  return [
    { title: '游戏', dataIndex: 'gameName', key: 'gameName' },
    { title: '主维度', dataIndex: 'dimName', key: 'dimName' },
    {
      title: '最佳值',
      key: 'value',
      render: (_, r) => {
        const ms = r.unit === 'ms'
        return (
          <Text strong>
            {ms ? formatDurationSmart(r.value) : r.value}{' '}
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
      render: (d: string | null) => (d ? formatDateTime(d) : '-'),
    },
  ]
}
