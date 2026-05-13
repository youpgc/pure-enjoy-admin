import React, { useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Layout, Menu, theme, Dropdown, Avatar, Badge, Space, Tag } from 'antd'
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
  SettingOutlined,
  DownOutlined,
} from '@ant-design/icons'
import { AuthProvider, useAuth } from './context/auth'
import { AuthGuard, PublicRoute } from './components/AuthGuard'
import { ROLE_DISPLAY_NAMES, ROLE_TAG_COLORS } from './types/auth'
import { usePermission } from './hooks/usePermission'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Users from './pages/Users'
import Expenses from './pages/Expenses'
import MoodDiaries from './pages/MoodDiaries'
import WeightRecords from './pages/WeightRecords'
import Notes from './pages/Notes'
import Novels from './pages/Novels'
import VersionManagement from './pages/VersionManagement'

const { Header, Sider, Content } = Layout

type PageKey = 'dashboard' | 'users' | 'expenses' | 'mood' | 'weight' | 'notes' | 'novels' | 'versions'

interface MenuItem {
  key: PageKey
  icon: React.ReactNode
  label: string
  permission: string
}

// 主布局组件
const MainLayout: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false)
  const [currentPage, setCurrentPage] = useState<PageKey>('dashboard')
  const { logout, user } = useAuth()
  const permissions = usePermission()
  const {
    token: { colorBgContainer },
  } = theme.useToken()

  const menuItems: MenuItem[] = [
    { key: 'dashboard', icon: <DashboardOutlined />, label: '数据概览', permission: 'canViewDashboard' },
    { key: 'users', icon: <UserOutlined />, label: '用户管理', permission: 'canViewUsers' },
    { key: 'expenses', icon: <WalletOutlined />, label: '消费记录', permission: 'canViewExpenses' },
    { key: 'mood', icon: <SmileOutlined />, label: '心情日记', permission: 'canViewMoodDiaries' },
    { key: 'weight', icon: <LineChartOutlined />, label: '体重记录', permission: 'canViewWeightRecords' },
    { key: 'notes', icon: <BookOutlined />, label: '笔记本', permission: 'canViewNotes' },
    { key: 'novels', icon: <ReadOutlined />, label: '小说书架', permission: 'canViewNovels' },
    { key: 'versions', icon: <MobileOutlined />, label: '版本管理', permission: 'canViewVersions' },
  ]

  // 根据权限过滤菜单
  const filteredMenuItems = menuItems.filter(item => {
    return permissions[item.permission as keyof typeof permissions] === true
  })

  const antdMenuItems: MenuProps['items'] = filteredMenuItems.map(item => ({
    key: item.key,
    icon: item.icon,
    label: item.label,
  }))

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard />
      case 'users':
        return <Users />
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
      case 'versions':
        return <VersionManagement />
      default:
        return <Dashboard />
    }
  }

  // 用户下拉菜单
  const userMenuItems: MenuProps['items'] = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: '个人信息',
      disabled: true,
    },
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: '系统设置',
      disabled: true,
    },
    {
      type: 'divider',
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
      danger: true,
      onClick: logout,
    },
  ]

  const currentMenuItem = menuItems.find(item => item.key === currentPage)

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
        <Header 
          style={{ 
            padding: '0 24px', 
            background: colorBgContainer, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
          }}
        >
          <h1 style={{ margin: 0, fontSize: 18 }}>
            {currentMenuItem?.label || '数据概览'}
          </h1>
          
          <Space size="large">
            <span style={{ color: '#999' }}>纯享App管理后台</span>
            
            <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
              <Space style={{ cursor: 'pointer' }}>
                <Avatar 
                  style={{ backgroundColor: '#6C63FF' }}
                  icon={<UserOutlined />}
                >
                  {user?.name?.charAt(0)}
                </Avatar>
                <Space direction="vertical" size={0} style={{ lineHeight: 1.2 }}>
                  <span style={{ fontSize: 14, fontWeight: 500 }}>{user?.name}</span>
                  <Tag 
                    color={ROLE_TAG_COLORS[user?.role || 'viewer']} 
                    style={{ fontSize: 10, padding: '0 4px', margin: 0 }}
                  >
                    {ROLE_DISPLAY_NAMES[user?.role || 'viewer']}
                  </Tag>
                </Space>
                <DownOutlined style={{ fontSize: 12, color: '#999' }} />
              </Space>
            </Dropdown>
          </Space>
        </Header>
        <Content style={{ margin: 24, padding: 24, background: colorBgContainer, borderRadius: 8 }}>
          {renderPage()}
        </Content>
      </Layout>
    </Layout>
  )
}

// 应用内容组件
const AppContent: React.FC = () => {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <PublicRoute>
            <Login />
          </PublicRoute>
        }
      />
      <Route
        path="/*"
        element={
          <AuthGuard>
            <MainLayout />
          </AuthGuard>
        }
      />
    </Routes>
  )
}

// 主应用组件
const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
