import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../utils/supabase'
import { hasPermission as checkPermission } from '../types/permission'
import { ROLE_SUPER_ADMIN, ROLE_ADMIN } from '../constants'

// ==================== 权限 Hook ====================
// 模块级共享：避免多个组件并发 usePermission 时重复发起 `permissions?select=name`
// 首屏 Dashboard 等页面会同时挂载多个使用本 hook 的组件，各自 useEffect 触发 loadPermissions。
// 这里用单次 in-flight Promise 去重 + 会话内结果缓存，保证同一用户会话只发一次真实请求。
// 权限变更/登出由 reload() 与 auth 事件清理缓存后重新拉取。
type PermissionLoadResult = {
  role: string
  permissions: string[]
}

let permissionInflight: Promise<PermissionLoadResult> | null = null
let permissionCache: PermissionLoadResult | null = null

function clearPermissionCache() {
  permissionInflight = null
  permissionCache = null
}

async function fetchPermissionData(): Promise<PermissionLoadResult> {
  if (permissionInflight) return permissionInflight
  if (permissionCache) return permissionCache

  permissionInflight = (async (): Promise<PermissionLoadResult> => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) {
      return { role: '', permissions: [] }
    }

    const userMetadata = session.user.user_metadata || {}
    const appMetadata = session.user.app_metadata || {}
    const userRole = (userMetadata.role || appMetadata.role || '') as string

    // 超级管理员直接拥有所有权限
    if (userRole === ROLE_SUPER_ADMIN) {
      const { data: allPerms } = await supabase
        .from('permissions')
        .select('name')
      return {
        role: userRole,
        permissions: (allPerms as Array<{ name: string }> | null)?.map((p) => p.name) || [],
      }
    }

    // 其他角色从数据库查询权限列表
    const { data: roleData } = await supabase
      .from('roles')
      .select('id')
      .eq('code', userRole)
      .single()

    const roleId = (roleData as unknown as { id: number } | null)?.id
    if (!roleId) {
      return { role: userRole, permissions: [] }
    }

    const { data: rolePerms } = await supabase
      .from('role_permissions')
      .select('permission_id')
      .eq('role_id', roleId)

    if (!rolePerms || rolePerms.length === 0) {
      return { role: userRole, permissions: [] }
    }

    const permissionIds = (rolePerms as unknown as Array<{ permission_id: number }>).map((rp) => rp.permission_id)
    const { data: permData } = await supabase
      .from('permissions')
      .select('name')
      .in('id', permissionIds)

    return {
      role: userRole,
      permissions: ((permData as unknown as Array<{ name: string }> | null)?.map((p) => p.name)) || [],
    }
  })()

  try {
    permissionCache = await permissionInflight
    return permissionCache
  } finally {
    permissionInflight = null
  }
}

export const usePermission = () => {
  const [permissions, setPermissions] = useState<string[]>([])
  const [role, setRole] = useState<string>('')
  const [loading, setLoading] = useState(true)

  // 加载当前用户的权限列表（结果经模块级去重/缓存，同一会话最多一次真实请求）
  const loadPermissions = useCallback(async () => {
    try {
      setLoading(true)
      const result = await fetchPermissionData()
      setRole(result.role)
      setPermissions(result.permissions)
    } catch (error) {
      console.error('[usePermission] 加载权限失败:', error)
      setPermissions([])
    } finally {
      setLoading(false)
    }
  }, [])

  // 强制刷新：清理缓存后重新拉取
  const reload = useCallback(async () => {
    clearPermissionCache()
    await loadPermissions()
  }, [loadPermissions])

  // 判断是否有某个权限（基于数据库配置，禁止硬编码特权）
  const hasPermission = useCallback((permissionName: string): boolean => {
    return checkPermission(permissions, permissionName)
  }, [permissions])

  // 判断是否有任意一个权限
  const hasAnyPermission = useCallback((permissionNames: string[]): boolean => {
    return permissionNames.some(name => permissions.includes(name))
  }, [permissions])

  // 判断是否有所有指定权限
  const hasAllPermissions = useCallback((permissionNames: string[]): boolean => {
    return permissionNames.every(name => permissions.includes(name))
  }, [permissions])

  // 菜单可见性判断（有菜单权限或菜单下任意操作权限）
  const hasMenuPermission = useCallback((menuPermissionName: string, actionPermissions: string[]): boolean => {
    if (permissions.includes(menuPermissionName)) return true
    return actionPermissions.some(name => permissions.includes(name))
  }, [permissions])

  // 快捷判断
  const isSuperAdmin = useCallback(() => role === ROLE_SUPER_ADMIN, [role])
  const isAdmin = useCallback(() => role === ROLE_SUPER_ADMIN || role === ROLE_ADMIN, [role])

  useEffect(() => {
    loadPermissions()

    // 监听 Auth 状态变化
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (session?.user) {
          loadPermissions()
        } else {
          clearPermissionCache()
          setPermissions([])
          setRole('')
        }
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [loadPermissions])

  return {
    permissions,
    role,
    loading,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    hasMenuPermission,
    isSuperAdmin,
    isAdmin,
    reload,
  }
}
