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

/// 对局详情快照（game_scores.run_detail，西行首个接入；database.ts 生成
/// 类型滞后于线上新增列，此处局部扩展，勿改生成文件）。
export type RunDetail = Record<string, unknown>

export const runDetailOf = (record: DbGameScore): RunDetail | null =>
  (record as { run_detail?: RunDetail | null }).run_detail ?? null

/// 关卡展示名：剥掉种子自带的「游戏名·」前缀（「游戏」列已展示游戏名，避免重复）。
/// 成绩列表「关卡」列与对局详情弹窗标题共用，保证两处口径一致。
export function displayLevelName(raw: string, gameName?: string): string {
  const prefix = gameName ? `${gameName}·` : ''
  return prefix && raw.startsWith(prefix) ? raw.slice(prefix.length) : raw
}
