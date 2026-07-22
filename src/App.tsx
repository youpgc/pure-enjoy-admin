import React, { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { Layout, Menu, theme } from 'antd'
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
  LogoutOutlined,
  SafetyOutlined,
  BarChartOutlined,
  FileTextOutlined,
  FileSearchOutlined,
  MonitorOutlined,
  AppstoreOutlined,
  StarOutlined,
  StarFilled,
  BellOutlined,
  NotificationOutlined,
  CheckCircleOutlined,
  MenuUnfoldOutlined,
  MenuFoldOutlined,
  SoundOutlined,
  MessageOutlined,
  TrophyOutlined,
  ControlOutlined,
  SettingOutlined,
  ToolOutlined,
  FolderOutlined,
  AlertOutlined,
} from '@ant-design/icons'
import type { AdminUser } from './types/auth'
import AuthGuard from './components/AuthGuard'
import ErrorBoundary from './components/ErrorBoundary'
import { usePermission } from './hooks/usePermission'
import Dashboard from './pages/Dashboard'
import Users from './pages/Users'
import Expenses from './pages/Expenses'
import MoodDiaries from './pages/MoodDiaries'
import WeightRecords from './pages/WeightRecords'
import Notes from './pages/Notes'
import Novels from './pages/Novels'
import VersionManagement from './pages/VersionManagement'
import RolePermission from './pages/RolePermission'
import Login from './pages/Login'
import Analytics from './pages/Analytics'
import OperationLogs from './pages/OperationLogs'
import SystemMonitor from './pages/SystemMonitor'
import Favorites from './pages/Favorites'
import Reminders from './pages/Reminders'
import Habits from './pages/Habits'
import Anniversaries from './pages/Anniversaries'
import AppConfigs from './pages/AppConfigs'
import NovelBookshelves from './pages/NovelBookshelves'
import DictManagement from './pages/DictManagement'
import SensitiveWords from './pages/SensitiveWords'
import SensitiveWordAnalytics from './pages/SensitiveWordAnalytics'
import FileManagement from './pages/FileManagement'
import Notifications from './pages/Notifications'
import Announcements from './pages/Announcements'
import Feedback from './pages/Feedback'
import PointsManagement from './pages/PointsManagement'
import ErrorLogs from './pages/ErrorLogs'
import NovelComments from './pages/NovelComments'
import Rankings from './pages/Rankings'
import Bookmarks from './pages/Bookmarks'
import Annotations from './pages/Annotations'
import Recommendations from './pages/Recommendations'
import TtsManagement from './pages/TtsManagement'
import LoginLogs from './pages/LoginLogs'
import { supabase } from './utils/supabase'

const { Header, Sider, Content } = Layout

// ========== AuthContext (使用 Supabase Auth) ==========
interface AuthContextType {
  user: AdminUser | null
  isLoading: boolean
  login: (username: string, password: string) => Promise<void>
  logout: () => Promise<void>
  hasPermission: (permission: string) => boolean
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  login: async () => {},
  logout: async () => {},
  hasPermission: () => false,
})

export const useAuth = () => useContext(AuthContext)

const InlineAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AdminUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // 从 Supabase Auth 会话构建 AdminUser
  // 注意：Supabase Auth 的 role 字段在 app_metadata 中，user_metadata 中的是自定义角色
  const buildAdminUser = useCallback((authUser: any): AdminUser | null => {
    if (!authUser) return null
    const metadata = authUser.user_metadata || {}
    const appMetadata = authUser.app_metadata || {}
    // 优先读取 user_metadata.role（自定义管理员角色），其次 app_metadata.role（Supabase 默认角色）
    const role = metadata.role || appMetadata.role || 'viewer'
    return {
      id: authUser.id,
      email: authUser.email || '',
      role: role,
      nickname: metadata.nickname || metadata.name || '',
      avatar_url: metadata.avatar_url,
      created_at: authUser.created_at,
    }
  }, [])

  // 监听 Supabase Auth 状态变化
  useEffect(() => {
    // 初始化时获取当前会话
    const initSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.user) {
          setUser(buildAdminUser(session.user))
        }
      } catch (e) {
        if (import.meta.env.DEV) {
          console.error('[Auth] 获取会话失败:', e)
        }
      } finally {
        setIsLoading(false)
      }
    }

    initSession()

    // 订阅 Auth 状态变化
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (session?.user) {
          setUser(buildAdminUser(session.user))
        } else {
          setUser(null)
        }
        setIsLoading(false)
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [buildAdminUser])

  const login = useCallback(async (_username: string, _password: string) => {
    // 登录逻辑在 Login.tsx 中处理，此处仅作为占位
    throw new Error('请使用 Login.tsx 中的登录逻辑')
  }, [])

  const logout = useCallback(async () => {
    await supabase.auth.signOut()
    setUser(null)
  }, [])

  // 权限判断已迁移到 usePermission Hook 中
  // AuthContext 中保留 hasPermission 作为兼容接口，基于用户角色做基本判断
  const hasPermission = useCallback((_permission: string) => {
    if (!user) return false
    // 具体细粒度权限查询应使用 usePermission Hook
    return false
  }, [user])

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, hasPermission }}>
      {children}
    </AuthContext.Provider>
  )
}

// ========== Navigation Context ==========
type PageKey = 'dashboard' | 'users' | 'roles' | 'expenses' | 'mood' | 'weight' | 'notes' |
  'novels' | 'novel_bookshelves' | 'novel_comments' | 'rankings' | 'bookmarks' | 'annotations' | 'versions' | 'analytics' | 'operation_logs' | 'system_monitor' |
  'favorites' | 'reminders' | 'habits' | 'app_configs' | 'dict_management' |
  'sensitive_words' | 'sensitive_word_analytics' | 'file_management' | 'announcements' | 'notifications' | 'feedback'
  | 'anniversaries' | 'points' | 'error_logs' | 'recommendations' | 'tts_management' | 'login_logs'

interface NavigationContextType {
  currentPage: PageKey
  setCurrentPage: (page: PageKey) => void
}

export const NavigationContext = createContext<NavigationContextType>({
  currentPage: 'dashboard',
  setCurrentPage: () => {},
})

export const useNavigation = () => useContext(NavigationContext)

// ========== MainLayout ==========
const MainLayout: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false)
  const [openKeys, setOpenKeys] = useState<string[]>([])
  const [currentPage, setCurrentPage] = useState<PageKey>('dashboard')
  const { user, logout } = useAuth()
  const { hasMenuPermission, isAdmin } = usePermission()
  const {
    token: { colorBgContainer },
  } = theme.useToken()

  const handleLogout = () => {
    logout()
  }

  // 定义菜单项（按业务模块分组），根据权限动态显示
  const menuItems: MenuProps['items'] = [
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
        ].filter((item): item is { key: string; icon: React.ReactElement; label: string } => !!item),
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
        ].filter((item): item is { key: string; icon: React.ReactElement; label: string } => !!item),
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
        ].filter((item): item is { key: string; icon: React.ReactElement; label: string } => !!item),
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
        ].filter((item): item is { key: string; icon: React.ReactElement; label: string } => !!item),
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
        ].filter((item): item is { key: string; icon: React.ReactElement; label: string } => !!item),
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

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard />
      case 'users':
        return <Users />
      case 'roles':
        return <RolePermission />
      case 'expenses':
        return <Expenses />
      case 'mood':
        return <MoodDiaries />
      case 'weight':
        return <WeightRecords />
      case 'notes':
        return <Notes />
      case 'novels':
        return <Novels />
      case 'novel_comments':
        return <NovelComments />
      case 'novel_bookshelves':
        return <NovelBookshelves />
      case 'rankings':
        return <Rankings />
      case 'bookmarks':
        return <Bookmarks />
      case 'annotations':
        return <Annotations />
      case 'recommendations':
        return <Recommendations />
      case 'tts_management':
        return <TtsManagement />
      case 'versions':
        return <VersionManagement />
      case 'notifications':
        return <Notifications />
      case 'analytics':
        return <Analytics />
      case 'operation_logs':
        return <OperationLogs />
      case 'system_monitor':
        return <SystemMonitor />
      case 'favorites':
        return <Favorites />
      case 'reminders':
        return <Reminders />
      case 'habits':
        return <Habits />
      case 'anniversaries':
        return <Anniversaries />
      case 'app_configs':
        return <AppConfigs />
      case 'dict_management':
        return <DictManagement />
      case 'sensitive_words':
        return <SensitiveWords />
      case 'sensitive_word_analytics':
        return <SensitiveWordAnalytics />
      case 'file_management':
        return <FileManagement />
      case 'announcements':
        return <Announcements />
      case 'feedback':
        return <Feedback />
      case 'points':
        return <PointsManagement />
      case 'error_logs':
        return <ErrorLogs />
      case 'login_logs':
        return <LoginLogs />
      default:
        return <Dashboard />
    }
  }

  const getPageTitle = () => {
    const titles: Record<PageKey, string> = {
      dashboard: '数据概览',
      users: '用户管理',
      roles: '角色权限',
      expenses: '消费记录',
      mood: '心情日记',
      weight: '体重记录',
      notes: '笔记本',
      novels: '小说管理',
      novel_comments: '评论管理',
      novel_bookshelves: '书架管理',
      rankings: '排行榜管理',
      bookmarks: '阅读进度管理',
      annotations: '批注管理',
      recommendations: '推荐管理',
      tts_management: '听书管理',
      versions: '版本管理',
      analytics: '数据分析',
      operation_logs: '操作日志',
      system_monitor: '系统监控',
      favorites: '收藏夹',
      reminders: '提醒事项',
      habits: '习惯打卡',
      app_configs: '配置管理',
      dict_management: '字典管理',
      sensitive_words: '敏感词管理',
      sensitive_word_analytics: '敏感词数据统计',
      file_management: '文件管理',
      announcements: '公告管理',
      notifications: '通知管理',
      feedback: '问题反馈',
      anniversaries: '纪念日',
      points: '积分管理',
      error_logs: '错误日志',
      login_logs: '登录日志',
    }
    return titles[currentPage] || '数据概览'
  }

  return (
    <Layout style={{ minHeight: '100vh' }}>
      {/* 固定左侧菜单栏 */}
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        theme="light"
        style={{
          boxShadow: '2px 0 8px rgba(0,0,0,0.05)',
          position: 'fixed',
          left: 0,
          top: 0,
          bottom: 0,
          zIndex: 100,
          height: '100vh',
          overflow: 'hidden',
        }}
      >
        <div style={{ height: 64, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <img src={`${import.meta.env.BASE_URL}logo.png`} alt="logo" style={{ width: 32, height: 32 }} />
          {!collapsed && <h2 style={{ margin: 0, color: '#6C63FF', fontSize: 20 }}>纯享管理</h2>}
        </div>
        {/* 菜单区域 - 可滚动 */}
        <div style={{ height: 'calc(100vh - 64px)', overflow: 'auto' }}>
          <Menu
            mode="inline"
            selectedKeys={[currentPage]}
            openKeys={openKeys}
            onOpenChange={(keys) => setOpenKeys(keys.length > 0 ? [String(keys[keys.length - 1])] : [])}
            items={menuItems}
            onClick={({ key }) => setCurrentPage(key as PageKey)}
            style={{ borderRight: 0 }}
            inlineCollapsed={collapsed}
          />
        </div>
      </Sider>
      
      {/* 主内容区域 */}
      <Layout style={{ marginLeft: collapsed ? 80 : 200, transition: 'margin-left 0.2s' }}>
        {/* 固定顶部信息栏 */}
        <Header 
          style={{ 
            padding: '0 24px', 
            background: colorBgContainer, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            position: 'fixed',
            top: 0,
            left: collapsed ? 80 : 200,
            right: 0,
            zIndex: 99,
            boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
            transition: 'left 0.2s',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            {React.createElement(collapsed ? MenuUnfoldOutlined : MenuFoldOutlined, {
              style: { fontSize: 18, cursor: 'pointer', color: '#999' },
              onClick: () => setCollapsed(!collapsed),
            })}
            <h1 style={{ margin: 0, fontSize: 18 }}>
              {getPageTitle()}
            </h1>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <span style={{ color: '#999' }}>{user?.email}</span>
            <span style={{ color: '#bbb' }}>|</span>
            <a onClick={handleLogout} style={{ color: '#999', cursor: 'pointer' }}>
              <LogoutOutlined /> 退出
            </a>
          </div>
        </Header>
        
        {/* 内容区域 - 带顶部偏移 */}
        <Content 
          style={{ 
            marginTop: 64,
            padding: '16px 24px',
            minHeight: 'calc(100vh - 64px)',
            overflow: 'auto',
          }}
        >
          <div style={{ background: colorBgContainer, borderRadius: 8, padding: 24 }}>
            <NavigationContext.Provider value={{
              currentPage,
              setCurrentPage,
            }}>
              <ErrorBoundary>
                {renderPage()}
              </ErrorBoundary>
            </NavigationContext.Provider>
          </div>
        </Content>
      </Layout>
    </Layout>
  )
}

// ========== App (最外层用 InlineAuthProvider 包裹) ==========
const App: React.FC = () => {
  return (
    <InlineAuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/"
          element={
            <AuthGuard>
              <MainLayout />
            </AuthGuard>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </InlineAuthProvider>
  )
}

export default App
