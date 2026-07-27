// ==================== 版本管理 ====================

export const VERSION_STATUS_MAP: Record<string, { color: string; label: string }> = {
  released: { color: 'green', label: '已发布' },
  revoked: { color: 'orange', label: '已下架' },
  superseded: { color: 'default', label: '已失效' },
}

export const VERSION_STATUS_OPTIONS = [
  { label: '已发布', value: 'released' },
  { label: '已下架', value: 'revoked' },
  { label: '已失效', value: 'superseded' },
]

export const VERSION_PLATFORM_MAP: Record<string, { color: string; label: string }> = {
  ios: { color: 'blue', label: 'iOS' },
  android: { color: 'green', label: 'Android' },
  web: { color: 'purple', label: 'Web' },
}

export const VERSION_PLATFORM_OPTIONS = [
  { label: 'iOS', value: 'ios' },
  { label: 'Android', value: 'android' },
  { label: 'Web', value: 'web' },
]
