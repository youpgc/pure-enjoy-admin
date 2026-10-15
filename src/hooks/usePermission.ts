import { useState, useEffect, useCallback } from 'react'
import { fetchAdminMe, hasLocalSession, type AdminMe } from '../utils/adminSession'
import { getSessionCache, setSessionCache, removeSessionCache } from '../utils/sessionCache'
import { hasPermission as checkPermission } from '../types/permission'
import { ROLE_SUPER_ADMIN, ROLE_ADMIN } from '../constants'

// ==================== 权限 Hook ====================
// 本地后端为权限权威源：/auth/me 一次返回 role + permissions（服务端实时判定，
// 超管返回全量权限码，其余角色按 role_permissions 授权）。原「get_my_role RPC +
// roles/role_permissions/permissions 三段查询」已由服务端 /auth/me 取代。
// 模块级共享：避免多个组件并发 usePermission 时重复发起 /auth/me。
// 首屏 Dashboard 等页面会同时挂载多个使用本 hook 的组件，各自 useEffect 触发 loadPermissions。
// 这里用单次 in-flight Promise 去重 + 会话内结果缓存，保证同一用户会话只发一次真实请求。
// 权限变更/登出由 reload() 与 auth 事件清理缓存后重新拉取。
type PermissionLoadResult = {
  role: string
  permissions: string[]
}

let permissionInflight: Promise<PermissionLoadResult> | null = null
let permissionCache: PermissionLoadResult | null = null
// 缓存归属的用户 ID：切换账号（无整页刷新场景）时校验不匹配则丢弃，
// 防止新账号读到旧账号的角色/权限缓存
let permissionCacheUserId: string | null = null

// 标签页级缓存 key 前缀：跨「整页重载」复用初始化结果，避免切走再切回时重复请求
const PERM_CACHE_KEY = 'perm_'

function clearPermissionCache() {
  if (permissionCacheUserId) removeSessionCache(PERM_CACHE_KEY + permissionCacheUserId)
  permissionInflight = null
  permissionCache = null
  permissionCacheUserId = null
}

async function fetchPermissionData(): Promise<PermissionLoadResult> {
  if (!hasLocalSession()) {
    clearPermissionCache()
    return { role: '', permissions: [] }
  }
  const currentUserId = localStorage.getItem('pe_admin_access_token')?.slice(-12) ?? 'anon'

  // 缓存/在途请求属于其他用户 → 丢弃后重新拉取
  if (permissionCacheUserId !== null && permissionCacheUserId !== currentUserId) {
    clearPermissionCache()
  }
  if (permissionInflight) return permissionInflight
  if (permissionCache) return permissionCache
  // 跨整页重载复用：同标签页内已拉取过则直接返回，跳过 /auth/me 重复请求
  const cached = getSessionCache<PermissionLoadResult>(PERM_CACHE_KEY + currentUserId)
  if (cached) {
    permissionCacheUserId = currentUserId
    permissionCache = cached
    return cached
  }
  permissionCacheUserId = currentUserId

  permissionInflight = (async (): Promise<PermissionLoadResult> => {
    // 角色与权限码均由服务端 /auth/me 实时判定（超管全量、其余按授权），
    // fail-closed：请求失败按最小权限（空角色）处理，绝不回退客户端缓存元数据。
    const me: AdminMe | null = await fetchAdminMe()
    if (!me) {
      return { role: '', permissions: [] }
    }
    return { role: me.role, permissions: me.permissions || [] }
  })()

  const inflight = permissionInflight
  try {
    const result = await inflight
    // fail-closed：/auth/me 瞬时失败的空结果不落任何缓存（内存/标签页级），
    // 否则同 token 下刷新页面也命中空缓存，菜单/按钮全空直到登出重登
    if (result.role === '' && result.permissions.length === 0) {
      return result
    }
    // 等待期间可能已切换账号并清理/重建缓存归属，只有归属未变时才落缓存
    if (permissionCacheUserId === currentUserId) {
      permissionCache = result
      // 写标签页级缓存：重载后仍可复用，避免重复请求固定接口
      setSessionCache(PERM_CACHE_KEY + currentUserId, result)
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

  // 判断是否有某个权限（基于服务端授权，禁止硬编码特权）
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
