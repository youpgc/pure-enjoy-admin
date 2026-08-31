import React, { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { Layout, Menu, theme } from 'antd'
import {
  LogoutOutlined,
  MenuUnfoldOutlined,
  MenuFoldOutlined,
} from '@ant-design/icons'
import type { AdminUser } from './types/auth'
import { lazy, Suspense } from 'react'
import { Button, Spin } from 'antd'
import AuthGuard from './components/AuthGuard'
import ErrorBoundary from './components/ErrorBoundary'
import { usePermission } from './hooks/usePermission'
import Login from './pages/Login'

// 页面级组件按需懒加载（审查 P1-4a）：首屏仅打包 Login，进入对应菜单时才加载对应 chunk，
// 避免全部 30+ 页面同步打进主 bundle（用户"按需加载"纪律 + 规范 §10）。
const Dashboard = lazy(() => import('./pages/Dashboard'))
const Users = lazy(() => import('./pages/Users'))
const Expenses = lazy(() => import('./pages/Expenses'))
const MoodDiaries = lazy(() => import('./pages/MoodDiaries'))
const WeightRecords = lazy(() => import('./pages/WeightRecords'))
const Notes = lazy(() => import('./pages/Notes'))
const Novels = lazy(() => import('./pages/Novels'))
const VersionManagement = lazy(() => import('./pages/VersionManagement'))
const RolePermission = lazy(() => import('./pages/RolePermission'))
const Analytics = lazy(() => import('./pages/Analytics'))
const OperationLogs = lazy(() => import('./pages/OperationLogs'))
const SystemMonitor = lazy(() => import('./pages/SystemMonitor'))
const Favorites = lazy(() => import('./pages/Favorites'))
const Reminders = lazy(() => import('./pages/Reminders'))
const Habits = lazy(() => import('./pages/Habits'))
const Anniversaries = lazy(() => import('./pages/Anniversaries'))
const AppConfigs = lazy(() => import('./pages/AppConfigs'))
const NovelBookshelves = lazy(() => import('./pages/NovelBookshelves'))
const DictManagement = lazy(() => import('./pages/DictManagement'))
const SensitiveWords = lazy(() => import('./pages/SensitiveWords'))
const SensitiveWordAnalytics = lazy(() => import('./pages/SensitiveWordAnalytics'))
const FileManagement = lazy(() => import('./pages/FileManagement'))
const Notifications = lazy(() => import('./pages/Notifications'))
const Announcements = lazy(() => import('./pages/Announcements'))
const Feedback = lazy(() => import('./pages/Feedback'))
const PointsManagement = lazy(() => import('./pages/PointsManagement'))
const CheckinManagement = lazy(() => import('./pages/CheckinManagement'))
const ErrorLogs = lazy(() => import('./pages/ErrorLogs'))
const NovelComments = lazy(() => import('./pages/NovelComments'))
const Rankings = lazy(() => import('./pages/Rankings'))
const Bookmarks = lazy(() => import('./pages/Bookmarks'))
const Annotations = lazy(() => import('./pages/Annotations'))
const Recommendations = lazy(() => import('./pages/Recommendations'))
const TtsManagement = lazy(() => import('./pages/TtsManagement'))
const LoginLogs = lazy(() => import('./pages/LoginLogs'))
const GameConfigs = lazy(() => import('./pages/GameConfigs'))
const GameLevels = lazy(() => import('./pages/GameLevels'))
const GameRewardRules = lazy(() => import('./pages/GameRewardRules'))
const GameScores = lazy(() => import('./pages/GameScores'))
const GameAnalytics = lazy(() => import('./pages/GameAnalytics'))
import { supabase } from './utils/supabase'
import { buildMenuItems } from './config/menuConfig'
import { PAGE_TITLES } from './config/pageTitles'

const { Header, Sider, Content } = Layout

// ========== AuthContext (使用 Supabase Auth) ==========
interface AuthContextType {
  user: AdminUser | null
  isLoading: boolean
  login: (username: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  login: async () => {},
  logout: async () => {},
})

export const useAuth = () => useContext(AuthContext)

const InlineAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AdminUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // 从 Supabase Auth 会话构建 AdminUser
  // 注意：Supabase Auth 的 role 字段在 app_metadata 中，user_metadata 中的是自定义角色
  // ⚠️ 此处 role 取自 JWT metadata，仅供展示（如顶栏），严禁用于权限/角色判定！
  //    权限判定必须走 usePermission（get_my_role RPC）或 AuthGuard（is_admin RPC），
  //    以数据库 public.users.role 为准（JWT metadata 可被用户自改，见审查报告 P1b）。
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

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

// ========== Navigation Context ==========
export type PageKey = 'dashboard' | 'users' | 'roles' | 'expenses' | 'mood' | 'weight' | 'notes' |
  'novels' | 'novel_bookshelves' | 'novel_comments' | 'rankings' | 'bookmarks' | 'annotations' | 'versions' | 'analytics' | 'operation_logs' | 'system_monitor' |
  'favorites' | 'reminders' | 'habits' | 'app_configs' | 'dict_management' |
  'sensitive_words' | 'sensitive_word_analytics' | 'file_management' | 'announcements' | 'notifications' | 'feedback'
  | 'anniversaries' | 'points' | 'error_logs' | 'recommendations' | 'tts_management' | 'login_logs' | 'checkin'
  | 'game_configs' | 'game_levels' | 'game_reward_rules' | 'game_scores' | 'game_analytics'

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
  // 菜单配置已抽离到 src/config/menuConfig.tsx（God File 优化，审查报告 P2a）
  const menuItems = buildMenuItems(hasMenuPermission, isAdmin)

  // 页面组件映射表（审查 P3-1）：PageKey 与 lazy 组件一一对应，新增页面只需在此登记，
  // 避免 switch 人工同步遗漏；未登记 key 回退 Dashboard。
  const PAGE_COMPONENTS: Record<PageKey, React.LazyExoticComponent<any>> = {
    dashboard: Dashboard,
    users: Users,
    roles: RolePermission,
    expenses: Expenses,
    mood: MoodDiaries,
    weight: WeightRecords,
    notes: Notes,
    novels: Novels,
    novel_comments: NovelComments,
    novel_bookshelves: NovelBookshelves,
    rankings: Rankings,
    bookmarks: Bookmarks,
    annotations: Annotations,
    recommendations: Recommendations,
    tts_management: TtsManagement,
    versions: VersionManagement,
    notifications: Notifications,
    analytics: Analytics,
    operation_logs: OperationLogs,
    system_monitor: SystemMonitor,
    favorites: Favorites,
    reminders: Reminders,
    habits: Habits,
    anniversaries: Anniversaries,
    app_configs: AppConfigs,
    dict_management: DictManagement,
    sensitive_words: SensitiveWords,
    sensitive_word_analytics: SensitiveWordAnalytics,
    file_management: FileManagement,
    announcements: Announcements,
    feedback: Feedback,
    points: PointsManagement,
    checkin: CheckinManagement,
    error_logs: ErrorLogs,
    login_logs: LoginLogs,
    game_configs: GameConfigs,
    game_levels: GameLevels,
    game_reward_rules: GameRewardRules,
    game_scores: GameScores,
    game_analytics: GameAnalytics,
  }

  const renderPage = () => {
    const Comp = PAGE_COMPONENTS[currentPage] || Dashboard
    return <Comp />
  }

  const getPageTitle = () => {
    // 标题映射已抽离到 src/config/pageTitles.ts（God File 优化，审查报告 P2a）
    return PAGE_TITLES[currentPage] || '数据概览'
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
            <Button type="link" onClick={handleLogout} style={{ color: '#999', padding: 0, height: 'auto' }}>
              <LogoutOutlined /> 退出
            </Button>
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
              <Suspense fallback={<div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}><Spin size="large" tip="页面加载中..." /></div>}>
                {renderPage()}
              </Suspense>
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
