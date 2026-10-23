// Dashboard 模块类型定义（从 Dashboard.tsx 抽取）

export interface RecentActivity {
  id: string
  action: string
  module: string | null
  user_id: string | null
  created_at: string
  user_nickname: string | null
}

export interface UserStats {
  total: number
  newToday: number
  newWeek: number
  newMonth: number
}

export interface TrendPoint {
  date: string
  count: number
}

// ==================== 游戏模块（Dashboard 概览） ====================

/** 游戏模块统计卡片数据 */
export interface GameStats {
  /** 游戏总数 */
  total: number
  /** 启用中游戏数 */
  enabled: number
  /** 累计成绩数（game_scores） */
  scoresTotal: number
  /** 今日成绩数 */
  scoresToday: number
  /** 今日活跃玩家（去重） */
  playersToday: number
  /** 本周活跃玩家（去重，近似值） */
  playersWeek: number
  /** 今日积分发放（game_reward_claims.points 合计） */
  pointsToday: number
}

/** 游戏数据概览表行（按游戏聚合） */
export interface GameOverviewRow {
  id: string
  name: string
  code: string
  engine: string
  enabled: boolean
  /** 累计成绩数 */
  scoresTotal: number
  /** 今日成绩数 */
  scoresToday: number
  /** 今日活跃玩家（去重） */
  playersToday: number
  /** 今日积分发放 */
  pointsToday: number
}
