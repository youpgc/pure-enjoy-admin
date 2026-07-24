import React, { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { Layout, Menu, theme } from 'antd'
import {
  LogoutOutlined,
  MenuUnfoldOutlined,
  MenuFoldOutlined,
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
import { buildMenuItems } from './config/menuConfig'
import { PAGE_TITLES } from './config/pageTitles'

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
export type PageKey = 'dashboard' | 'users' | 'roles' | 'expenses' | 'mood' | 'weight' | 'notes' |
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
  // 菜单配置已抽离到 src/config/menuConfig.tsx（God File 优化，审查报告 P2a）
  const menuItems = buildMenuItems(hasMenuPermission, isAdmin)

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
