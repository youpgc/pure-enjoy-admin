import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Spin } from 'antd'
import { supabase } from '../../utils/supabase'
import { getSessionCache, setSessionCache, removeSessionCache } from '../../utils/sessionCache'
import { USER_STATUS_ACTIVE } from '../../constants/roles'
import styles from './AuthGuard.module.css'

// 标签页级鉴权缓存 key：跨「整页重载」复用 is_admin + users.status 校验结果，
// 避免切走应用再切回浏览器（标签页被丢弃后重载）时重复请求固定鉴权接口。
// 关闭标签页即失效；主动登出 / 会话失效时清除，保证新开标签页仍走服务端校验。
const AUTH_CACHE_KEY = 'auth'

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

        // 同标签页内已校验过（重载后复用），直接放行，跳过 is_admin / users 重复请求
        const authCached = getSessionCache<{ ok: true }>(AUTH_CACHE_KEY)
        if (authCached?.ok) {
          setIsAuthenticated(true)
          setIsLoading(false)
          return
        }

        // 角色判定以数据库 public.users.role 为准（public.is_admin() 防篡改），
        // 不再把 JWT 的 user_metadata / app_metadata.role 作为首要判定源。
        // fail-closed：RPC 失败一律按"非管理员"拒绝进入，不回退 JWT metadata
        // （普通用户可经 auth.updateUser 自改 user_metadata.role 提权，见审查报告 P1-C）。
        const { data: isAdmin, error: rpcError } = await supabase.rpc('is_admin')
        if (rpcError || !isAdmin) {
          // 明确非管理员才登出；RPC 异常仅拒绝进入（保留会话，便于网络恢复后重试）
          if (!rpcError && !isAdmin) {
            await supabase.auth.signOut()
          }
          removeSessionCache(AUTH_CACHE_KEY)
          setIsAuthenticated(false)
          navigate('/login')
          return
        }

        // 二级兜底：即便 is_admin() RPC 未含 status 条件，也按 users.status 拦截
        // 禁用/封禁账户（软删除仅置 status，若 RPC 不校验则被禁管理员仍可进后台，审查 P1-2/P2-7）。
        // RLS 限制下查不到 profile 时放行（主闭环依赖 is_admin SQL 加 status 条件）。
        const result = await supabase
          .from('users')
          .select('status')
          .eq('auth_id', session.user.id)
          .maybeSingle()
        const profile = result.data as { status?: string } | null
        if (profile && profile.status !== USER_STATUS_ACTIVE) {
          await supabase.auth.signOut()
          removeSessionCache(AUTH_CACHE_KEY)
          setIsAuthenticated(false)
          navigate('/login')
          return
        }

        // 会话有效且角色正确
        setSessionCache(AUTH_CACHE_KEY, { ok: true })
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
          removeSessionCache(AUTH_CACHE_KEY)
          setIsAuthenticated(false)
          navigate('/login')
        } else if (event === 'SIGNED_IN') {
          // 登录/切换账号（含无整页刷新场景）：重跑 is_admin() 服务端校验，
          // 防止旧管理员会话下切入普通账号后继续停留在后台页面
          checkAuth()
        }
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [navigate])

  if (isLoading) {
    return (
      <div className={styles.centerScreen}>
        <Spin size="large" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  return <>{children}</>
}

export default AuthGuard
