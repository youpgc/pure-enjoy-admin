import { supabase, reportError, logOperation } from './supabase'
import { message } from 'antd'
import { formatSupabaseErrorMessage } from './errorCode'
/// Supabase 查询构建器类型
// PostgrestQueryBuilder 类型依赖 @supabase/postgrest-js 内部导出，
// 在不同 Supabase 版本间路径不稳定，这里使用 any 以保持兼容性。
// 如需强类型可改用 PostgrestQueryBuilder<GenericTable, GenericSchema, T>，
// 但需根据实际安装的 @supabase/supabase-js 版本确认导入路径。
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseQuery = any

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

/// 统一 Supabase 错误码映射（委托 errorCode.formatSupabaseErrorMessage，单一源，消除 P2-4 重复）
export function mapSupabaseError(error: any): string {
  return formatSupabaseErrorMessage(error)
}

/// 统一异常处理：打印 + 提示 + 记录错误日志
export function handleApiError(error: unknown, context?: string): string {
  const msg = error instanceof Error ? error.message : mapSupabaseError(error)
  console.error(`[API${context ? ` - ${context}` : ''}]`, error)
  message.error(msg)
  // 避免在 error_logs 相关操作的错误处理中递归调用 reportError
  if (context && !context.includes('ErrorLogs') && !context.includes('error_logs')) {
    reportError('error', context || 'api', msg, undefined, error instanceof Error ? error : undefined)
  }
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
    private options?: { defaultOrder?: { column: string; ascending?: boolean }; select?: string }
  ) {}

  // 不参与自动审计的表：日志类自身（避免递归）+ users（已有精细化日志）
  private static readonly AUDIT_EXCLUDED = new Set<string>([
    'operation_logs',
    'error_logs',
    'login_logs',
    'users',
  ])

  /// 解析实际 select 列：未配置时回退 '*'，开发环境告警提示显式配置（审查报告 P2-8）
  private resolvedSelect(): string {
    if (!this.options?.select && import.meta.env.DEV) {
      console.warn(
        `[BaseService] 表 "${this.tableName}" 未配置 select，将拉取全列（增大传输与脱敏面）。` +
        `建议构造 BaseService 时传 options.select 显式指定列。`
      )
    }
    return this.options?.select || '*'
  }

  /// 操作审计（best-effort，不阻塞主流程）：写入 operation_logs
  /// 审查 P3-3：target_id 存储为数组（而非逗号拼接字符串），便于事后按 id 关联
  private audit(action: string, targetId: string | number | Array<string | number>, detail?: object) {
    if (BaseService.AUDIT_EXCLUDED.has(this.tableName)) return
    const targetIdArray = Array.isArray(targetId)
      ? targetId.map(String)
      : [String(targetId)]
    logOperation({
      action,
      module: this.tableName,
      target_id: targetIdArray,
      detail,
    }).catch(() => {})
  }

  /// 查询列表
  async findAll(
    query?: (q: SupabaseQuery) => SupabaseQuery
  ): Promise<ApiResponse<T[]>> {
    try {
      let q = supabase.from(this.tableName).select(this.resolvedSelect())
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
        .select(this.resolvedSelect())
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
    query?: (q: SupabaseQuery) => SupabaseQuery
  ): Promise<ApiResponse<{ data: T[]; total: number }>> {
    try {
      const from = (page - 1) * pageSize
      const to = from + pageSize - 1
      let q = supabase.from(this.tableName).select(this.resolvedSelect(), { count: 'exact', head: false })
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
      this.audit('create', (result as { id?: string | number } | null)?.id ?? '', data as object)
      return successResponse(result)
    } catch (err) {
      return errorResponse(handleApiError(err, `${this.tableName}.create`))
    }
  }

  /// 更新
  async update(id: string | number, data: Partial<T>): Promise<ApiResponse<boolean>> {
    try {
      const { data: result, error } = await (supabase.from(this.tableName) as any)
        .update(data)
        .eq('id', id)
        .select()
      if (error) throw error
      if (!result || (Array.isArray(result) && result.length === 0)) {
        return errorResponse('更新失败：未匹配到任何记录（可能无权限）')
      }
      this.audit('update', id, { changes: data })
      return successResponse(true)
    } catch (err) {
      return errorResponse(handleApiError(err, `${this.tableName}.update`))
    }
  }

  /// 删除
  async delete(id: string | number): Promise<ApiResponse<boolean>> {
    try {
      // 删除前抓取被删记录快照，写入审计以便追溯「删除了什么」（best-effort，失败不影响删除）
      let snapshot: Record<string, unknown> | null = null
      try {
        const before = await (supabase.from(this.tableName) as any)
          .select(this.options?.select || '*')
          .eq('id', id)
          .maybeSingle()
        snapshot = ((before?.data as Record<string, unknown> | null) || null)
      } catch {
        snapshot = null
      }

      // PostgREST 删除 0 行命中时 data=[]、error=null，若不校验会静默返回 success=true。
      // 必须校验 affected rows，与 update/batchUpdate 对齐（审查报告 P1-1）
      const { data, error } = await supabase.from(this.tableName).delete().eq('id', id).select('id')
      if (error) throw error
      if (!data || data.length === 0) {
        return errorResponse('删除失败：未匹配到任何记录（可能无权限）')
      }
      this.audit('delete', id, snapshot ? { deleted: snapshot } : undefined)
      return successResponse(true)
    } catch (err) {
      return errorResponse(handleApiError(err, `${this.tableName}.delete`))
    }
  }

  /// 批量删除
  async batchDelete(ids: (string | number)[]): Promise<ApiResponse<boolean>> {
    try {
      // 删除前抓取被删记录快照（best-effort，失败不影响删除）
      let snapshots: Record<string, unknown>[] = []
      try {
        const before = await (supabase.from(this.tableName) as any)
          .select(this.options?.select || '*')
          .in('id', ids)
        snapshots = ((before?.data as Record<string, unknown>[] | null) || null) || []
      } catch {
        snapshots = []
      }

      // 同 delete：校验 affected rows，避免 0 行命中静默成功（审查报告 P1-1）
      const { data, error } = await supabase.from(this.tableName).delete().in('id', ids).select('id')
      if (error) throw error
      if (!data || data.length === 0) {
        return errorResponse('批量删除失败：未匹配到任何记录（可能无权限）')
      }
      this.audit('batch_delete', ids, { count: data.length, deleted: snapshots })
      return successResponse(true)
    } catch (err) {
      return errorResponse(handleApiError(err, `${this.tableName}.batchDelete`))
    }
  }

  /// 批量更新
  async batchUpdate(ids: (string | number)[], data: Partial<T>): Promise<ApiResponse<boolean>> {
    try {
      const { data: result, error } = await (supabase.from(this.tableName) as any)
        .update(data)
        .in('id', ids)
        .select()
      if (error) throw error
      if (!result || (Array.isArray(result) && result.length === 0)) {
        return errorResponse('批量更新失败：未匹配到任何记录（可能无权限）')
      }
      this.audit('batch_update', ids, { count: ids.length, changes: data })
      return successResponse(true)
    } catch (err) {
      return errorResponse(handleApiError(err, `${this.tableName}.batchUpdate`))
    }
  }
}

/// 快捷查询：直接执行 supabase 查询并统一处理错误
export async function apiQuery<T = any>(
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
