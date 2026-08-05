// 批注审核模块类型（从 Annotations.tsx 抽离，审查 P1 膨胀）

export interface NovelAnnotation {
  id: string
  user_id: string
  novel_id: string
  chapter_id: string
  chapter_order: number
  start_offset: number
  end_offset: number
  highlighted_text: string
  note: string | null
  color: string
  is_deleted: boolean
  deleted_at: string | null
  // 审核状态（新增，feature_admin_annotations_review.sql 注册）：pending 待审核 / approved 通过 / rejected 封禁
  review_status?: 'pending' | 'approved' | 'rejected' | null
  reviewed_at?: string | null
  reviewed_by?: string | null
  created_at: string
  updated_at: string
}

export interface TrendItem {
  date: string
  count: number
}
