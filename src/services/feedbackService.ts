import { BaseService } from '../utils/apiClient'
import { supabase } from '../utils/supabase'
import type { Database } from '../types/database'

type FeedbackRow = Database['public']['Tables']['user_feedback']['Row']

/// 用户反馈管理服务（封装 user_feedback 和 feedback_flow_records 的 CRUD）
class FeedbackService extends BaseService<FeedbackRow> {
  constructor() {
    super('user_feedback', { defaultOrder: { column: 'created_at', ascending: false } })
  }

  /// 分页查询反馈列表
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
      let builder = q
      if (options?.keyword) {
        const text = `%${options.keyword}%`
        builder = builder.or(`title.ilike.${text},user_nickname.ilike.${text}`)
      }
      if (options?.category) builder = builder.eq('category', options.category)
      if (options?.status) builder = builder.eq('status', options.status)
      return builder
    })
  }

  /// 更新反馈状态
  async updateStatus(id: string, status: string, operatorId?: string, operatorName?: string) {
    const updateResult = await this.update(id, { status } as Partial<FeedbackRow>)
    if (!updateResult.success) return updateResult

    // 添加处理流水
    if (operatorId && operatorName) {
      const { error } = await supabase
        .from('feedback_flow_records')
        .insert({
          feedback_id: id,
          status,
          operator_id: operatorId,
          operator_name: operatorName,
          created_at: new Date().toISOString(),
        } as any)
      if (error) {
        console.warn('处理流水记录失败:', error.message)
      }
    }
    return updateResult
  }
}

export const feedbackService = new FeedbackService()
