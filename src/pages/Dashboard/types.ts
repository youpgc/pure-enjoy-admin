// Dashboard 模块类型定义（从 Dashboard.tsx 抽取）

export interface NovelListItem {
  id: string
  title: string
  author: string | null
  read_count: number | null
  rating: number | null
  created_at: string
  category: string | null
}

export interface CommentItem {
  id: string
  novel_id: string
  user_id: string
  user_nickname: string | null
  novel_title: string | null
  content: string
  rating: number | null
  created_at: string
}

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
  activeToday: number
  activeWeek: number
  activeMonth: number
  retention: number
  retentionChange: number
}

export interface NovelStats {
  total: number
  totalRead: number
  readers: number
  newReaders: number
}

export interface TrendPoint {
  date: string
  count: number
}
