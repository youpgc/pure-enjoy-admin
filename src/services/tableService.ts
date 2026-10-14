// 本地受控表访问基类（批 2-7，替代原 apiClient.BaseService 直连 Supabase）
// 通道：后端通用表层 /admin/table/{table}/**（表白名单 + 列白名单 + 操作符白名单 + 参数化）。
// 八法签名与原 BaseService 完全一致，页面零改动；页面传入的链式查询回调由
// LocalQuery 迷你构建器承接（只记录过滤条件，序列化为后端 where JSON）。
import { apiRequest } from '../utils/adminHttp'
import { successResponse, errorResponse, handleApiError, type ApiResponse } from '../utils/apiClient'
import { logOperation } from '../utils/errorReport'

/// 单个过滤条件（col + op + val），对应后端 buildWhere 的白名单操作符
interface Cond {
  col: string
  op: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'like' | 'ilike' | 'in' | 'is'
  val?: unknown
  glue?: 'and' | 'or'
}

/**
 * 迷你查询构建器：模拟 supabase 链式 API，页面回调 (q) => q.eq(...) 零改动。
 * select/range/limit/single 等非过滤方法做 no-op 兼容（列裁剪由 service 的
 * select 配置下发 cols；分页由 paginate 统一控制，不在回调里改写）。
 */
export class LocalQuery {
  private conds: Cond[] = []
  private orderSpec?: { column: string; ascending?: boolean }

  private push(op: Cond['op'], col: string, val?: unknown) {
    this.conds.push({ col, op, val })
    return this
  }

  eq(col: string, val: unknown) { return this.push('eq', col, val) }
  neq(col: string, val: unknown) { return this.push('neq', col, val) }
  gt(col: string, val: unknown) { return this.push('gt', col, val) }
  gte(col: string, val: unknown) { return this.push('gte', col, val) }
  lt(col: string, val: unknown) { return this.push('lt', col, val) }
  lte(col: string, val: unknown) { return this.push('lte', col, val) }
  like(col: string, val: unknown) { return this.push('like', col, val) }
  ilike(col: string, val: unknown) { return this.push('ilike', col, val) }
  in(col: string, vals: unknown[]) { return this.push('in', col, vals) }
  /// 仅支持 IS NULL（与后端白名单一致）
  is(col: string, _val: unknown) { return this.push('is', col) }

  /// 兼容 Supabase `.or('col.op.val,col2.op.val2')` 平铺 OR 字符串语法。
  /// 支持 ilike/like（通配符 * → %）与 eq/neq/gt/gte/lt/lte 原样值；
  /// 与 AND 条件混用时后端会把连续 OR 折叠为括号分组（等价 PostgREST a AND (b OR c)）。
  or(expr: string) {
    for (const part of expr.split(',')) {
      const m = part.match(/^([a-z_][a-z0-9_]*)\.(ilike|like|eq|neq|gt|gte|lt|lte)\.(.*)$/)
      if (!m) continue
      const [, col, op, raw = ''] = m
      const val = op === 'ilike' || op === 'like' ? raw.replace(/\*/g, '%') : raw
      this.conds.push({ col, op: op as Cond['op'], val, glue: 'or' } as Cond)
    }
    return this
  }

  /// 追加 OR 连接的平铺条件（与 Supabase `.or('a.ilike..,b.ilike..')` 平铺 OR 语义一致；
  /// 与 AND 条件混用时后端折叠为括号分组）
  orFlat(conds: Array<{ col: string; op: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'like' | 'ilike'; val: unknown }>) {
    for (const c of conds) {
      this.conds.push({ col: c.col, op: c.op, val: c.val, glue: 'or' } as Cond)
    }
    return this
  }

  /// 记录排序（findAll 生效；paginate 由 defaultOrder 接管，与原 BaseService 行为一致）
  order(column: string, opts?: { ascending?: boolean }) {
    this.orderSpec = { column, ascending: opts?.ascending }
    return this
  }

  // no-op 兼容方法（原 supabase 链式 API 中页面可能调用但不改变语义的部分）
  select(_cols?: string) { return this }
  range(_from: number, _to: number) { return this }
  limit(_n: number) { return this }
  single() { return this }
  maybeSingle() { return this }

  /// 序列化为后端 where JSON；空条件返回 undefined
  toWhereJson(): string | undefined {
    return this.conds.length ? JSON.stringify(this.conds) : undefined
  }

  getOrder(): { column: string; ascending: boolean } | undefined {
    if (!this.orderSpec) return undefined
    // supabase `.order(col)` 缺省 ascending=true，保持一致
    return { column: this.orderSpec.column, ascending: this.orderSpec.ascending ?? true }
  }
}

// 不参与自动审计的表：日志类自身（避免递归）+ users（已有精细化日志）
const AUDIT_EXCLUDED = new Set<string>(['operation_logs', 'error_logs', 'login_logs', 'users'])

export interface LocalBaseServiceOptions {
  defaultOrder?: { column: string; ascending?: boolean }
  /// 显式列裁剪（逗号分隔），经后端列白名单校验后下发 cols
  select?: string
}

export class LocalBaseService<T extends Record<string, any>> {
  constructor(
    private tableName: string,
    private options?: LocalBaseServiceOptions
  ) {}

  // ==================== 内部工具 ====================

  /// 解析 select 配置为 cols 列表（后端按列白名单逐列校验）
  private resolvedCols(): string[] | undefined {
    if (!this.options?.select) return undefined
    return this.options.select.split(',').map((s) => s.trim()).filter(Boolean)
  }

  private buildWhere(query?: (q: LocalQuery) => LocalQuery): string | undefined {
    return query ? query(new LocalQuery()).toWhereJson() : undefined
  }

  private buildQueryString(params: Record<string, string | number | boolean | undefined>): string {
    const sp = new URLSearchParams()
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== '') sp.set(k, String(v))
    }
    return sp.toString()
  }

  /// 操作审计（best-effort，不阻塞主流程）：写入本地后端 operation_logs
  private audit(action: string, targetId: string | number | Array<string | number>, detail?: object) {
    if (AUDIT_EXCLUDED.has(this.tableName)) return
    const targetIdArray = Array.isArray(targetId) ? targetId.map(String) : [String(targetId)]
    logOperation({
      action,
      module: this.tableName,
      target_id: targetIdArray,
      detail,
    }).catch(() => {})
  }

  // ==================== 八法（签名与原 BaseService 一致） ====================

  /// 查询列表（服务端上限 10000 行）
  async findAll(query?: (q: LocalQuery) => LocalQuery): Promise<ApiResponse<T[]>> {
    try {
      const q = query ? query(new LocalQuery()) : new LocalQuery()
      // 排序：回调内显式 order 优先，其次 defaultOrder（与原 BaseService 行为一致）
      const order = q.getOrder() ?? this.options?.defaultOrder
      const qs = this.buildQueryString({
        where: q.toWhereJson(),
        cols: this.resolvedCols()?.join(','),
        order: order?.column,
        // 后端 asc=true → ASC；ascending ?? false 与原 supabase `.order(col, {ascending})` 口径一致
        asc: order ? order.ascending ?? false : undefined,
      })
      const data = await apiRequest<T[]>('GET', `/admin/table/${this.tableName}/all${qs ? `?${qs}` : ''}`)
      return successResponse(data || [])
    } catch (err) {
      return errorResponse(handleApiError(err, `${this.tableName}.findAll`))
    }
  }

  /// 根据 ID 查询单条
  async findById(id: string | number): Promise<ApiResponse<T>> {
    try {
      const data = await apiRequest<T>('GET', `/admin/table/${this.tableName}/${encodeURIComponent(String(id))}`)
      return successResponse(data)
    } catch (err) {
      return errorResponse(handleApiError(err, `${this.tableName}.findById`))
    }
  }

  /// 分页查询（排序由 defaultOrder 接管，缺省不传则按库内自然序）
  async paginate(
    page: number,
    pageSize: number,
    query?: (q: LocalQuery) => LocalQuery
  ): Promise<ApiResponse<{ data: T[]; total: number }>> {
    try {
      // 排序与原 BaseService 一致：defaultOrder 优先，缺省回退 created_at DESC
      // （保证 LIMIT/OFFSET 分页稳定，避免跨页重复/漏行）
      const orderColumn = this.options?.defaultOrder?.column || 'created_at'
      const orderAscending = this.options?.defaultOrder?.ascending ?? false
      const qs = this.buildQueryString({
        where: this.buildWhere(query),
        cols: this.resolvedCols()?.join(','),
        order: orderColumn,
        asc: orderAscending,
        page,
        page_size: pageSize,
      })
      const data = await apiRequest<{ list: T[]; total: number }>(
        'GET',
        `/admin/table/${this.tableName}${qs ? `?${qs}` : ''}`
      )
      return successResponse({ data: data?.list || [], total: data?.total || 0 })
    } catch (err) {
      return errorResponse(handleApiError(err, `${this.tableName}.paginate`))
    }
  }

  /// 创建（后端 RETURNING * 返回整行）
  async create(data: Omit<T, 'id' | 'created_at'>): Promise<ApiResponse<T>> {
    try {
      const result = await apiRequest<T>('POST', `/admin/table/${this.tableName}`, data as Record<string, unknown>)
      this.audit('create', (result as { id?: string | number } | null)?.id ?? '', data as object)
      return successResponse(result)
    } catch (err) {
      return errorResponse(handleApiError(err, `${this.tableName}.create`))
    }
  }

  /// 更新（后端 0 行命中抛错，与原「未匹配到任何记录」口径一致）
  async update(id: string | number, data: Partial<T>): Promise<ApiResponse<boolean>> {
    try {
      const result = await apiRequest<{ affected: number }>(
        'PUT',
        `/admin/table/${this.tableName}/${encodeURIComponent(String(id))}`,
        data as Record<string, unknown>
      )
      if (!result || result.affected === 0) {
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
      const result = await apiRequest<{ affected: number }>(
        'DELETE',
        `/admin/table/${this.tableName}/${encodeURIComponent(String(id))}`
      )
      if (!result || result.affected === 0) {
        return errorResponse('删除失败：未匹配到任何记录（可能无权限）')
      }
      this.audit('delete', id)
      return successResponse(true)
    } catch (err) {
      return errorResponse(handleApiError(err, `${this.tableName}.delete`))
    }
  }

  /// 批量删除
  async batchDelete(ids: (string | number)[]): Promise<ApiResponse<boolean>> {
    try {
      const result = await apiRequest<{ affected: number }>(
        'POST',
        `/admin/table/${this.tableName}/batch-delete`,
        { ids: ids.map(String) }
      )
      if (!result || result.affected === 0) {
        return errorResponse('批量删除失败：未匹配到任何记录（可能无权限）')
      }
      this.audit('batch_delete', ids, { count: ids.length })
      return successResponse(true)
    } catch (err) {
      return errorResponse(handleApiError(err, `${this.tableName}.batchDelete`))
    }
  }

  /// 批量更新
  async batchUpdate(ids: (string | number)[], data: Partial<T>): Promise<ApiResponse<boolean>> {
    try {
      const result = await apiRequest<{ affected: number }>(
        'PUT',
        `/admin/table/${this.tableName}`,
        { ids: ids.map(String), data: data as Record<string, unknown> }
      )
      if (!result || result.affected === 0) {
        return errorResponse('批量更新失败：未匹配到任何记录（可能无权限）')
      }
      this.audit('batch_update', ids, { count: ids.length, changes: data })
      return successResponse(true)
    } catch (err) {
      return errorResponse(handleApiError(err, `${this.tableName}.batchUpdate`))
    }
  }
}
