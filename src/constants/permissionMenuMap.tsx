// ==================== 权限 -> 菜单对照表 ====================
//
// 权限树/权限配置面板原本按 permissions.module 扁平分组，与侧边栏菜单没有对应关系，
// 且 MODULE_DISPLAY_NAMES 不完整，大量分组直接显示原始 module 字符串（如 sensitive_words、
// app_configs），无法直观看出对应哪个页面。
//
// 本文件把「权限资源前缀（permission.name 中 ':' 之前的部分）」映射到侧边栏的
// 「菜单分组 + 页面中文名」，使权限树与菜单 1:1 对齐。映射从 src/config/menuConfig.tsx
// 派生，菜单结构调整时同步更新此处即可，避免双向漂移。
//
// 说明：
// - 一个资源前缀通常对应一个页面（如 novels -> 小说管理）。
// - 少数前缀被多个子页面复用（如 novels:read 同时控制 书架/评论/排行/阅读进度统计/批注），
//   这些子页面本就是「小说管理」的子功能，归到该页面下更直观。
// - 听书管理(tss_management) 与 推荐管理(recommendations) 已按业务归入「内容管理」菜单组，
//   并补齐独立权限 tts:read / recommendations:read（见 feature_admin_tts_recommendations_perms.sql），
//   权限树与菜单现已 1:1 对齐。
// - dict 与 dict_management 并存（历史种子 SQL 用 dict，菜单用 dict_management），
//   这里统一归到「字典管理」，避免拆成两项。

import type { ReactNode } from 'react'
import {
  DashboardOutlined,
  UserOutlined,
  StarFilled,
  ReadOutlined,
  SafetyOutlined,
  MessageOutlined,
  BookOutlined,
  LineChartOutlined,
  WalletOutlined,
  SmileOutlined,
  FileTextOutlined,
  StarOutlined,
  BellOutlined,
  CheckCircleOutlined,
  CalendarOutlined,
  MobileOutlined,
  NotificationOutlined,
  SoundOutlined,
  BarChartOutlined,
  TrophyOutlined,
  FileSearchOutlined,
  MonitorOutlined,
  ToolOutlined,
  FolderOutlined,
  AlertOutlined,
} from '@ant-design/icons'

export interface PermissionPageInfo {
  /** 菜单分组（侧边栏顶层） */
  group: string
  /** 页面中文名 */
  page: string
  /** 页面图标（与菜单一致） */
  icon?: ReactNode
}

/** 权限资源前缀 -> 菜单分组 + 页面 */
export const RESOURCE_PAGE_MAP: Record<string, PermissionPageInfo> = {
  dashboard: { group: '数据概览', page: '数据概览', icon: <DashboardOutlined /> },
  users: { group: '用户中心', page: '用户管理', icon: <UserOutlined /> },
  points: { group: '用户中心', page: '积分管理', icon: <StarFilled /> },
  checkin: { group: '用户中心', page: '签到管理', icon: <CalendarOutlined /> },
  login_logs: { group: '用户中心', page: '登录日志', icon: <AlertOutlined /> },
  novels: { group: '内容管理', page: '小说管理', icon: <ReadOutlined /> },
  user_novels: { group: '内容管理', page: '书架管理', icon: <BookOutlined /> },
  tts: { group: '内容管理', page: '听书管理', icon: <SoundOutlined /> },
  recommendations: { group: '内容管理', page: '推荐管理', icon: <StarOutlined /> },
  rankings: { group: '内容管理', page: '排行榜', icon: <TrophyOutlined /> },
  sensitive_words: { group: '内容管理', page: '敏感词管理', icon: <SafetyOutlined /> },
  expenses: { group: '生活服务', page: '消费记录', icon: <WalletOutlined /> },
  mood: { group: '生活服务', page: '心情日记', icon: <SmileOutlined /> },
  weight: { group: '生活服务', page: '体重记录', icon: <LineChartOutlined /> },
  notes: { group: '生活服务', page: '笔记本', icon: <FileTextOutlined /> },
  favorites: { group: '生活服务', page: '收藏夹', icon: <StarOutlined /> },
  reminders: { group: '生活服务', page: '提醒事项', icon: <BellOutlined /> },
  habits: { group: '生活服务', page: '习惯打卡', icon: <CheckCircleOutlined /> },
  anniversaries: { group: '生活服务', page: '纪念日', icon: <CalendarOutlined /> },
  versions: { group: '运营管理', page: '版本管理', icon: <MobileOutlined /> },
  notifications: { group: '运营管理', page: '通知管理', icon: <NotificationOutlined /> },
  announcements: { group: '运营管理', page: '公告管理', icon: <SoundOutlined /> },
  feedback: { group: '运营管理', page: '问题反馈', icon: <MessageOutlined /> },
  analytics: { group: '运营管理', page: '数据分析', icon: <BarChartOutlined /> },
  roles: { group: '系统设置', page: '角色权限', icon: <SafetyOutlined /> },
  operation_logs: { group: '系统设置', page: '操作日志', icon: <FileSearchOutlined /> },
  system_monitor: { group: '系统设置', page: '系统监控', icon: <MonitorOutlined /> },
  app_configs: { group: '系统设置', page: '配置管理', icon: <ToolOutlined /> },
  dict: { group: '系统设置', page: '字典管理', icon: <BookOutlined /> },
  dict_management: { group: '系统设置', page: '字典管理', icon: <BookOutlined /> },
  file_management: { group: '系统设置', page: '文件管理', icon: <FolderOutlined /> },
  error_logs: { group: '系统设置', page: '错误日志', icon: <AlertOutlined /> },
}

/** 菜单分组展示顺序（与侧边栏一致）；未分类放到最后 */
export const GROUP_ORDER = [
  '数据概览',
  '用户中心',
  '内容管理',
  '生活服务',
  '运营管理',
  '系统设置',
  '未分类',
]

/** 菜单分组配色（侧边栏分组色板） */
export const GROUP_COLORS: Record<string, string> = {
  数据概览: '#13c2c2',
  用户中心: '#1890ff',
  内容管理: '#52c41a',
  生活服务: '#faad14',
  运营管理: '#722ed1',
  系统设置: '#f5222d',
  未分类: '#666666',
}

/**
 * 由权限 name 解析所属页面信息。
 * 按 name 资源前缀匹配；未命中时回退到 module（保持旧行为，确保任何权限都不会遗漏）。
 */
export function resolvePermissionPage(name: string, module?: string): PermissionPageInfo {
  const prefix = name.split(':')[0] || name
  const hit = RESOURCE_PAGE_MAP[prefix]
  if (hit) return hit
  const fallback = module || '未分类'
  return { group: fallback, page: fallback }
}
