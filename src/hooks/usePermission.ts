import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../utils/supabase'
import { hasPermission as checkPermission } from '../types/permission'

// ==================== 权限 Hook ====================

export const usePermission = () => {
  const [permissions, setPermissions] = useState<string[]>([])
  const [role, setRole] = useState<string>('')
  const [loading, setLoading] = useState(true)

  // 加载当前用户的权限列表
  const loadPermissions = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) {
        setPermissions([])
        setRole('')
        setLoading(false)
        return
      }

      // 从 user_metadata 或 app_metadata 获取角色
      const userMetadata = session.user.user_metadata || {}
      const appMetadata = session.user.app_metadata || {}
      const userRole = (userMetadata.role || appMetadata.role || '') as string
      setRole(userRole)

      // 超级管理员直接拥有所有权限
      if (userRole === 'super_admin') {
        const { data: allPerms } = await supabase
          .from('permissions')
          .select('name')
        setPermissions(allPerms?.map(p => p.name) || [])
        setLoading(false)
        return
      }

      // 其他角色从数据库查询权限列表
      const { data: roleData } = await supabase
        .from('roles')
        .select('id')
        .eq('code', userRole)
        .single()

      if (!roleData) {
        setPermissions([])
        setLoading(false)
        return
      }

      const { data: rolePerms } = await supabase
        .from('role_permissions')
        .select('permission_id')
        .eq('role_id', roleData.id)

      if (!rolePerms || rolePerms.length === 0) {
        setPermissions([])
        setLoading(false)
        return
      }

      const permissionIds = rolePerms.map(rp => rp.permission_id)
      const { data: permData } = await supabase
        .from('permissions')
        .select('name')
        .in('id', permissionIds)

      setPermissions(permData?.map(p => p.name) || [])
    } catch (error) {
      console.error('[usePermission] 加载权限失败:', error)
      setPermissions([])
    } finally {
      setLoading(false)
    }
  }, [])

  // 判断是否有某个权限
  const hasPermission = useCallback((permissionName: string): boolean => {
    if (role === 'super_admin') return true
    return checkPermission(permissions, permissionName)
  }, [permissions, role])

  // 判断是否有任意一个权限
  const hasAnyPermission = useCallback((permissionNames: string[]): boolean => {
    if (role === 'super_admin') return true
    return permissionNames.some(name => permissions.includes(name))
  }, [permissions, role])

  // 判断是否有所有指定权限
  const hasAllPermissions = useCallback((permissionNames: string[]): boolean => {
    if (role === 'super_admin') return true
    return permissionNames.every(name => permissions.includes(name))
  }, [permissions, role])

  // 菜单可见性判断（有菜单权限或菜单下任意操作权限）
  const hasMenuPermission = useCallback((menuPermissionName: string, actionPermissions: string[]): boolean => {
    if (role === 'super_admin') return true
    if (permissions.includes(menuPermissionName)) return true
    return actionPermissions.some(name => permissions.includes(name))
  }, [permissions, role])

  // 快捷判断
  const isSuperAdmin = useCallback(() => role === 'super_admin', [role])
  const isAdmin = useCallback(() => role === 'super_admin' || role === 'admin', [role])

  useEffect(() => {
    loadPermissions()

    // 监听 Auth 状态变化
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (session?.user) {
          loadPermissions()
        } else {
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
    reload: loadPermissions,
  }
}
