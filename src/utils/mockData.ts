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

// ==================== 小说章节 ====================
export interface MockNovelChapter {
  id: string
  novel_id: string
  chapter_num: number
  title: string
  content: string
  word_count: number
  is_free: boolean
  price: number
  created_at: string
  updated_at: string
}

// 章节内容模板
const chapterContentTemplates = [
  '夜色如墨，月光透过云层洒落在大地上，映照出一片银白。少年站在山崖边，衣袂飘飘，目光深邃地望向远方。风吹过，带起几片落叶，在空中旋转飞舞。\n\n"终于到了这一天。"少年低声自语，眼中闪过一丝坚定。\n\n他叫林逸，一个来自小城的普通少年。但命运的齿轮早已开始转动，将他卷入一场惊天动地的冒险之中。\n\n远处传来一声龙吟，震得山林瑟瑟发抖。林逸深吸一口气，纵身跃下山崖，朝着声音传来的方向飞去。',
  '清晨的阳光透过窗户洒进房间，温暖而明亮。少女坐在书桌前，翻阅着一本泛黄的古籍，眉头微皱。\n\n"这段记载...如果没错的话，那座遗迹就在城外百里处。"她喃喃自语，手指在书页上轻轻划过。\n\n苏瑶，城中苏家的嫡女，自幼聪慧过人，对古籍秘辛有着浓厚的兴趣。近日来，她一直在研究一本关于上古遗迹的记载。\n\n"小姐，老爷请您去大厅。"门外传来丫鬟的声音。\n\n苏瑶合上古籍，将其小心翼翼地收入怀中，起身走出房间。',
  '大殿之上，金碧辉煌，数百名修士齐聚一堂。一位白发老者端坐在主位之上，目光如电，扫视众人。\n\n"诸位，三年一度的宗门大比即将开始。"老者的声音不大，却清晰地传入每个人的耳中，"此次大比，优胜者将获得进入秘境的资格。"\n\n此言一出，众人纷纷骚动起来。秘境，那可是传说中蕴含无数宝物和机缘的所在！\n\n"安静！"老者轻喝一声，大殿顿时鸦雀无声，"但我要提醒你们，秘境之中危机四伏，生死由命。"',
  '密林深处，雾气弥漫。一行五人小心翼翼地穿行在古树之间，警惕地注视着四周。\n\n"队长，前面就是妖兽的领地了。"一名瘦高的青年低声说道。\n\n领头的黑衣男子点了点头，"大家打起精神，这次的目标是三阶妖兽的内丹。"\n\n话音刚落，一声低沉的咆哮从雾中传来。众人立刻停下脚步，各自取出法器，严阵以待。\n\n一头巨大的黑虎从雾中缓缓走出，双目如炬，散发着令人心悸的气息。',
  '炼丹房内，药香四溢。一名青年盘膝而坐，面前悬浮着一尊古朴的丹炉。炉中火光跳动，温度不断攀升。\n\n"凝！"青年双手结印，一道道灵力注入丹炉之中。\n\n丹炉发出嗡鸣声，炉盖微微震动，一股浓郁的药香飘散而出。\n\n"成！"青年大喝一声，炉盖冲天而起，三枚圆润的丹药飞出，散发着璀璨的光芒。\n\n"上品丹药！"青年面露喜色，小心翼翼地将丹药收入玉瓶之中。这是他第一次炼制上品丹药，标志着他的炼丹术又上了一个台阶。',
  '城墙之上，战鼓雷鸣。数万大军列阵以待，旌旗猎猎作响。一名身着银甲的将军站在城楼之上，目光坚毅。\n\n"将军，敌军还有十里。"斥候飞马来报。\n\n将军点了点头，转身对身后的将士们高声说道："兄弟们，身后就是我们的家园，我们退无可退！今日，不是我们踏平敌营，就是敌军踏破城墙！"\n\n"誓死守城！"数万将士齐声高呼，声震云霄。\n\n将军拔出长剑，剑指前方，"开城门，迎敌！"',
  '幽暗的洞穴中，火把的光芒摇曳不定。两人沿着狭窄的通道缓缓前行，脚步声在空旷的洞穴中回荡。\n\n"师兄，你说这里面真的有上古传承吗？"年轻弟子问道。\n\n走在前面的中年男子没有回头，"祖师留下的记载不会有错。不过，传承之路向来凶险，你做好心理准备。"\n\n越往深处走，空气越发稀薄，一股无形的压力笼罩而来。年轻弟子的额头渗出细密的汗珠，但他咬紧牙关，紧跟不舍。\n\n终于，通道尽头出现了一扇巨大的石门，门上刻满了古老的符文，散发着幽幽的光芒。',
  '湖面如镜，倒映着满天繁星。一个白衣少女坐在湖边的青石上，手中拿着一支竹笛，轻轻吹奏。悠扬的笛声在夜空中飘荡，如泣如诉。\n\n"好一曲《望月怀远》。"一个声音从身后传来。\n\n少女放下竹笛，回头望去。只见一个青衫少年站在不远处，面带微笑。\n\n"你是谁？"少女警惕地问道。\n\n"在下路经此地，闻笛声而来，多有冒昧。"少年拱手行礼，"在下萧然，敢问姑娘芳名？"\n\n少女犹豫片刻，轻声说道："我叫白灵。"',
  '演武场上，两道身影交错而过，发出阵阵轰鸣。每一次碰撞都激起漫天气浪，周围的弟子们看得目眩神迷。\n\n"好强！"一名弟子忍不住赞叹，"大师兄的剑法又精进了！"\n\n场中，一名持剑青年与一名持刀壮汉激战正酣。青年的剑法轻灵飘逸，如行云流水；壮汉的刀法刚猛霸道，势不可挡。\n\n两人你来我往，斗了上百回合，不分胜负。\n\n"够了。"一个威严的声音响起，两人同时收手，各退三步。\n\n"不错，你们两个都有长进。"一位老者满意地点了点头。',
  '集市上人来人往，热闹非凡。各种摊位鳞次栉比，叫卖声此起彼伏。\n\n"上好的灵草，百年份的，只要五十灵石！"\n\n"极品法器，削铁如泥，走过路过不要错过！"\n\n林逸穿行在人群中，目光在各个摊位上扫过。他这次来集市，是为了寻找一株叫做"九转还魂草"的灵药。\n\n"这位公子，要看看吗？"一个老者叫住了他，摊位上摆着各种稀奇古怪的东西。\n\n林逸目光一扫，忽然被角落里一株不起眼的小草吸引住了。',
]

const chapterTitles = [
  '初入江湖', '命运之轮', '宗门大比', '秘境探险', '炼丹之路',
  '古城保卫战', '上古传承', '月下相遇', '巅峰对决', '集市奇遇',
  '龙脉觉醒', '天劫降临', '重返故里', '暗流涌动', '破茧成蝶',
  '星辰大海', '终局之战', '新的开始', '风云再起', '大道无形',
]

const mockNovelChapters: MockNovelChapter[] = []
// 为前5本小说生成章节
for (let novelIdx = 0; novelIdx < 5; novelIdx++) {
  const chapterCount = 10 + novelIdx * 5
  for (let chIdx = 0; chIdx < chapterCount; chIdx++) {
    const content = chapterContentTemplates[chIdx % chapterContentTemplates.length]!
    mockNovelChapters.push({
      id: `chapter_${novelIdx + 1}_${chIdx + 1}`,
      novel_id: `novel_${String(novelIdx + 1).padStart(3, '0')}`,
      chapter_num: chIdx + 1,
      title: `第${chIdx + 1}章 ${chapterTitles[chIdx % chapterTitles.length]!}`,
      content,
      word_count: content.length,
      is_free: chIdx < 5, // 前5章免费
      price: chIdx < 5 ? 0 : 0.5,
      created_at: dayjs().subtract(chapterCount - chIdx, 'day').format('YYYY-MM-DD HH:mm:ss'),
      updated_at: dayjs().subtract(chapterCount - chIdx, 'day').format('YYYY-MM-DD HH:mm:ss'),
    })
  }
}

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

// ==================== 推送消息 ====================
export interface MockPushMessage {
  id: string
  title: string
  content: string
  type: 'system' | 'version_update' | 'activity' | 'recommendation'
  target: 'all' | 'group' | 'single'
  target_desc: string
  push_time: string
  status: 'pending' | 'sent' | 'failed'
  sent_count: number
  delivered_count: number
  opened_count: number
  created_at: string
  created_by: string
}

const pushTypeMap: Record<string, { label: string; color: string }> = {
  system: { label: '系统通知', color: 'blue' },
  version_update: { label: '版本更新', color: 'green' },
  activity: { label: '活动通知', color: 'orange' },
  recommendation: { label: '个性化推荐', color: 'purple' },
}

const pushStatusMap: Record<string, { label: string; color: string }> = {
  pending: { label: '待发送', color: 'default' },
  sent: { label: '已发送', color: 'green' },
  failed: { label: '失败', color: 'red' },
}

const pushTitles = [
  '系统维护通知', 'v2.4.0 版本更新', '周末阅读挑战活动', '为您推荐好书',
  '账号安全提醒', 'v2.3.1 热修复更新', '签到送积分活动', '个性化书单推荐',
  '服务器升级公告', 'v2.5.0 新功能上线', '春节阅读马拉松', '根据您的历史阅读推荐',
]

const pushContents = [
  '系统将于今晚 22:00-23:00 进行维护升级，届时部分功能可能暂时不可用，请提前做好安排。',
  '新版本已发布，修复了若干已知问题并优化了阅读体验，建议您尽快更新。',
  '参与周末阅读挑战，连续阅读3天即可获得专属积分奖励，快来参加吧！',
  '根据您的阅读偏好，为您精心挑选了以下好书，点击查看详情。',
  '检测到您的账号在新设备登录，如非本人操作请及时修改密码。',
  '本次更新修复了阅读器卡顿的问题，提升了整体性能表现。',
  '每日签到连续7天可获得双倍积分，更有机会抽取会员体验卡。',
  '基于您最近阅读的书籍，我们为您推荐了以下相关作品。',
  '为提升服务质量，我们将于本周六凌晨进行服务器升级。',
  '全新UI界面上线，支持暗色模式，新增书签同步功能。',
  '春节期间参与阅读马拉松活动，完成目标即可获得丰厚奖励。',
  '根据您的历史阅读记录，这些书籍可能也会让您感兴趣。',
]

const pushTargets = [
  { target: 'all' as const, desc: '全部用户' },
  { target: 'group' as const, desc: 'VIP用户组' },
  { target: 'group' as const, desc: '新注册用户' },
  { target: 'single' as const, desc: '用户 张三' },
  { target: 'all' as const, desc: '全部用户' },
  { target: 'group' as const, desc: 'Android用户' },
  { target: 'all' as const, desc: '全部用户' },
  { target: 'group' as const, desc: '活跃用户' },
  { target: 'all' as const, desc: '全部用户' },
  { target: 'group' as const, desc: 'iOS用户' },
  { target: 'all' as const, desc: '全部用户' },
  { target: 'single' as const, desc: '用户 李四' },
]

const mockPushMessages: MockPushMessage[] = Array.from({ length: 12 }, (_, i) => {
  const types: MockPushMessage['type'][] = ['system', 'version_update', 'activity', 'recommendation']
  const statuses: MockPushMessage['status'][] = ['sent', 'sent', 'sent', 'pending', 'failed']
  const type = types[i % types.length]!
  const status = statuses[i % statuses.length]!
  const sentCount = status === 'pending' ? 0 : Math.floor(Math.random() * 500) + 200
  const deliveredCount = status === 'pending' ? 0 : Math.floor(sentCount * (0.85 + Math.random() * 0.1))
  const openedCount = status === 'pending' ? 0 : Math.floor(deliveredCount * (0.3 + Math.random() * 0.4))

  return {
    id: `push_${String(i + 1).padStart(3, '0')}`,
    title: pushTitles[i]!,
    content: pushContents[i]!,
    type,
    target: pushTargets[i]!.target,
    target_desc: pushTargets[i]!.desc,
    push_time: dayjs().subtract(i * 2, 'hour').format('YYYY-MM-DD HH:mm:ss'),
    status,
    sent_count: sentCount,
    delivered_count: deliveredCount,
    opened_count: openedCount,
    created_at: dayjs().subtract(i * 2 + 1, 'hour').format('YYYY-MM-DD HH:mm:ss'),
    created_by: mockUsers[i % 3]!.nickname || '管理员',
  }
})

export { pushTypeMap, pushStatusMap }

// ==================== 活动管理 ====================
export interface MockActivity {
  id: string
  name: string
  description: string
  cover_url: string
  type: 'limited_free' | 'discount' | 'checkin_reward' | 'reading_challenge'
  start_time: string
  end_time: string
  status: 'draft' | 'active' | 'ended'
  rules: string
  participant_count: number
  conversion_rate: number
  created_at: string
  created_by: string
}

const activityTypeMap: Record<string, { label: string; color: string }> = {
  limited_free: { label: '限时免费', color: 'red' },
  discount: { label: '折扣优惠', color: 'orange' },
  checkin_reward: { label: '签到奖励', color: 'green' },
  reading_challenge: { label: '阅读挑战', color: 'blue' },
}

const activityStatusMap: Record<string, { label: string; color: string }> = {
  draft: { label: '草稿', color: 'default' },
  active: { label: '进行中', color: 'green' },
  ended: { label: '已结束', color: 'default' },
}

const mockActivities: MockActivity[] = [
  {
    id: 'activity_001',
    name: '周末阅读挑战',
    description: '连续阅读3天，每阅读30分钟即可获得积分奖励。完成全部挑战的用户将获得专属徽章和额外积分。',
    cover_url: 'https://picsum.photos/seed/activity1/400/200',
    type: 'reading_challenge',
    start_time: dayjs().subtract(2, 'day').format('YYYY-MM-DD 00:00:00'),
    end_time: dayjs().add(5, 'day').format('YYYY-MM-DD 23:59:59'),
    status: 'active',
    rules: '1. 每日阅读满30分钟计为一次有效阅读\n2. 连续3天完成挑战即可获得100积分\n3. 全部完成可获得"阅读达人"徽章\n4. 积分将在活动结束后3个工作日内发放',
    participant_count: 356,
    conversion_rate: 68.5,
    created_at: dayjs().subtract(5, 'day').format('YYYY-MM-DD HH:mm:ss'),
    created_by: '管理员',
  },
  {
    id: 'activity_002',
    name: '新用户限时免费',
    description: '新注册用户可免费阅读所有VIP书籍7天，体验优质内容。',
    cover_url: 'https://picsum.photos/seed/activity2/400/200',
    type: 'limited_free',
    start_time: dayjs().subtract(10, 'day').format('YYYY-MM-DD 00:00:00'),
    end_time: dayjs().add(20, 'day').format('YYYY-MM-DD 23:59:59'),
    status: 'active',
    rules: '1. 仅限注册时间在活动期间的新用户\n2. 免费期限为注册后7天\n3. 每人限享受一次\n4. 活动期间阅读的书籍在免费期结束后需付费解锁',
    participant_count: 892,
    conversion_rate: 45.2,
    created_at: dayjs().subtract(15, 'day').format('YYYY-MM-DD HH:mm:ss'),
    created_by: '管理员',
  },
  {
    id: 'activity_003',
    name: '每日签到送积分',
    description: '每日登录签到即可获得积分，连续签到奖励翻倍。',
    cover_url: 'https://picsum.photos/seed/activity3/400/200',
    type: 'checkin_reward',
    start_time: dayjs().subtract(30, 'day').format('YYYY-MM-DD 00:00:00'),
    end_time: dayjs().add(60, 'day').format('YYYY-MM-DD 23:59:59'),
    status: 'active',
    rules: '1. 每日签到获得5积分\n2. 连续签到3天额外获得10积分\n3. 连续签到7天额外获得30积分\n4. 连续签到30天额外获得100积分\n5. 中断签到将重新计算连续天数',
    participant_count: 1256,
    conversion_rate: 82.3,
    created_at: dayjs().subtract(35, 'day').format('YYYY-MM-DD HH:mm:ss'),
    created_by: '管理员',
  },
  {
    id: 'activity_004',
    name: '会员折扣季',
    description: '活动期间开通或续费会员享受8折优惠。',
    cover_url: 'https://picsum.photos/seed/activity4/400/200',
    type: 'discount',
    start_time: dayjs().subtract(20, 'day').format('YYYY-MM-DD 00:00:00'),
    end_time: dayjs().subtract(5, 'day').format('YYYY-MM-DD 23:59:59'),
    status: 'ended',
    rules: '1. 新开通月度会员享8折优惠\n2. 新开通年度会员享7折优惠\n3. 续费会员在原折扣基础上再享9折\n4. 优惠不可叠加使用',
    participant_count: 567,
    conversion_rate: 35.8,
    created_at: dayjs().subtract(25, 'day').format('YYYY-MM-DD HH:mm:ss'),
    created_by: '管理员',
  },
  {
    id: 'activity_005',
    name: '春节阅读马拉松',
    description: '春节期间参与阅读马拉松活动，累计阅读时长达标即可获得丰厚奖励。',
    cover_url: 'https://picsum.photos/seed/activity5/400/200',
    type: 'reading_challenge',
    start_time: dayjs().subtract(60, 'day').format('YYYY-MM-DD 00:00:00'),
    end_time: dayjs().subtract(45, 'day').format('YYYY-MM-DD 23:59:59'),
    status: 'ended',
    rules: '1. 活动期间累计阅读满10小时获得50积分\n2. 累计阅读满30小时获得200积分+月度会员\n3. 累计阅读满50小时获得500积分+季度会员\n4. 阅读时长以系统记录为准',
    participant_count: 789,
    conversion_rate: 52.1,
    created_at: dayjs().subtract(65, 'day').format('YYYY-MM-DD HH:mm:ss'),
    created_by: '管理员',
  },
  {
    id: 'activity_006',
    name: '暑期阅读计划',
    description: '暑假期间每日阅读打卡，完成21天挑战获得限定奖励。',
    cover_url: 'https://picsum.photos/seed/activity6/400/200',
    type: 'reading_challenge',
    start_time: dayjs().add(30, 'day').format('YYYY-MM-DD 00:00:00'),
    end_time: dayjs().add(80, 'day').format('YYYY-MM-DD 23:59:59'),
    status: 'draft',
    rules: '1. 每日阅读满20分钟计为一次打卡\n2. 连续21天打卡完成挑战\n3. 完成挑战获得"暑期阅读之星"徽章\n4. 打卡期间每日额外赠送3积分',
    participant_count: 0,
    conversion_rate: 0,
    created_at: dayjs().subtract(2, 'day').format('YYYY-MM-DD HH:mm:ss'),
    created_by: '管理员',
  },
]

export { activityTypeMap, activityStatusMap }

// ==================== 用户反馈 ====================
export interface MockFeedback {
  id: string
  user_id: string
  user_name: string
  category: 'bug' | 'feature' | 'ux' | 'other'
  title: string
  content: string
  images: string[]
  status: 'pending' | 'processing' | 'resolved' | 'closed'
  priority: 'low' | 'medium' | 'high'
  reply: string | null
  replied_by: string | null
  replied_at: string | null
  created_at: string
  updated_at: string
}

const feedbackCategoryMap: Record<string, { label: string; color: string }> = {
  bug: { label: 'Bug反馈', color: 'red' },
  feature: { label: '功能建议', color: 'blue' },
  ux: { label: '体验优化', color: 'orange' },
  other: { label: '其他', color: 'default' },
}

const feedbackStatusMap: Record<string, { label: string; color: string }> = {
  pending: { label: '待处理', color: 'default' },
  processing: { label: '处理中', color: 'processing' },
  resolved: { label: '已解决', color: 'success' },
  closed: { label: '已关闭', color: 'default' },
}

const feedbackPriorityMap: Record<string, { label: string; color: string }> = {
  low: { label: '低', color: 'default' },
  medium: { label: '中', color: 'orange' },
  high: { label: '高', color: 'red' },
}

const feedbackTitles = [
  '阅读器翻页卡顿', '希望增加夜间模式', '搜索结果不够精准',
  '建议增加书籍分类筛选', '签到页面加载缓慢', '希望支持离线阅读',
  '书架排序功能异常', '建议增加阅读进度同步', '推送通知内容不相关',
  '希望增加社交分享功能', '会员页面显示异常', '建议增加听书功能',
  '笔记编辑器崩溃', '希望增加字体大小调节', 'App启动速度慢',
]

const feedbackContents = [
  '在使用阅读器翻页时，经常出现卡顿现象，尤其是在章节较长的情况下。设备型号：iPhone 15 Pro，系统版本：iOS 17.2。',
  '希望App能够增加夜间模式，在晚上阅读时保护眼睛。可以参考其他阅读App的夜间模式设计。',
  '搜索功能返回的结果不够精准，搜索关键词匹配度不高，经常找不到想要的书籍。',
  '建议在书籍列表页面增加更多分类筛选条件，比如按字数、评分、更新时间等维度筛选。',
  '签到页面打开速度很慢，经常需要等待3-5秒才能加载完成，影响用户体验。',
  '希望App能够支持离线下载书籍，在没有网络的情况下也能阅读已下载的内容。',
  '书架页面的排序功能有bug，选择按最近阅读排序后，顺序并没有正确更新。',
  '希望阅读进度能够在不同设备间同步，目前换设备后需要重新找到阅读位置。',
  '收到的推送通知内容与我的阅读兴趣不匹配，希望推送能更加个性化。',
  '建议增加社交分享功能，可以将正在阅读的书籍或精彩段落分享到社交平台。',
  '会员中心页面在部分机型上显示异常，底部按钮被遮挡无法点击。',
  '希望App能够增加听书功能，支持TTS语音朗读，方便在通勤时使用。',
  '在编辑笔记时，如果输入内容较长，编辑器会突然崩溃，之前输入的内容全部丢失。',
  '希望增加字体大小调节功能，目前字体太小，长时间阅读眼睛容易疲劳。',
  'App冷启动速度较慢，从点击图标到进入首页需要约5秒，希望优化启动速度。',
]

const feedbackReplies = [
  null,
  '感谢您的建议，夜间模式已在开发计划中，预计下个版本上线。',
  null,
  '感谢反馈，分类筛选功能已在v2.4.0版本中上线，请更新体验。',
  null,
  '离线阅读功能已列入Q3开发计划，敬请期待。',
  null,
  '阅读进度同步功能已在v2.3.0版本中实现，请确保已更新到最新版本。',
  null,
  '社交分享功能正在开发中，预计v2.5.0版本上线。',
  null,
  '听书功能已在评估中，我们会尽快安排开发。',
  null,
  '字体大小调节功能已在v2.4.0版本中上线。',
  null,
]

const mockFeedbacks: MockFeedback[] = Array.from({ length: 15 }, (_, i) => {
  const categories: MockFeedback['category'][] = ['bug', 'feature', 'ux', 'other']
  const statuses: MockFeedback['status'][] = ['pending', 'processing', 'resolved', 'closed']
  const priorities: MockFeedback['priority'][] = ['low', 'medium', 'high']
  const user = mockUsers[i % mockUsers.length]!
  const category = categories[i % categories.length]!
  const status = statuses[i % statuses.length]!
  const priority = priorities[i % priorities.length]!
  const reply = feedbackReplies[i] ?? null
  const repliedAt = reply ? dayjs().subtract(Math.floor(Math.random() * 3), 'day').format('YYYY-MM-DD HH:mm:ss') : null

  return {
    id: `feedback_${String(i + 1).padStart(3, '0')}`,
    user_id: user.id,
    user_name: user.nickname || '未知用户',
    category,
    title: feedbackTitles[i]!,
    content: feedbackContents[i]!,
    images: i % 3 === 0 ? [`https://picsum.photos/seed/feedback${i}/200/200`] : [],
    status,
    priority,
    reply,
    replied_by: reply ? '管理员' : null,
    replied_at: repliedAt,
    created_at: dayjs().subtract(i * 2 + Math.floor(Math.random() * 24), 'hour').format('YYYY-MM-DD HH:mm:ss'),
    updated_at: dayjs().subtract(Math.floor(Math.random() * 24), 'hour').format('YYYY-MM-DD HH:mm:ss'),
  }
})

export { feedbackCategoryMap, feedbackStatusMap, feedbackPriorityMap }

export interface ApiEndpoint {
  id: string
  module: string
  method: 'GET' | 'POST' | 'PUT' | 'DELETE'
  path: string
  description: string
  params: string
  responseExample: string
}

export interface ApiKey {
  id: string
  name: string
  key: string
  created_at: string
  last_used_at: string | null
  status: 'active' | 'revoked'
  request_count: number
}

export interface ApiLog {
  id: string
  time: string
  method: 'GET' | 'POST' | 'PUT' | 'DELETE'
  path: string
  status: number
  duration: number
  ip: string
  api_key_name: string
  user_agent: string
}

export interface SyncHistory {
  id: string
  time: string
  type: 'full' | 'incremental' | 'manual'
  status: 'success' | 'failed' | 'in_progress'
  records_synced: number
  duration: number
  detail: string
}

export const mockApiEndpoints: ApiEndpoint[] = [
  // 用户认证
  { id: 'ep_001', module: '用户认证', method: 'POST', path: '/api/auth/register', description: '用户注册', params: '{ "email": "string", "password": "string", "nickname": "string" }', responseExample: '{ "code": 200, "data": { "user_id": "string", "token": "string" } }' },
  { id: 'ep_002', module: '用户认证', method: 'POST', path: '/api/auth/login', description: '用户登录', params: '{ "email": "string", "password": "string" }', responseExample: '{ "code": 200, "data": { "user_id": "string", "token": "string", "role": "string" } }' },
  { id: 'ep_003', module: '用户认证', method: 'POST', path: '/api/auth/logout', description: '用户登出', params: '{ "token": "string" }', responseExample: '{ "code": 200, "message": "登出成功" }' },
  { id: 'ep_004', module: '用户认证', method: 'POST', path: '/api/auth/refresh-token', description: '刷新令牌', params: '{ "refresh_token": "string" }', responseExample: '{ "code": 200, "data": { "token": "string", "expires_in": 3600 } }' },
  { id: 'ep_005', module: '用户认证', method: 'PUT', path: '/api/auth/password', description: '修改密码', params: '{ "old_password": "string", "new_password": "string" }', responseExample: '{ "code": 200, "message": "密码修改成功" }' },
  // 消费记录
  { id: 'ep_006', module: '消费记录', method: 'GET', path: '/api/expenses', description: '获取消费记录列表', params: '?page=1&limit=20&category=餐饮&start_date=2024-01-01&end_date=2024-12-31', responseExample: '{ "code": 200, "data": { "list": [...], "total": 100, "page": 1 } }' },
  { id: 'ep_007', module: '消费记录', method: 'POST', path: '/api/expenses', description: '创建消费记录', params: '{ "category": "餐饮", "amount": 128.5, "note": "午餐", "date": "2024-01-15" }', responseExample: '{ "code": 200, "data": { "id": "string", ... } }' },
  { id: 'ep_008', module: '消费记录', method: 'PUT', path: '/api/expenses/:id', description: '更新消费记录', params: '{ "category": "餐饮", "amount": 150, "note": "午餐聚餐" }', responseExample: '{ "code": 200, "data": { "id": "string", ... } }' },
  { id: 'ep_009', module: '消费记录', method: 'DELETE', path: '/api/expenses/:id', description: '删除消费记录', params: '无', responseExample: '{ "code": 200, "message": "删除成功" }' },
  { id: 'ep_010', module: '消费记录', method: 'GET', path: '/api/expenses/stats', description: '消费统计', params: '?period=month&category=餐饮', responseExample: '{ "code": 200, "data": { "total": 5000, "by_category": [...] } }' },
  // 心情日记
  { id: 'ep_011', module: '心情日记', method: 'GET', path: '/api/moods', description: '获取心情日记列表', params: '?page=1&limit=20&mood=开心', responseExample: '{ "code": 200, "data": { "list": [...], "total": 50 } }' },
  { id: 'ep_012', module: '心情日记', method: 'POST', path: '/api/moods', description: '创建心情日记', params: '{ "mood": "开心", "content": "今天天气很好", "tags": ["生活", "工作"] }', responseExample: '{ "code": 200, "data": { "id": "string", ... } }' },
  { id: 'ep_013', module: '心情日记', method: 'PUT', path: '/api/moods/:id', description: '更新心情日记', params: '{ "mood": "平静", "content": "更新内容" }', responseExample: '{ "code": 200, "data": { "id": "string", ... } }' },
  { id: 'ep_014', module: '心情日记', method: 'DELETE', path: '/api/moods/:id', description: '删除心情日记', params: '无', responseExample: '{ "code": 200, "message": "删除成功" }' },
  { id: 'ep_015', module: '心情日记', method: 'GET', path: '/api/moods/stats', description: '心情统计', params: '?period=week', responseExample: '{ "code": 200, "data": { "distribution": { "开心": 10, "平静": 8, ... } } }' },
  // 体重记录
  { id: 'ep_016', module: '体重记录', method: 'GET', path: '/api/weights', description: '获取体重记录列表', params: '?page=1&limit=30&start_date=2024-01-01', responseExample: '{ "code": 200, "data": { "list": [...], "total": 30 } }' },
  { id: 'ep_017', module: '体重记录', method: 'POST', path: '/api/weights', description: '创建体重记录', params: '{ "weight": 68.5, "height": 175, "body_fat": 22.1, "note": "运动后" }', responseExample: '{ "code": 200, "data": { "id": "string", "bmi": 22.4, ... } }' },
  { id: 'ep_018', module: '体重记录', method: 'PUT', path: '/api/weights/:id', description: '更新体重记录', params: '{ "weight": 68.0, "note": "修正数据" }', responseExample: '{ "code": 200, "data": { "id": "string", ... } }' },
  { id: 'ep_019', module: '体重记录', method: 'DELETE', path: '/api/weights/:id', description: '删除体重记录', params: '无', responseExample: '{ "code": 200, "message": "删除成功" }' },
  { id: 'ep_020', module: '体重记录', method: 'GET', path: '/api/weights/trend', description: '体重趋势', params: '?period=30d', responseExample: '{ "code": 200, "data": { "trend": [...], "current": 68.5, "change": -1.2 } }' },
  // 笔记
  { id: 'ep_021', module: '笔记', method: 'GET', path: '/api/notes', description: '获取笔记列表', params: '?page=1&limit=20&category=技术&keyword=React', responseExample: '{ "code": 200, "data": { "list": [...], "total": 20 } }' },
  { id: 'ep_022', module: '笔记', method: 'POST', path: '/api/notes', description: '创建笔记', params: '{ "title": "标题", "content": "内容", "category": "技术", "tags": ["React"] }', responseExample: '{ "code": 200, "data": { "id": "string", ... } }' },
  { id: 'ep_023', module: '笔记', method: 'PUT', path: '/api/notes/:id', description: '更新笔记', params: '{ "title": "新标题", "content": "新内容" }', responseExample: '{ "code": 200, "data": { "id": "string", ... } }' },
  { id: 'ep_024', module: '笔记', method: 'DELETE', path: '/api/notes/:id', description: '删除笔记', params: '无', responseExample: '{ "code": 200, "message": "删除成功" }' },
  { id: 'ep_025', module: '笔记', method: 'PUT', path: '/api/notes/:id/pin', description: '置顶/取消置顶笔记', params: '{ "is_pinned": true }', responseExample: '{ "code": 200, "message": "操作成功" }' },
  // 小说
  { id: 'ep_026', module: '小说', method: 'GET', path: '/api/novels', description: '获取小说列表', params: '?page=1&limit=20&category=玄幻&status=ongoing', responseExample: '{ "code": 200, "data": { "list": [...], "total": 15 } }' },
  { id: 'ep_027', module: '小说', method: 'GET', path: '/api/novels/:id', description: '获取小说详情', params: '无', responseExample: '{ "code": 200, "data": { "id": "string", "title": "...", "chapters": [...] } }' },
  { id: 'ep_028', module: '小说', method: 'GET', path: '/api/novels/:id/chapters', description: '获取小说章节列表', params: '?page=1&limit=50', responseExample: '{ "code": 200, "data": { "list": [...], "total": 500 } }' },
  { id: 'ep_029', module: '小说', method: 'GET', path: '/api/novels/:id/chapters/:chapter_id', description: '获取章节内容', params: '无', responseExample: '{ "code": 200, "data": { "title": "第一章", "content": "..." } }' },
  { id: 'ep_030', module: '小说', method: 'PUT', path: '/api/novels/:id/progress', description: '更新阅读进度', params: '{ "chapter_id": "string", "progress": 0.5 }', responseExample: '{ "code": 200, "message": "进度已更新" }' },
  // 版本管理
  { id: 'ep_031', module: '版本管理', method: 'GET', path: '/api/versions', description: '获取版本列表', params: '?platform=android', responseExample: '{ "code": 200, "data": { "list": [...], "latest": {...} } }' },
  { id: 'ep_032', module: '版本管理', method: 'GET', path: '/api/versions/latest', description: '获取最新版本', params: '?platform=android', responseExample: '{ "code": 200, "data": { "version": "2.3.1", "build_number": 231, ... } }' },
  { id: 'ep_033', module: '版本管理', method: 'GET', path: '/api/versions/check-update', description: '检查更新', params: '?current_version=2.2.0&platform=android', responseExample: '{ "code": 200, "data": { "has_update": true, "force_update": false, "version": "2.3.1" } }' },
  { id: 'ep_034', module: '版本管理', method: 'POST', path: '/api/versions/:id/download', description: '记录下载', params: '{ "device_info": "string" }', responseExample: '{ "code": 200, "data": { "download_url": "https://..." } }' },
]

export const mockApiKeys: ApiKey[] = [
  { id: 'ak_001', name: '生产环境主密钥', key: 'pe_sk_live_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6', created_at: dayjs().subtract(90, 'day').format('YYYY-MM-DD HH:mm:ss'), last_used_at: dayjs().subtract(2, 'minute').format('YYYY-MM-DD HH:mm:ss'), status: 'active', request_count: 125680 },
  { id: 'ak_002', name: '测试环境密钥', key: 'pe_sk_test_x9y8z7w6v5u4t3s2r1q0p9o8n7m6l5k4', created_at: dayjs().subtract(60, 'day').format('YYYY-MM-DD HH:mm:ss'), last_used_at: dayjs().subtract(1, 'hour').format('YYYY-MM-DD HH:mm:ss'), status: 'active', request_count: 45230 },
  { id: 'ak_003', name: '数据分析服务', key: 'pe_sk_data_j5k6l7m8n9o0p1q2r3s4t5u6v7w8x9y0', created_at: dayjs().subtract(30, 'day').format('YYYY-MM-DD HH:mm:ss'), last_used_at: dayjs().subtract(15, 'minute').format('YYYY-MM-DD HH:mm:ss'), status: 'active', request_count: 18920 },
  { id: 'ak_004', name: '旧版客户端密钥', key: 'pe_sk_old_a1a2b3b4c5c6d7d8e9e0f1f2g3g4h5h6', created_at: dayjs().subtract(180, 'day').format('YYYY-MM-DD HH:mm:ss'), last_used_at: dayjs().subtract(30, 'day').format('YYYY-MM-DD HH:mm:ss'), status: 'revoked', request_count: 89000 },
  { id: 'ak_005', name: '第三方集成密钥', key: 'pe_sk_3rd_q1w2e3r4t5y6u7i8o9p0a1s2d3f4g5h6', created_at: dayjs().subtract(15, 'day').format('YYYY-MM-DD HH:mm:ss'), last_used_at: dayjs().subtract(3, 'day').format('YYYY-MM-DD HH:mm:ss'), status: 'active', request_count: 3200 },
]

const apiLogPaths = mockApiEndpoints.map(ep => ep.path)
const apiLogMethods: ('GET' | 'POST' | 'PUT' | 'DELETE')[] = ['GET', 'POST', 'PUT', 'DELETE']

export const mockApiLogs: ApiLog[] = Array.from({ length: 100 }, (_, i) => {
  const method = apiLogMethods[i % apiLogMethods.length]!
  const status = i % 20 === 0 ? 500 : i % 15 === 0 ? 404 : i % 12 === 0 ? 401 : i % 10 === 0 ? 429 : 200
  return {
    id: `api_log_${String(i + 1).padStart(4, '0')}`,
    time: dayjs().subtract(i * 5, 'minute').format('YYYY-MM-DD HH:mm:ss'),
    method,
    path: apiLogPaths[i % apiLogPaths.length]!,
    status,
    duration: status >= 400 ? Math.floor(Math.random() * 2000) + 500 : Math.floor(Math.random() * 300) + 20,
    ip: `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
    api_key_name: mockApiKeys[i % mockApiKeys.length]!.name,
    user_agent: [
      'PureEnjoy/2.3.1 (Android 14; Pixel 8)',
      'PureEnjoy/2.3.1 (iOS 17.0; iPhone 15)',
      'PureEnjoy-DataSync/1.0.0',
      'ThirdParty-Integration/1.2.0',
    ][i % 4]!,
  }
})

export const mockSyncHistory: SyncHistory[] = [
  { id: 'sync_001', time: dayjs().subtract(10, 'minute').format('YYYY-MM-DD HH:mm:ss'), type: 'incremental', status: 'success', records_synced: 23, duration: 3.2, detail: '增量同步：新增 15 条消费记录，更新 8 条心情日记' },
  { id: 'sync_002', time: dayjs().subtract(2, 'hour').format('YYYY-MM-DD HH:mm:ss'), type: 'manual', status: 'success', records_synced: 156, duration: 12.5, detail: '手动全量同步：同步用户数据、消费记录、心情日记、体重记录' },
  { id: 'sync_003', time: dayjs().subtract(6, 'hour').format('YYYY-MM-DD HH:mm:ss'), type: 'incremental', status: 'failed', records_synced: 0, duration: 5.1, detail: '同步失败：网络连接超时，待重试' },
  { id: 'sync_004', time: dayjs().subtract(12, 'hour').format('YYYY-MM-DD HH:mm:ss'), type: 'incremental', status: 'success', records_synced: 45, duration: 4.8, detail: '增量同步：新增 30 条笔记，更新 15 条体重记录' },
  { id: 'sync_005', time: dayjs().subtract(1, 'day').format('YYYY-MM-DD HH:mm:ss'), type: 'full', status: 'success', records_synced: 12580, duration: 45.3, detail: '每日全量同步完成' },
  { id: 'sync_006', time: dayjs().subtract(1, 'day').format('YYYY-MM-DD HH:mm:ss'), type: 'incremental', status: 'success', records_synced: 67, duration: 6.1, detail: '增量同步：新增 40 条消费记录，更新 27 条数据' },
  { id: 'sync_007', time: dayjs().subtract(2, 'day').format('YYYY-MM-DD HH:mm:ss'), type: 'full', status: 'success', records_synced: 12350, duration: 42.8, detail: '每日全量同步完成' },
  { id: 'sync_008', time: dayjs().subtract(2, 'day').format('YYYY-MM-DD HH:mm:ss'), type: 'incremental', status: 'failed', records_synced: 12, duration: 8.3, detail: '同步中断：数据冲突（3条记录），需手动解决' },
  { id: 'sync_009', time: dayjs().subtract(3, 'day').format('YYYY-MM-DD HH:mm:ss'), type: 'manual', status: 'success', records_synced: 89, duration: 8.7, detail: '手动触发同步：解决冲突后重新同步' },
  { id: 'sync_010', time: dayjs().subtract(3, 'day').format('YYYY-MM-DD HH:mm:ss'), type: 'full', status: 'success', records_synced: 12200, duration: 40.1, detail: '每日全量同步完成' },
  { id: 'sync_011', time: dayjs().subtract(4, 'day').format('YYYY-MM-DD HH:mm:ss'), type: 'incremental', status: 'success', records_synced: 34, duration: 3.9, detail: '增量同步：新增 20 条心情日记，更新 14 条笔记' },
  { id: 'sync_012', time: dayjs().subtract(5, 'day').format('YYYY-MM-DD HH:mm:ss'), type: 'full', status: 'success', records_synced: 12100, duration: 39.5, detail: '每日全量同步完成' },
  { id: 'sync_013', time: dayjs().subtract(7, 'day').format('YYYY-MM-DD HH:mm:ss'), type: 'incremental', status: 'success', records_synced: 56, duration: 5.4, detail: '增量同步：新增 35 条消费记录，更新 21 条体重记录' },
  { id: 'sync_014', time: dayjs().subtract(7, 'day').format('YYYY-MM-DD HH:mm:ss'), type: 'manual', status: 'success', records_synced: 200, duration: 15.2, detail: '手动全量同步：数据迁移后首次同步' },
  { id: 'sync_015', time: dayjs().subtract(10, 'day').format('YYYY-MM-DD HH:mm:ss'), type: 'full', status: 'failed', records_synced: 5600, duration: 60.0, detail: '全量同步失败：数据库连接中断，已自动重试' },
]

// ==================== 导出所有 Mock 数据 ====================
export {
  mockUsers,
  mockExpenses,
  mockMoodDiaries,
  mockWeightRecords,
  mockNotes,
  mockNovels,
  mockNovelChapters,
  mockPushMessages,
  mockActivities,
  mockFeedbacks,
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

// ==================== 收藏夹 ====================
export interface MockFavorite {
  id: string
  user_id: string
  title: string
  url: string | null
  category: string
  tags: string[]
  is_pinned: boolean
  created_at: string
  updated_at: string
}

export const favoriteCategoryMap: Record<string, { label: string; color: string }> = {
  article: { label: '文章', color: 'blue' },
  video: { label: '视频', color: 'red' },
  tool: { label: '工具', color: 'green' },
  website: { label: '网站', color: 'purple' },
  other: { label: '其他', color: 'default' },
}

const favoriteTitles = [
  'React 官方文档', 'TypeScript 入门教程', 'Ant Design 组件库',
  'MDN Web Docs', 'GitHub 开源项目', 'Stack Overflow',
  'CSS-Tricks 技巧', 'JavaScript 高级程序设计', 'Node.js 最佳实践',
  'Docker 入门指南', 'Kubernetes 教程', 'Linux 命令大全',
  'VS Code 插件推荐', 'Chrome 开发者工具', 'Figma 设计资源',
]

const favoriteUrls = [
  'https://react.dev', 'https://www.typescriptlang.org/docs', 'https://ant.design',
  'https://developer.mozilla.org', 'https://github.com', 'https://stackoverflow.com',
  'https://css-tricks.com', 'https://book.douban.com/subject/35196328', 'https://nodejs.org',
  'https://www.docker.com', 'https://kubernetes.io', 'https://linux.die.net',
  'https://marketplace.visualstudio.com', 'https://developer.chrome.com', 'https://www.figma.com',
]

const favoriteCategories = ['article', 'video', 'tool', 'website', 'other']
const favoriteTagsList = ['前端', '后端', '工具', '教程', '参考', '开源', '设计', '文档']

export const mockFavorites: MockFavorite[] = Array.from({ length: 15 }, (_, i) => {
  const user = mockUsers[i % mockUsers.length]!
  const category = favoriteCategories[i % favoriteCategories.length]!
  return {
    id: `fav_${String(i + 1).padStart(3, '0')}`,
    user_id: user.id,
    title: favoriteTitles[i]!,
    url: favoriteUrls[i]!,
    category,
    tags: [favoriteTagsList[i % favoriteTagsList.length]!, favoriteTagsList[(i + 2) % favoriteTagsList.length]!],
    is_pinned: i < 3,
    created_at: dayjs().subtract(Math.floor(Math.random() * 90) + 1, 'day').format('YYYY-MM-DD HH:mm:ss'),
    updated_at: dayjs().subtract(Math.floor(Math.random() * 7), 'day').format('YYYY-MM-DD HH:mm:ss'),
  }
})

// ==================== 日程提醒 ====================
export interface MockReminder {
  id: string
  user_id: string
  title: string
  description: string | null
  remind_at: string
  is_completed: boolean
  priority: 'low' | 'normal' | 'high'
  created_at: string
}

export const reminderPriorityMap: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  low: { label: '低', color: 'default', icon: null },
  normal: { label: '中', color: 'blue', icon: null },
  high: { label: '高', color: 'red', icon: null },
}

const reminderTitles = [
  '完成项目报告', '团队周会', '客户演示', '代码审查', '发布新版本',
  '学习新技术', '健身运动', '阅读书籍', '家庭聚会', '缴纳账单',
  '预约体检', '购买生活用品', '整理笔记', '备份数据', '更新简历',
]

const reminderDescriptions = [
  '需要完成Q4季度的项目总结报告',
  '每周五下午3点的团队例会',
  '向客户展示新功能',
  '审查团队成员提交的代码',
  '发布v2.4.0版本到生产环境',
  '学习React 18新特性',
  '去健身房锻炼1小时',
  '阅读《深度工作》30分钟',
  '周末家庭聚餐',
  '缴纳水电费和网费',
  '预约年度健康体检',
  '去超市购买生活用品',
  '整理本周的学习笔记',
  '备份重要数据到云端',
  '更新个人简历',
]

export const mockReminders: MockReminder[] = Array.from({ length: 15 }, (_, i) => {
  const user = mockUsers[i % mockUsers.length]!
  const priorities: MockReminder['priority'][] = ['low', 'normal', 'high']
  const isCompleted = i < 5
  return {
    id: `reminder_${String(i + 1).padStart(3, '0')}`,
    user_id: user.id,
    title: reminderTitles[i]!,
    description: reminderDescriptions[i]!,
    remind_at: dayjs().add(i - 5, 'day').hour(9 + i % 8).minute(0).format('YYYY-MM-DD HH:mm:ss'),
    is_completed: isCompleted,
    priority: priorities[i % priorities.length]!,
    created_at: dayjs().subtract(Math.floor(Math.random() * 30) + 1, 'day').format('YYYY-MM-DD HH:mm:ss'),
  }
})

// ==================== 习惯打卡 ====================
export interface MockHabit {
  id: string
  user_id: string
  name: string
  description: string | null
  frequency: 'daily' | 'weekly' | 'monthly'
  target_days: number
  current_streak: number
  max_streak: number
  total_checkins: number
  color: string
  is_active: boolean
  created_at: string
}

export interface MockHabitCheckin {
  id: string
  habit_id: string
  checkin_date: string
  note: string | null
  created_at: string
}

export const habitFrequencyMap: Record<string, { label: string }> = {
  daily: { label: '每天' },
  weekly: { label: '每周' },
  monthly: { label: '每月' },
}

const habitNames = [
  '早起', '阅读', '运动', '冥想', '喝水',
  '写日记', '背单词', '练琴', '画画', '编程',
  '整理房间', '吃水果', '早睡', '拉伸', '记账',
]

const habitDescriptions = [
  '每天早上7点前起床',
  '每天阅读30分钟',
  '每天运动30分钟',
  '每天冥想10分钟',
  '每天喝8杯水',
  '每天写日记记录生活',
  '每天背20个单词',
  '每天练习钢琴30分钟',
  '每天画画1小时',
  '每天编程学习2小时',
  '每天整理房间10分钟',
  '每天吃2份水果',
  '每天晚上11点前睡觉',
  '每天拉伸15分钟',
  '每天记录收支',
]

const habitColors = [
  '#1890FF', '#52C41A', '#FAAD14', '#FF4D4F', '#722ED1',
  '#13C2C2', '#EB2F96', '#F5222D', '#FA541C', '#FA8C16',
  '#2F4554', '#61A5E8', '#91C7AE', '#D53A35', '#E062AE',
]

export const mockHabits: MockHabit[] = Array.from({ length: 12 }, (_, i) => {
  const user = mockUsers[i % 5]!
  const currentStreak = Math.floor(Math.random() * 30)
  const totalCheckins = Math.floor(Math.random() * 100) + currentStreak
  return {
    id: `habit_${String(i + 1).padStart(3, '0')}`,
    user_id: user.id,
    name: habitNames[i]!,
    description: habitDescriptions[i]!,
    frequency: 'daily',
    target_days: 21,
    current_streak: currentStreak,
    max_streak: Math.max(currentStreak, Math.floor(Math.random() * 60) + 10),
    total_checkins: totalCheckins,
    color: habitColors[i % habitColors.length]!,
    is_active: i < 10,
    created_at: dayjs().subtract(Math.floor(Math.random() * 90) + 30, 'day').format('YYYY-MM-DD HH:mm:ss'),
  }
})

// 生成打卡记录
export const mockHabitCheckins: MockHabitCheckin[] = []
mockHabits.forEach(habit => {
  // 为每个习惯生成最近7天的打卡记录（随机）
  for (let i = 0; i < 7; i++) {
    if (Math.random() > 0.3) { // 70%概率打卡
      mockHabitCheckins.push({
        id: `checkin_${habit.id}_${i}`,
        habit_id: habit.id,
        checkin_date: dayjs().subtract(i, 'day').format('YYYY-MM-DD'),
        note: i === 0 ? '今天感觉很好！' : null,
        created_at: dayjs().subtract(i, 'day').hour(8 + Math.floor(Math.random() * 12)).format('YYYY-MM-DD HH:mm:ss'),
      })
    }
  }
})
