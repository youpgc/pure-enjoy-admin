// ==================== 通知 ====================

export const NOTIFICATION_TYPE_MAP: Record<string, { color: string; label: string }> = {
  system: { color: 'blue', label: '系统' },
  user: { color: 'green', label: '用户' },
  novel: { color: 'purple', label: '小说' },
  activity: { color: 'orange', label: '活动' },
}

export const NOTIFICATION_TYPE_TAG_MAP: Record<string, string> = {
  system: '系统通知',
  user: '用户通知',
  novel: '小说通知',
  activity: '活动通知',
}

export const NOTIFICATION_TYPE_OPTIONS = [
  { label: '系统', value: 'system' },
  { label: '用户', value: 'user' },
  { label: '小说', value: 'novel' },
  { label: '活动', value: 'activity' },
]
