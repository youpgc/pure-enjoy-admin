// ==================== 系统监控服务层（批 2-7：本地后端化） ====================
//
// 原实现为云端 5 个 RPC（get_db_health 等），现改为本地后端 /admin/system-monitor/**：
// 全部只读 pg_catalog 统计视图 + 自家日志表；出参保持「单元素数组」形态与原 RPC 一致。
// 各方法独立返回 ApiResponse，单分区失败不影响其它分区（best-effort）。
import { apiRequest } from '../utils/adminHttp'
import type { ApiResponse } from '../utils/apiClient'

export interface DbHealth {
  db_size_bytes: number
  active_conns: number
  max_conns: number
  conn_util_pct: number
  err_last_24h: number
  err_prev_24h: number
  total_tables: number
  total_rows_est: number
}

export interface TableStat {
  table_name: string
  row_estimate: number
  table_size_bytes: number
  index_size_bytes: number
  total_size_bytes: number
  last_vacuum: string | null
  last_autovacuum: string | null
}

export interface LogTrendPoint {
  day: string
  op_count: number
  err_count: number
}

export interface RlsCoverage {
  total_tables: number
  rls_enabled: number
  unprotected: string[]
}

export interface SeqScanHotspot {
  table_name: string
  row_estimate: number
  seq_scan: number
  idx_scan: number
}

/// 将 apiRequest 异常包装为旧 ApiResponse 形态（页面 res.success 判定习惯不变）
async function wrap<T>(fn: () => Promise<T>): Promise<ApiResponse<T>> {
  try {
    return { success: true, data: await fn(), errorMessage: null, statusCode: 200 }
  } catch (e) {
    const msg = e instanceof Error ? e.message : '请求失败'
    return { success: false, data: null, errorMessage: msg, statusCode: null }
  }
}

export const systemMonitorService = {
  getDbHealth: (): Promise<ApiResponse<DbHealth[]>> =>
    wrap(() => apiRequest<DbHealth[]>('GET', '/admin/system-monitor/db-health')),

  getTableStats: (): Promise<ApiResponse<TableStat[]>> =>
    wrap(() => apiRequest<TableStat[]>('GET', '/admin/system-monitor/table-stats')),

  getLogTrends: (days: number): Promise<ApiResponse<LogTrendPoint[]>> =>
    wrap(() => apiRequest<LogTrendPoint[]>('GET', `/admin/system-monitor/log-trends?days=${days}`)),

  getRlsCoverage: (): Promise<ApiResponse<RlsCoverage[]>> =>
    wrap(() => apiRequest<RlsCoverage[]>('GET', '/admin/system-monitor/rls-coverage')),

  getSeqScanHotspots: (minRows = 10000): Promise<ApiResponse<SeqScanHotspot[]>> =>
    wrap(() => apiRequest<SeqScanHotspot[]>('GET', `/admin/system-monitor/seq-scan-hotspots?min_rows=${minRows}`)),
}
