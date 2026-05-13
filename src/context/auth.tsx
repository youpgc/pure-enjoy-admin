import React, { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { message } from 'antd'
import type { UserInfo, LoginCredentials, AuthState, UserRole } from '../types/auth'

// 模拟用户数据（实际项目中应该从后端API获取）
const MOCK_USERS: Record<string, { password: string; userInfo: UserInfo }> = {
  'admin@pureenjoy.com': {
    password: 'admin123',
    userInfo: {
      id: '1',
      email: 'admin@pureenjoy.com',
      role: 'super_admin',
      name: '超级管理员',
      created_at: new Date().toISOString(),
    },
  },
  'manager@pureenjoy.com': {
    password: 'manager123',
    userInfo: {
      id: '2',
      email: 'manager@pureenjoy.com',
      role: 'admin',
      name: '管理员',
      created_at: new Date().toISOString(),
    },
  },
  'viewer@pureenjoy.com': {
    password: 'viewer123',
    userInfo: {
      id: '3',
      email: 'viewer@pureenjoy.com',
      role: 'viewer',
      name: '查看者',
      created_at: new Date().toISOString(),
    },
  },
}

interface AuthContextType extends AuthState {
  login: (credentials: LoginCredentials) => Promise<boolean>
  logout: () => void
  updateUser: (user: Partial<UserInfo>) => void
  hasRole: (roles: UserRole[]) => boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const AUTH_STORAGE_KEY = 'pure_enjoy_admin_auth'

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AuthState>({
    isAuthenticated: false,
    user: null,
    isLoading: true,
    error: null,
  })

  // 初始化时检查本地存储
  useEffect(() => {
    const initAuth = () => {
      try {
        const stored = localStorage.getItem(AUTH_STORAGE_KEY)
        if (stored) {
          const user = JSON.parse(stored) as UserInfo
          setState({
            isAuthenticated: true,
            user,
            isLoading: false,
            error: null,
          })
        } else {
          setState(prev => ({ ...prev, isLoading: false }))
        }
      } catch {
        setState(prev => ({ ...prev, isLoading: false }))
      }
    }
    initAuth()
  }, [])

  const login = useCallback(async (credentials: LoginCredentials): Promise<boolean> => {
    setState(prev => ({ ...prev, isLoading: true, error: null }))

    try {
      // 模拟API调用延迟
      await new Promise(resolve => setTimeout(resolve, 500))

      const userData = MOCK_USERS[credentials.email]

      if (!userData || userData.password !== credentials.password) {
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: '邮箱或密码错误',
        }))
        message.error('邮箱或密码错误')
        return false
      }

      const userInfo = {
        ...userData.userInfo,
        last_sign_in_at: new Date().toISOString(),
      }

      // 保存到本地存储
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(userInfo))

      setState({
        isAuthenticated: true,
        user: userInfo,
        isLoading: false,
        error: null,
      })

      message.success(`欢迎回来，${userInfo.name}`)
      return true
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: '登录失败，请稍后重试',
      }))
      message.error('登录失败，请稍后重试')
      return false
    }
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem(AUTH_STORAGE_KEY)
    setState({
      isAuthenticated: false,
      user: null,
      isLoading: false,
      error: null,
    })
    message.success('已退出登录')
  }, [])

  const updateUser = useCallback((userData: Partial<UserInfo>) => {
    setState(prev => {
      if (!prev.user) return prev
      const updatedUser = { ...prev.user, ...userData }
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(updatedUser))
      return {
        ...prev,
        user: updatedUser,
      }
    })
  }, [])

  const hasRole = useCallback((roles: UserRole[]): boolean => {
    if (!state.user) return false
    return roles.includes(state.user.role)
  }, [state.user])

  return (
    <AuthContext.Provider
      value={{
        ...state,
        login,
        logout,
        updateUser,
        hasRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

// 检查是否已登录（用于路由守卫）
export const checkAuth = (): UserInfo | null => {
  try {
    const stored = localStorage.getItem(AUTH_STORAGE_KEY)
    if (stored) {
      return JSON.parse(stored) as UserInfo
    }
  } catch {
    // 解析失败
  }
  return null
}
