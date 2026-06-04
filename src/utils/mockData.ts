import type { Role, Permission, RolePermission, RoleWithPermissions } from '../types/permission'

// ==================== 角色数据 ====================

export const mockRoles: Role[] = [
  {
    id: 1,
    name: 'user',
    display_name: '普通用户',
    description: '普通用户，拥有基本的查看和编辑自己数据的权限',
    level: 1,
    created_at: '2024-01-01 00:00:00',
  },
  {
    id: 2,
    name: 'admin',
    display_name: '管理员',
    description: '管理员，可以管理用户和大部分数据',
    level: 2,
    created_at: '2024-01-01 00:00:00',
  },
  {
    id: 3,
    name: 'super_admin',
    display_name: '超级管理员',
    description: '超级管理员，拥有所有权限',
    level: 3,
    created_at: '2024-01-01 00:00:00',
  },
]

// 权限模块定义
const permissionModules = [
  { module: 'users', displayName: '用户管理' },
  { module: 'expenses', displayName: '消费记录' },
  { module: 'moods', displayName: '心情日记' },
  { module: 'weights', displayName: '体重记录' },
  { module: 'notes', displayName: '笔记本' },
  { module: 'novels', displayName: '小说书架' },
  { module: 'versions', displayName: '版本管理' },
  { module: 'system', displayName: '系统设置' },
]

const permissionActions = [
  { action: 'read', displayName: '查看' },
  { action: 'write', displayName: '编辑' },
  { action: 'delete', displayName: '删除' },
]

// 生成所有权限
let permissionId = 1
export const mockPermissions: Permission[] = permissionModules.flatMap(({ module }) =>
  permissionActions.map(({ action, displayName }) => ({
    id: permissionId++,
    name: `${module}:${action}`,
    display_name: `${permissionModules.find(m => m.module === module)!.displayName}${displayName}`,
    module,
    action,
    description: null,
    created_at: '2024-01-01 00:00:00',
  }))
)

// 角色权限关联数据
export const mockRolePermissions: RolePermission[] = [
  // 普通用户权限 (role_id: 1)
  { role_id: 1, permission_id: 4 }, // expenses:read
  { role_id: 1, permission_id: 5 }, // expenses:write
  { role_id: 1, permission_id: 7 }, // moods:read
  { role_id: 1, permission_id: 8 }, // moods:write
  { role_id: 1, permission_id: 10 }, // weights:read
  { role_id: 1, permission_id: 11 }, // weights:write
  { role_id: 1, permission_id: 13 }, // notes:read
  { role_id: 1, permission_id: 14 }, // notes:write
  { role_id: 1, permission_id: 16 }, // novels:read

  // 管理员权限 (role_id: 2)
  { role_id: 2, permission_id: 1 }, // users:read
  { role_id: 2, permission_id: 2 }, // users:write
  { role_id: 2, permission_id: 3 }, // users:delete
  { role_id: 2, permission_id: 4 }, // expenses:read
  { role_id: 2, permission_id: 5 }, // expenses:write
  { role_id: 2, permission_id: 6 }, // expenses:delete
  { role_id: 2, permission_id: 7 }, // moods:read
  { role_id: 2, permission_id: 8 }, // moods:write
  { role_id: 2, permission_id: 9 }, // moods:delete
  { role_id: 2, permission_id: 10 }, // weights:read
  { role_id: 2, permission_id: 11 }, // weights:write
  { role_id: 2, permission_id: 12 }, // weights:delete
  { role_id: 2, permission_id: 13 }, // notes:read
  { role_id: 2, permission_id: 14 }, // notes:write
  { role_id: 2, permission_id: 15 }, // notes:delete
  { role_id: 2, permission_id: 16 }, // novels:read
  { role_id: 2, permission_id: 17 }, // novels:write
  { role_id: 2, permission_id: 18 }, // novels:delete
  { role_id: 2, permission_id: 19 }, // versions:read
  { role_id: 2, permission_id: 20 }, // versions:write

  // 超级管理员权限 (role_id: 3) - 所有权限
  ...mockPermissions.map(p => ({ role_id: 3, permission_id: p.id })),
]

// 获取带权限的角色数据
export const getRolesWithPermissions = (): RoleWithPermissions[] => {
  return mockRoles.map(role => ({
    ...role,
    permissions: mockRolePermissions
      .filter(rp => rp.role_id === role.id)
      .map(rp => mockPermissions.find(p => p.id === rp.permission_id)!)
      .filter(Boolean),
  }))
}

// ==================== 消费分类选项 ====================

export const EXPENSE_CATEGORY_OPTIONS = [
  { label: '餐饮', value: '餐饮' },
  { label: '交通', value: '交通' },
  { label: '购物', value: '购物' },
  { label: '娱乐', value: '娱乐' },
  { label: '其他', value: '其他' },
]

// ==================== 数据分析类型定义 ====================

export interface AnalyticsKeyMetrics {
  totalUsers: number
  todayNewUsers: number
  activeUsers: number
  totalExpense: number
  avgExpense: number
  totalNotes: number
  totalDiaries: number
  novelReadCount: number
}

export interface UserTrendItem {
  date: string
  count: number
  cumulative: number
}

export interface UserActivityItem {
  date: string
  DAU: number
  WAU: number
  MAU: number
}

export interface RetentionRate {
  period: string
  rate: number
  userCount: number
}

export interface UserDistribution {
  name: string
  value: number
  color: string
}

export interface ExpenseCategoryItem {
  name: string
  value: number
  color: string
}

export interface ExpenseTrendItem {
  date: string
  amount: number
}

export interface MoodTrendItem {
  date: string
  开心: number
  平静: number
  一般: number
  难过: number
  焦虑: number
}

export interface WeightAnalyticsItem {
  date: string
  avgWeight: number
  avgBMI: number
}

export interface NoteActivityItem {
  date: string
  count: number
}
