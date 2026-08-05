// 数据分析模块类型与常量（从 Analytics.tsx 抽离，审查 P1 膨胀）

export interface DailyStat {
  date: string
  newUsers: number
  activeUsers: number
  newNovels: number
  newChapters: number
  newFeedback: number
}

export interface NovelStat {
  category: string
  count: number
}

export interface TopNovel {
  title: string
  author: string
  read_count: number
  chapter_count: number
}

export const COLORS = ['#1890ff', '#52c41a', '#faad14', '#ff4d4f', '#722ed1', '#13c2c2']
