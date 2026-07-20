// 敏感词模块共享类型定义

export interface SensitiveWord {
  id: string
  word: string
  category: string
  level: 'low' | 'medium' | 'high'
  replace_word?: string
  description?: string
  match_mode: 'exact' | 'fuzzy' | 'regex'
  is_active: boolean
  hit_count: number
  created_by?: string
  created_at: string
  updated_at?: string
}

export interface SensitiveWordFilters {
  keyword: string
  category: string | undefined
  level: string | undefined
}
