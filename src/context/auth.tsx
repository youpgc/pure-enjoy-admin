import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import type { AdminUser, Role } from '../types/auth'

interface AuthContextType {
  user: AdminUser | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  login: async () => {},
  logout: () => {},
})

export const useAuth = () => useContext(AuthContext)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AdminUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const stored = localStorage.getItem('admin_user')
    if (stored) {
      try {
        setUser(JSON.parse(stored))
      } catch {
        localStorage.removeItem('admin_user')
      }
    }
    setLoading(false)
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    // 硬编码测试账号（登录完全使用硬编码账号）
    const testUsers = [
      { id: '1', email: 'admin@pureenjoy.com', password: 'admin123', role: 'super_admin' as Role, name: '超级管理员' },
      { id: '2', email: 'manager@pureenjoy.com', password: 'manager123', role: 'admin' as Role, name: '管理员' },
      { id: '3', email: 'viewer@pureenjoy.com', password: 'viewer123', role: 'viewer' as Role, name: '查看者' },
    ]
    
    const testUser = testUsers.find(u => u.email === email && u.password === password)
    if (testUser) {
      const adminUser: AdminUser = {
        id: testUser.id,
        email: testUser.email,
        role: testUser.role,
        created_at: new Date().toISOString(),
      }
      setUser(adminUser)
      localStorage.setItem('admin_user', JSON.stringify(adminUser))
      return
    }
    
    // 未找到匹配的账号
    throw new Error('邮箱或密码错误')
  }, [])

  const logout = useCallback(() => {
    setUser(null)
    localStorage.removeItem('admin_user')
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}
