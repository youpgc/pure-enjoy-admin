// 排行榜模块类型与常量（从 Rankings.tsx 抽离，审查 P1 膨胀）

export interface RankingItem {
  novel_id: string
  title: string
  author: string | null
  cover_url: string | null
  category: string | null
  status: string | null
  total_reads: number
  total_collects: number
  avg_rating: number
  rating_count: number
  daily_reads: number
  daily_collects: number
  weekly_reads: number
  weekly_collects: number
  monthly_reads: number
  monthly_collects: number
  created_at: string
  computed_at: string
}

export type RankingType =
  | 'daily_reads'
  | 'weekly_reads'
  | 'monthly_reads'
  | 'total_reads'
  | 'daily_collects'
  | 'weekly_collects'
  | 'monthly_collects'
  | 'total_collects'
  | 'avg_rating'
  | 'new_books'

export interface Intervention {
  pin_ids: string[]
  block_ids: string[]
}

export interface RankingRules {
  rating_min_count: number
  new_book_days_threshold: number
  read_weight: number
  collect_weight: number
  rating_weight: number
}

export const RANKING_OPTIONS = [
  { label: '日榜·阅读', value: 'daily_reads' },
  { label: '周榜·阅读', value: 'weekly_reads' },
  { label: '月榜·阅读', value: 'monthly_reads' },
  { label: '总榜·阅读', value: 'total_reads' },
  { label: '日榜·收藏', value: 'daily_collects' },
  { label: '周榜·收藏', value: 'weekly_collects' },
  { label: '月榜·收藏', value: 'monthly_collects' },
  { label: '总榜·收藏', value: 'total_collects' },
  { label: '评分榜', value: 'avg_rating' },
  { label: '新书榜', value: 'new_books' },
]

export const DEFAULT_RULES: RankingRules = {
  rating_min_count: 10,
  new_book_days_threshold: 30,
  read_weight: 1.0,
  collect_weight: 1.0,
  rating_weight: 1.0,
}
