import { apiQuery } from '../utils/apiClient'
import { supabase } from '../utils/supabase'
import type { Database } from '../types/database'

type RoleRow = Database['public']['Tables']['roles']['Row']
type PermissionRow = Database['public']['Tables']['permissions']['Row']

/// 角色权限管理服务（封装 roles / permissions / role_permissions 的 CRUD）
class RolePermissionService {
  /// 查询角色列表（按 id 升序，角色权限页展示口径）
  async findAllRoles() {
    return apiQuery<RoleRow[]>(
      () =>
        supabase
          .from('roles')
          .select('id, name, code, description, is_system, status, created_at, updated_at')
          .order('id'),
      'RolePermission-加载角色'
    )
  }

  /// 查询权限列表（按 sort_order 升序，角色权限页展示口径）
  async findAllPermissions() {
    return apiQuery<PermissionRow[]>(
      () =>
        supabase
          .from('permissions')
          .select('id, name, display_name, type, parent_id, sort_order, module, description, created_at')
          .order('sort_order'),
      'RolePermission-加载权限'
    )
  }

  /// 查询角色已关联的权限 id 列表
  async findRolePermissions(roleId: number) {
    const res = await apiQuery<Array<{ permission_id: number }>>(
      () =>
        supabase
          .from('role_permissions')
          .select('permission_id')
          .eq('role_id', roleId),
      'RolePermission-加载角色权限'
    )
    return { ...res, data: res.data?.map((r) => r.permission_id) ?? [] }
  }
}

export const rolePermissionService = new RolePermissionService()
