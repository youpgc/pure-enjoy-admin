// ==================== 支出分类 ====================

export const EXPENSE_CATEGORY_MAP: Record<string, string> = {
  food: '餐饮',
  transport: '交通',
  communication: '通讯',
  shopping: '购物',
  entertainment: '娱乐',
  health: '医疗',
  housing: '居住',
  education: '教育',
  other: '其他',
}

// ==================== 心情 ====================

export const MOOD_TYPE_MAP: Record<string, string> = {
  happy: '开心',
  excited: '兴奋',
  calm: '平静',
  neutral: '一般',
  sad: '难过',
  anxious: '焦虑',
  angry: '生气',
  tired: '疲惫',
  grateful: '感恩',
}

export const MOOD_COLOR_MAP: Record<string, string> = {
  happy: '#52c41a',
  sad: '#1890ff',
  angry: '#ff4d4f',
  anxious: '#faad14',
  calm: '#13c2c2',
  excited: '#eb2f96',
  tired: '#8c8c8c',
}

// ==================== 笔记分类 ====================

export const NOTE_CATEGORY_MAP: Record<string, string> = {
  work: '工作',
  life: '生活',
  study: '学习',
  idea: '灵感',
  travel: '旅行',
  other: '其他',
}

// ==================== 收藏分类 ====================

export const FAVORITE_CATEGORY_MAP: Record<string, string> = {
  other: '其他',
  novel: '小说',
  note: '笔记',
  expense: '消费',
  mood: '心情',
}

// ==================== 提醒重复类型 ====================

export const REPEAT_TYPE_MAP: Record<string, string> = {
  none: '不重复',
  daily: '每天',
  weekly: '每周',
  monthly: '每月',
  yearly: '每年',
  weekday: '工作日',
  weekend: '周末',
  custom: '自定义',
}
