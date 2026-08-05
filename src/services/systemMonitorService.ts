// ==================== 系统监控服务层 ====================
//
// 对应 SQL：/d/workspace/sql/feature_admin_system_monitor.sql（5 个只读统计 RPC）
// 各方法独立返回 ApiResponse，单 RPC 失败不影响其它分区（best-effort）。
// 权限：页面已按 system_monitor:read（仅 admin/super_admin）门控；RPC 为 security definer
//       只读 pg_catalog + 自家日志，无敏感行数据暴露。

import { supabase } from '../utils/supabase'
import { apiQuery } from '../utils/apiClient'

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

export const systemMonitorService = {
  getDbHealth: () =>
    apiQuery<DbHealth[]>(() => supabase.rpc('get_db_health'), 'SystemMonitor-健康概览'),

  getTableStats: () =>
    apiQuery<TableStat[]>(() => supabase.rpc('get_table_stats'), 'SystemMonitor-表规模'),

  getLogTrends: (days: number) =>
    apiQuery<LogTrendPoint[]>(
      () => (supabase.rpc as any)('get_log_trends', { p_days: days }),
      'SystemMonitor-日志趋势'
    ),

  getRlsCoverage: () =>
    apiQuery<RlsCoverage[]>(() => supabase.rpc('get_rls_coverage'), 'SystemMonitor-RLS覆盖'),

  getSeqScanHotspots: (minRows = 10000) =>
    apiQuery<SeqScanHotspot[]>(
      () => (supabase.rpc as any)('get_seq_scan_hotspots', { p_min_rows: minRows }),
      'SystemMonitor-全表扫描热点'
    ),
}
