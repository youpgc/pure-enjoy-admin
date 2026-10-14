// 数据分析模块类型（从 Analytics.tsx 抽离，审查 P1 膨胀）
// 小说域（novelStats / topNovels / 新增小说 / 新增章节）已随小说模块下线整体剥离，
// 前端代码有分支备份；后期如需恢复请补后端通道后从分支取回。

export interface DailyStat {
  date: string
  newUsers: number
  activeUsers: number
  newFeedback: number
}
