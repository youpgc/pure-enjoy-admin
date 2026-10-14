// 统一 API 响应封装与错误处理（批 2-7 去 Supabase 化）
// 原 BaseService / apiQuery / apiExecute 已下线：动态表 CRUD 统一走
// src/services/tableService.ts（LocalBaseService → 本地后端 /admin/table/**）。
import { reportError } from './errorReport'
import { message } from 'antd'
import { formatApiErrorMessage } from './errorCode'

/// 统一 API 响应封装
export interface ApiResponse<T> {
  success: boolean
  data: T | null
  errorMessage: string | null
  statusCode: number | null
}

export function successResponse<T>(data: T, statusCode?: number): ApiResponse<T> {
  return { success: true, data, errorMessage: null, statusCode: statusCode ?? 200 }
}

export function errorResponse<T>(msg: string, statusCode?: number): ApiResponse<T> {
  return { success: false, data: null, errorMessage: msg, statusCode: statusCode ?? 500 }
}

/// 统一错误码映射（委托 errorCode.formatApiErrorMessage，单一源）
export function mapApiError(error: any): string {
  return formatApiErrorMessage(error)
}

/// 统一异常处理：打印 + 提示 + 记录错误日志
export function handleApiError(error: unknown, context?: string): string {
  const msg = error instanceof Error ? error.message : mapApiError(error)
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
  const msg = mapApiError(error)
  console.error(`[API - ${context}]`, error)
  reportError('error', context, msg, undefined, error instanceof Error ? error : undefined)
  return msg
}
