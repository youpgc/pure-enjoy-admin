import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import type { AdminUser, Role } from '../types/auth'
import { supabase } from '../utils/supabase'

interface AuthContextType {
  user: AdminUser | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  checkPermission: (permission: string) => boolean
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  login: async () => {},
  logout: () => {},
  checkPermission: () => false,
})

export const useAuth = () => useContext(AuthContext)

// 数据库用户类型
interface DbUser {
  id: string
  email: string
  password_hash: string
  nickname: string | null
  avatar_url: string | null
  role: string
  member_level: string
  points: number
  status: string
  register_ip: string | null
  last_login_ip: string | null
  last_login_at: string | null
  login_count: number
  created_at: string
  updated_at: string
}

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
    // 1. 查询用户
    const { data: dbUser, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single()

    if (error || !dbUser) {
      throw new Error('用户不存在')
    }

    const user = dbUser as DbUser

    // 2. 验证密码（简单比较，实际应该用 bcrypt）
    if (user.password_hash !== password) {
      throw new Error('密码错误')
    }

    // 3. 检查状态
    if (user.status !== 'active') {
      throw new Error('账号已被禁用')
    }

    // 4. 检查角色
    if (user.role === 'user') {
      throw new Error('普通用户无法登录后台')
    }

    // 5. 更新登录信息
    await supabase
      .from('users')
      .update({
        last_login_at: new Date().toISOString(),
        last_login_ip: '127.0.0.1', // 实际应该获取真实IP
        login_count: user.login_count + 1
      })
      .eq('id', user.id)

    // 6. 存储用户信息
    const adminUser: AdminUser = {
      id: user.id,
      email: user.email,
      role: user.role as Role,
      nickname: user.nickname || undefined,
      avatar_url: user.avatar_url || undefined,
      created_at: user.created_at,
    }

    setUser(adminUser)
    localStorage.setItem('admin_user', JSON.stringify(adminUser))
  }, [])

  const logout = useCallback(() => {
    setUser(null)
    localStorage.removeItem('admin_user')
  }, [])

  const checkPermission = useCallback((permission: string): boolean => {
    if (!user) return false

    // 角色权限映射
    const rolePermissions: Record<string, string[]> = {
      super_admin: ['*'], // 超级管理员拥有所有权限
      admin: [
        'users:read', 'users:write', 'users:delete', 'users:export',
        'expenses:read', 'expenses:write', 'expenses:delete', 'expenses:export',
        'moods:read', 'moods:write', 'moods:delete', 'moods:export',
        'weights:read', 'weights:write', 'weights:delete', 'weights:export',
        'notes:read', 'notes:write', 'notes:delete', 'notes:export',
        'novels:read', 'novels:write', 'novels:delete', 'novels:export',
        'novel_library:read', 'novel_library:write', 'novel_library:delete', 'novel_library:export',
        'versions:read', 'versions:write', 'versions:release',
        'system:read', 'system:logs', 'system:stats'
      ],
      viewer: [
        'expenses:read', 'moods:read', 'weights:read', 'notes:read', 'novels:read',
        'novel_library:read'
      ]
    }

    const permissions = rolePermissions[user.role] || []
    return permissions.includes('*') || permissions.includes(permission)
  }, [user])

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, checkPermission }}>
      {children}
    </AuthContext.Provider>
  )
}
