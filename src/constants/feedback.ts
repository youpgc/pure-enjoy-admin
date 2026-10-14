// ==================== 反馈 ====================

export const FEEDBACK_STATUS_MAP: Record<string, { color: string; label: string }> = {
  pending: { color: 'default', label: '待处理' },
  processing: { color: 'processing', label: '处理中' },
  resolved: { color: 'success', label: '已解决' },
  closed: { color: 'default', label: '已关闭' },
}

// 反馈状态/动作枚举单一源（避免页面硬编码）
export const FEEDBACK_STATUS_PENDING = 'pending'
export const FEEDBACK_ACTION_DELETED = 'deleted'

export const FEEDBACK_CATEGORY_MAP: Record<string, { color: string; label: string }> = {
  bug: { color: 'error', label: '功能异常' },
  suggestion: { color: 'processing', label: '功能建议' },
  complaint: { color: 'error', label: '投诉' },
  other: { color: 'default', label: '其他' },
}

// 状态可流转目标（与后端 FeedbackStatus 四态一致；deleted 走软删除路径）
export const FEEDBACK_STATUS_ACTIONS: Record<string, string[]> = {
  pending: ['processing', 'closed'],
  processing: ['resolved', 'closed'],
  resolved: [],
  closed: [],
}

// 小说推荐反馈类型（与 FEEDBACK_CATEGORY_MAP 无关，属另一枚举：用户对推荐结果的反馈）
export const RECOMMENDATION_FEEDBACK_TYPE_MAP: Record<string, { color: string; label: string }> = {
  click: { color: 'blue', label: '点击' },
  dismiss: { color: 'default', label: '忽略' },
  collect: { color: 'magenta', label: '收藏' },
  read: { color: 'green', label: '阅读' },
  not_interested: { color: 'red', label: '不感兴趣' },
}
