import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Spin } from 'antd'
import { AUTH_CACHE_KEY, fetchAdminMe, hasLocalSession, clearLocalSession } from '../../utils/adminSession'
import { getSessionCache, setSessionCache, removeSessionCache } from '../../utils/sessionCache'
import { ROLE_ADMIN, ROLE_SUPER_ADMIN } from '../../constants/roles'
import styles from './AuthGuard.module.css'

// 标签页级鉴权缓存 key：跨「整页重载」复用 /auth/me 校验结果，
// 避免切走应用再切回浏览器（标签页被丢弃后重载）时重复请求固定鉴权接口。
// 关闭标签页即失效；主动登出 / 会话失效时清除，保证新开标签页仍走服务端校验。


interface AuthGuardProps {
  children: React.ReactNode
}

/**
 * 认证守卫组件
 * 本地后端会话为权威源：JWT 存在 + /auth/me 校验通过 + 角色为 admin/super_admin 才放行。
 * 角色与状态判定均发生在服务端（登录时已按 admin_users 白名单拦截，/auth/me 实时重查），
 * 前端只做 fail-closed 兜底。
 */
const AuthGuard: React.FC<AuthGuardProps> = ({ children }) => {
  const navigate = useNavigate()
  const [isLoading, setIsLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // 无本地 JWT，未登录
        if (!hasLocalSession()) {
          setIsAuthenticated(false)
          navigate('/login')
          return
        }

        // 同标签页内已校验过（重载后复用），直接放行，跳过 /auth/me 重复请求
        const authCached = getSessionCache<{ ok: true }>(AUTH_CACHE_KEY)
        if (authCached?.ok) {
          setIsAuthenticated(true)
          setIsLoading(false)
          return
        }

        // 服务端实时校验：主体有效（未被禁用/删除）且角色可登录管理端。
        // fail-closed：请求失败或角色不符一律拒绝进入。
        const me = await fetchAdminMe()
        if (!me || (me.role !== ROLE_SUPER_ADMIN && me.role !== ROLE_ADMIN)) {
          if (!me) {
            // 主体不可用（禁用/删除/令牌失效）：清本地会话，下次直达登录页
            clearLocalSession()
          }
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
