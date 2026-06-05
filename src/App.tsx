import React, { createContext, useContext, useState, useCallback } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { Layout, Menu, theme } from 'antd'
import type { MenuProps } from 'antd'
import {
  DashboardOutlined,
  UserOutlined,
  WalletOutlined,
  SmileOutlined,
  LineChartOutlined,
  BookOutlined,
  ReadOutlined,
  MobileOutlined,
  LogoutOutlined,
  SafetyOutlined,
  BarChartOutlined,
  FileTextOutlined,
  MonitorOutlined,
  AppstoreOutlined,
  StarOutlined,
  BellOutlined,
  CheckCircleOutlined,
  MenuUnfoldOutlined,
  MenuFoldOutlined,
  SoundOutlined,
  MessageOutlined,
  CalendarOutlined,
} from '@ant-design/icons'
import type { AdminUser } from './types/auth'
import AuthGuard from './components/AuthGuard'
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


const { Header, Sider, Content } = Layout

// ========== AuthContext (内联定义，避免Vite缓存问题) ==========
interface AuthContextType {
  user: AdminUser | null
  login: (username: string, password: string) => Promise<void>
  logout: () => void
  hasPermission: (permission: string) => boolean
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  login: async () => {},
  logout: () => {},
  hasPermission: () => false,
})

export const useAuth = () => useContext(AuthContext)

const InlineAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AdminUser | null>(() => {
    try {
      const stored = localStorage.getItem('admin_user')
      return stored ? JSON.parse(stored) : null
    } catch {
      return null
    }
  })

  const login = useCallback(async (_username: string, _password: string) => {
    throw new Error('请使用 Login.tsx 中的登录逻辑')
  }, [])

  const logout = useCallback(() => {
    setUser(null)
    localStorage.removeItem('admin_user')
  }, [])

  const hasPermission = useCallback((permission: string) => {
    if (!user) return false
    if (user.role === 'super_admin') return true
    if (user.role === 'admin') {
      return ['users:read', 'users:write', 'users:delete', 'users:export'].includes(permission)
    }
    return false
  }, [user])

  return (
    <AuthContext.Provider value={{ user, login, logout, hasPermission }}>
      {children}
    </AuthContext.Provider>
  )
}

// ========== Navigation Context ==========
type PageKey = 'dashboard' | 'users' | 'roles' | 'expenses' | 'mood' | 'weight' | 'notes' |
  'novels' | 'novel_bookshelves' | 'versions' | 'analytics' | 'operation_logs' | 'system_monitor' |
  'favorites' | 'reminders' | 'habits' | 'app_configs' | 'dict_management' |
  'sensitive_words' | 'sensitive_word_analytics' | 'file_management' | 'announcements' | 'notifications' | 'feedback'
  | 'anniversaries'

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
  const { canManageVersions } = usePermission()
  const {
    token: { colorBgContainer },
  } = theme.useToken()

  const handleLogout = () => {
    logout()
  }

  // 定义菜单项
  const menuItems: MenuProps['items'] = [
    {
      key: 'dashboard',
      icon: <DashboardOutlined />,
      label: '数据概览',
    },
    {
      key: 'users',
      icon: <UserOutlined />,
      label: '用户管理',
    },
    {
      key: 'life',
      icon: <AppstoreOutlined />,
      label: '生活记录',
      children: [
        { key: 'expenses', icon: <WalletOutlined />, label: '消费记录' },
        { key: 'mood', icon: <SmileOutlined />, label: '心情日记' },
        { key: 'weight', icon: <LineChartOutlined />, label: '体重记录' },
        { key: 'notes', icon: <BookOutlined />, label: '笔记本' },
      ],
    },
    {
      key: 'extension',
      icon: <StarOutlined />,
      label: '扩展功能',
      children: [
        { key: 'favorites', icon: <StarOutlined />, label: '收藏夹' },
        { key: 'reminders', icon: <BellOutlined />, label: '提醒事项' },
        { key: 'habits', icon: <CheckCircleOutlined />, label: '习惯打卡' },
        { key: 'anniversaries', icon: <CalendarOutlined />, label: '纪念日' },
      ],
    },
    {
      key: 'novel',
      icon: <ReadOutlined />,
      label: '小说管理',
      children: [
        { key: 'novels', icon: <BookOutlined />, label: '小说管理' },
        { key: 'novel_bookshelves', icon: <BookOutlined />, label: '书架管理' },
      ],
    },
    {
      key: 'sensitive',
      icon: <SafetyOutlined />,
      label: '敏感词管理',
      children: [
        { key: 'sensitive_words', icon: <SafetyOutlined />, label: '敏感词列表' },
        { key: 'sensitive_word_analytics', icon: <BarChartOutlined />, label: '数据统计' },
      ],
    },
    ...(canManageVersions ? [
      {
        key: 'operation',
        icon: <BarChartOutlined />,
        label: '运营管理',
        children: [
          { key: 'versions', icon: <MobileOutlined />, label: '版本管理' },
          { key: 'notifications', icon: <BellOutlined />, label: '通知管理' },
          { key: 'analytics', icon: <BarChartOutlined />, label: '数据分析' },
          { key: 'operation_logs', icon: <FileTextOutlined />, label: '操作日志' },
          { key: 'system_monitor', icon: <MonitorOutlined />, label: '系统监控' },
          { key: 'roles', icon: <SafetyOutlined />, label: '角色权限' },
          { key: 'app_configs', icon: <FileTextOutlined />, label: '配置管理' },
          { key: 'dict_management', icon: <FileTextOutlined />, label: '字典管理' },
          { key: 'file_management', icon: <FileTextOutlined />, label: '文件管理' },
          { key: 'announcements', icon: <SoundOutlined />, label: '公告管理' },
          { key: 'feedback', icon: <MessageOutlined />, label: '问题反馈' },
        ],
      },
    ] : []),
  ]

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
      case 'novel_bookshelves':
        return <NovelBookshelves />
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
      novel_bookshelves: '书架管理',
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
          <img src="/logo.png" alt="logo" style={{ width: 32, height: 32 }} />
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
              {renderPage()}
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
