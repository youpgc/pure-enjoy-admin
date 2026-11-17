// GameScores 页共享类型（从 index.tsx 抽离，审查 P1 单文件超 500 行）

import type { DbGameLevel, DbGameScore } from '../../types/database'

/// 最佳成绩概览行：各游戏主维度的全局最佳一条
export interface BestOverviewRow {
  gameId: string
  gameName: string
  dimName: string
  unit: string | null
  value: number
  userId: string
  playedAt: string | null
}

/// 成绩行 + DB 侧内嵌的关卡（成绩分页时随行返回）。
/// 内嵌为 many-to-one：level_id 为空（无尽会话 / 合成关）时为 null。
export type ScoreRow = DbGameScore & {
  game_levels?: Pick<DbGameLevel, 'id' | 'name' | 'level_no' | 'config' | 'target'> | null
}
