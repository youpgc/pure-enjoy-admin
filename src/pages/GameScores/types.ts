// GameScores 页共享类型（从 index.tsx 抽离，审查 P1 单文件超 500 行）

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
