// ==================== 通知 ====================

export const NOTIFICATION_TYPE_MAP: Record<string, { color: string; label: string }> = {
  system: { color: 'blue', label: '系统' },
  user: { color: 'green', label: '用户' },
  novel: { color: 'purple', label: '小说' },
  activity: { color: 'orange', label: '活动' },
  // 以下为 App 实际写入的通知类型（审查：前面映射缺失导致显示原始值）
  update: { color: 'blue', label: '更新' },
  reminder: { color: 'orange', label: '提醒' },
  habit: { color: 'green', label: '习惯' },
  announcement: { color: 'geekblue', label: '公告' },
  comment: { color: 'cyan', label: '评论' },
  message: { color: 'magenta', label: '私信' },
}

export const NOTIFICATION_TYPE_TAG_MAP: Record<string, string> = {
  system: '系统通知',
  user: '用户通知',
  novel: '小说通知',
  activity: '活动通知',
  update: '更新通知',
  reminder: '提醒通知',
  habit: '习惯通知',
  announcement: '公告通知',
  comment: '评论通知',
  message: '私信通知',
}

export const NOTIFICATION_TYPE_OPTIONS = [
  { label: '系统', value: 'system' },
  { label: '用户', value: 'user' },
  { label: '小说', value: 'novel' },
  { label: '活动', value: 'activity' },
  { label: '更新', value: 'update' },
  { label: '提醒', value: 'reminder' },
  { label: '习惯', value: 'habit' },
  { label: '公告', value: 'announcement' },
  { label: '评论', value: 'comment' },
  { label: '私信', value: 'message' },
]
