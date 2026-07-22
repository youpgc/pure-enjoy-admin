/**
 * 集中常量定义 - 全项目唯一的枚举/字典/映射源
 *
 * 规则：
 * 1. 所有状态值、类型值、角色值等统一在此定义
 * 2. 页面组件和工具函数从这里导入，禁止自行硬编码
 * 3. dictService.ts 的 fallback 值也必须与此保持一致
 */

// ==================== Auth & Roles ====================

export const ROLE_USER = 'user' as const
export const ROLE_ADMIN = 'admin' as const
export const ROLE_SUPER_ADMIN = 'super_admin' as const

export const ADMIN_ROLE_CODES = [ROLE_ADMIN, ROLE_SUPER_ADMIN] as const

export type UserRole = 'user' | 'admin' | 'super_admin'
export type MemberLevel = 'normal' | 'member' | 'super_member'
export type UserStatus = 'active' | 'abnormal' | 'disabled' | 'banned'

export const USER_ROLE_LABELS: Record<UserRole, string> = {
  user: '普通用户',
  admin: '管理员',
  super_admin: '超级管理员',
}

export const USER_ROLE_COLORS: Record<UserRole, string> = {
  user: 'default',
  admin: 'blue',
  super_admin: 'purple',
}

export const USER_ROLE_OPTIONS = [
  { label: '普通用户', value: 'user' as UserRole },
  { label: '管理员', value: 'admin' as UserRole },
  { label: '超级管理员', value: 'super_admin' as UserRole },
]

export const MEMBER_LEVEL_LABELS: Record<MemberLevel, string> = {
  normal: '普通会员',
  member: '会员',
  super_member: '超级会员',
}

export const MEMBER_LEVEL_COLORS: Record<MemberLevel, string> = {
  normal: 'default',
  member: 'gold',
  super_member: 'cyan',
}

export const MEMBER_LEVEL_OPTIONS = [
  { label: '普通会员', value: 'normal' as MemberLevel },
  { label: '会员', value: 'member' as MemberLevel },
  { label: '超级会员', value: 'super_member' as MemberLevel },
]

export const USER_STATUS_LABELS: Record<UserStatus, string> = {
  active: '正常',
  abnormal: '异常',
  disabled: '禁用',
  banned: '封禁',
}

export const USER_STATUS_COLORS: Record<UserStatus, string> = {
  active: 'green',
  abnormal: 'orange',
  disabled: 'default',
  banned: 'red',
}

export const USER_STATUS_OPTIONS = [
  { label: '正常', value: 'active' as UserStatus },
  { label: '异常', value: 'abnormal' as UserStatus },
  { label: '禁用', value: 'disabled' as UserStatus },
  { label: '封禁', value: 'banned' as UserStatus },
]

export const USER_STATUS_ACTIVE = 'active' as const

export const DEFAULT_USER_FORM_VALUES = {
  gender: '保密',
  role: ROLE_USER as UserRole,
  member_level: 'normal' as MemberLevel,
  status: USER_STATUS_ACTIVE as UserStatus,
  available_points: 0,
}

// ==================== Supabase 错误码 ====================

export const SUPABASE_ERROR_CODE_MAP: Record<string, string> = {
  PGRST116: '数据不存在或已被删除',
  PGRST301: '没有权限执行此操作',
  '23505': '数据已存在（唯一性冲突）',
  '23503': '关联数据不存在（外键约束）',
  '42501': '没有权限执行此操作',
}

// ==================== 应用配置类型 ====================

export const CONFIG_TYPE_MAP: Record<string, string> = {
  string: '字符串',
  number: '数字',
  boolean: '布尔',
  json: 'JSON',
}

export const CONFIG_TYPE_OPTIONS = [
  { label: '字符串', value: 'string' as const },
  { label: '数字', value: 'number' as const },
  { label: '布尔', value: 'boolean' as const },
  { label: 'JSON', value: 'json' as const },
]

// ==================== 权限系统 ====================

export const ROLE_STATUS_LABELS: Record<string, string> = {
  active: '启用',
  disabled: '禁用',
}

export const ROLE_STATUS_COLORS: Record<string, string> = {
  active: 'green',
  disabled: 'red',
}

// 角色状态枚举单一源（避免页面硬编码 'active' / 'disabled'）
export const ROLE_STATUS = {
  ACTIVE: 'active',
  DISABLED: 'disabled',
} as const

export const PERMISSION_TYPE_LABELS: Record<string, string> = {
  menu: '菜单',
  action: '操作',
}

export const MODULE_DISPLAY_NAMES: Record<string, string> = {
  users: '用户中心',
  content: '内容管理',
  life: '生活服务',
  operations: '运营管理',
  system: '系统设置',
  dashboard: '数据概览',
  expenses: '消费记录',
  moods: '心情日记',
  weights: '体重记录',
  notes: '笔记本',
  novels: '小说管理',
  versions: '版本管理',
  feedback: '问题反馈',
  announcements: '公告管理',
}

export const MODULE_COLORS: Record<string, string> = {
  users: '#1890ff',
  content: '#52c41a',
  life: '#faad14',
  operations: '#722ed1',
  system: '#f5222d',
  dashboard: '#13c2c2',
  expenses: '#eb2f96',
  moods: '#fa8c16',
  weights: '#a0d911',
  notes: '#2f54eb',
  novels: '#fa541c',
  versions: '#13c2c2',
  feedback: '#1890ff',
  announcements: '#52c41a',
}

// ==================== 操作日志 ====================

export const ACTION_MAP: Record<string, { color: string; label: string }> = {
  create: { color: 'green', label: '创建' },
  update: { color: 'blue', label: '更新' },
  delete: { color: 'red', label: '删除' },
  read: { color: 'default', label: '查询' },
  create_user: { color: 'green', label: '创建用户' },
  update_user: { color: 'blue', label: '更新用户' },
  delete_user: { color: 'red', label: '删除用户' },
  toggle_user_status: { color: 'orange', label: '切换用户状态' },
}

export const ACTION_LABEL_MAP: Record<string, string> = Object.fromEntries(
  Object.entries(ACTION_MAP).map(([k, v]) => [k, v.label])
)

export const ACTION_OPTIONS = [
  { label: '创建', value: 'create' },
  { label: '更新', value: 'update' },
  { label: '删除', value: 'delete' },
  { label: '查询', value: 'read' },
]

export const OP_MODULE_MAP: Record<string, { color: string; label: string }> = {
  user: { color: 'blue', label: '用户' },
  users: { color: 'blue', label: '用户' },
  system: { color: 'purple', label: '系统' },
  novel: { color: 'green', label: '小说' },
  content: { color: 'orange', label: '内容' },
}

export const OP_MODULE_LABEL_MAP: Record<string, string> = Object.fromEntries(
  Object.entries(OP_MODULE_MAP).map(([k, v]) => [k, v.label])
)

export const MODULE_OPTIONS = [
  { label: '用户', value: 'user' },
  { label: '系统', value: 'system' },
  { label: '小说', value: 'novel' },
  { label: '内容', value: 'content' },
]

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

// ==================== 反馈 ====================

export const FEEDBACK_STATUS_MAP: Record<string, { color: string; label: string }> = {
  pending: { color: 'default', label: '待确认' },
  confirmed: { color: 'processing', label: '已确认' },
  in_progress: { color: 'warning', label: '处理中' },
  resolved: { color: 'success', label: '已完结' },
  rejected: { color: 'error', label: '已拒绝' },
  delayed: { color: 'orange', label: '已滞后' },
}

// 反馈状态/动作枚举单一源（避免页面硬编码）
export const FEEDBACK_STATUS_PENDING = 'pending'
export const FEEDBACK_ACTION_DELETED = 'deleted'

export const FEEDBACK_CATEGORY_MAP: Record<string, { color: string; label: string }> = {
  bug: { color: 'error', label: 'Bug' },
  feature: { color: 'processing', label: '功能建议' },
  improvement: { color: 'warning', label: '体验优化' },
  other: { color: 'default', label: '其他' },
}

export const FEEDBACK_STATUS_ACTIONS: Record<string, string[]> = {
  pending: ['confirmed', 'rejected'],
  confirmed: ['in_progress', 'delayed', 'rejected'],
  in_progress: ['resolved', 'delayed', 'rejected'],
  resolved: [],
  rejected: [],
  delayed: ['in_progress', 'resolved', 'rejected'],
}

// 小说推荐反馈类型（与 FEEDBACK_CATEGORY_MAP 无关，属另一枚举：用户对推荐结果的反馈）
export const RECOMMENDATION_FEEDBACK_TYPE_MAP: Record<string, { color: string; label: string }> = {
  click: { color: 'blue', label: '点击' },
  dismiss: { color: 'default', label: '忽略' },
  collect: { color: 'magenta', label: '收藏' },
  read: { color: 'green', label: '阅读' },
  not_interested: { color: 'red', label: '不感兴趣' },
}

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
  tired: '笮惫',
  grateful: '感恩',
}

export const MOOD_COLOR_MAP: Record<string, string> = {
  happy: '#52c41a',
  sad: '#1890ff',
  angry: '#ff4d4f',
  anxious: '#faad14',
  calm: '#13c2c2',
  excited: '#eb2f96',
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

// ==================== 积分 ====================

export const POINT_TYPE_MAP: Record<string, { color: string; label: string }> = {
  checkin:      { color: 'green',  label: '签到' },
  earn:         { color: 'green',  label: '获得' },
  spend:        { color: 'red',    label: '消费' },
  adjust:       { color: 'blue',   label: '调整' },
  admin_adjust: { color: 'purple', label: '管理员调整' },
}

export const POINT_STATUS_MAP: Record<string, { color: string; label: string }> = {
  active: { color: 'green', label: '有效' },
  expired: { color: 'default', label: '已过期' },
  used: { color: 'orange', label: '已使用' },
}

// ==================== 错误日志 ====================

export const ERROR_LOG_LEVEL_MAP: Record<string, { color: string; label: string }> = {
  error: { color: 'red', label: 'ERROR' },
  warning: { color: 'orange', label: 'WARNING' },
  info: { color: 'blue', label: 'INFO' },
}

export const ERROR_LOG_LEVEL_OPTIONS = [
  { label: 'ERROR', value: 'error' },
  { label: 'WARNING', value: 'warning' },
  { label: 'INFO', value: 'info' },
]
