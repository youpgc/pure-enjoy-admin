import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://mhdrbjpqmzswswoazwjg.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_wFx9tlxImVfEpRN4NMkS1g_QOm64aj6'

// 错误日志队列（用于批量写入）
interface ErrorLog {
  id?: string
  level: 'error' | 'warning' | 'info'
  module: string
  message: string
  detail?: string
  stack_trace?: string
  user_id?: string
  ip?: string
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
    // 获取当前用户信息
    const adminUserStr = localStorage.getItem('admin_user')
    const adminUser = adminUserStr ? JSON.parse(adminUserStr) : null
    
    const logsWithMetadata = logsToFlush.map(log => ({
      ...log,
      user_id: log.user_id || adminUser?.id || null,
      created_at: new Date().toISOString(),
    }))
    
    const { error } = await supabase.from('error_logs').insert(logsWithMetadata)
    if (error) {
      console.error('[ErrorLogger] 写入错误日志失败:', error)
      // 如果写入失败，将日志放回队列
      errorLogQueue.unshift(...logsToFlush)
    } else {
      console.log(`[ErrorLogger] 成功写入 ${logsToFlush.length} 条错误日志`)
    }
  } catch (err) {
    console.error('[ErrorLogger] 刷新错误日志异常:', err)
    errorLogQueue.unshift(...logsToFlush)
  } finally {
    isFlushing = false
  }
}

// 定期刷新错误日志
setInterval(flushErrorLogs, 5000)

// 全局错误记录函数
export function reportError(
  level: 'error' | 'warning' | 'info',
  module: string,
  message: string,
  detail?: string,
  error?: Error
) {
  const errorLog: ErrorLog = {
    level,
    module,
    message,
    detail: detail || message,
    stack_trace: error?.stack,
  }
  
  // 添加到队列
  errorLogQueue.push(errorLog)
  
  // 控制台输出
  const consoleMethod = level === 'error' ? console.error : level === 'warning' ? console.warn : console.log
  consoleMethod(`[${level.toUpperCase()}][${module}] ${message}`, { detail, error })
  
  // 立即尝试刷新（如果是错误级别）
  if (level === 'error') {
    flushErrorLogs()
  }
}

// 操作日志记录函数
export async function logOperation(params: {
  action: string
  module: string
  detail?: string
  target_id?: string
  ip?: string
}) {
  try {
    const adminUserStr = localStorage.getItem('admin_user')
    const adminUser = adminUserStr ? JSON.parse(adminUserStr) : null
    
    const logData = {
      user_id: adminUser?.id || null,
      action: params.action,
      module: params.module,
      target_id: params.target_id || null,
      ip: params.ip || '127.0.0.1',
      details: params.detail || null,
      created_at: new Date().toISOString(),
    }
    
    console.log('[OperationLog] 记录操作日志:', logData)
    
    const { error } = await supabase.from('operation_logs').insert(logData)
    if (error) {
      console.error('[OperationLog] 记录操作日志失败:', error)
    }
  } catch (err) {
    console.error('[OperationLog] 记录操作日志异常:', err)
  }
}

// 创建 Supabase 客户端
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
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
      
      console.log(`[Supabase] ${method} ${tableName} - 请求开始`)
      
      return fetch(url, options).then(async (response) => {
        const duration = Date.now() - startTime
        
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
          
          // 记录 API 错误到错误日志
          reportError(
            'error',
            'SupabaseAPI',
            `API请求失败: ${method} ${tableName}`,
            `状态码: ${response.status}, 消息: ${errorMessage}, 代码: ${errorData?.code || 'unknown'}`,
          )
          
          console.error(`[Supabase] ${method} ${tableName} - 请求失败 (${duration}ms):`, {
            status: response.status,
            message: errorMessage,
            url: url.toString().split('?')[0], // 移除查询参数，保护敏感信息
          })
        } else {
          console.log(`[Supabase] ${method} ${tableName} - 请求成功 (${duration}ms)`)
        }
        
        return response
      }).catch((error) => {
        const duration = Date.now() - startTime
        
        // 记录网络错误到错误日志
        reportError(
          'error',
          'SupabaseAPI',
          `API网络错误: ${method} ${tableName}`,
          error.message || '网络请求失败',
          error
        )
        
        console.error(`[Supabase] ${method} ${tableName} - 网络错误 (${duration}ms):`, error)
        throw error
      })
    },
  },
})

// 错误处理辅助函数
export const handleSupabaseError = (error: any, context: string): string => {
  console.error(`[Supabase] ${context} 错误:`, error)
  
  if (error?.code === 'PGRST116') {
    return '数据不存在或已被删除'
  }
  if (error?.code === 'PGRST301') {
    return '没有权限执行此操作'
  }
  if (error?.code === '23505') {
    return '数据已存在（唯一性冲突）'
  }
  if (error?.code === '23503') {
    return '关联数据不存在（外键约束）'
  }
  if (error?.message?.includes('JWT')) {
    return '认证已过期，请重新登录'
  }
  if (error?.message?.includes('network')) {
    return '网络连接失败，请检查网络'
  }
  
  return error?.message || '操作失败，请稍后重试'
}

// 日志记录函数
export const logApiCall = (operation: string, table: string, data?: any) => {
  console.log(`[API] ${operation} ${table}`, data ? { data } : '')
}

export const logApiSuccess = (operation: string, table: string, result?: any) => {
  console.log(`[API] ${operation} ${table} 成功`, result ? { result } : '')
}

export const logApiError = (operation: string, table: string, error: any) => {
  console.error(`[API] ${operation} ${table} 失败:`, error)
}
