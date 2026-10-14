import type { ReactElement } from 'react'
import type { MenuProps } from 'antd'
import {
  DashboardOutlined,
  UserOutlined,
  TeamOutlined,
  WalletOutlined,  LineChartOutlined,
  BookOutlined,
  CalendarOutlined,
  ReadOutlined,
  MobileOutlined,
  SafetyOutlined,
  FileTextOutlined,
  FileSearchOutlined,
  MonitorOutlined,
  AppstoreOutlined,
  BarChartOutlined,  StarFilled,
  BellOutlined,
  NotificationOutlined,
  CheckCircleOutlined,
  SoundOutlined,
  MessageOutlined,  CrownOutlined,
  FundOutlined,
  ControlOutlined,
  SettingOutlined,
  ToolOutlined,
  FolderOutlined,
  AlertOutlined,
  TagsOutlined,
  HeartOutlined,
  FlagOutlined,
  SlidersOutlined,
  TrophyOutlined,
  StarOutlined,
  SmileOutlined,
  ShoppingOutlined,
} from '@ant-design/icons'

type HasMenuPermission = (menu: string, perms: string[]) => boolean
type IsAdmin = () => boolean

type MenuItem = { key: string; icon: ReactElement; label: string }

/**
 * 侧边菜单配置（按业务模块分组，根据权限动态显示）。
 * 从 App.tsx 抽离，降低单文件体积（God File 优化，审查报告 P2a）。
 * 权限判定通过参数注入，避免在本文件内使用 Hook。
 *
 * 权限码（2026-10-14 对齐本地后端）：全部使用后端 permissions 表的 admin:* 码
 * （/auth/me 返回服务端实时授权：超管全量、其余角色按 role_permissions）。
 * 生活服务中暂无后端权限码的子页（消费/心情/体重/笔记/收藏/提醒/纪念日）
 * 按角色放行（isAdmin）——本地后端尚未开放对应表的通道与权限码。
 */
export const buildMenuItems = (
  hasMenuPermission: HasMenuPermission,
  isAdmin: IsAdmin
): MenuProps['items'] => [
  // 数据概览
  ...(hasMenuPermission('admin:dashboard:list', []) ? [
    {
      key: 'dashboard',
      icon: <DashboardOutlined />,
      label: '数据概览',
    },
  ] : []),
  // 用户中心
  ...(hasMenuPermission('admin:user:list', [
    'admin:user:list', 'admin:user:update', 'admin:user:delete', 'admin:user:view', 'admin:user:status',
    'admin:points:list', 'admin:points:adjust', 'admin:points:recalc',
    'admin:habit:list', 'admin:habit:edit',
    'admin:audit:login',
  ]) || isAdmin() ? [
    {
      key: 'user-center',
      icon: <TeamOutlined />,
      label: '用户中心',
      children: [
        ...(hasMenuPermission('admin:user:list', ['admin:user:list', 'admin:user:update', 'admin:user:delete']) ? [
          { key: 'users', icon: <UserOutlined />, label: '用户管理' },
        ] : []),
        ...(hasMenuPermission('admin:points:list', ['admin:points:list', 'admin:points:adjust', 'admin:points:recalc']) ? [
          { key: 'points', icon: <StarFilled />, label: '积分管理' },
        ] : []),
        // 签到管理：数据走 habit_checkins 表，与习惯打卡共用 admin:habit:* 权限
        ...(hasMenuPermission('admin:habit:list', ['admin:habit:list', 'admin:habit:edit']) ? [
          { key: 'checkin', icon: <CalendarOutlined />, label: '签到管理' },
        ] : []),
        // 登录日志：admin:audit:login
        ...(hasMenuPermission('admin:audit:login', ['admin:audit:login']) ? [
          { key: 'login_logs', icon: <AlertOutlined />, label: '登录日志' },
        ] : []),
      ].filter((item): item is MenuItem => !!item),
    },
  ] : []),
  // 内容管理（敏感词域：admin:sensitive-word:*）
  ...(hasMenuPermission('admin:sensitive-word:list', [
    'admin:sensitive-word:list', 'admin:sensitive-word:update', 'admin:sensitive-word:delete',
    'admin:sensitive-word:create', 'admin:sensitive-word:view', 'admin:sensitive-word:log',
    'admin:sensitive-word:config',
  ]) ? [
    {
      key: 'content',
      icon: <ReadOutlined />,
      label: '内容管理',
      children: [
        ...(hasMenuPermission('admin:sensitive-word:list', [
          'admin:sensitive-word:list', 'admin:sensitive-word:update', 'admin:sensitive-word:delete',
        ]) ? [
          { key: 'sensitive_words', icon: <SafetyOutlined />, label: '敏感词管理' },
        ] : []),
        ...(hasMenuPermission('admin:sensitive-word:list', [
          'admin:sensitive-word:list', 'admin:sensitive-word:log', 'admin:sensitive-word:config',
        ]) ? [
          { key: 'sensitive_word_analytics', icon: <LineChartOutlined />, label: '敏感词统计' },
        ] : []),
      ].filter((item): item is MenuItem => !!item),
    },
  ] : []),
  // 生活服务（本地后端仅开放 habit_checkins 通道；其余子页暂按角色放行）
  ...(hasMenuPermission('admin:habit:list', ['admin:habit:list', 'admin:habit:edit']) || isAdmin() ? [
    {
      key: 'life',
      icon: <AppstoreOutlined />,
      label: '生活服务',
      children: [
        ...(isAdmin() ? [
          { key: 'expenses', icon: <WalletOutlined />, label: '消费记录' },
        ] : []),
        ...(isAdmin() ? [
          { key: 'mood', icon: <SmileOutlined />, label: '心情日记' },
        ] : []),
        ...(isAdmin() ? [
          { key: 'weight', icon: <LineChartOutlined />, label: '体重记录' },
        ] : []),
        ...(isAdmin() ? [
          { key: 'notes', icon: <FileTextOutlined />, label: '笔记本' },
        ] : []),
        ...(isAdmin() ? [
          { key: 'favorites', icon: <StarOutlined />, label: '收藏夹' },
        ] : []),
        ...(isAdmin() ? [
          { key: 'reminders', icon: <BellOutlined />, label: '提醒事项' },
        ] : []),
        ...(hasMenuPermission('admin:habit:list', ['admin:habit:list', 'admin:habit:edit']) ? [
          { key: 'habits', icon: <CheckCircleOutlined />, label: '习惯打卡' },
        ] : []),
        ...(isAdmin() ? [
          { key: 'anniversaries', icon: <CalendarOutlined />, label: '纪念日' },
        ] : []),
      ].filter((item): item is MenuItem => !!item),
    },
  ] : []),
  // 游戏中心（admin:game:list / edit / reward / score）
  ...(hasMenuPermission('admin:game:list', ['admin:game:list', 'admin:game:edit', 'admin:game:reward', 'admin:game:score']) ? [
    {
      key: 'games',
      icon: <TrophyOutlined />,
      label: '游戏中心',
      children: [
        { key: 'game_configs', icon: <SettingOutlined />, label: '游戏与维度配置' },
        { key: 'game_modes', icon: <TagsOutlined />, label: '模式管理' },
        { key: 'game_levels', icon: <AppstoreOutlined />, label: '关卡配置' },
        { key: 'game_reward_rules', icon: <StarOutlined />, label: '积分奖励配置' },
        { key: 'game_achievements', icon: <CrownOutlined />, label: '游戏成就配置' },
        { key: 'game_scores', icon: <TrophyOutlined />, label: '成绩看板' },
        { key: 'game_analytics', icon: <BarChartOutlined />, label: '游戏数据分析' },
        { key: 'game_items', icon: <ToolOutlined />, label: '道具管理' },
        { key: 'game_reward_records', icon: <FundOutlined />, label: '游戏奖励记录' },
      ].filter((item): item is MenuItem => !!item),
    },
  ] : []),
  // 宠物管理（admin:pet:list / edit 统管 5 个容器页，同 games 模式）
  ...(hasMenuPermission('admin:pet:list', ['admin:pet:list', 'admin:pet:edit']) ? [
    {
      key: 'pets',
      icon: <HeartOutlined />,
      label: '宠物管理',
      children: [
        { key: 'pet_config', icon: <SlidersOutlined />, label: '全局参数' },
        { key: 'pet_form', icon: <HeartOutlined />, label: '形态体系' },
        { key: 'pet_shop', icon: <ShoppingOutlined />, label: '商品目录' },
        { key: 'pet_play', icon: <FlagOutlined />, label: '玩法内容' },
        { key: 'pet_ops', icon: <ToolOutlined />, label: '运营工具' },
      ].filter((item): item is MenuItem => !!item),
    },
  ] : []),
  // 运营管理（version / notification / announcement / feedback 域权限码）
  ...(hasMenuPermission('admin:announcement:list', [
    'admin:version:list', 'admin:version:update', 'admin:version:delete', 'admin:version:create', 'admin:version:status', 'admin:version:view',
    'admin:notification:list', 'admin:notification:edit',
    'admin:announcement:list', 'admin:announcement:update', 'admin:announcement:delete', 'admin:announcement:create', 'admin:announcement:view',
    'admin:feedback:list', 'admin:feedback:reply',
  ]) ? [
    {
      key: 'operation',
      icon: <ControlOutlined />,
      label: '运营管理',
      children: [
        ...(hasMenuPermission('admin:version:list', [
          'admin:version:list', 'admin:version:update', 'admin:version:delete', 'admin:version:create', 'admin:version:status',
        ]) ? [
          { key: 'versions', icon: <MobileOutlined />, label: '版本管理' },
        ] : []),
        ...(hasMenuPermission('admin:notification:list', ['admin:notification:list', 'admin:notification:edit']) ? [
          { key: 'notifications', icon: <NotificationOutlined />, label: '通知管理' },
        ] : []),
        ...(hasMenuPermission('admin:announcement:list', [
          'admin:announcement:list', 'admin:announcement:update', 'admin:announcement:delete',
        ]) ? [
          { key: 'announcements', icon: <SoundOutlined />, label: '公告管理' },
        ] : []),
        ...(hasMenuPermission('admin:feedback:list', ['admin:feedback:list', 'admin:feedback:reply']) ? [
          { key: 'feedback', icon: <MessageOutlined />, label: '问题反馈' },
        ] : []),
        // 数据分析：读 users / user_feedback（通用表层）
        ...(hasMenuPermission('admin:feedback:list', ['admin:feedback:list', 'admin:user:list']) ? [
          { key: 'analytics', icon: <BarChartOutlined />, label: '数据分析' },
        ] : []),
      ].filter((item): item is MenuItem => !!item),
    },
  ] : []),
  // 系统设置（role / audit / monitor / setting / dict / file 域权限码）
  ...(hasMenuPermission('admin:role:list', [
    'admin:role:list', 'admin:role:update', 'admin:role:delete', 'admin:role:create', 'admin:role:grant', 'admin:role:view',
    'admin:audit:operation', 'admin:audit:error',
    'admin:monitor:list',
    'admin:setting:list', 'admin:setting:update',
    'admin:dict:list', 'admin:dict:update', 'admin:dict:delete', 'admin:dict:create', 'admin:dict:view',
    'admin:file:list', 'admin:file:delete',
  ]) ? [
    {
      key: 'system',
      icon: <SettingOutlined />,
      label: '系统设置',
      children: [
        ...(hasMenuPermission('admin:role:list', [
          'admin:role:list', 'admin:role:update', 'admin:role:delete', 'admin:role:create', 'admin:role:grant',
        ]) ? [
          { key: 'roles', icon: <SafetyOutlined />, label: '角色权限' },
        ] : []),
        ...(hasMenuPermission('admin:audit:operation', ['admin:audit:operation']) ? [
          { key: 'operation_logs', icon: <FileSearchOutlined />, label: '操作日志' },
        ] : []),
        ...(hasMenuPermission('admin:monitor:list', ['admin:monitor:list']) ? [
          { key: 'system_monitor', icon: <MonitorOutlined />, label: '系统监控' },
        ] : []),
        ...(hasMenuPermission('admin:setting:list', ['admin:setting:list', 'admin:setting:update']) ? [
          { key: 'app_configs', icon: <ToolOutlined />, label: '配置管理' },
        ] : []),
        ...(hasMenuPermission('admin:dict:list', ['admin:dict:list', 'admin:dict:update', 'admin:dict:delete']) ? [
          { key: 'dict_management', icon: <BookOutlined />, label: '字典管理' },
        ] : []),
        ...(hasMenuPermission('admin:file:list', ['admin:file:list', 'admin:file:delete']) ? [
          { key: 'file_management', icon: <FolderOutlined />, label: '文件管理' },
        ] : []),
        ...(hasMenuPermission('admin:audit:error', ['admin:audit:error']) ? [
          { key: 'error_logs', icon: <AlertOutlined />, label: '错误日志' },
        ] : []),
      ].filter((item): item is MenuItem => !!item),
    },
  ] : []),
].filter(Boolean)
