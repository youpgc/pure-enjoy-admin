// 角色与角色-权限关联的数据访问层
// 集中管理 roles / role_permissions 的写操作，避免在页面组件中裸写 supabase.from（治理红线：页面只渲染，数据走 services）
import { supabase } from '../utils/supabase'
import type { Role } from '../types/permission'

export const roleService = {
  /// 更新角色
  updateRole: (id: number, data: Partial<Role>) =>
    (supabase.from('roles') as any).update(data).eq('id', id),

  /// 新增角色并返回含 id 的记录
  createRole: (data: Record<string, unknown>) =>
    (supabase.from('roles') as any).insert(data).select().single(),

  /// 删除指定角色的全部权限关联（保留：新增角色清场等场景）
  deleteRolePermissions: (roleId: number) =>
    supabase.from('role_permissions').delete().eq('role_id', roleId),

  /// 只删除指定权限关联（编辑角色 diff 更新用，避免全删重插的中途失败清空风险）
  deleteRolePermissionsByIds: (roleId: number, permissionIds: number[]) =>
    supabase
      .from('role_permissions')
      .delete()
      .eq('role_id', roleId)
      .in('permission_id', permissionIds),

  /// 批量新增权限关联
  createRolePermissions: (rolePerms: { role_id: number; permission_id: number }[]) =>
    (supabase.from('role_permissions') as any).insert(rolePerms),
}
