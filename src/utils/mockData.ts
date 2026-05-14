import dayjs from 'dayjs'

// ==================== 用户列表 ====================
export interface MockUser {
  id: string
  name: string
  email: string
  phone: string
  avatar: string
  status: 'active' | 'inactive' | 'banned'
  created_at: string
  last_login: string
}

const userNames = [
  '张三', '李四', '王五', '赵六', '孙七', '周八', '吴九', '郑十',
  '陈晓明', '林小红', '黄大伟', '刘美丽', '杨志强', '徐静雯', '马天宇',
  '朱丽叶', '胡建华', '郭小明', '何芳芳', '罗文斌',
]

const mockUsers: MockUser[] = userNames.map((name, i) => ({
  id: `user_${String(i + 1).padStart(3, '0')}`,
  name,
  email: `${['zhangsan', 'lisi', 'wangwu', 'zhaoliu', 'sunqi', 'zhouba', 'wujiu', 'zhengshi', 'chenxm', 'linxh', 'huangdw', 'liuml', 'yangzq', 'xujw', 'maty', 'zhuly', 'hujh', 'guoxm', 'heff', 'luowb'][i]!}@example.com`,
  phone: `1${3 + (i % 8)}${String(Math.floor(Math.random() * 100000000)).padStart(8, '0')}`,
  avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}`,
  status: (['active', 'active', 'active', 'inactive', 'banned'] as const)[i % 5]!,
  created_at: dayjs().subtract(Math.floor(Math.random() * 180) + 1, 'day').format('YYYY-MM-DD HH:mm:ss'),
  last_login: dayjs().subtract(Math.floor(Math.random() * 7), 'day').format('YYYY-MM-DD HH:mm:ss'),
}))

// ==================== 消费记录 ====================
export interface MockExpense {
  id: string
  user_id: string
  user_name: string
  category: string
  amount: number
  description: string
  date: string
  created_at: string
}

const expenseCategories = ['餐饮', '交通', '购物', '娱乐', '其他']
const expenseDescriptions: Record<string, string[]> = {
  '餐饮': ['午餐外卖', '晚餐聚餐', '早餐咖啡', '水果零食', '奶茶饮品', '超市采购食材'],
  '交通': ['地铁充值', '打车回家', '共享单车月卡', '加油', '高铁票'],
  '购物': ['衣服', '日用品', '电子产品', '书籍', '家居用品'],
  '娱乐': ['电影票', '游戏充值', 'KTV', '健身月卡', '音乐会'],
  '其他': ['快递费', '理发', '手机话费', '水电费', '医疗'],
}

const mockExpenses: MockExpense[] = Array.from({ length: 30 }, (_, i) => {
  const category = expenseCategories[i % expenseCategories.length]!
  const descs = expenseDescriptions[category]!
  const user = mockUsers[i % mockUsers.length]!
  return {
    id: `expense_${String(i + 1).padStart(3, '0')}`,
    user_id: user.id,
    user_name: user.name,
    category,
    amount: parseFloat((Math.random() * 500 + 10).toFixed(2)),
    description: descs[i % descs.length]!,
    date: dayjs().subtract(i, 'day').format('YYYY-MM-DD'),
    created_at: dayjs().subtract(i, 'day').format('YYYY-MM-DD HH:mm:ss'),
  }
})

// ==================== 心情日记 ====================
export interface MockMoodDiary {
  id: string
  user_id: string
  user_name: string
  mood: string
  content: string
  date: string
  created_at: string
}

const moodTypes = ['开心', '平静', '一般', '难过', '焦虑']
const moodContents: Record<string, string[]> = {
  '开心': ['今天天气很好，心情愉快！', '和朋友一起出去玩，非常开心', '完成了一个重要的项目，很有成就感', '收到了一份意外的礼物'],
  '平静': ['普通的一天，按部就班', '读了一本好书，内心很平静', '在公园散步，享受宁静的时光', '整理了房间，感觉很好'],
  '一般': ['今天没什么特别的事', '工作有些忙碌，但还算顺利', '有点累，需要休息', '天气一般，心情也一般'],
  '难过': ['工作上遇到了一些困难', '和好朋友吵架了', '考试没考好，有些失落', '一个人在家，有点孤独'],
  '焦虑': ['明天有个重要的面试', '项目截止日期快到了', '最近压力比较大', '很多事情要做，感觉时间不够'],
}

const mockMoodDiaries: MockMoodDiary[] = Array.from({ length: 20 }, (_, i) => {
  const mood = moodTypes[i % moodTypes.length]!
  const contents = moodContents[mood]!
  const user = mockUsers[i % mockUsers.length]!
  return {
    id: `mood_${String(i + 1).padStart(3, '0')}`,
    user_id: user.id,
    user_name: user.name,
    mood,
    content: contents[i % contents.length]!,
    date: dayjs().subtract(i, 'day').format('YYYY-MM-DD'),
    created_at: dayjs().subtract(i, 'day').format('YYYY-MM-DD HH:mm:ss'),
  }
})

// ==================== 体重记录 ====================
export interface MockWeightRecord {
  id: string
  user_id: string
  user_name: string
  weight: number
  body_fat: number
  note: string
  date: string
  created_at: string
}

const mockWeightRecords: MockWeightRecord[] = Array.from({ length: 30 }, (_, i) => {
  const user = mockUsers[i % 5]!
  const baseWeight = 65 + (i % 5) * 3
  const weight = parseFloat((baseWeight - i * 0.05 + (Math.random() - 0.5) * 1.5).toFixed(1))
  return {
    id: `weight_${String(i + 1).padStart(3, '0')}`,
    user_id: user.id,
    user_name: user.name,
    weight,
    body_fat: parseFloat((18 + Math.random() * 12).toFixed(1)),
    note: ['', '控制饮食中', '运动后', '聚餐后', '正常记录'][i % 5]!,
    date: dayjs().subtract(i, 'day').format('YYYY-MM-DD'),
    created_at: dayjs().subtract(i, 'day').format('YYYY-MM-DD HH:mm:ss'),
  }
})

// ==================== 笔记 ====================
export interface MockNote {
  id: string
  user_id: string
  user_name: string
  title: string
  content: string
  category: string
  tags: string[]
  created_at: string
  updated_at: string
}

const noteTitles = [
  'React Hooks 学习笔记', 'TypeScript 高级类型', 'CSS Grid 布局指南',
  'Node.js 性能优化', 'Docker 入门教程', 'Git 常用命令',
  'Python 数据分析', '算法与数据结构', '设计模式总结',
  '前端工程化实践', 'MySQL 索引优化', 'Redis 缓存策略',
  '微服务架构设计', 'Kubernetes 部署指南', '代码审查最佳实践',
]

const noteCategories = ['技术', '生活', '读书', '工作']
const noteTags = ['JavaScript', 'TypeScript', 'React', 'Vue', 'Node.js', 'Python', 'CSS', 'HTML', 'DevOps', '数据库']

const mockNotes: MockNote[] = Array.from({ length: 15 }, (_, i) => {
  const user = mockUsers[i % mockUsers.length]!
  const tags = [noteTags[i % noteTags.length]!, noteTags[(i + 3) % noteTags.length]!]
  return {
    id: `note_${String(i + 1).padStart(3, '0')}`,
    user_id: user.id,
    user_name: user.name,
    title: noteTitles[i]!,
    content: `这是关于"${noteTitles[i]!}"的详细笔记内容，包含了核心概念、代码示例和实践经验。`,
    category: noteCategories[i % noteCategories.length]!,
    tags,
    created_at: dayjs().subtract(Math.floor(Math.random() * 90) + 1, 'day').format('YYYY-MM-DD HH:mm:ss'),
    updated_at: dayjs().subtract(Math.floor(Math.random() * 7), 'day').format('YYYY-MM-DD HH:mm:ss'),
  }
})

// ==================== 小说 ====================
export interface MockNovel {
  id: string
  title: string
  author: string
  category: string
  status: '连载中' | '已完结'
  chapter_count: number
  word_count: number
  rating: number
  description: string
  cover_url: string
  created_at: string
  updated_at: string
}

const novelTitles = [
  '星辰大海', '都市修仙录', '重生之商业帝国', '末世求生指南',
  '穿越之锦绣人生', '超级学霸系统', '仙道长青', '万界归一',
  '科技狂人', '龙血武帝',
]

const novelAuthors = ['笔名一', '笔名二', '笔名三', '笔名四', '笔名五', '笔名六', '笔名七', '笔名八', '笔名九', '笔名十']
const novelCategories = ['玄幻', '都市', '科幻', '历史', '仙侠', '游戏', '悬疑', '奇幻', '军事', '体育']

const mockNovels: MockNovel[] = Array.from({ length: 10 }, (_, i) => ({
  id: `novel_${String(i + 1).padStart(3, '0')}`,
  title: novelTitles[i]!,
  author: novelAuthors[i]!,
  category: novelCategories[i]!,
  status: i < 7 ? '连载中' as const : '已完结' as const,
  chapter_count: Math.floor(Math.random() * 2000) + 50,
  word_count: Math.floor(Math.random() * 5000000) + 100000,
  rating: parseFloat((7 + Math.random() * 3).toFixed(1)),
  description: `《${novelTitles[i]!}》是一部精彩的${novelCategories[i]!}小说，讲述了一段引人入胜的故事。`,
  cover_url: `https://picsum.photos/seed/novel${i + 1}/200/280`,
  created_at: dayjs().subtract(Math.floor(Math.random() * 365) + 30, 'day').format('YYYY-MM-DD HH:mm:ss'),
  updated_at: dayjs().subtract(Math.floor(Math.random() * 3), 'day').format('YYYY-MM-DD HH:mm:ss'),
}))

// ==================== Dashboard 统计数据 ====================
export interface DashboardStats {
  totalUsers: number
  todayNewUsers: number
  totalExpense: number
  activeUsers: number
  moodDiaryCount: number
  noteCount: number
  userTrendPercent: number
  expenseTrendPercent: number
  activeTrendPercent: number
  moodTrendPercent: number
  noteTrendPercent: number
  newUserTrendPercent: number
}

export const mockDashboardStats: DashboardStats = {
  totalUsers: 1258,
  todayNewUsers: 23,
  totalExpense: 156832.5,
  activeUsers: 876,
  moodDiaryCount: 3456,
  noteCount: 892,
  userTrendPercent: 12.5,
  expenseTrendPercent: 8.3,
  activeTrendPercent: -2.1,
  moodTrendPercent: 15.7,
  noteTrendPercent: 6.8,
  newUserTrendPercent: -5.2,
}

// ==================== 用户增长趋势（30天） ====================
export interface UserTrendItem {
  date: string
  count: number
  cumulative: number
}

export const mockUserTrend: UserTrendItem[] = Array.from({ length: 30 }, (_, i) => {
  const date = dayjs().subtract(29 - i, 'day')
  const dailyCount = Math.floor(Math.random() * 30) + 10
  const cumulative = 1258 - (29 - i) * Math.floor(Math.random() * 5 + 15) + Math.floor(Math.random() * 20)
  return {
    date: date.format('MM-DD'),
    count: dailyCount,
    cumulative: Math.max(cumulative, 100),
  }
})

// ==================== 消费分类数据 ====================
export interface ExpenseCategoryItem {
  name: string
  value: number
  color: string
}

export const mockExpenseByCategory: ExpenseCategoryItem[] = [
  { name: '餐饮', value: 45200, color: '#6C63FF' },
  { name: '交通', value: 18900, color: '#FF6B6B' },
  { name: '购物', value: 52300, color: '#4ECDC4' },
  { name: '娱乐', value: 28600, color: '#45B7D1' },
  { name: '其他', value: 11832.5, color: '#96CEB4' },
]

// ==================== 心情分布数据 ====================
export interface MoodDistributionItem {
  mood: string
  count: number
  color: string
}

export const mockMoodDistribution: MoodDistributionItem[] = [
  { mood: '开心', count: 1200, color: '#52c41a' },
  { mood: '平静', count: 890, color: '#1890ff' },
  { mood: '一般', count: 650, color: '#faad14' },
  { mood: '难过', count: 420, color: '#ff4d4f' },
  { mood: '焦虑', count: 296, color: '#722ed1' },
]

// ==================== 最近动态 ====================
export interface RecentActivity {
  id: string
  type: 'user_register' | 'expense' | 'mood_diary' | 'note' | 'weight'
  title: string
  description: string
  time: string
  color: string
}

export const mockRecentActivities: RecentActivity[] = [
  {
    id: 'act_1',
    type: 'user_register',
    title: '新用户注册',
    description: '用户 "罗文斌" 完成注册',
    time: dayjs().subtract(5, 'minute').format('HH:mm'),
    color: '#6C63FF',
  },
  {
    id: 'act_2',
    type: 'expense',
    title: '新增消费',
    description: '张三 记录了一笔餐饮消费 ¥128.00',
    time: dayjs().subtract(15, 'minute').format('HH:mm'),
    color: '#FF6B6B',
  },
  {
    id: 'act_3',
    type: 'mood_diary',
    title: '心情日记',
    description: '李四 记录了今日心情：开心',
    time: dayjs().subtract(30, 'minute').format('HH:mm'),
    color: '#4ECDC4',
  },
  {
    id: 'act_4',
    type: 'note',
    title: '新建笔记',
    description: '王五 创建了笔记 "React Hooks 学习笔记"',
    time: dayjs().subtract(1, 'hour').format('HH:mm'),
    color: '#45B7D1',
  },
  {
    id: 'act_5',
    type: 'weight',
    title: '体重记录',
    description: '赵六 记录体重 68.5kg',
    time: dayjs().subtract(2, 'hour').format('HH:mm'),
    color: '#96CEB4',
  },
  {
    id: 'act_6',
    type: 'user_register',
    title: '新用户注册',
    description: '用户 "何芳芳" 完成注册',
    time: dayjs().subtract(3, 'hour').format('HH:mm'),
    color: '#6C63FF',
  },
  {
    id: 'act_7',
    type: 'expense',
    title: '新增消费',
    description: '孙七 记录了一笔交通消费 ¥35.00',
    time: dayjs().subtract(4, 'hour').format('HH:mm'),
    color: '#FF6B6B',
  },
  {
    id: 'act_8',
    type: 'mood_diary',
    title: '心情日记',
    description: '周八 记录了今日心情：平静',
    time: dayjs().subtract(5, 'hour').format('HH:mm'),
    color: '#4ECDC4',
  },
]

// ==================== 体重趋势（14天） ====================
export interface WeightTrendItem {
  date: string
  weight: number
  body_fat: number
}

export const mockWeightTrend: WeightTrendItem[] = Array.from({ length: 14 }, (_, i) => {
  const date = dayjs().subtract(13 - i, 'day')
  const baseWeight = 68.5
  const weight = parseFloat((baseWeight - i * 0.08 + (Math.random() - 0.5) * 0.8).toFixed(1))
  const bodyFat = parseFloat((22.5 - i * 0.15 + (Math.random() - 0.5) * 0.5).toFixed(1))
  return {
    date: date.format('MM-DD'),
    weight,
    body_fat: bodyFat,
  }
})

// ==================== 导出所有 Mock 数据 ====================
export {
  mockUsers,
  mockExpenses,
  mockMoodDiaries,
  mockWeightRecords,
  mockNotes,
  mockNovels,
}
