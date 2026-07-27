// ==================== 敏感词 ====================

export const SENSITIVE_CATEGORY_MAP: Record<string, { color: string; label: string }> = {
  political: { color: 'red', label: '政治' },
  pornographic: { color: 'orange', label: '色情' },
  violence: { color: 'volcano', label: '暴力' },
  advertising: { color: 'blue', label: '广告' },
  other: { color: 'default', label: '其他' },
}

export const SENSITIVE_CATEGORY_OPTIONS = [
  { label: '政治', value: 'political' },
  { label: '色情', value: 'pornographic' },
  { label: '暴力', value: 'violence' },
  { label: '广告', value: 'advertising' },
  { label: '其他', value: 'other' },
]

export const SENSITIVE_LEVEL_MAP: Record<string, { color: string; label: string }> = {
  low: { color: 'orange', label: '低' },
  medium: { color: 'red', label: '中' },
  high: { color: 'purple', label: '高' },
}

export const SENSITIVE_LEVEL_OPTIONS = [
  { label: '低', value: 'low' },
  { label: '中', value: 'medium' },
  { label: '高', value: 'high' },
]

export const SENSITIVE_MATCH_MODE_MAP: Record<string, { color: string; label: string }> = {
  exact: { color: 'blue', label: '精确' },
  fuzzy: { color: 'orange', label: '模糊' },
  regex: { color: 'purple', label: '正则' },
}

export const SENSITIVE_MATCH_MODE_OPTIONS = [
  { label: '精确', value: 'exact' },
  { label: '模糊', value: 'fuzzy' },
  { label: '正则', value: 'regex' },
]
