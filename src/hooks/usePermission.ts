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
          // 优先读取 user_metadata.role（自定义管理员角色），其次 app_metadata.role（Supabase 默认角色）
          const userMetadata = session.user.user_metadata || {}
          const appMetadata = session.user.app_metadata || {}
          const userRole = (userMetadata.role || appMetadata.role || '') as string
          setRole(userRole)
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
          // 优先读取 user_metadata.role（自定义管理员角色），其次 app_metadata.role（Supabase 默认角色）
          const userMetadata = session.user.user_metadata || {}
          const appMetadata = session.user.app_metadata || {}
          const userRole = (userMetadata.role || appMetadata.role || '') as string
          setRole(userRole)
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

  const canReadFeedback = useCallback(() => {
    return isAdmin()
  }, [isAdmin])

  const canWriteFeedback = useCallback(() => {
    return isAdmin()
  }, [isAdmin])

  const canDeleteFeedback = useCallback(() => {
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
    canReadFeedback: canReadFeedback(),
    canWriteFeedback: canWriteFeedback(),
    canDeleteFeedback: canDeleteFeedback(),
    canManagePoints: canManagePoints(),
    canManageAppConfigs: canManageAppConfigs(),
    canViewSystemMonitor: canViewSystemMonitor(),
    canViewOperationLogs: canViewOperationLogs(),
    canViewErrorLogs: canViewErrorLogs(),
  }
}
