import { useMemo } from 'react'
import { useAuth } from '../context/auth'
import { ROLE_PERMISSIONS } from '../types/auth'

export const usePermission = () => {
  const { user } = useAuth()

  const permissions = useMemo(() => {
    if (!user) return []
    return ROLE_PERMISSIONS[user.role] || []
  }, [user])

  const hasPermission = (permission: string): boolean => {
    return permissions.includes(permission)
  }

  const canManageUsers = hasPermission('manage_users')
  const canManageVersions = hasPermission('manage_versions')
  const canManageData = hasPermission('manage_data')
  const canViewData = hasPermission('view_data')

  return {
    permissions,
    hasPermission,
    canManageUsers,
    canManageVersions,
    canManageData,
    canViewData,
  }
}
