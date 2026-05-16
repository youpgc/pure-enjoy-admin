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

const { Header, Sider, Content } = Layout

type PageKey = 'dashboard' | 'users' | 'roles' | 'expenses' | 'mood' | 'weight' | 'notes' | 'novels' | 'novel_library' | 'versions'

const allMenuItems: { key: PageKey; icon: React.ReactNode; label: string; requiredRole?: string }[] = [
  { key: 'dashboard', icon: <DashboardOutlined />, label: '数据概览' },
  { key: 'users', icon: <UserOutlined />, label: '用户管理' },
  { key: 'roles', icon: <SafetyOutlined />, label: '角色权限', requiredRole: 'admin' },
  { key: 'expenses', icon: <WalletOutlined />, label: '消费记录' },
  { key: 'mood', icon: <SmileOutlined />, label: '心情日记' },
  { key: 'weight', icon: <LineChartOutlined />, label: '体重记录' },
  { key: 'notes', icon: <BookOutlined />, label: '笔记本' },
  { key: 'novels', icon: <ReadOutlined />, label: '用户书架' },
  { key: 'novel_library', icon: <DatabaseOutlined />, label: '小说库管理' },
  { key: 'versions', icon: <MobileOutlined />, label: '版本管理', requiredRole: 'admin' },
]

const MainLayout: React.FC = () => {
  const [collapsed] = useState(false)
  const [currentPage, setCurrentPage] = useState<PageKey>('dashboard')
  const { user, logout } = useAuth()
  const { canManageUsers, canManageVersions } = usePermission()
  const {
    token: { colorBgContainer },
  } = theme.useToken()

  // Filter menu items based on role
  const filteredMenuItems = allMenuItems.filter(item => {
    if (item.requiredRole === 'admin') return canManageVersions
    if (item.key === 'users') return canManageUsers
    return true
  })

  const antdMenuItems: MenuProps['items'] = [
    ...filteredMenuItems.slice(0, filteredMenuItems.length > 7 ? 7 : filteredMenuItems.length).map(item => ({
      key: item.key,
      icon: item.icon,
      label: item.label,
    })),
    ...(filteredMenuItems.length > 7 ? [{ type: 'divider' as const }, ...filteredMenuItems.slice(7).map(item => ({
      key: item.key,
      icon: item.icon,
      label: item.label,
    }))] : []),
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
      default:
        return <Dashboard />
    }
  }

  const handleLogout = () => {
    logout()
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
          items={antdMenuItems}
          onClick={({ key }) => setCurrentPage(key as PageKey)}
        />
      </Sider>
      <Layout>
        <Header style={{ padding: '0 24px', background: colorBgContainer, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h1 style={{ margin: 0, fontSize: 18 }}>
            {allMenuItems.find(item => item.key === currentPage)?.label || '数据概览'}
          </h1>
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
