import { supabase, reportError } from './supabase'
import { message } from 'antd'

/// 统一 API 响应封装
export interface ApiResponse<T> {
  success: boolean
  data: T | null
  errorMessage: string | null
  statusCode: number | null
}

function successResponse<T>(data: T, statusCode?: number): ApiResponse<T> {
  return { success: true, data, errorMessage: null, statusCode: statusCode ?? 200 }
}

function errorResponse<T>(msg: string, statusCode?: number): ApiResponse<T> {
  return { success: false, data: null, errorMessage: msg, statusCode: statusCode ?? 500 }
}

/// 统一 Supabase 错误码映射
export function mapSupabaseError(error: any): string {
  const codeMap: Record<string, string> = {
    PGRST116: '数据不存在或已被删除',
    PGRST301: '没有权限执行此操作',
    '23505': '数据已存在（唯一性冲突）',
    '23503': '关联数据不存在（外键约束）',
    '42501': '没有权限执行此操作',
  }
  const code = error?.code as string | undefined
  if (code && codeMap[code]) return codeMap[code]
  if (error?.message?.includes('JWT')) return '认证已过期，请重新登录'
  if (error?.message?.includes('network')) return '网络连接失败，请检查网络'
  return error?.message || '操作失败，请稍后重试'
}

/// 统一异常处理：打印 + 提示 + 记录错误日志
export function handleApiError(error: unknown, context?: string): string {
  const msg = error instanceof Error ? error.message : mapSupabaseError(error)
  console.error(`[API${context ? ` - ${context}` : ''}]`, error)
  message.error(msg)
  reportError('error', context || 'api', msg, undefined, error instanceof Error ? error : undefined)
  return msg
}

/// 内部错误处理：记录日志但不弹消息（保留供非 UI 层使用）
export function logApiError(error: unknown, context: string): string {
  const msg = mapSupabaseError(error)
  console.error(`[API - ${context}]`, error)
  reportError('error', context, msg, undefined, error instanceof Error ? error : undefined)
  return msg
}

/// 通用 Service 基类
export class BaseService<T extends Record<string, any>> {
  constructor(
    private tableName: string,
    private options?: { defaultOrder?: { column: string; ascending?: boolean } }
  ) {}

  /// 查询列表
  async findAll(
    query?: (q: any) => any
  ): Promise<ApiResponse<T[]>> {
    try {
      let q = supabase.from(this.tableName).select('*')
      if (query) q = query(q)
      if (this.options?.defaultOrder) {
        q = q.order(this.options.defaultOrder.column, {
          ascending: this.options.defaultOrder.ascending ?? false,
        })
      }
      const { data, error } = await q
      if (error) throw error
      return successResponse(data || [])
    } catch (err) {
      return errorResponse(handleApiError(err, `${this.tableName}.findAll`))
    }
  }

  /// 根据 ID 查询单条
  async findById(id: string | number): Promise<ApiResponse<T>> {
    try {
      const { data, error } = await supabase
        .from(this.tableName)
        .select('*')
        .eq('id', id)
        .single()
      if (error) throw error
      return successResponse(data)
    } catch (err) {
      return errorResponse(handleApiError(err, `${this.tableName}.findById`))
    }
  }

  /// 分页查询
  async paginate(
    page: number,
    pageSize: number,
    query?: (q: any) => any
  ): Promise<ApiResponse<{ data: T[]; total: number }>> {
    try {
      const from = (page - 1) * pageSize
      const to = from + pageSize - 1
      let q = supabase.from(this.tableName).select('*', { count: 'exact', head: false })
      if (query) q = query(q)
      q = q.order(this.options?.defaultOrder?.column || 'created_at', {
        ascending: this.options?.defaultOrder?.ascending ?? false,
      } as any).range(from, to)
      const { data, count, error } = await q
      if (error) throw error
      return successResponse({ data: data || [], total: count || 0 })
    } catch (err) {
      return errorResponse(handleApiError(err, `${this.tableName}.paginate`))
    }
  }

  /// 创建
  async create(data: Omit<T, 'id' | 'created_at'>): Promise<ApiResponse<T>> {
    try {
      const { data: result, error } = await supabase
        .from(this.tableName)
        .insert(data as any)
        .select()
        .single()
      if (error) throw error
      return successResponse(result)
    } catch (err) {
      return errorResponse(handleApiError(err, `${this.tableName}.create`))
    }
  }

  /// 更新
  async update(id: string | number, data: Partial<T>): Promise<ApiResponse<boolean>> {
    try {
      const { error } = await supabase.from(this.tableName).update(data as any).eq('id', id)
      if (error) throw error
      return successResponse(true)
    } catch (err) {
      return errorResponse(handleApiError(err, `${this.tableName}.update`))
    }
  }

  /// 删除
  async delete(id: string | number): Promise<ApiResponse<boolean>> {
    try {
      const { error } = await supabase.from(this.tableName).delete().eq('id', id)
      if (error) throw error
      return successResponse(true)
    } catch (err) {
      return errorResponse(handleApiError(err, `${this.tableName}.delete`))
    }
  }

  /// 批量删除
  async batchDelete(ids: (string | number)[]): Promise<ApiResponse<boolean>> {
    try {
      const { error } = await supabase.from(this.tableName).delete().in('id', ids)
      if (error) throw error
      return successResponse(true)
    } catch (err) {
      return errorResponse(handleApiError(err, `${this.tableName}.batchDelete`))
    }
  }

  /// 批量更新
  async batchUpdate(ids: (string | number)[], data: Partial<T>): Promise<ApiResponse<boolean>> {
    try {
      const { error } = await supabase.from(this.tableName).update(data as any).in('id', ids)
      if (error) throw error
      return successResponse(true)
    } catch (err) {
      return errorResponse(handleApiError(err, `${this.tableName}.batchUpdate`))
    }
  }
}

/// 快捷查询：直接执行 supabase 查询并统一处理错误
export async function apiQuery<T>(
  queryFn: () => any,
  context?: string
): Promise<ApiResponse<T> & { count?: number | null }> {
  try {
    const { data, error, count } = await queryFn()
    if (error) throw error
    return { ...successResponse(data as T), count }
  } catch (err) {
    const msg = handleApiError(err, context)
    return { ...errorResponse(msg), count: null }
  }
}

/// 快捷执行：直接执行 supabase 操作并统一处理错误（无返回数据）
export async function apiExecute(
  queryFn: () => any,
  context?: string
): Promise<ApiResponse<boolean>> {
  try {
    const { error } = await queryFn()
    if (error) throw error
    return successResponse(true)
  } catch (err) {
    const msg = handleApiError(err, context)
    return errorResponse(msg)
  }
}
