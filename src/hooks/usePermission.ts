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
// 缓存归属的 auth 用户 ID：切换账号（无整页刷新场景）时校验不匹配则丢弃，
// 防止新账号读到旧账号的角色/权限缓存
let permissionCacheUserId: string | null = null

function clearPermissionCache() {
  permissionInflight = null
  permissionCache = null
  permissionCacheUserId = null
}

async function fetchPermissionData(): Promise<PermissionLoadResult> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.user) {
    clearPermissionCache()
    return { role: '', permissions: [] }
  }
  const currentUserId = session.user.id

  // 缓存/在途请求属于其他用户 → 丢弃后重新拉取
  if (permissionCacheUserId !== null && permissionCacheUserId !== currentUserId) {
    clearPermissionCache()
  }
  if (permissionInflight) return permissionInflight
  if (permissionCache) return permissionCache
  permissionCacheUserId = currentUserId

  permissionInflight = (async (): Promise<PermissionLoadResult> => {
    // 角色判定以数据库 public.users.role 为准（get_my_role() RPC，防篡改），
    // 与 AuthGuard 的 is_admin() 口径对齐；RPC 失败时回退 JWT metadata
    // 角色（仅作 UX 容错，避免网络抖动导致权限全丢）。
    // （普通用户可经 auth.updateUser 自改 user_metadata.role 提权，见审查报告 P1b）
    let userRole = ''
    const { data: dbRole, error: roleErr } = await supabase.rpc('get_my_role')
    if (!roleErr && typeof dbRole === 'string' && dbRole) {
      userRole = dbRole
    } else {
      const userMetadata = session.user.user_metadata || {}
      const appMetadata = session.user.app_metadata || {}
      userRole = (userMetadata.role || appMetadata.role || '') as string
    }

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

  const inflight = permissionInflight
  try {
    const result = await inflight
    // 等待期间可能已切换账号并清理/重建缓存归属，只有归属未变时才落缓存
    if (permissionCacheUserId === currentUserId) {
      permissionCache = result
    }
    return result
  } finally {
    if (permissionInflight === inflight) {
      permissionInflight = null
    }
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
      (event, session) => {
        if (session?.user) {
          // 登录事件（含切换账号）主动清缓存，确保拉取的是新账号的角色/权限
          if (event === 'SIGNED_IN') {
            clearPermissionCache()
          }
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
