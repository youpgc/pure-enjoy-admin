import type { ReactElement } from 'react'
import type { MenuProps } from 'antd'
import {
  DashboardOutlined,
  UserOutlined,
  TeamOutlined,
  WalletOutlined,
  SmileOutlined,
  LineChartOutlined,
  BookOutlined,
  CalendarOutlined,
  ReadOutlined,
  MobileOutlined,
  SafetyOutlined,
  FileTextOutlined,
  FileSearchOutlined,
  MonitorOutlined,
  AppstoreOutlined,
  BarChartOutlined,
  StarOutlined,
  StarFilled,
  BellOutlined,
  NotificationOutlined,
  CheckCircleOutlined,
  SoundOutlined,
  MessageOutlined,
  TrophyOutlined,
  ControlOutlined,
  SettingOutlined,
  ToolOutlined,
  FolderOutlined,
  AlertOutlined,
} from '@ant-design/icons'

type HasMenuPermission = (menu: string, perms: string[]) => boolean
type IsAdmin = () => boolean

type MenuItem = { key: string; icon: ReactElement; label: string }

/**
 * 侧边菜单配置（按业务模块分组，根据权限动态显示）。
 * 从 App.tsx 抽离，降低单文件体积（God File 优化，审查报告 P2a）。
 * 权限判定通过参数注入，避免在本文件内使用 Hook。
 */
export const buildMenuItems = (
  hasMenuPermission: HasMenuPermission,
  isAdmin: IsAdmin
): MenuProps['items'] => [
  // 数据概览
  ...(hasMenuPermission('menu:dashboard', ['dashboard:read']) ? [
    {
      key: 'dashboard',
      icon: <DashboardOutlined />,
      label: '数据概览',
    },
  ] : []),
  // 用户中心
  ...(hasMenuPermission('menu:users', ['users:read', 'users:write', 'users:delete', 'points:read', 'points:write']) ? [
    {
      key: 'user-center',
      icon: <TeamOutlined />,
      label: '用户中心',
      children: [
        ...(hasMenuPermission('menu:users', ['users:read', 'users:write', 'users:delete']) ? [
          { key: 'users', icon: <UserOutlined />, label: '用户管理' },
        ] : []),
        ...(hasMenuPermission('menu:users', ['points:read', 'points:write']) ? [
          { key: 'points', icon: <StarFilled />, label: '积分管理' },
        ] : []),
      ].filter((item): item is MenuItem => !!item),
    },
  ] : []),
  // 内容管理
  ...(hasMenuPermission('menu:content', ['novels:read', 'novels:write', 'novels:delete', 'sensitive_words:read', 'sensitive_words:write', 'sensitive_words:delete']) ? [
    {
      key: 'content',
      icon: <ReadOutlined />,
      label: '内容管理',
      children: [
        ...(hasMenuPermission('menu:content', ['novels:read', 'novels:write', 'novels:delete']) ? [
          { key: 'novels', icon: <ReadOutlined />, label: '小说管理' },
        ] : []),
        ...(hasMenuPermission('menu:content', ['novels:read']) ? [
          { key: 'novel_comments', icon: <MessageOutlined />, label: '评论管理' },
        ] : []),
        ...(hasMenuPermission('menu:content', ['novels:read']) ? [
          { key: 'rankings', icon: <TrophyOutlined />, label: '排行榜' },
        ] : []),
        ...(hasMenuPermission('menu:content', ['novels:read']) ? [
          { key: 'bookmarks', icon: <BookOutlined />, label: '阅读进度' },
        ] : []),
        ...(hasMenuPermission('menu:content', ['novels:read']) ? [
          { key: 'annotations', icon: <MessageOutlined />, label: '批注管理' },
        ] : []),
        ...(hasMenuPermission('menu:content', ['sensitive_words:read', 'sensitive_words:write', 'sensitive_words:delete']) ? [
          { key: 'sensitive_words', icon: <SafetyOutlined />, label: '敏感词管理' },
        ] : []),
        ...(hasMenuPermission('menu:content', ['sensitive_words:read', 'sensitive_words:write', 'sensitive_words:delete']) ? [
          { key: 'sensitive_word_analytics', icon: <LineChartOutlined />, label: '敏感词统计' },
        ] : []),
      ].filter((item): item is MenuItem => !!item),
    },
  ] : []),
  // 生活服务
  ...(hasMenuPermission('menu:life', ['expenses:read', 'mood:read', 'weight:read', 'notes:read', 'favorites:read', 'reminders:read', 'habits:read', 'anniversaries:read']) ? [
    {
      key: 'life',
      icon: <AppstoreOutlined />,
      label: '生活服务',
      children: [
        ...(hasMenuPermission('menu:life', ['expenses:read', 'expenses:write', 'expenses:delete']) ? [
          { key: 'expenses', icon: <WalletOutlined />, label: '消费记录' },
        ] : []),
        ...(hasMenuPermission('menu:life', ['mood:read', 'mood:write', 'mood:delete']) ? [
          { key: 'mood', icon: <SmileOutlined />, label: '心情日记' },
        ] : []),
        ...(hasMenuPermission('menu:life', ['weight:read', 'weight:write', 'weight:delete']) ? [
          { key: 'weight', icon: <LineChartOutlined />, label: '体重记录' },
        ] : []),
        ...(hasMenuPermission('menu:life', ['notes:read', 'notes:write', 'notes:delete']) ? [
          { key: 'notes', icon: <FileTextOutlined />, label: '笔记本' },
        ] : []),
        ...(hasMenuPermission('menu:life', ['favorites:read', 'favorites:write', 'favorites:delete']) ? [
          { key: 'favorites', icon: <StarOutlined />, label: '收藏夹' },
        ] : []),
        ...(hasMenuPermission('menu:life', ['reminders:read', 'reminders:write', 'reminders:delete']) ? [
          { key: 'reminders', icon: <BellOutlined />, label: '提醒事项' },
        ] : []),
        ...(hasMenuPermission('menu:life', ['habits:read', 'habits:write', 'habits:delete']) ? [
          { key: 'habits', icon: <CheckCircleOutlined />, label: '习惯打卡' },
        ] : []),
        ...(hasMenuPermission('menu:life', ['anniversaries:read', 'anniversaries:write', 'anniversaries:delete']) ? [
          { key: 'anniversaries', icon: <CalendarOutlined />, label: '纪念日' },
        ] : []),
      ].filter((item): item is MenuItem => !!item),
    },
  ] : []),
  // 运营管理
  ...(hasMenuPermission('menu:operations', ['versions:read', 'notifications:read', 'announcements:read', 'feedback:read', 'analytics:read']) ? [
    {
      key: 'operation',
      icon: <ControlOutlined />,
      label: '运营管理',
      children: [
        ...(hasMenuPermission('menu:operations', ['versions:read', 'versions:write', 'versions:delete']) ? [
          { key: 'versions', icon: <MobileOutlined />, label: '版本管理' },
        ] : []),
        ...(hasMenuPermission('menu:operations', ['notifications:read', 'notifications:write', 'notifications:delete']) ? [
          { key: 'notifications', icon: <NotificationOutlined />, label: '通知管理' },
        ] : []),
        ...(hasMenuPermission('menu:operations', ['announcements:read', 'announcements:write', 'announcements:delete']) ? [
          { key: 'announcements', icon: <SoundOutlined />, label: '公告管理' },
        ] : []),
        ...(hasMenuPermission('menu:operations', ['feedback:read', 'feedback:write', 'feedback:delete']) ? [
          { key: 'feedback', icon: <MessageOutlined />, label: '问题反馈' },
        ] : []),
        ...(hasMenuPermission('menu:operations', ['analytics:read']) ? [
          { key: 'analytics', icon: <BarChartOutlined />, label: '数据分析' },
        ] : []),
        ...(hasMenuPermission('menu:operations', ['analytics:read']) ? [
          { key: 'recommendations', icon: <StarOutlined />, label: '推荐管理' },
        ] : []),
      ].filter((item): item is MenuItem => !!item),
    },
  ] : []),
  // 系统设置
  ...(hasMenuPermission('menu:system', ['roles:read', 'operation_logs:read', 'system_monitor:read', 'app_configs:read', 'dict_management:read', 'file_management:read', 'error_logs:read']) ? [
    {
      key: 'system',
      icon: <SettingOutlined />,
      label: '系统设置',
      children: [
        ...(hasMenuPermission('menu:system', ['roles:read', 'roles:write', 'roles:delete']) ? [
          { key: 'roles', icon: <SafetyOutlined />, label: '角色权限' },
        ] : []),
        ...(hasMenuPermission('menu:system', ['operation_logs:read']) ? [
          { key: 'operation_logs', icon: <FileSearchOutlined />, label: '操作日志' },
        ] : []),
        ...(hasMenuPermission('menu:system', ['system_monitor:read']) ? [
          { key: 'system_monitor', icon: <MonitorOutlined />, label: '系统监控' },
        ] : []),
        ...(hasMenuPermission('menu:system', ['app_configs:read', 'app_configs:write']) ? [
          { key: 'app_configs', icon: <ToolOutlined />, label: '配置管理' },
        ] : []),
        ...(hasMenuPermission('menu:system', ['dict_management:read', 'dict_management:write', 'dict_management:delete']) ? [
          { key: 'dict_management', icon: <BookOutlined />, label: '字典管理' },
        ] : []),
        ...(hasMenuPermission('menu:system', ['file_management:read', 'file_management:write', 'file_management:delete']) ? [
          { key: 'file_management', icon: <FolderOutlined />, label: '文件管理' },
        ] : []),
        ...(hasMenuPermission('menu:system', ['error_logs:read']) ? [
          { key: 'error_logs', icon: <AlertOutlined />, label: '错误日志' },
        ] : []),
        ...(hasMenuPermission('menu:system', ['app_configs:read']) ? [
          { key: 'tts_management', icon: <SoundOutlined />, label: '听书管理' },
        ] : []),
      ].filter((item): item is MenuItem => !!item),
    },
  ] : []),
  // 登录日志（管理员/超级管理员可见，独立于系统设置组以确保任何管理员角色均可见）
  ...(isAdmin() ? [
    {
      key: 'login_logs',
      icon: <AlertOutlined />,
      label: '登录日志',
    },
  ] : []),
].filter(Boolean)
