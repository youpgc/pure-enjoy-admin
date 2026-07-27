// ==================== 公告 ====================

export const ANNOUNCEMENT_TYPE_MAP: Record<string, { color: string; label: string }> = {
  system: { color: 'blue', label: '系统' },
  activity: { color: 'green', label: '活动' },
  maintenance: { color: 'orange', label: '维护' },
}

export const ANNOUNCEMENT_TYPE_OPTIONS = [
  { label: '系统', value: 'system' },
  { label: '活动', value: 'activity' },
  { label: '维护', value: 'maintenance' },
]

export const PRIORITY_MAP: Record<string, { color: string; label: string }> = {
  high: { color: 'red', label: '高' },
  medium: { color: 'orange', label: '中' },
  low: { color: 'blue', label: '低' },
}

export const PRIORITY_OPTIONS = [
  { label: '高', value: 'high' },
  { label: '中', value: 'medium' },
  { label: '低', value: 'low' },
]
