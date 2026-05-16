import React, { useState } from 'react'
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
  DatabaseOutlined,
  BarChartOutlined,
  FileTextOutlined,
  MonitorOutlined,
  AppstoreOutlined,
  StarOutlined,
  BellOutlined,
  CheckCircleOutlined,
  MenuUnfoldOutlined,
  MenuFoldOutlined,
} from '@ant-design/icons'
import AuthGuard from './components/AuthGuard'
import { useAuth } from './context/auth'
import { usePermission } from './hooks/usePermission'
import Dashboard from './pages/Dashboard'
import Users from './pages/Users'
import Expenses from './pages/Expenses'
import MoodDiaries from './pages/MoodDiaries'
import WeightRecords from './pages/WeightRecords'
import Notes from './pages/Notes'
import Novels from './pages/Novels'
import NovelManagement from './pages/NovelManagement'
import VersionManagement from './pages/VersionManagement'
import RolePermission from './pages/RolePermission'
import Login from './pages/Login'
import Analytics from './pages/Analytics'
import OperationLogs from './pages/OperationLogs'
import SystemMonitor from './pages/SystemMonitor'
import Favorites from './pages/Favorites'
import Reminders from './pages/Reminders'
import Habits from './pages/Habits'

const { Header, Sider, Content } = Layout

type PageKey = 'dashboard' | 'users' | 'roles' | 'expenses' | 'mood' | 'weight' | 'notes' | 
  'novels' | 'novel_library' | 'versions' | 'analytics' | 'operation_logs' | 'system_monitor' |
  'favorites' | 'reminders' | 'habits'

const MainLayout: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false)
  const [currentPage, setCurrentPage] = useState<PageKey>('dashboard')
  const { user, logout } = useAuth()
  const { canManageUsers, canManageVersions } = usePermission()
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
      ],
    },
    {
      key: 'novel',
      icon: <ReadOutlined />,
      label: '小说管理',
      children: [
        { key: 'novels', icon: <BookOutlined />, label: '用户书架' },
        { key: 'novel_library', icon: <DatabaseOutlined />, label: '小说库管理' },
      ],
    },
    ...(canManageVersions ? [
      {
        key: 'operation',
        icon: <BarChartOutlined />,
        label: '运营管理',
        children: [
          { key: 'versions', icon: <MobileOutlined />, label: '版本管理' },
          { key: 'analytics', icon: <BarChartOutlined />, label: '数据分析' },
          { key: 'operation_logs', icon: <FileTextOutlined />, label: '操作日志' },
          { key: 'system_monitor', icon: <MonitorOutlined />, label: '系统监控' },
          { key: 'roles', icon: <SafetyOutlined />, label: '角色权限' },
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
      case 'novel_library':
        return <NovelManagement />
      case 'versions':
        return <VersionManagement />
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
      novels: '用户书架',
      novel_library: '小说库管理',
      versions: '版本管理',
      analytics: '数据分析',
      operation_logs: '操作日志',
      system_monitor: '系统监控',
      favorites: '收藏夹',
      reminders: '提醒事项',
      habits: '习惯打卡',
    }
    return titles[currentPage] || '数据概览'
  }

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        theme="light"
        style={{ boxShadow: '2px 0 8px rgba(0,0,0,0.05)' }}
      >
        <div style={{ height: 64, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <h2 style={{ margin: 0, color: '#6C63FF', fontSize: collapsed ? 14 : 20 }}>
            {collapsed ? '纯' : '纯享管理'}
          </h2>
        </div>
        <Menu
          mode="inline"
          selectedKeys={[currentPage]}
          items={menuItems}
          onClick={({ key }) => setCurrentPage(key as PageKey)}
          style={{ borderRight: 0 }}
        />
      </Sider>
      <Layout>
        <Header style={{ padding: '0 24px', background: colorBgContainer, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
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
        <Content style={{ margin: 24, padding: 24, background: colorBgContainer, borderRadius: 8 }}>
          {renderPage()}
        </Content>
      </Layout>
    </Layout>
  )
}

const App: React.FC = () => {
  return (
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
  )
}

export default App
