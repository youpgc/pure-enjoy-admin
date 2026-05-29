import React, { createContext, useContext, useState, useCallback } from 'react'
import type { Role } from '../types/auth'

export interface AdminUser {
  id: string
  email: string
  role: Role
  nickname?: string
  avatar_url?: string
  created_at: string
}

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

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AdminUser | null>(() => {
    try {
      const stored = localStorage.getItem('admin_user')
      return stored ? JSON.parse(stored) : null
    } catch {
      return null
    }
  })

  const login = useCallback(async (_username: string, _password: string) => {
    // 登录逻辑在 Login.tsx 中直接实现
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
