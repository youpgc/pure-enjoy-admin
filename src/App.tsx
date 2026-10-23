// 根组件：认证 Provider + 路由表
// 认证上下文见 contexts/AuthContext，导航上下文见 contexts/NavigationContext，
// 主布局见 components/layout/MainLayout，页面懒加载注册见 config/pageComponents。
import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { InlineAuthProvider } from './contexts/AuthContext'
import AuthGuard from './components/common/AuthGuard'
import MainLayout from './components/layout/MainLayout'
import Login from './pages/Login'

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
