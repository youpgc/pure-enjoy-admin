// ==================== 权限 -> 菜单对照表 ====================
//
// 本文件把权限码映射到侧边栏的「菜单分组 + 页面中文名」，使权限配置面板
// （PermissionConfigModal）与菜单 1:1 对齐。映射从 src/config/menuConfig.tsx
// 派生，菜单结构调整时同步更新此处即可，避免双向漂移。
//
// 权限码结构（2026-10-14 对齐本地后端 permissions 表）：全部为 admin:<域>:<动作>
// （68 个码，如 admin:user:list / admin:sensitive-word:log）。
// - 解析规则：取第二段「域」匹配 SEGMENT_PAGE_MAP；
// - 少数动作跨页面（audit 三类日志、sensitive-word 统计/配置）按完整码在
//   CODE_PAGE_MAP 细分；
// - 旧版前缀式权限码（users:read、menu:life 等）已全部下线，历史操作日志的
//   相关值由 operationLog.ts 的标签映射兜底展示。

import type { ReactNode } from 'react'
import {
  DashboardOutlined,
  UserOutlined,
  StarFilled,
  SafetyOutlined,
  MessageOutlined,
  BookOutlined,
  LineChartOutlined,
  CheckCircleOutlined,
  CalendarOutlined,
  MobileOutlined,
  NotificationOutlined,
  SoundOutlined,
  TrophyOutlined,
  FileSearchOutlined,
  MonitorOutlined,
  ToolOutlined,
  FolderOutlined,
  AlertOutlined,
  HeartOutlined,
} from '@ant-design/icons'

export interface PermissionPageInfo {
  /** 菜单分组（侧边栏顶层） */
  group: string
  /** 页面中文名 */
  page: string
  /** 页面图标（与菜单一致） */
  icon?: ReactNode
}

/** admin:<域>:* 的「域」-> 菜单分组 + 页面 */
const SEGMENT_PAGE_MAP: Record<string, PermissionPageInfo> = {
  dashboard: { group: '数据概览', page: '数据概览', icon: <DashboardOutlined /> },
  user: { group: '用户中心', page: '用户管理', icon: <UserOutlined /> },
  account: { group: '用户中心', page: '用户管理', icon: <UserOutlined /> },
  points: { group: '用户中心', page: '积分管理', icon: <StarFilled /> },
  // habit 域同时门禁「习惯打卡」（生活服务）与「签到管理」（用户中心）两个页面
  habit: { group: '生活服务', page: '习惯打卡 / 签到管理', icon: <CheckCircleOutlined /> },
  'sensitive-word': { group: '内容管理', page: '敏感词管理', icon: <SafetyOutlined /> },
  game: { group: '游戏中心', page: '游戏管理', icon: <TrophyOutlined /> },
  pet: { group: '宠物管理', page: '宠物管理', icon: <HeartOutlined /> },
  version: { group: '运营管理', page: '版本管理', icon: <MobileOutlined /> },
  notification: { group: '运营管理', page: '通知管理', icon: <NotificationOutlined /> },
  announcement: { group: '运营管理', page: '公告管理', icon: <SoundOutlined /> },
  feedback: { group: '运营管理', page: '问题反馈', icon: <MessageOutlined /> },
  role: { group: '系统设置', page: '角色权限', icon: <SafetyOutlined /> },
  permission: { group: '系统设置', page: '角色权限', icon: <SafetyOutlined /> },
  monitor: { group: '系统设置', page: '系统监控', icon: <MonitorOutlined /> },
  setting: { group: '系统设置', page: '配置管理', icon: <ToolOutlined /> },
  dict: { group: '系统设置', page: '字典管理', icon: <BookOutlined /> },
  file: { group: '系统设置', page: '文件管理', icon: <FolderOutlined /> },
}

/** 按完整权限码细分（同一域内动作对应不同页面时使用） */
const CODE_PAGE_MAP: Record<string, PermissionPageInfo> = {
  'admin:audit:login': { group: '用户中心', page: '登录日志', icon: <CalendarOutlined /> },
  'admin:audit:operation': { group: '系统设置', page: '操作日志', icon: <FileSearchOutlined /> },
  'admin:audit:error': { group: '系统设置', page: '错误日志', icon: <AlertOutlined /> },
  'admin:sensitive-word:log': { group: '内容管理', page: '敏感词统计', icon: <LineChartOutlined /> },
  'admin:sensitive-word:config': { group: '内容管理', page: '敏感词统计', icon: <LineChartOutlined /> },
}

/** 菜单分组展示顺序（与侧边栏一致）；未分类放到最后 */
export const GROUP_ORDER = [
  '数据概览',
  '用户中心',
  '内容管理',
  '生活服务',
  '游戏中心',
  '宠物管理',
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
  游戏中心: '#eb2f96',
  宠物管理: '#fa8c16',
  未分类: '#666666',
}

/**
 * 由权限 name 解析所属页面信息。
 * 优先按完整码细分（CODE_PAGE_MAP），再按域段匹配（SEGMENT_PAGE_MAP）；
 * 未命中时回退到 module（保持兜底行为，确保任何权限都不会遗漏）。
 */
export function resolvePermissionPage(name: string, module?: string): PermissionPageInfo {
  const byCode = CODE_PAGE_MAP[name]
  if (byCode) return byCode
  const parts = name.split(':')
  if (parts[0] === 'admin' && parts.length >= 2) {
    const hit = SEGMENT_PAGE_MAP[parts[1]!]
    if (hit) return hit
  }
  const fallback = module || '未分类'
  return { group: fallback, page: fallback }
}
