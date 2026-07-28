// ==================== 小说 ====================

export const NOVEL_CATEGORY_MAP: Record<string, string> = {
  '修真': '修真',
  '玄幻': '玄幻',
  xuanhuan: '玄幻',
  xianxia: '仙俠',
  dushi: '都市',
  urban: '都市',
  lishi: '历史',
  fantasy: '玄幻',
  wuxia: '武俠',
  romance: '言情',
  kehuan: '科幻',
  scifi: '科幻',
  youxi: '游戏',
  history: '历史',
  mystery: '悬疑',
  xuanyi: '悬疑',
  game: '游戏',
  other: '其他',
  lingyi: '灵异',
  yanqing: '言情',
  qita: '其他',
}

export const NOVEL_CATEGORY_OPTIONS = [
  { label: '玄幻', value: '玄幻' },
  { label: '修真', value: '修真' },
  { label: '都市', value: '都市' },
  { label: '言情', value: '言情' },
  { label: '科幻', value: '科幻' },
  { label: '历史', value: '历史' },
  { label: '游戏', value: '游戏' },
  { label: '悬疑', value: '悬疑' },
  { label: '武俠', value: '武俠' },
  { label: '灵异', value: '灵异' },
  { label: '其他', value: '其他' },
]

export const NOVEL_STATUS_MAP: Record<string, string> = {
  ongoing: '连载中',
  completed: '已完结',
}

export const NOVEL_STATUS_COLORS: Record<string, string> = {
  ongoing: 'green',
  completed: 'blue',
}

export const NOVEL_STATUS_OPTIONS = [
  { label: '连载中', value: 'ongoing' },
  { label: '已完结', value: 'completed' },
]

// 聚合来源（source 字段取值）
export const NOVEL_SOURCE_MAP: Record<string, string> = {
  original: '原创',
  zongheng: '纵横',
  faloo: '飞卢',
  '17k': '17K',
  douban: '豆瓣',
}

// 聚合书（非原创）来源集合，用于标签着色
export const NOVEL_AGGREGATED_SOURCES = new Set(['zongheng', 'faloo', '17k', 'douban'])

export const NOVEL_SOURCE_OPTIONS = [
  { label: '原创', value: 'original' },
  { label: '纵横', value: 'zongheng' },
  { label: '飞卢', value: 'faloo' },
  { label: '17K', value: '17k' },
  { label: '豆瓣', value: 'douban' },
]
