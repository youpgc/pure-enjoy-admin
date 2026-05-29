import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import type { AdminUser, Role } from '../types/auth'
import { supabase } from '../utils/supabase'

interface AuthContextType {
  user: AdminUser | null
  loading: boolean
  login: (username: string, password: string) => Promise<void>
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

  const login = useCallback(async (username: string, password: string) => {
    console.log(`[Auth] 尝试登录: username=${username}, time=${new Date().toISOString()}`)
    
    try {
      // 1. 查询 admin_users 表（使用 email 字段登录）
      console.log(`[Auth] 查询 admin_users 表，条件: email=${username}`)
      const { data: dbUsers, error } = await supabase
        .from('admin_users')
        .select('*')
        .eq('email', username)

      if (error) {
        console.error('[Auth] 查询 admin_users 表失败:', error)
        throw new Error('登录失败，请稍后重试')
      }

      if (!dbUsers || dbUsers.length === 0) {
        console.warn('[Auth] 用户不存在:', username)
        throw new Error('用户名或密码错误')
      }

      const dbUser = dbUsers[0]
      console.log(`[Auth] 找到用户: id=${dbUser.id}, email=${dbUser.email}, role=${dbUser.role}`)

      // 2. 验证密码（明文比较）
      if (dbUser.password !== password) {
        console.warn('[Auth] 密码错误:', username)
        throw new Error('用户名或密码错误')
      }

      // 3. 检查角色 - 只允许 admin 和 super_admin 登录后台
      const allowedRoles = ['admin', 'super_admin']
      if (!allowedRoles.includes(dbUser.role)) {
        console.warn('[Auth] 用户角色无权登录后台:', username, '角色:', dbUser.role)
        throw new Error('该用户无权登录管理后台')
      }

      // 4. 存储用户信息
      const adminUser: AdminUser = {
        id: String(dbUser.id),
        email: dbUser.email,
        role: dbUser.role as Role,
        created_at: dbUser.created_at,
      }

      setUser(adminUser)
      localStorage.setItem('admin_user', JSON.stringify(adminUser))
      console.log('[Auth] 登录成功:', { username, userId: dbUser.id, role: dbUser.role })
      
    } catch (err) {
      console.error('[Auth] 登录过程发生错误:', err)
      throw err
    }
  }, [])

  const logout = useCallback(() => {
    setUser(null)
    localStorage.removeItem('admin_user')
    console.log('[Auth] 用户登出')
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
