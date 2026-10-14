// 错误日志 / 操作日志上报（2026-10-13 自 supabase.ts 迁出，随「完全脱离 Supabase」改造）
// 写入通道均为本地后端审计端点：POST /admin/audit/error-logs、POST /admin/audit/operation-logs
//（user_id / ip / user_agent 由服务端从 JWT 与请求头取得）。
import { apiRequestLoose } from './adminHttp'

const isDev = import.meta.env.DEV

// 敏感字段列表（日志中需要脱敏的字段）
const SENSITIVE_FIELDS = ['password', 'password_hash', 'token', 'apikey', 'authorization', 'secret', 'phone', 'email']

/**
 * 对字符串进行脱敏处理
 * 检测并替换敏感信息为 ***
 */
function sanitizeLogContent(content: string): string {
  let sanitized = content
  // 脱敏邮箱
  sanitized = sanitized.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '***@***.***')
  // 脱敏手机号（中国大陆）
  sanitized = sanitized.replace(/1[3-9]\d{9}/g, '1**********')
  // 脱敏 UUID
  sanitized = sanitized.replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '***UUID***')
  return sanitized
}

/**
 * 递归脱敏对象中的敏感字段
 */
function sanitizeObject(obj: unknown): unknown {
  if (obj === null || obj === undefined) return obj
  if (typeof obj === 'string') return sanitizeLogContent(obj)
  if (typeof obj !== 'object') return obj

  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject)
  }

  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase()
    if (SENSITIVE_FIELDS.some(f => lowerKey.includes(f))) {
      result[key] = '***'
    } else if (typeof value === 'string' && value.length > 200) {
      // 截断过长的字符串
      result[key] = value.substring(0, 200) + '...'
    } else {
      result[key] = sanitizeObject(value)
    }
  }
  return result
}

// 全局错误记录函数（写入本地后端 error_logs）
export async function reportError(
  level: 'error' | 'warning' | 'info',
  module: string,
  message: string,
  detail?: string,
  error?: Error
) {
  try {
    // 脱敏处理
    const sanitizedMessage = sanitizeLogContent(message)
    const sanitizedDetail = sanitizeLogContent(detail || message)
    const sanitizedStack = error?.stack ? sanitizeLogContent(error.stack) : undefined

    // 控制台输出（仅开发环境输出详细信息，生产环境只输出级别和模块）
    if (isDev) {
      if (level === 'error') {
        console.error(`[${level.toUpperCase()}][${module}] ${sanitizedMessage}`, { detail: sanitizedDetail, error })
      } else if (level === 'warning') {
        console.warn(`[${level.toUpperCase()}][${module}] ${sanitizedMessage}`, { detail: sanitizedDetail, error })
      } else {
        console.log(`[${level.toUpperCase()}][${module}] ${sanitizedMessage}`, { detail: sanitizedDetail, error })
      }
    } else if (level === 'error') {
      // 生产环境仅输出极简错误标记，不含任何详情
      console.error(`[ERROR][${module}] 系统错误`)
    }

    // 直接写入本地后端（POST /admin/audit/error-logs；user_id 由服务端从 JWT 主体取得）
    const { code } = await apiRequestLoose('POST', '/admin/audit/error-logs', {
      level,
      module,
      message: sanitizedMessage,
      detail: {
        description: sanitizedDetail,
        stack_trace: sanitizedStack,
      },
    })
    if (code !== 200 && isDev) {
      console.error('[ErrorLogger] 写入失败:', code)
    }
  } catch (err) {
    // 记录错误时出错，仅控制台输出，避免递归调用 reportError
    if (isDev) {
      console.error('[ErrorLogger] 记录异常:', err)
    }
  }
}

// 解析当前登录用户的唯一 ID（本地后端 JWT 的 sub 即主体 ID；admin realm 为 admin_users.id）
export async function getCurrentBusinessUserId(): Promise<string | null> {
  try {
    const token = localStorage.getItem('pe_admin_access_token')
    if (!token) return null
    const payloadPart = token.split('.')[1]
    if (!payloadPart) return null
    const payload = JSON.parse(atob(payloadPart.replace(/-/g, '+').replace(/_/g, '/')))
    return typeof payload?.sub === 'string' ? payload.sub : null
  } catch {
    return null
  }
}

// 操作日志记录函数（写入本地后端 operation_logs，不使用队列）
export async function logOperation(params: {
  action: string
  module: string
  detail?: string | object
  target_id?: string | string[]
  ip?: string
  user_agent?: string
  immediate?: boolean // 保留参数但忽略，始终立即写入
}) {
  try {
    // 将 detail 转换为对象格式（数据库期望 JSON）
    let details: object | null = null
    if (params.detail) {
      if (typeof params.detail === 'string') {
        details = { message: params.detail }
      } else {
        details = params.detail
      }
    }

    // 审查 P3-3：target_id 统一规整为数组（单值包成 [v]，已为数组则原样），便于按 id 关联
    const targetId = params.target_id == null
      ? null
      : Array.isArray(params.target_id)
        ? params.target_id
        : [params.target_id]

    // 前端无法获得真实客户端 IP，ip/user_agent 由服务端从请求头提取（占位字段不再需要）
    const logData = {
      action: params.action,
      module: params.module,
      target_id: targetId,
      details: details,
    }

    if (isDev) {
      console.log('[OperationLog] 记录操作日志:', sanitizeObject(logData))
    }

    // 直接写入本地后端（POST /admin/audit/operation-logs；user_id/ip/user_agent 由服务端从令牌与请求头取得）
    const { code } = await apiRequestLoose('POST', '/admin/audit/operation-logs', logData)

    if (code !== 200 && isDev) {
      console.error('[OperationLog] 写入失败:', code)
    }
  } catch (err) {
    if (isDev) {
      console.error('[OperationLog] 记录操作日志异常:', err)
    }
  }
}
