import dayjs from 'dayjs'
import type { User, UserRole, MemberLevel, UserStatus } from '../types/user'
import type { Role, Permission, RolePermission, RoleWithPermissions } from '../types/permission'
import { generateUserId } from './userId'

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

// 生成符合新接口的 mockUsers
const mockUsers: User[] = userNames.map((name, i) => {
  const roles: UserRole[] = ['user', 'user', 'user', 'admin', 'super_admin']
  const memberLevels: MemberLevel[] = ['normal', 'normal', 'member', 'member', 'super_member']
  const statuses: UserStatus[] = ['active', 'active', 'active', 'abnormal', 'disabled', 'banned']
  
  return {
    id: generateUserId(),
    email: `${['zhangsan', 'lisi', 'wangwu', 'zhaoliu', 'sunqi', 'zhouba', 'wujiu', 'zhengshi', 'chenxm', 'linxh', 'huangdw', 'liuml', 'yangzq', 'xujw', 'maty', 'zhuly', 'hujh', 'guoxm', 'heff', 'luowb'][i]!}@example.com`,
    phone: `1${3 + (i % 8)}${String(Math.floor(Math.random() * 100000000)).padStart(8, '0')}`,
    nickname: name,
    username: `${['zhangsan', 'lisi', 'wangwu', 'zhaoliu', 'sunqi', 'zhouba', 'wujiu', 'zhengshi', 'chenxm', 'linxh', 'huangdw', 'liuml', 'yangzq', 'xujw', 'maty', 'zhuly', 'hujh', 'guoxm', 'heff', 'luowb'][i]}`,
    avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}`,
    role: roles[i % roles.length]!,
    member_level: memberLevels[i % memberLevels.length]!,
    points: Math.floor(Math.random() * 10000),
    status: statuses[i % statuses.length]!,
    register_ip: `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
    last_login_ip: `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
    last_login_at: dayjs().subtract(Math.floor(Math.random() * 7), 'day').format('YYYY-MM-DDTHH:mm:ss'),
    login_count: Math.floor(Math.random() * 100) + 1,
    created_at: dayjs().subtract(Math.floor(Math.random() * 180) + 1, 'day').format('YYYY-MM-DDTHH:mm:ss'),
    updated_at: dayjs().subtract(Math.floor(Math.random() * 7), 'day').format('YYYY-MM-DDTHH:mm:ss'),
  }
})

// ==================== 消费记录 ====================
export interface MockExpense {
  id: string
  user_id: string
  user_name: string
  category: string
  amount: number
  note: string
  date: string
  created_at: string
  updated_at: string
}

const expenseCategories = ['餐饮', '交通', '购物', '娱乐', '其他']
const expenseNotes: Record<string, string[]> = {
  '餐饮': ['午餐外卖', '晚餐聚餐', '早餐咖啡', '水果零食', '奶茶饮品', '超市采购食材'],
  '交通': ['地铁充值', '打车回家', '共享单车月卡', '加油', '高铁票'],
  '购物': ['衣服', '日用品', '电子产品', '书籍', '家居用品'],
  '娱乐': ['电影票', '游戏充值', 'KTV', '健身月卡', '音乐会'],
  '其他': ['快递费', '理发', '手机话费', '水电费', '医疗'],
}

const mockExpenses: MockExpense[] = Array.from({ length: 50 }, (_, i) => {
  const category = expenseCategories[i % expenseCategories.length]!
  const notes = expenseNotes[category]!
  const user = mockUsers[i % mockUsers.length]!
  return {
    id: `expense_${String(i + 1).padStart(3, '0')}`,
    user_id: user.id,
    user_name: user.nickname || '未知用户',
    category,
    amount: parseFloat((Math.random() * 500 + 10).toFixed(2)),
    note: notes[i % notes.length]!,
    date: dayjs().subtract(i, 'day').format('YYYY-MM-DD'),
    created_at: dayjs().subtract(i, 'day').format('YYYY-MM-DD HH:mm:ss'),
    updated_at: dayjs().subtract(i, 'day').format('YYYY-MM-DD HH:mm:ss'),
  }
})

// ==================== 心情日记 ====================
export interface MockMoodDiary {
  id: string
  user_id: string
  user_name: string
  mood: string
  mood_label: string
  tags: string[]
  content: string
  date: string
  created_at: string
  updated_at: string
}

const moodTypes = ['开心', '平静', '一般', '难过', '焦虑']
const moodLabels: Record<string, string> = {
  '开心': '今天心情很好',
  '平静': '内心很平静',
  '一般': '普通的一天',
  '难过': '有些难过',
  '焦虑': '感到焦虑',
}
const moodContents: Record<string, string[]> = {
  '开心': ['今天天气很好，心情愉快！', '和朋友一起出去玩，非常开心', '完成了一个重要的项目，很有成就感', '收到了一份意外的礼物'],
  '平静': ['普通的一天，按部就班', '读了一本好书，内心很平静', '在公园散步，享受宁静的时光', '整理了房间，感觉很好'],
  '一般': ['今天没什么特别的事', '工作有些忙碌，但还算顺利', '有点累，需要休息', '天气一般，心情也一般'],
  '难过': ['工作上遇到了一些困难', '和好朋友吵架了', '考试没考好，有些失落', '一个人在家，有点孤独'],
  '焦虑': ['明天有个重要的面试', '项目截止日期快到了', '最近压力比较大', '很多事情要做，感觉时间不够'],
}
const moodTags = ['工作', '生活', '学习', '健康', '家庭', '朋友', '旅行', '美食', '运动', '阅读']

const mockMoodDiaries: MockMoodDiary[] = Array.from({ length: 30 }, (_, i) => {
  const mood = moodTypes[i % moodTypes.length]!
  const contents = moodContents[mood]!
  const user = mockUsers[i % mockUsers.length]!
  const tags = [moodTags[i % moodTags.length]!, moodTags[(i + 3) % moodTags.length]!]
  return {
    id: `mood_${String(i + 1).padStart(3, '0')}`,
    user_id: user.id,
    user_name: user.nickname || '未知用户',
    mood,
    mood_label: moodLabels[mood]!,
    tags,
    content: contents[i % contents.length]!,
    date: dayjs().subtract(i, 'day').format('YYYY-MM-DD'),
    created_at: dayjs().subtract(i, 'day').format('YYYY-MM-DD HH:mm:ss'),
    updated_at: dayjs().subtract(i, 'day').format('YYYY-MM-DD HH:mm:ss'),
  }
})

// ==================== 体重记录 ====================
export interface MockWeightRecord {
  id: string
  user_id: string
  user_name: string
  weight: number
  height: number
  bmi: number
  body_fat: number | null
  note: string
  date: string
  created_at: string
  updated_at: string
}

const mockWeightRecords: MockWeightRecord[] = Array.from({ length: 40 }, (_, i) => {
  const user = mockUsers[i % 5]!
  const baseWeight = 65 + (i % 5) * 3
  const height = 170 + (i % 5) * 3 // 身高 170-185cm
  const weight = parseFloat((baseWeight - i * 0.05 + (Math.random() - 0.5) * 1.5).toFixed(1))
  const bmi = parseFloat((weight / Math.pow(height / 100, 2)).toFixed(1))
  
  return {
    id: `weight_${String(i + 1).padStart(3, '0')}`,
    user_id: user.id,
    user_name: user.nickname || '未知用户',
    weight,
    height,
    bmi,
    body_fat: i % 3 === 0 ? null : parseFloat((18 + Math.random() * 12).toFixed(1)),
    note: ['', '控制饮食中', '运动后', '聚餐后', '正常记录'][i % 5]!,
    date: dayjs().subtract(i, 'day').format('YYYY-MM-DD'),
    created_at: dayjs().subtract(i, 'day').format('YYYY-MM-DD HH:mm:ss'),
    updated_at: dayjs().subtract(i, 'day').format('YYYY-MM-DD HH:mm:ss'),
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
  is_pinned: boolean
  created_at: string
  updated_at: string
}

const noteTitles = [
  'React Hooks 学习笔记', 'TypeScript 高级类型', 'CSS Grid 布局指南',
  'Node.js 性能优化', 'Docker 入门教程', 'Git 常用命令',
  'Python 数据分析', '算法与数据结构', '设计模式总结',
  '前端工程化实践', 'MySQL 索引优化', 'Redis 缓存策略',
  '微服务架构设计', 'Kubernetes 部署指南', '代码审查最佳实践',
  '今日工作总结', '读书笔记 - 原则', '健身计划',
  '旅行攻略', '美食探店记录',
]

const noteCategories = ['技术', '生活', '读书', '工作']
const noteTags = ['JavaScript', 'TypeScript', 'React', 'Vue', 'Node.js', 'Python', 'CSS', 'HTML', 'DevOps', '数据库', '日常', '计划', '总结']

const mockNotes: MockNote[] = Array.from({ length: 20 }, (_, i) => {
  const user = mockUsers[i % mockUsers.length]!
  const tags = [noteTags[i % noteTags.length]!, noteTags[(i + 3) % noteTags.length]!]
  return {
    id: `note_${String(i + 1).padStart(3, '0')}`,
    user_id: user.id,
    user_name: user.nickname || '未知用户',
    title: noteTitles[i]!,
    content: `这是关于"${noteTitles[i]!}"的详细笔记内容，包含了核心概念、代码示例和实践经验。这是一段较长的内容预览，用于测试文本截断效果。`,
    category: noteCategories[i % noteCategories.length]!,
    tags,
    is_pinned: i < 3, // 前3条置顶
    created_at: dayjs().subtract(Math.floor(Math.random() * 90) + 1, 'day').format('YYYY-MM-DD HH:mm:ss'),
    updated_at: dayjs().subtract(Math.floor(Math.random() * 7), 'day').format('YYYY-MM-DD HH:mm:ss'),
  }
})

// ==================== 小说 ====================
export interface MockNovel {
  id: string
  user_id: string | null
  user_name: string | null
  title: string
  author: string
  source: string
  category: string
  tags: string[]
  word_count: number
  chapter_count: number
  status: 'ongoing' | 'completed'
  rating: number
  read_count: number
  collect_count: number
  progress: number
  last_read_at: string | null
  description: string
  cover_url: string
  created_at: string
  updated_at: string
}

const novelTitles = [
  '星辰大海', '都市修仙录', '重生之商业帝国', '末世求生指南',
  '穿越之锦绣人生', '超级学霸系统', '仙道长青', '万界归一',
  '科技狂人', '龙血武帝', '剑来', '大奉打更人',
  '诡秘之主', '斗罗大陆', '凡人修仙传',
]

const novelAuthors = ['笔名一', '笔名二', '笔名三', '笔名四', '笔名五', '笔名六', '笔名七', '笔名八', '笔名九', '笔名十', '爱潜水的乌贼', '卖报小郎君', '唐家三少', '忘语']
const novelCategories = ['玄幻', '都市', '科幻', '历史', '仙侠', '游戏', '悬疑', '奇幻', '军事', '体育']
const novelSources = ['起点中文网', '纵横中文网', '17K小说网', '飞卢小说网', '番茄小说']
const novelTags = ['热血', '爽文', '系统', '重生', '穿越', '修仙', '都市', '玄幻', '科幻', '悬疑']

const mockNovels: MockNovel[] = Array.from({ length: 15 }, (_, i) => {
  const user = i < 10 ? mockUsers[i % mockUsers.length] : null
  return {
    id: `novel_${String(i + 1).padStart(3, '0')}`,
    user_id: user?.id || null,
    user_name: user?.nickname || null,
    title: novelTitles[i]!,
    author: novelAuthors[i]!,
    source: novelSources[i % novelSources.length]!,
    category: novelCategories[i % novelCategories.length]!,
    tags: [novelTags[i % novelTags.length]!, novelTags[(i + 3) % novelTags.length]!],
    word_count: Math.floor(Math.random() * 5000000) + 100000,
    chapter_count: Math.floor(Math.random() * 2000) + 50,
    status: i < 10 ? 'ongoing' as const : 'completed' as const,
    rating: parseFloat((7 + Math.random() * 3).toFixed(1)),
    read_count: Math.floor(Math.random() * 100000),
    collect_count: Math.floor(Math.random() * 10000),
    progress: Math.random(),
    last_read_at: dayjs().subtract(Math.floor(Math.random() * 7), 'day').format('YYYY-MM-DD HH:mm:ss'),
    description: `《${novelTitles[i]!}》是一部精彩的${novelCategories[i % novelCategories.length]!}小说，讲述了一段引人入胜的故事。`,
    cover_url: `https://picsum.photos/seed/novel${i + 1}/200/280`,
    created_at: dayjs().subtract(Math.floor(Math.random() * 365) + 30, 'day').format('YYYY-MM-DD HH:mm:ss'),
    updated_at: dayjs().subtract(Math.floor(Math.random() * 3), 'day').format('YYYY-MM-DD HH:mm:ss'),
  }
})

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

// ==================== 角色数据 ====================

export const mockRoles: Role[] = [
  {
    id: 1,
    name: 'user',
    display_name: '普通用户',
    description: '普通用户，拥有基本的查看和编辑自己数据的权限',
    level: 1,
    created_at: '2024-01-01 00:00:00',
  },
  {
    id: 2,
    name: 'admin',
    display_name: '管理员',
    description: '管理员，可以管理用户和大部分数据',
    level: 2,
    created_at: '2024-01-01 00:00:00',
  },
  {
    id: 3,
    name: 'super_admin',
    display_name: '超级管理员',
    description: '超级管理员，拥有所有权限',
    level: 3,
    created_at: '2024-01-01 00:00:00',
  },
]

// 权限模块定义
const permissionModules = [
  { module: 'users', displayName: '用户管理' },
  { module: 'expenses', displayName: '消费记录' },
  { module: 'moods', displayName: '心情日记' },
  { module: 'weights', displayName: '体重记录' },
  { module: 'notes', displayName: '笔记本' },
  { module: 'novels', displayName: '小说书架' },
  { module: 'versions', displayName: '版本管理' },
  { module: 'system', displayName: '系统设置' },
]

const permissionActions = [
  { action: 'read', displayName: '查看' },
  { action: 'write', displayName: '编辑' },
  { action: 'delete', displayName: '删除' },
]

// 生成所有权限
let permissionId = 1
export const mockPermissions: Permission[] = permissionModules.flatMap(({ module }) =>
  permissionActions.map(({ action, displayName }) => ({
    id: permissionId++,
    name: `${module}:${action}`,
    display_name: `${permissionModules.find(m => m.module === module)!.displayName}${displayName}`,
    module,
    action,
    description: null,
    created_at: '2024-01-01 00:00:00',
  }))
)

// 角色权限关联数据
export const mockRolePermissions: RolePermission[] = [
  // 普通用户权限 (role_id: 1)
  { role_id: 1, permission_id: 4 }, // expenses:read
  { role_id: 1, permission_id: 5 }, // expenses:write
  { role_id: 1, permission_id: 7 }, // moods:read
  { role_id: 1, permission_id: 8 }, // moods:write
  { role_id: 1, permission_id: 10 }, // weights:read
  { role_id: 1, permission_id: 11 }, // weights:write
  { role_id: 1, permission_id: 13 }, // notes:read
  { role_id: 1, permission_id: 14 }, // notes:write
  { role_id: 1, permission_id: 16 }, // novels:read

  // 管理员权限 (role_id: 2)
  { role_id: 2, permission_id: 1 }, // users:read
  { role_id: 2, permission_id: 2 }, // users:write
  { role_id: 2, permission_id: 3 }, // users:delete
  { role_id: 2, permission_id: 4 }, // expenses:read
  { role_id: 2, permission_id: 5 }, // expenses:write
  { role_id: 2, permission_id: 6 }, // expenses:delete
  { role_id: 2, permission_id: 7 }, // moods:read
  { role_id: 2, permission_id: 8 }, // moods:write
  { role_id: 2, permission_id: 9 }, // moods:delete
  { role_id: 2, permission_id: 10 }, // weights:read
  { role_id: 2, permission_id: 11 }, // weights:write
  { role_id: 2, permission_id: 12 }, // weights:delete
  { role_id: 2, permission_id: 13 }, // notes:read
  { role_id: 2, permission_id: 14 }, // notes:write
  { role_id: 2, permission_id: 15 }, // notes:delete
  { role_id: 2, permission_id: 16 }, // novels:read
  { role_id: 2, permission_id: 17 }, // novels:write
  { role_id: 2, permission_id: 18 }, // novels:delete
  { role_id: 2, permission_id: 19 }, // versions:read
  { role_id: 2, permission_id: 20 }, // versions:write

  // 超级管理员权限 (role_id: 3) - 所有权限
  ...mockPermissions.map(p => ({ role_id: 3, permission_id: p.id })),
]

// 获取带权限的角色数据
export const getRolesWithPermissions = (): RoleWithPermissions[] => {
  return mockRoles.map(role => ({
    ...role,
    permissions: mockRolePermissions
      .filter(rp => rp.role_id === role.id)
      .map(rp => mockPermissions.find(p => p.id === rp.permission_id)!)
      .filter(Boolean),
  }))
}

// ==================== 数据分析 - 用户活跃度 ====================
export interface UserActivityItem {
  date: string
  DAU: number
  WAU: number
  MAU: number
}

export const mockUserActivity: UserActivityItem[] = Array.from({ length: 30 }, (_, i) => {
  const date = dayjs().subtract(29 - i, 'day')
  return {
    date: date.format('MM-DD'),
    DAU: Math.floor(Math.random() * 300) + 400,
    WAU: Math.floor(Math.random() * 200) + 600,
    MAU: Math.floor(Math.random() * 150) + 800,
  }
})

// ==================== 数据分析 - 用户留存率 ====================
export interface RetentionRate {
  period: string
  rate: number
  userCount: number
}

export const mockRetentionRates: RetentionRate[] = [
  { period: '次日留存', rate: 68.5, userCount: 862 },
  { period: '3日留存', rate: 52.3, userCount: 658 },
  { period: '7日留存', rate: 38.7, userCount: 487 },
  { period: '30日留存', rate: 22.1, userCount: 278 },
]

// ==================== 数据分析 - 用户分布 ====================
export interface UserDistribution {
  name: string
  value: number
  color: string
}

export const mockUserByRole: UserDistribution[] = [
  { name: '普通用户', value: 980, color: '#1890ff' },
  { name: '管理员', value: 45, color: '#36cfc9' },
  { name: '超级管理员', value: 8, color: '#9254de' },
]

export const mockUserByMemberLevel: UserDistribution[] = [
  { name: '普通会员', value: 720, color: '#1890ff' },
  { name: '会员', value: 380, color: '#597ef7' },
  { name: '超级会员', value: 158, color: '#f759ab' },
]

export const mockUserByStatus: UserDistribution[] = [
  { name: '正常', value: 1050, color: '#52c41a' },
  { name: '异常', value: 85, color: '#faad14' },
  { name: '禁用', value: 73, color: '#d9d9d9' },
  { name: '封禁', value: 50, color: '#ff4d4f' },
]

// ==================== 数据分析 - 消费趋势 ====================
export interface ExpenseTrendItem {
  date: string
  amount: number
}

export const mockExpenseTrend: ExpenseTrendItem[] = Array.from({ length: 30 }, (_, i) => {
  const date = dayjs().subtract(29 - i, 'day')
  return {
    date: date.format('MM-DD'),
    amount: parseFloat((Math.random() * 8000 + 3000).toFixed(2)),
  }
})

// ==================== 数据分析 - 心情分布 ====================
export interface MoodTrendItem {
  date: string
  开心: number
  平静: number
  一般: number
  难过: number
  焦虑: number
}

export const mockMoodTrend: MoodTrendItem[] = Array.from({ length: 14 }, (_, i) => {
  const date = dayjs().subtract(13 - i, 'day')
  return {
    date: date.format('MM-DD'),
    开心: Math.floor(Math.random() * 30) + 20,
    平静: Math.floor(Math.random() * 20) + 15,
    一般: Math.floor(Math.random() * 15) + 10,
    难过: Math.floor(Math.random() * 10) + 5,
    焦虑: Math.floor(Math.random() * 8) + 3,
  }
})

// ==================== 数据分析 - 体重趋势 ====================
export interface WeightAnalyticsItem {
  date: string
  avgWeight: number
  avgBMI: number
}

export const mockWeightAnalytics: WeightAnalyticsItem[] = Array.from({ length: 30 }, (_, i) => {
  const date = dayjs().subtract(29 - i, 'day')
  return {
    date: date.format('MM-DD'),
    avgWeight: parseFloat((65 + Math.random() * 5 - i * 0.02).toFixed(1)),
    avgBMI: parseFloat((22 + Math.random() * 2 - i * 0.01).toFixed(1)),
  }
})

// ==================== 数据分析 - 笔记活跃度 ====================
export interface NoteActivityItem {
  date: string
  count: number
}

export const mockNoteActivity: NoteActivityItem[] = Array.from({ length: 30 }, (_, i) => {
  const date = dayjs().subtract(29 - i, 'day')
  return {
    date: date.format('MM-DD'),
    count: Math.floor(Math.random() * 20) + 5,
  }
})

// ==================== 数据分析 - 关键指标 ====================
export interface AnalyticsKeyMetrics {
  totalUsers: number
  todayNewUsers: number
  activeUsers: number
  totalExpense: number
  avgExpense: number
  totalNotes: number
  totalDiaries: number
  novelReadCount: number
}

export const mockAnalyticsMetrics: AnalyticsKeyMetrics = {
  totalUsers: 1258,
  todayNewUsers: 23,
  activeUsers: 876,
  totalExpense: 156832.5,
  avgExpense: 124.7,
  totalNotes: 892,
  totalDiaries: 3456,
  novelReadCount: 28650,
}

// ==================== 操作日志 ====================
export interface OperationLogItem {
  id: string
  time: string
  user_name: string
  action: string
  module: string
  target: string
  ip: string
  detail: string
}

const logActions = ['创建', '更新', '删除', '查看', '导出', '登录', '登出', '修改密码', '修改状态', '上传']
const logModules = ['用户管理', '消费记录', '心情日记', '体重记录', '笔记', '小说', '版本管理', '系统']
const logTargets = [
  '用户 张三', '用户 李四', '用户 王五', '消费记录 #1024', '消费记录 #1025',
  '心情日记 #2056', '体重记录 #3012', '笔记 "React Hooks 学习笔记"',
  '笔记 "TypeScript 高级类型"', '小说 "星辰大海"', '版本 v2.3.1', '系统配置',
  '用户 赵六', '用户 孙七', '笔记 "Docker 入门教程"', '消费记录 #1030',
]

export const mockOperationLogs: OperationLogItem[] = Array.from({ length: 100 }, (_, i) => {
  const action = logActions[i % logActions.length]!
  const module = logModules[i % logModules.length]!
  const user = mockUsers[i % mockUsers.length]!
  return {
    id: `log_${String(i + 1).padStart(4, '0')}`,
    time: dayjs().subtract(i, 'hour').format('YYYY-MM-DD HH:mm:ss'),
    user_name: user.nickname || '未知用户',
    action,
    module,
    target: logTargets[i % logTargets.length]!,
    ip: `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
    detail: `${user.nickname || '未知用户'} 在 ${module} 模块执行了 ${action} 操作`,
  }
})

// ==================== 系统监控 ====================
export interface SystemStats {
  totalUsers: number
  totalDataSize: string
  storageUsed: string
  storageTotal: string
  apiCallCount: number
  apiCallToday: number
  avgResponseTime: number
  errorRate: number
  uptime: string
  version: string
}

export const mockSystemStats: SystemStats = {
  totalUsers: 1258,
  totalDataSize: '2.8 GB',
  storageUsed: '1.2 GB',
  storageTotal: '5.0 GB',
  apiCallCount: 1256800,
  apiCallToday: 34560,
  avgResponseTime: 128,
  errorRate: 0.32,
  uptime: '99.97%',
  version: 'v2.3.1',
}

export interface DbTableStat {
  tableName: string
  displayName: string
  rowCount: number
  size: string
  lastUpdate: string
}

export const mockDbTableStats: DbTableStat[] = [
  { tableName: 'users', displayName: '用户表', rowCount: 1258, size: '256 MB', lastUpdate: dayjs().subtract(5, 'minute').format('YYYY-MM-DD HH:mm:ss') },
  { tableName: 'expenses', displayName: '消费记录表', rowCount: 45680, size: '512 MB', lastUpdate: dayjs().subtract(12, 'minute').format('YYYY-MM-DD HH:mm:ss') },
  { tableName: 'mood_diaries', displayName: '心情日记表', rowCount: 34560, size: '384 MB', lastUpdate: dayjs().subtract(8, 'minute').format('YYYY-MM-DD HH:mm:ss') },
  { tableName: 'weight_records', displayName: '体重记录表', rowCount: 18920, size: '128 MB', lastUpdate: dayjs().subtract(30, 'minute').format('YYYY-MM-DD HH:mm:ss') },
  { tableName: 'notes', displayName: '笔记表', rowCount: 8920, size: '256 MB', lastUpdate: dayjs().subtract(15, 'minute').format('YYYY-MM-DD HH:mm:ss') },
  { tableName: 'novels', displayName: '小说表', rowCount: 560, size: '64 MB', lastUpdate: dayjs().subtract(1, 'hour').format('YYYY-MM-DD HH:mm:ss') },
  { tableName: 'novel_chapters', displayName: '小说章节表', rowCount: 128500, size: '768 MB', lastUpdate: dayjs().subtract(2, 'hour').format('YYYY-MM-DD HH:mm:ss') },
  { tableName: 'operation_logs', displayName: '操作日志表', rowCount: 356000, size: '480 MB', lastUpdate: dayjs().subtract(1, 'minute').format('YYYY-MM-DD HH:mm:ss') },
  { tableName: 'versions', displayName: '版本表', rowCount: 45, size: '2 MB', lastUpdate: dayjs().subtract(3, 'day').format('YYYY-MM-DD HH:mm:ss') },
  { tableName: 'roles', displayName: '角色表', rowCount: 3, size: '0.1 MB', lastUpdate: dayjs().subtract(30, 'day').format('YYYY-MM-DD HH:mm:ss') },
]

export interface ApiRequestItem {
  id: string
  time: string
  method: string
  path: string
  status: number
  duration: number
  ip: string
  userAgent: string
}

const apiPaths = [
  '/api/users', '/api/expenses', '/api/moods', '/api/weights',
  '/api/notes', '/api/novels', '/api/auth/login', '/api/auth/logout',
  '/api/system/config', '/api/versions',
]
const apiMethods = ['GET', 'POST', 'PUT', 'DELETE']
const userAgents = [
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)',
  'Mozilla/5.0 (Linux; Android 14; Pixel 8)',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
]

export const mockApiRequests: ApiRequestItem[] = Array.from({ length: 50 }, (_, i) => {
  const method = apiMethods[i % apiMethods.length]!
  const status = i % 15 === 0 ? 500 : i % 10 === 0 ? 404 : i % 8 === 0 ? 401 : 200
  return {
    id: `req_${String(i + 1).padStart(4, '0')}`,
    time: dayjs().subtract(i * 3, 'minute').format('YYYY-MM-DD HH:mm:ss'),
    method,
    path: apiPaths[i % apiPaths.length]!,
    status,
    duration: status >= 400 ? Math.floor(Math.random() * 2000) + 500 : Math.floor(Math.random() * 300) + 20,
    ip: `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
    userAgent: userAgents[i % userAgents.length]!,
  }
})

export interface AlertItem {
  id: string
  time: string
  level: 'error' | 'warning' | 'info'
  type: string
  message: string
  module: string
  resolved: boolean
}

export const mockAlerts: AlertItem[] = [
  {
    id: 'alert_1',
    time: dayjs().subtract(10, 'minute').format('YYYY-MM-DD HH:mm:ss'),
    level: 'error',
    type: 'API异常',
    message: '/api/users 接口响应超时 (>3000ms)',
    module: '用户管理',
    resolved: false,
  },
  {
    id: 'alert_2',
    time: dayjs().subtract(25, 'minute').format('YYYY-MM-DD HH:mm:ss'),
    level: 'warning',
    type: '异常登录',
    message: '用户 "张三" 在异常IP (45.33.32.156) 登录',
    module: '用户管理',
    resolved: false,
  },
  {
    id: 'alert_3',
    time: dayjs().subtract(1, 'hour').format('YYYY-MM-DD HH:mm:ss'),
    level: 'error',
    type: '数据库异常',
    message: 'notes 表查询性能下降，平均响应时间 >500ms',
    module: '笔记',
    resolved: true,
  },
  {
    id: 'alert_4',
    time: dayjs().subtract(2, 'hour').format('YYYY-MM-DD HH:mm:ss'),
    level: 'warning',
    type: '存储告警',
    message: '存储使用率已达 24%，建议关注增长趋势',
    module: '系统',
    resolved: true,
  },
  {
    id: 'alert_5',
    time: dayjs().subtract(3, 'hour').format('YYYY-MM-DD HH:mm:ss'),
    level: 'info',
    type: '系统更新',
    message: '系统已自动更新至 v2.3.1',
    module: '系统',
    resolved: true,
  },
  {
    id: 'alert_6',
    time: dayjs().subtract(5, 'hour').format('YYYY-MM-DD HH:mm:ss'),
    level: 'error',
    type: 'API异常',
    message: '/api/expenses 接口返回 500 错误 (3次)',
    module: '消费记录',
    resolved: true,
  },
  {
    id: 'alert_7',
    time: dayjs().subtract(8, 'hour').format('YYYY-MM-DD HH:mm:ss'),
    level: 'warning',
    type: '异常登录',
    message: '用户 "李四" 连续登录失败 5 次',
    module: '用户管理',
    resolved: true,
  },
  {
    id: 'alert_8',
    time: dayjs().subtract(12, 'hour').format('YYYY-MM-DD HH:mm:ss'),
    level: 'info',
    type: '备份完成',
    message: '数据库自动备份完成 (大小: 2.8GB)',
    module: '系统',
    resolved: true,
  },
]

// ==================== 导出所有 Mock 数据 ====================
export {
  mockUsers,
  mockExpenses,
  mockMoodDiaries,
  mockWeightRecords,
  mockNotes,
  mockNovels,
}

// ==================== 常量定义 ====================

// 消费分类选项
export const EXPENSE_CATEGORY_OPTIONS = [
  { label: '餐饮', value: '餐饮' },
  { label: '交通', value: '交通' },
  { label: '购物', value: '购物' },
  { label: '娱乐', value: '娱乐' },
  { label: '其他', value: '其他' },
]

// 心情类型选项
export const MOOD_OPTIONS = [
  { label: '😊 开心', value: '开心' },
  { label: '😌 平静', value: '平静' },
  { label: '😐 一般', value: '一般' },
  { label: '😢 难过', value: '难过' },
  { label: '😰 焦虑', value: '焦虑' },
]

// 笔记分类选项
export const NOTE_CATEGORY_OPTIONS = [
  { label: '技术', value: '技术' },
  { label: '生活', value: '生活' },
  { label: '读书', value: '读书' },
  { label: '工作', value: '工作' },
]

// 小说分类选项
export const NOVEL_CATEGORY_OPTIONS = [
  { label: '玄幻', value: '玄幻' },
  { label: '都市', value: '都市' },
  { label: '科幻', value: '科幻' },
  { label: '历史', value: '历史' },
  { label: '仙侠', value: '仙侠' },
  { label: '游戏', value: '游戏' },
  { label: '悬疑', value: '悬疑' },
  { label: '奇幻', value: '奇幻' },
]

// 小说状态选项
export const NOVEL_STATUS_OPTIONS = [
  { label: '连载中', value: 'ongoing' },
  { label: '已完结', value: 'completed' },
]

// BMI 等级
export const BMI_LEVELS = [
  { max: 18.5, label: '偏瘦', color: 'orange' },
  { max: 24, label: '正常', color: 'green' },
  { max: 28, label: '偏胖', color: 'blue' },
  { max: Infinity, label: '肥胖', color: 'red' },
]

// 获取 BMI 等级
export const getBmiLevel = (bmi: number): { label: string; color: string } => {
  const level = BMI_LEVELS.find(l => bmi < l.max)
  return level || { label: '未知', color: 'default' }
}

// 计算 BMI
export const calculateBmi = (weight: number, height: number): number => {
  if (!weight || !height) return 0
  return parseFloat((weight / Math.pow(height / 100, 2)).toFixed(1))
}
