import { SUPABASE_ERROR_CODE_MAP } from '../constants'

/// 统一 Supabase 错误文案提取（单一源）
// apiClient.mapSupabaseError 与 supabase.handleSupabaseError 共用本函数，
// 消除两处重复的 SUPABASE_ERROR_CODE_MAP + JWT/network 文案逻辑（审查报告 P2-4）。
export function formatSupabaseErrorMessage(error: unknown): string {
  const codeMap = SUPABASE_ERROR_CODE_MAP
  const code = (error as { code?: string } | null)?.code
  if (code && codeMap[code]) return codeMap[code]
  const message = (error as { message?: string } | null)?.message || ''
  if (message.includes('JWT')) return '认证已过期，请重新登录'
  if (message.includes('network')) return '网络连接失败，请检查网络'
  return message || '操作失败，请稍后重试'
}
