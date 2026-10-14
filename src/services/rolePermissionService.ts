import { apiRequest } from '../utils/adminHttp'
import type { Permission, Role } from '../types/permission'
import type { RoleVO } from './roleService'

/// 后端 PermissionTreeVO 形态（children 递归）
interface PermissionTreeVO {
  id: number
  name: string
  display_name: string
  type: string
  parent_id: number | null
  module: string | null
  sort_order: number
  description: string | null
  children: PermissionTreeVO[]
}

/// 树结构拍平为页面所需的扁平权限列表（保持服务端排序语义：父先子后）
function flattenTree(nodes: PermissionTreeVO[], out: Permission[]): void {
  for (const n of nodes) {
    out.push({
      id: n.id,
      name: n.name,
      display_name: n.display_name,
      type: n.type,
      parent_id: n.parent_id,
      module: n.module,
      sort_order: n.sort_order,
      description: n.description,
    } as Permission)
    if (n.children?.length) flattenTree(n.children, out)
  }
}

/// 角色权限管理服务 —— 本地后端 rbac 端点
class RolePermissionService {
  /// 查询角色列表（按 id 升序，与后端排序一致）
  async findAllRoles() {
    try {
      const roles = await apiRequest<RoleVO[]>('GET', '/admin/roles')
      return { success: true as const, data: (roles || []) as unknown as Role[] }
    } catch (err) {
      return { success: false as const, data: [] as unknown as Role[], errorMessage: String(err) }
    }
  }

  /// 查询权限列表（服务端树拍平）
  async findAllPermissions() {
    try {
      const tree = await apiRequest<PermissionTreeVO[]>('GET', '/admin/permissions/tree')
      const flat: Permission[] = []
      flattenTree(tree || [], flat)
      return { success: true as const, data: flat }
    } catch (err) {
      return { success: false as const, data: [] as Permission[], errorMessage: String(err) }
    }
  }

  /// 查询角色的权限 ID 列表
  async findRolePermissions(roleId: number) {
    try {
      const detail = await apiRequest<{ permission_ids: number[] }>(
        'GET',
        `/admin/roles/${roleId}/permissions`
      )
      return {
        success: true as const,
        data: (detail?.permission_ids ?? []).map((id) => String(id)),
      }
    } catch {
      return { success: false as const, data: [] as string[] }
    }
  }

  /// 更新角色的权限（服务端单事务整体替换，替代旧「先删后插」两段式）
  async updateRolePermissions(roleId: number, permissionIds: string[]) {
    try {
      await apiRequest('PUT', `/admin/roles/${roleId}/permissions`, {
        permission_ids: permissionIds.map((pid) => Number(pid)),
      })
      return { success: true as const }
    } catch {
      return { success: false as const }
    }
  }
}

export const rolePermissionService = new RolePermissionService()
