// ==================== 反馈 ====================

export const FEEDBACK_STATUS_MAP: Record<string, { color: string; label: string }> = {
  pending: { color: 'default', label: '待确认' },
  confirmed: { color: 'processing', label: '已确认' },
  in_progress: { color: 'warning', label: '处理中' },
  resolved: { color: 'success', label: '已完结' },
  rejected: { color: 'error', label: '已拒绝' },
  delayed: { color: 'orange', label: '已滞后' },
}

// 反馈状态/动作枚举单一源（避免页面硬编码）
export const FEEDBACK_STATUS_PENDING = 'pending'
export const FEEDBACK_ACTION_DELETED = 'deleted'

export const FEEDBACK_CATEGORY_MAP: Record<string, { color: string; label: string }> = {
  bug: { color: 'error', label: 'Bug' },
  feature: { color: 'processing', label: '功能建议' },
  improvement: { color: 'warning', label: '体验优化' },
  other: { color: 'default', label: '其他' },
}

export const FEEDBACK_STATUS_ACTIONS: Record<string, string[]> = {
  pending: ['confirmed', 'rejected'],
  confirmed: ['in_progress', 'delayed', 'rejected'],
  in_progress: ['resolved', 'delayed', 'rejected'],
  resolved: [],
  rejected: [],
  delayed: ['in_progress', 'resolved', 'rejected'],
}

// 小说推荐反馈类型（与 FEEDBACK_CATEGORY_MAP 无关，属另一枚举：用户对推荐结果的反馈）
export const RECOMMENDATION_FEEDBACK_TYPE_MAP: Record<string, { color: string; label: string }> = {
  click: { color: 'blue', label: '点击' },
  dismiss: { color: 'default', label: '忽略' },
  collect: { color: 'magenta', label: '收藏' },
  read: { color: 'green', label: '阅读' },
  not_interested: { color: 'red', label: '不感兴趣' },
}
