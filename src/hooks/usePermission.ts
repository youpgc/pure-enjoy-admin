import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../utils/supabase'

/**
 * 权限管理 Hook
 * 使用 Supabase Auth 的 user_metadata 中的 role 字段进行权限判断
 */
export const usePermission = () => {
  const [role, setRole] = useState<string>('')
  const [isLoading, setIsLoading] = useState(true)

  // 从 Supabase Auth 会话获取角色
  useEffect(() => {
    const getRole = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.user) {
          const userRole = session.user.user_metadata?.role as string
          setRole(userRole || '')
        } else {
          setRole('')
        }
      } catch (e) {
        if (process.env.NODE_ENV === 'development') {
          console.error('[usePermission] 获取角色失败:', e)
        }
        setRole('')
      } finally {
        setIsLoading(false)
      }
    }

    getRole()

    // 订阅 Auth 状态变化，角色可能随会话变化
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (session?.user) {
          const userRole = session.user.user_metadata?.role as string
          setRole(userRole || '')
        } else {
          setRole('')
        }
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const isAdmin = useCallback(() => {
    return role === 'admin' || role === 'super_admin'
  }, [role])

  const isSuperAdmin = useCallback(() => {
    return role === 'super_admin'
  }, [role])

  const canManageVersions = useCallback(() => {
    return isAdmin()
  }, [isAdmin])

  const canManageUsers = useCallback(() => {
    return isAdmin()
  }, [isAdmin])

  const canManageRoles = useCallback(() => {
    return isSuperAdmin()
  }, [isSuperAdmin])

  const canManageSystem = useCallback(() => {
    return isSuperAdmin()
  }, [isSuperAdmin])

  const canViewAnalytics = useCallback(() => {
    return isAdmin()
  }, [isAdmin])

  const canManageContent = useCallback(() => {
    return isAdmin()
  }, [isAdmin])

  const canManageDict = useCallback(() => {
    return isAdmin()
  }, [isAdmin])

  const canManageSensitiveWords = useCallback(() => {
    return isAdmin()
  }, [isAdmin])

  const canManageFiles = useCallback(() => {
    return isAdmin()
  }, [isAdmin])

  const canManageNotifications = useCallback(() => {
    return isAdmin()
  }, [isAdmin])

  const canManageAnnouncements = useCallback(() => {
    return isAdmin()
  }, [isAdmin])

  const canManageFeedback = useCallback(() => {
    return isAdmin()
  }, [isAdmin])

  const canManagePoints = useCallback(() => {
    return isAdmin()
  }, [isAdmin])

  const canManageAppConfigs = useCallback(() => {
    return isSuperAdmin()
  }, [isSuperAdmin])

  const canViewSystemMonitor = useCallback(() => {
    return isSuperAdmin()
  }, [isSuperAdmin])

  const canViewOperationLogs = useCallback(() => {
    return isSuperAdmin()
  }, [isSuperAdmin])

  const canViewErrorLogs = useCallback(() => {
    return isSuperAdmin()
  }, [isSuperAdmin])

  return {
    role,
    isLoading,
    isAdmin: isAdmin(),
    isSuperAdmin: isSuperAdmin(),
    canManageVersions: canManageVersions(),
    canManageUsers: canManageUsers(),
    canManageRoles: canManageRoles(),
    canManageSystem: canManageSystem(),
    canViewAnalytics: canViewAnalytics(),
    canManageContent: canManageContent(),
    canManageDict: canManageDict(),
    canManageSensitiveWords: canManageSensitiveWords(),
    canManageFiles: canManageFiles(),
    canManageNotifications: canManageNotifications(),
    canManageAnnouncements: canManageAnnouncements(),
    canManageFeedback: canManageFeedback(),
    canManagePoints: canManagePoints(),
    canManageAppConfigs: canManageAppConfigs(),
    canViewSystemMonitor: canViewSystemMonitor(),
    canViewOperationLogs: canViewOperationLogs(),
    canViewErrorLogs: canViewErrorLogs(),
  }
}
