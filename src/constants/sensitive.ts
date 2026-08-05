// ==================== 敏感词 ====================

export const SENSITIVE_CATEGORY_MAP: Record<string, { color: string; label: string }> = {
  political: { color: 'red', label: '政治' },
  pornographic: { color: 'orange', label: '色情' },
  violence: { color: 'volcano', label: '暴力' },
  advertising: { color: 'blue', label: '广告' },
  other: { color: 'default', label: '其他' },
  // 以下为 App 实际写入的分类（审查：前面映射缺失导致显示原始值）
  novel: { color: 'purple', label: '小说' },
  spam: { color: 'blue', label: '垃圾广告' },
  fraud: { color: 'red', label: '诈骗' },
  abuse: { color: 'volcano', label: '辱骂' },
}

export const SENSITIVE_CATEGORY_OPTIONS = [
  { label: '政治', value: 'political' },
  { label: '色情', value: 'pornographic' },
  { label: '暴力', value: 'violence' },
  { label: '广告', value: 'advertising' },
  { label: '其他', value: 'other' },
  { label: '小说', value: 'novel' },
  { label: '垃圾广告', value: 'spam' },
  { label: '诈骗', value: 'fraud' },
  { label: '辱骂', value: 'abuse' },
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
  // 以下为 App 实际写入的匹配模式（审查：前面映射缺失导致显示原始值）
  contains: { color: 'cyan', label: '包含' },
  replace: { color: 'geekblue', label: '替换' },
  block: { color: 'red', label: '屏蔽' },
}

export const SENSITIVE_MATCH_MODE_OPTIONS = [
  { label: '精确', value: 'exact' },
  { label: '模糊', value: 'fuzzy' },
  { label: '正则', value: 'regex' },
  { label: '包含', value: 'contains' },
  { label: '替换', value: 'replace' },
  { label: '屏蔽', value: 'block' },
]

// 敏感词命中来源（sensitive_word_logs.source，自由字符串，由各业务端写入）
export const SENSITIVE_SOURCE_MAP: Record<string, { color: string; label: string }> = {
  comment: { color: 'blue', label: '评论' },
  content: { color: 'cyan', label: '正文' },
  mood: { color: 'purple', label: '心情' },
  note: { color: 'green', label: '笔记' },
  annotation: { color: 'geekblue', label: '批注' },
  bookmark: { color: 'orange', label: '书签' },
  feedback: { color: 'volcano', label: '反馈' },
  bio: { color: 'default', label: '简介' },
  nickname: { color: 'default', label: '昵称' },
  title: { color: 'default', label: '标题' },
  chat: { color: 'magenta', label: '聊天' },
  post: { color: 'gold', label: '帖子' },
}

export const SENSITIVE_SOURCE_OPTIONS = Object.entries(SENSITIVE_SOURCE_MAP).map(
  ([value, { label }]) => ({ label, value }),
)

// 敏感词处理方式（sensitive_word_logs.action_taken）
export const SENSITIVE_ACTION_MAP: Record<string, { color: string; label: string }> = {
  none: { color: 'default', label: '未处理' },
  blocked: { color: 'red', label: '已屏蔽' },
  replaced: { color: 'orange', label: '已替换' },
  warned: { color: 'gold', label: '已警告' },
  ignored: { color: 'default', label: '已忽略' },
  masked: { color: 'blue', label: '已打码' },
  deleted: { color: 'volcano', label: '已删除' },
}

export const SENSITIVE_ACTION_OPTIONS = Object.entries(SENSITIVE_ACTION_MAP).map(
  ([value, { label }]) => ({ label, value }),
)
