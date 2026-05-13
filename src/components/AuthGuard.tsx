import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { Spin } from 'antd'
import { useAuth } from '../context/auth'
import type { UserRole } from '../types/auth'

interface AuthGuardProps {
  children: React.ReactNode
  requiredRoles?: UserRole[]
  fallback?: React.ReactNode
}

// 路由守卫组件
export const AuthGuard: React.FC<AuthGuardProps> = ({
  children,
  requiredRoles,
  fallback,
}) => {
  const { isAuthenticated, isLoading, user, hasRole } = useAuth()
  const location = useLocation()

  // 加载中
  if (isLoading) {
    return (
      <div style={{
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <Spin size="large" tip="加载中..." />
      </div>
    )
  }

  // 未登录，重定向到登录页
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  // 检查角色权限
  if (requiredRoles && requiredRoles.length > 0) {
    if (!hasRole(requiredRoles)) {
      // 无权限访问
      if (fallback) {
        return <>{fallback}</>
      }
      return (
        <div style={{
          height: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
        }}>
          <h2 style={{ color: '#ff4d4f' }}>无权限访问</h2>
          <p style={{ color: '#666' }}>
            您没有权限访问此页面，请联系管理员
          </p>
        </div>
      )
    }
  }

  return <>{children}</>
}

// 公开路由（仅未登录可访问）
export const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return (
      <div style={{
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <Spin size="large" tip="加载中..." />
      </div>
    )
  }

  // 已登录，重定向到首页
  if (isAuthenticated) {
    const from = (location.state as any)?.from?.pathname || '/'
    return <Navigate to={from} replace />
  }

  return <>{children}</>
}

export default AuthGuard
