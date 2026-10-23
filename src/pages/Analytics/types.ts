// 数据分析模块类型与常量（从 Analytics.tsx 抽离，审查 P1 膨胀）

export interface DailyStat {
  date: string
  newUsers: number
  newFeedback: number
}
