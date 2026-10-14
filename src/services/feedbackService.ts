// 用户反馈管理数据访问层 —— 本地后端 /admin/feedbacks
// 列表（keyword/category/status 过滤，已排除软删）/ 详情（含流转记录）/ 回复改状态 / 软删除
// 操作人信息由后端从 JWT 解析，前端不再传递
import { apiRequest } from '../utils/adminHttp'

/// 后端 FeedbackVO 形态（snake_case 出参）
export interface FeedbackVO {
  id: string
  user_id: string | null
  user_nickname: string | null
  title: string
  description: string | null
  category: string
  status: string
  admin_reply: string | null
  flow: FlowRecordVO[]
  created_at: string
  updated_at: string | null
}

/// 后端 FeedbackFlowVO 形态
export interface FlowRecordVO {
  id: string
  action: string
  remark: string | null
  operator_name: string | null
  created_at: string
}

/// 后端 PageResult 形态
interface PageResultVO {
  list: FeedbackVO[]
  total: number
}

export const feedbackService = {
  /// 分页查询反馈列表（后端已排除软删除）
  paginateFeedback: (
    page: number,
    pageSize: number,
    options?: { keyword?: string; category?: string; status?: string }
  ) => {
    const params = new URLSearchParams({ page: String(page), page_size: String(pageSize) })
    if (options?.keyword) params.set('keyword', options.keyword)
    if (options?.category) params.set('category', options.category)
    if (options?.status) params.set('status', options.status)
    return apiRequest<PageResultVO>('GET', `/admin/feedbacks?${params.toString()}`)
  },

  /// 反馈详情（含流转记录 flow）
  detail: (id: string) => apiRequest<FeedbackVO>('GET', `/admin/feedbacks/${id}`),

  /// 更新状态并回复（后端单事务写流转记录；admin_reply 与 status 至少其一）
  updateStatus: async (id: string, status: string, remark: string) => {
    const body: Record<string, string> = {}
    if (status) body.status = status
    if (remark.trim()) body.admin_reply = remark.trim()
    return apiRequest<FeedbackVO>('PUT', `/admin/feedbacks/${id}`, body)
  },

  /// 软删除反馈（后端置 is_deleted 并写 deleted 流水）
  softDelete: (id: string, remark: string) => {
    const query = remark.trim() ? `?remark=${encodeURIComponent(remark.trim())}` : ''
    return apiRequest<FeedbackVO>('DELETE', `/admin/feedbacks/${id}${query}`)
  },
}
