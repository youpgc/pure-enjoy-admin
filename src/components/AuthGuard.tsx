import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Spin } from 'antd'
import { supabase } from '../utils/supabase'
import { ADMIN_ROLE_CODES } from '../constants'

interface AuthGuardProps {
  children: React.ReactNode
}

/**
 * 认证守卫组件
 * 使用 Supabase Auth 验证用户会话状态
 * 未登录或会话过期时自动跳转到登录页
 */
const AuthGuard: React.FC<AuthGuardProps> = ({ children }) => {
  const navigate = useNavigate()
  const [isLoading, setIsLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // 获取当前 Supabase Auth 会话
        const { data: { session }, error } = await supabase.auth.getSession()

        if (error) {
          if (import.meta.env.DEV) {
            console.error('[AuthGuard] 获取会话失败:', error)
          }
          setIsAuthenticated(false)
          navigate('/login')
          return
        }

        if (!session) {
          // 无会话，未登录
          setIsAuthenticated(false)
          navigate('/login')
          return
        }

        // 角色判定以数据库 public.users.role 为准（public.is_admin() 防篡改），
        // 不再把 JWT 的 user_metadata / app_metadata.role 作为首要判定源。
        // （普通用户可经 auth.updateUser 自改 user_metadata.role 提权，见审查报告 P1b）
        const { data: isAdmin, error: rpcError } = await supabase.rpc('is_admin')
        if (rpcError || !isAdmin) {
          // RPC 失败或明确非管理员：回退到 token 角色做 UX 判断，避免网络抖动误踢管理员
          const userMetadata = session.user.user_metadata || {}
          const appMetadata = session.user.app_metadata || {}
          const role = (userMetadata.role || appMetadata.role || '') as string
          if (!(ADMIN_ROLE_CODES as readonly string[]).includes(role)) {
            // 非管理员角色，登出并跳转
            await supabase.auth.signOut()
            setIsAuthenticated(false)
            navigate('/login')
            return
          }
        }

        // 会话有效且角色正确
        setIsAuthenticated(true)
      } catch (e) {
        if (import.meta.env.DEV) {
          console.error('[AuthGuard] 认证检查异常:', e)
        }
        setIsAuthenticated(false)
        navigate('/login')
      } finally {
        setIsLoading(false)
      }
    }

    checkAuth()

    // 订阅 Auth 状态变化
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === 'SIGNED_OUT' || !session) {
          setIsAuthenticated(false)
          navigate('/login')
        }
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [navigate])

  if (isLoading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
      }}>
        <Spin size="large" tip="验证登录状态中..." />
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  return <>{children}</>
}

export default AuthGuard
