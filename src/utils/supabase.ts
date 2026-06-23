import { createClient, User } from '@supabase/supabase-js'

declare const process: { env: Record<string, string | undefined> } | undefined;
const isDev = typeof process !== 'undefined' && process!.env && process!.env.NODE_ENV === 'development'

// 根据环境控制调试日志：开发环境开启，生产环境关闭
const enableDebugLog = isDev

const SUPABASE_URL = 'https://mhdrbjpqmzswswoazwjg.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_wFx9tlxImVfEpRN4NMkS1g_QOm64aj6'

// 错误日志队列（用于批量写入）
interface ErrorLog {
  id?: string
  level: 'error' | 'warning' | 'info'
  module: string
  message: string
  detail?: Record<string, unknown> // JSONB 类型，存储任意结构化数据
  user_id?: string
  created_at?: string
}

const errorLogQueue: ErrorLog[] = []
let isFlushing = false

// 批量写入错误日志到数据库
async function flushErrorLogs() {
  if (isFlushing || errorLogQueue.length === 0) return

  isFlushing = true
  const logsToFlush = [...errorLogQueue]
  errorLogQueue.length = 0

  try {
    // 从 Supabase Auth 获取当前用户ID
    const { data: { user } } = await supabase.auth.getUser()

    const logsWithMetadata = logsToFlush.map(log => ({
      ...log,
      user_id: log.user_id || user?.id || null,
      created_at: new Date().toISOString(),
    }))

    const { error } = await supabase.from('error_logs').insert(logsWithMetadata)
    if (error) {
      if (isDev) {
        console.error('[ErrorLogger] 写入错误日志失败:', error)
      }
      // 如果写入失败，将日志放回队列
      errorLogQueue.unshift(...logsToFlush)
    }
  } catch (err) {
    if (isDev) {
      console.error('[ErrorLogger] 刷新错误日志异常:', err)
    }
    errorLogQueue.unshift(...logsToFlush)
  } finally {
    isFlushing = false
  }
}

// 定期刷新错误日志
setInterval(flushErrorLogs, 5000)

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
    // 从 Supabase Auth 获取当前用户
    const { data: { user } } = await supabase.auth.getUser()

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
      user_id: user?.id || null,
      created_at: new Date().toISOString(),
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
    const { error: insertError } = await supabase.from('error_logs').insert(errorLog)
    if (insertError && isDev) {
      console.error('[ErrorLogger] 写入失败:', insertError)
    }
  } catch (err) {
    if (isDev) {
      console.error('[ErrorLogger] 记录异常:', err)
    }
  }
}

// 操作日志队列（用于批量写入和失败重试）
interface OperationLogItem {
  user_id: string | null
  action: string
  module: string
  target_id: string | null
  ip: string
  details: string | null
  created_at: string
  retryCount: number
}

const operationLogQueue: OperationLogItem[] = []
let isFlushingLogs = false

// 批量写入操作日志
async function flushOperationLogs() {
  if (isFlushingLogs || operationLogQueue.length === 0) return

  isFlushingLogs = true
  const logsToFlush = operationLogQueue.splice(0, 50) // 每次最多处理50条

  try {
    const { error } = await supabase.from('operation_logs').insert(
      logsToFlush.map(log => ({
        user_id: log.user_id,
        action: log.action,
        module: log.module,
        target_id: log.target_id,
        ip: log.ip,
        details: log.details,
        created_at: log.created_at,
      }))
    )

    if (error) {
      if (isDev) {
        console.error('[OperationLog] 批量写入失败:', error)
      }
      // 将失败的日志重新加入队列（限制重试次数）
      const failedLogs = logsToFlush
        .filter(log => log.retryCount < 3)
        .map(log => ({ ...log, retryCount: log.retryCount + 1 }))
      operationLogQueue.unshift(...failedLogs)
    }
  } catch (err) {
    if (isDev) {
      console.error('[OperationLog] 批量写入异常:', err)
    }
    // 将失败的日志重新加入队列
    const failedLogs = logsToFlush
      .filter(log => log.retryCount < 3)
      .map(log => ({ ...log, retryCount: log.retryCount + 1 }))
    operationLogQueue.unshift(...failedLogs)
  } finally {
    isFlushingLogs = false
    // 如果队列中还有日志，继续处理
    if (operationLogQueue.length > 0) {
      setTimeout(flushOperationLogs, 1000)
    }
  }
}

// 定期刷新日志（每30秒）
setInterval(flushOperationLogs, 30000)

// 操作日志记录函数（直接写入，不使用队列）
export async function logOperation(params: {
  action: string
  module: string
  detail?: string | object
  target_id?: string
  ip?: string
  immediate?: boolean // 保留参数但忽略，始终立即写入
}) {
  try {
    // 从 Supabase Auth 获取当前用户
    const { data: { user } } = await supabase.auth.getUser()

    // 将 detail 转换为对象格式（数据库期望 JSON）
    let details: object | null = null
    if (params.detail) {
      if (typeof params.detail === 'string') {
        details = { message: params.detail }
      } else {
        details = params.detail
      }
    }

    const logData = {
      user_id: user?.id || null,
      action: params.action,
      module: params.module,
      target_id: params.target_id || null,
      ip: params.ip || '127.0.0.1',
      details: details,
      created_at: new Date().toISOString(),
    }

    if (isDev) {
      console.log('[OperationLog] 记录操作日志:', sanitizeObject(logData))
    }

    // 直接写入数据库
    const { error } = await supabase.from('operation_logs').insert(logData)

    if (error && isDev) {
      console.error('[OperationLog] 写入失败:', error)
    }
  } catch (err) {
    if (isDev) {
      console.error('[OperationLog] 记录操作日志异常:', err)
    }
  }
}

// 创建 Supabase 客户端
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
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
    fetch: (url, options = {}) => {
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
      } catch {
        // 忽略 URL 解析错误
      }

      if (enableDebugLog) {
        console.log(`[Supabase] ${method} ${tableName} - 请求开始`)
      }

      return fetch(url, options).then(async (response) => {
        const duration = Date.now() - startTime

        // 处理 401 未授权 — 清除登录状态并跳转登录页
        if (response.status === 401) {
          if (isDev) {
            console.error(`[Supabase] ${method} ${tableName} - 401 未授权，清除登录状态`)
          }
          await supabase.auth.signOut()
          // 如果不在登录页，则跳转
          if (!window.location.pathname.includes('/login')) {
            window.location.href = '/pure-enjoy-admin/login'
          }
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
            // 无法解析 JSON 错误
          }

          // 记录 API 错误到错误日志（reportError 内部会进行脱敏）
          reportError(
            'error',
            'SupabaseAPI',
            `API请求失败: ${method} ${tableName}`,
            `状态码: ${response.status}, 消息: ${errorMessage}, 代码: ${errorData?.code || 'unknown'}`,
          )

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
      }).catch((error) => {
        const duration = Date.now() - startTime

        // 记录网络错误到错误日志（reportError 内部会进行脱敏）
        reportError(
          'error',
          'SupabaseAPI',
          `API网络错误: ${method} ${tableName}`,
          error.message || '网络请求失败',
          error
        )

        if (isDev) {
          console.error(`[Supabase] ${method} ${tableName} - 网络错误 (${duration}ms):`, error)
        }
        throw error
      })
    },
  },
})

// 错误处理辅助函数（逻辑与 apiClient.ts 中的 mapSupabaseError 一致，独立实现以避免循环依赖）
export const handleSupabaseError = (error: any, context?: string): string => {
  if (isDev) {
    console.error(`[Supabase] ${context} 错误:`, error)
  }

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
