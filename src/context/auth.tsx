import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import type { AdminUser, Role } from '../types/auth'
import { supabase, logOperation } from '../utils/supabase'
import sha256 from 'crypto-js/sha256'

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

// admin_users 表字段定义
interface DbAdminUser {
  id: string
  username: string
  password_hash: string
  role: string
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

  const login = useCallback(async (username: string, password: string) => {
    console.log(`[Auth] 尝试登录: username=${username}, time=${new Date().toISOString()}`)
    
    try {
      // 1. 查询 admin_users 表（不使用 single，避免 PGRST116 错误）
      console.log(`[Auth] 查询 admin_users 表，条件: username=${username}`)
      const { data: dbUsers, error } = await supabase
        .from('admin_users')
        .select('*')
        .eq('username', username)

      if (error) {
        console.error('[Auth] 查询 admin_users 表失败:', {
          error,
          username,
          time: new Date().toISOString()
        })
        // 记录登录失败日志
        await logOperation({
          action: '登录失败',
          module: '系统',
          detail: `查询用户失败: ${error.message}`,
          target_id: username,
        })
        throw new Error('登录失败，请稍后重试')
      }

      if (!dbUsers || dbUsers.length === 0) {
        console.warn('[Auth] 管理员用户不存在:', username)
        // 记录登录失败日志
        await logOperation({
          action: '登录失败',
          module: '系统',
          detail: `用户不存在: ${username}`,
          target_id: username,
        })
        throw new Error('用户名或密码错误')
      }

      const dbUser = dbUsers[0]
      const user = dbUser as DbAdminUser

      console.log(`[Auth] 找到管理员用户: id=${user.id}, username=${user.username}, role=${user.role}`)

      // 2. 验证密码（使用 SHA-256 哈希比较）
      const hashedPassword = sha256(password).toString()
      console.log(`[Auth] 验证密码: username=${username}, hash_match=${user.password_hash === hashedPassword}`)
      
      if (user.password_hash !== hashedPassword) {
        console.warn('[Auth] 密码错误:', username)
        // 记录登录失败日志
        await logOperation({
          action: '登录失败',
          module: '系统',
          detail: `密码错误: ${username}`,
          target_id: username,
        })
        throw new Error('用户名或密码错误')
      }

      // 3. 检查角色 - 只允许 admin 和 super_admin 登录后台
      const allowedRoles = ['admin', 'super_admin']
      if (!allowedRoles.includes(user.role)) {
        console.warn('[Auth] 用户角色无权登录后台:', username, '角色:', user.role)
        // 记录登录失败日志
        await logOperation({
          action: '登录失败',
          module: '系统',
          detail: `角色无权登录: ${username}, role=${user.role}`,
          target_id: username,
        })
        throw new Error('该用户无权登录管理后台')
      }

      // 4. 更新登录时间
      console.log(`[Auth] 更新登录时间: id=${user.id}`)
      const { error: updateError } = await supabase
        .from('admin_users')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', user.id)

      if (updateError) {
        console.error('[Auth] 更新登录时间失败:', {
          error: updateError,
          userId: user.id,
          time: new Date().toISOString()
        })
        // 登录信息更新失败不影响登录流程，继续执行
      } else {
        console.log('[Auth] 登录时间更新成功')
      }

      // 5. 存储用户信息
      const adminUser: AdminUser = {
        id: user.id,
        email: user.username, // 使用 username 作为 email 字段（兼容现有接口）
        role: user.role as Role,
        created_at: user.created_at,
      }

      setUser(adminUser)
      localStorage.setItem('admin_user', JSON.stringify(adminUser))
      console.log('[Auth] 登录成功:', {
        username,
        userId: user.id,
        role: user.role,
        time: new Date().toISOString()
      })
      
      // 记录登录成功日志
      await logOperation({
        action: '登录',
        module: '系统',
        detail: `管理员登录成功: ${username}, role=${user.role}`,
        target_id: user.id,
      })
      
    } catch (err) {
      console.error('[Auth] 登录过程发生错误:', {
        error: err,
        username,
        time: new Date().toISOString()
      })
      throw err
    }
  }, [])

  const logout = useCallback(async () => {
    const currentUser = user
    setUser(null)
    localStorage.removeItem('admin_user')
    console.log('[Auth] 用户登出:', {
      userId: currentUser?.id,
      time: new Date().toISOString()
    })
    // 记录登出日志
    await logOperation({
      action: '登出',
      module: '系统',
      detail: `管理员登出: ${currentUser?.email || 'unknown'}`,
      target_id: currentUser?.id || 'unknown',
    })
  }, [user])

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
