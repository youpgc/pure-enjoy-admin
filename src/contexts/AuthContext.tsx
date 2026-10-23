// 认证上下文：从 Supabase Auth 会话构建 AdminUser，供全局消费
// （登录逻辑在 Login.tsx 中处理，本上下文只负责会话状态与登出）
import React, { createContext, useContext, useState, useCallback, useEffect } from 'react'
import type { AdminUser } from '../types/auth'
import { supabase } from '../utils/supabase'

interface AuthContextType {
  user: AdminUser | null
  isLoading: boolean
  login: (username: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  login: async () => {},
  logout: async () => {},
})

export const useAuth = () => useContext(AuthContext)

export const InlineAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AdminUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // 从 Supabase Auth 会话构建 AdminUser
  // 注意：Supabase Auth 的 role 字段在 app_metadata 中，user_metadata 中的是自定义角色
  // ⚠️ 此处 role 取自 JWT metadata，仅供展示（如顶栏），严禁用于权限/角色判定！
  //    权限判定必须走 usePermission（get_my_role RPC）或 AuthGuard（is_admin RPC），
  //    以数据库 public.users.role 为准（JWT metadata 可被用户自改，见审查报告 P1b）。
  const buildAdminUser = useCallback((authUser: any): AdminUser | null => {
    if (!authUser) return null
    const metadata = authUser.user_metadata || {}
    const appMetadata = authUser.app_metadata || {}
    // 优先读取 user_metadata.role（自定义管理员角色），其次 app_metadata.role（Supabase 默认角色）
    const role = metadata.role || appMetadata.role || 'viewer'
    return {
      id: authUser.id,
      email: authUser.email || '',
      role: role,
      nickname: metadata.nickname || metadata.name || '',
      avatar_url: metadata.avatar_url,
      username: metadata.username || '',
      phone: metadata.phone || '',
      gender: metadata.gender || '',
      height: typeof metadata.height === 'number' ? metadata.height : undefined,
      created_at: authUser.created_at,
    }
  }, [])

  // 监听 Supabase Auth 状态变化
  useEffect(() => {
    // 初始化时获取当前会话
    const initSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.user) {
          setUser(buildAdminUser(session.user))
        }
      } catch (e) {
        if (import.meta.env.DEV) {
          console.error('[Auth] 获取会话失败:', e)
        }
      } finally {
        setIsLoading(false)
      }
    }

    initSession()

    // 订阅 Auth 状态变化
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (session?.user) {
          setUser(buildAdminUser(session.user))
        } else {
          setUser(null)
        }
        setIsLoading(false)
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [buildAdminUser])

  const login = useCallback(async (_username: string, _password: string) => {
    // 登录逻辑在 Login.tsx 中处理，此处仅作为占位
    throw new Error('请使用 Login.tsx 中的登录逻辑')
  }, [])

  const logout = useCallback(async () => {
    await supabase.auth.signOut()
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}
