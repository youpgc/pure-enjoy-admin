import { BaseService } from '../utils/apiClient'
import { supabase } from '../utils/supabase'
import type { Database } from '../types/database'

type RoleRow = Database['public']['Tables']['roles']['Row']
type PermissionRow = Database['public']['Tables']['permissions']['Row']

/// 角色权限管理服务（封装 roles / permissions / role_permissions 的 CRUD）
class RolePermissionService {
  private roleService = new BaseService<RoleRow>('roles', {
    defaultOrder: { column: 'created_at', ascending: false },
  })
  private permissionService = new BaseService<PermissionRow>('permissions', {
    defaultOrder: { column: 'created_at', ascending: false },
  })

  /// 查询角色列表
  async findAllRoles() {
    return this.roleService.findAll()
  }

  /// 查询权限列表
  async findAllPermissions() {
    return this.permissionService.findAll()
  }

  /// 查询角色的权限列表
  async findRolePermissions(roleId: number) {
    try {
      const { data, error } = await supabase
        .from('role_permissions')
        .select('permission_id')
        .eq('role_id', roleId)
      if (error) throw error
      return { success: true as const, data: ((data || []) as Array<{ permission_id: number }>).map(r => String(r.permission_id)) }
    } catch (err) {
      return { success: false as const, data: [] as string[] }
    }
  }

  /// 更新角色的权限（先删除再插入）
  async updateRolePermissions(roleId: number, permissionIds: string[]) {
    try {
      // 删除旧权限
      const { error: deleteError } = await supabase
        .from('role_permissions')
        .delete()
        .eq('role_id', roleId)
      if (deleteError) throw deleteError

      // 插入新权限
      if (permissionIds.length > 0) {
        const records = permissionIds.map((pid) => ({
          role_id: roleId,
          permission_id: Number(pid),
        }))
        // TODO: Supabase type inference issue - role_permissions Insert resolves to never
        const { error: insertError } = await (supabase.from('role_permissions') as any)
          .insert(records)
        if (insertError) throw insertError
      }
      return { success: true as const }
    } catch (err) {
      return { success: false as const }
    }
  }
}

export const rolePermissionService = new RolePermissionService()
