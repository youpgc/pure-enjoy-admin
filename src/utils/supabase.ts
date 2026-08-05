import { createClient } from '@supabase/supabase-js'
import type { Database } from '../types/database'
import { formatSupabaseErrorMessage } from './errorCode'

// 使用 Vite 环境变量判断开发环境
const isDev = import.meta.env.DEV

// 根据环境控制调试日志：开发环境开启，生产环境关闭
const enableDebugLog = isDev

// Supabase 项目配置（公开信息，非敏感数据）
// 优先使用环境变量，未配置时回退到硬编码默认值
const FALLBACK_SUPABASE_URL = 'https://mhdrbjpqmzswswoazwjg.supabase.co'
const FALLBACK_SUPABASE_ANON_KEY = 'sb_publishable_wFx9tlxImVfEpRN4NMkS1g_QOm64aj6'
const envUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined) || FALLBACK_SUPABASE_URL
const envKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) || FALLBACK_SUPABASE_ANON_KEY

// URL 校验：必须是合法的 https://{project-id}.supabase.co 格式
const supabaseUrlPattern = /^https:\/\/[a-z0-9]{10,}\.supabase\.co$/
if (!supabaseUrlPattern.test(envUrl)) {
  throw new Error(`VITE_SUPABASE_URL 格式无效: ${envUrl}，期望 https://{project-id}.supabase.co`)
}

export const SUPABASE_URL = envUrl
const SUPABASE_ANON_KEY = envKey

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

// 全局错误记录函数（直接写入数据库）
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

    const errorLog = {
      level,
      module,
      message: sanitizedMessage,
      detail: {
        description: sanitizedDetail,
        stack_trace: sanitizedStack,
      },
      user_id: await getCurrentBusinessUserId(),
      source: 'admin',
    }

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

    // 直接写入数据库
    const { error: insertError } = await (supabase.from('error_logs') as any).insert(errorLog)
    if (insertError && isDev) {
      console.error('[ErrorLogger] 写入失败:', insertError)
    }
  } catch (err) {
    // 记录错误时出错，仅控制台输出，避免递归调用 reportError
    if (isDev) {
      console.error('[ErrorLogger] 记录异常:', err)
    }
  }
}

// 解析当前登录用户的【业务 ID】(public.users.id)。
// operation_logs / error_logs 的 user_id 外键指向 public.users.id（业务 ID，形如 U000...），
// 而 supabase.auth.getUser() 返回的是 auth UUID，二者不同；直接写 UUID 会触发
// 23503（operation_logs_user_id_fkey）。故须经 auth_id = auth.uid() 反查业务 ID，
// 与 report_client_error RPC 口径一致。查不到（理论上不应发生）则回退 null（列允许 null）。
export async function getCurrentBusinessUserId(): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase
    .from('users')
    .select('id')
    .eq('auth_id', user.id)
    .maybeSingle()
  return (data as { id?: string } | null)?.id ?? null
}

// 操作日志记录函数（直接写入，不使用队列）
export async function logOperation(params: {
  action: string
  module: string
  detail?: string | object
  target_id?: string
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

    // 前端无法获得真实客户端 IP，ip 列保留为占位值（'127.0.0.1'）；
    // user_agent 取浏览器 UA，补上审计字段闭环（审查报告 P2-2）。
    const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : null
    const logData = {
      user_id: await getCurrentBusinessUserId(),
      action: params.action,
      module: params.module,
      target_id: params.target_id || null,
      ip: params.ip || '127.0.0.1',
      user_agent: params.user_agent || userAgent,
      details: details,
    }

    if (isDev) {
      console.log('[OperationLog] 记录操作日志:', sanitizeObject(logData))
    }

    // 直接写入数据库
    const { error } = await (supabase.from('operation_logs') as any).insert(logData)

    if (error && isDev) {
      console.error('[OperationLog] 写入失败:', error)
    }
  } catch (err) {
    if (isDev) {
      console.error('[OperationLog] 记录操作日志异常:', err)
    }
  }
}

// 创建 Supabase 客户端（注入 Database 类型以获得查询自动推断）
export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
  global: {
    // 添加请求头
    headers: {
      'X-Client-Info': 'pure-enjoy-admin',
    },
    // 请求拦截器 - 用于日志记录和错误上报
    fetch: async (url, options = {}) => {
      const startTime = Date.now()
      const method = options.method || 'GET'

      // 解析表名（用于日志）
      let tableName = 'unknown'
      try {
        const urlObj = new URL(url as string)
        const pathParts = urlObj.pathname.split('/')
        // Supabase REST API 路径格式: /rest/v1/{table}
        const restIndex = pathParts.indexOf('rest')
        if (restIndex !== -1 && pathParts[restIndex + 1] === 'v1') {
          tableName = pathParts[restIndex + 2] || 'unknown'
        }
      } catch (e) {
        console.error('URL parse failed:', e)
      }

      if (enableDebugLog) {
        console.log(`[Supabase] ${method} ${tableName} - 请求开始`)
      }

      try {
        const response = await fetch(url, options)
        const duration = Date.now() - startTime

        // 处理 401 未授权 — 清除登录状态并跳转登录页
        if (response.status === 401) {
          if (isDev) {
            console.error(`[Supabase] ${method} ${tableName} - 401 未授权`)
          }
          // 使用 setTimeout 避免在拦截器中直接调用 signOut 导致的循环问题
          setTimeout(() => {
            supabase.auth.signOut().then(() => {
              if (!window.location.pathname.includes('/login')) {
                window.location.href = '/pure-enjoy-admin/login'
              }
            })
          }, 0)
          return response
        }

        if (!response.ok) {
          // 尝试解析错误信息
          let errorMessage = `HTTP ${response.status}`
          let errorData: any = null
          try {
            errorData = await response.clone().json()
            errorMessage = errorData.message || errorData.error_description || errorMessage
          } catch {
            /* JSON 解析失败，使用默认错误信息 */
          }

          // 控制台输出（仅开发环境）
          if (isDev) {
            console.error(`[Supabase] ${method} ${tableName} - 请求失败 (${duration}ms):`, {
              status: response.status,
              message: errorMessage,
              url: url.toString().split('?')[0], // 移除查询参数，保护敏感信息
            })
          }
        } else {
          if (enableDebugLog) {
            console.log(`[Supabase] ${method} ${tableName} - 请求成功 (${duration}ms)`)
          }
        }

        return response
      } catch (error: any) {
        const duration = Date.now() - startTime

        if (isDev) {
          console.error(`[Supabase] ${method} ${tableName} - 网络错误 (${duration}ms):`, error)
        }
        throw error
      }
    },
  },
})

// 错误处理辅助函数（委托 errorCode.formatSupabaseErrorMessage，消除与 apiClient.mapSupabaseError 的重复，审查报告 P2-4）
export const handleSupabaseError = (error: any, context?: string): string => {
  if (isDev) {
    console.error(`[Supabase] ${context} 错误:`, error)
  }
  return formatSupabaseErrorMessage(error)
}
