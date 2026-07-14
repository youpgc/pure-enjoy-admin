import { BaseService, apiExecute } from '../utils/apiClient'
import { supabase } from '../utils/supabase'
import type { Database } from '../types/database'

type FeedbackRow = Database['public']['Tables']['user_feedback']['Row']

/// 用户反馈管理服务（封装 user_feedback 和 feedback_flow_records 的 CRUD）
class FeedbackService extends BaseService<FeedbackRow> {
  constructor() {
    super('user_feedback', { defaultOrder: { column: 'created_at', ascending: false } })
  }

  /// 分页查询反馈列表（排除已软删除）
  async paginateFeedback(
    page: number,
    pageSize: number,
    options?: {
      keyword?: string
      category?: string
      status?: string
    }
  ) {
    return this.paginate(page, pageSize, (q) => {
      let builder = q.eq('is_deleted', false)
      if (options?.keyword) {
        const text = `%${options.keyword}%`
        builder = builder.or(`title.ilike.${text},user_nickname.ilike.${text}`)
      }
      if (options?.category) builder = builder.eq('category', options.category)
      if (options?.status) builder = builder.eq('status', options.status)
      return builder
    })
  }

  /// 软删除反馈
  async softDelete(id: string, remark: string, operatorId: string, operatorName: string) {
    // 先记录流转
    const flowResult = await apiExecute(
      () => {
        // TODO: Supabase type inference issue - feedback_flow_records Insert resolves to never
        return (supabase.from('feedback_flow_records') as any).insert({
          feedback_id: id,
          action: 'deleted',
          remark: remark.trim() || '删除反馈记录',
          operator_id: operatorId,
          operator_name: operatorName,
        })
      },
      'FeedbackService-删除流水'
    )
    if (!flowResult.success) return flowResult

    // 再软删除
    return this.update(id, {
      is_deleted: true,
      deleted_at: new Date().toISOString(),
    } as Partial<FeedbackRow>)
  }

  /// 更新反馈状态并记录流转
  async updateStatus(id: string, status: string, remark: string, operatorId: string, operatorName: string) {
    // 记录流转
    const flowResult = await apiExecute(
      () => {
        // TODO: Supabase type inference issue - feedback_flow_records Insert resolves to never
        return (supabase.from('feedback_flow_records') as any).insert({
          feedback_id: id,
          action: status,
          remark: remark.trim(),
          operator_id: operatorId,
          operator_name: operatorName,
        })
      },
      'FeedbackService-状态流转'
    )
    if (!flowResult.success) return flowResult

    // 更新状态
    return this.update(id, { status, admin_reply: remark.trim() } as Partial<FeedbackRow>)
  }
}

export const feedbackService = new FeedbackService()
