// 角色与角色-权限关联的数据访问层 —— 本地后端 rbac 端点
// 数据源：/admin/roles（列表/CRUD/授权），授权为整体替换（单事务原子，替代旧「diff 删插」两段式）
import { apiRequest } from '../utils/adminHttp'
import type { Role } from '../types/permission'

/// 后端 RoleVO 形态（SNAKE_CASE）
export interface RoleVO {
  id: number
  name: string
  code: string
  description: string | null
  is_system: boolean
  status: string
  created_at: string
}

/// 后端 RoleDetailVO 形态（附带已授权权限 ID）
export interface RoleDetailVO {
  id: number
  permission_ids: number[]
}

export const roleService = {
  /// 角色列表
  listRoles: () => apiRequest<RoleVO[]>('GET', '/admin/roles'),

  /// 更新角色（name/description/status；code 不可变更）
  updateRole: async (id: number, data: Partial<Role>) => {
    await apiRequest<RoleVO>('PUT', `/admin/roles/${id}`, data)
    return { data: null, error: null }
  },

  /// 新增角色，返回含 id 的记录
  createRole: async (data: Record<string, unknown>) => {
    const vo = await apiRequest<RoleVO>('POST', '/admin/roles', data)
    return { data: vo as unknown as Role, error: null }
  },

  /// 删除角色（系统内建角色由服务端拦截）
  deleteRole: async (id: number) => {
    await apiRequest<void>('DELETE', `/admin/roles/${id}`)
    return { error: null }
  },

  /// 查询角色已授权权限 ID 列表
  getRolePermissions: async (roleId: number) => {
    const detail = await apiRequest<RoleDetailVO>('GET', `/admin/roles/${roleId}/permissions`)
    return detail?.permission_ids ?? []
  },

  /// 整体替换角色授权（单事务：先清空再插入，服务端保证原子性与权限 ID 有效性）
  replaceRolePermissions: async (roleId: number, permissionIds: number[]) => {
    await apiRequest<RoleDetailVO>('PUT', `/admin/roles/${roleId}/permissions`, {
      permission_ids: permissionIds,
    })
    return { error: null }
  },
}
