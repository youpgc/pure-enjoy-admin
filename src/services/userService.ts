import { BaseService } from '../utils/apiClient'
import type { User } from '../types/user'

/// 用户管理服务（封装 users 表的 CRUD，替代页面层直接调用 supabase）
class UserService extends BaseService<User> {
  constructor() {
    super('users', { defaultOrder: { column: 'created_at', ascending: false } })
  }

  /// 分页查询用户列表（带搜索和过滤）
  async paginateUsers(
    page: number,
    pageSize: number,
    options?: {
      searchText?: string
      role?: string
      status?: string
      memberLevel?: string
      dateRange?: [string, string] | null
    }
  ) {
    return this.paginate(page, pageSize, (q) => {
      let builder = q.eq('is_deleted', false)
      if (options?.searchText) {
        const text = `%${options.searchText}%`
        builder = builder.or(
          `email.ilike.${text},username.ilike.${text},nickname.ilike.${text},phone.ilike.${text}`
        )
      }
      if (options?.role) builder = builder.eq('role', options.role)
      if (options?.status) builder = builder.eq('status', options.status)
      if (options?.memberLevel) builder = builder.eq('member_level', options.memberLevel)
      if (options?.dateRange?.[0]) {
        builder = builder.gte('created_at', options.dateRange[0])
      }
      if (options?.dateRange?.[1]) {
        builder = builder.lte('created_at', options.dateRange[1])
      }
      return builder
    })
  }

  /// 软删除用户（禁用）
  async softDelete(id: string): Promise<ReturnType<BaseService<User>['update']>> {
    return this.update(id, {
      status: 'disabled',
      updated_at: new Date().toISOString(),
    } as Partial<User>)
  }

  /// 批量软删除
  async batchSoftDelete(ids: string[]): Promise<ReturnType<BaseService<User>['batchUpdate']>> {
    return this.batchUpdate(
      ids,
      { status: 'disabled', updated_at: new Date().toISOString() } as Partial<User>
    )
  }

  /// 切换用户状态
  async toggleStatus(id: string, newStatus: string) {
    return this.update(id, { status: newStatus, updated_at: new Date().toISOString() } as Partial<User>)
  }
}

export const userService = new UserService()
