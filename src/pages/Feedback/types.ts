// Feedback 模块类型定义（从 Feedback.tsx 抽取）

export interface FeedbackRecord {
  id: string
  user_id: string
  user_nickname: string | null
  title: string
  description: string | null
  category: string
  status: string
  admin_reply: string | null
  created_at: string
  updated_at: string | null
}

export interface FlowRecord {
  id: string
  feedback_id: string
  action: string
  remark: string | null
  operator_id: string | null
  operator_name: string | null
  created_at: string
}
