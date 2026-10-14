// 本地后端 HTTP 客户端（批 1 基建）
// 职责：统一请求封装 —— JWT 鉴权头、30s 超时、401 静默续期、BackendResult 解包。
// 与 supabase.ts 并存（过渡期）：本文件只承载「新通道」流量，
// 登录/鉴权/日志上报；存量数据面查询仍走 supabase-js，批 2/3 逐 service 切换后退役 supabase.ts。

const BASE_URL: string =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) || 'http://localhost:18080/api/v1'

/// BackendResult 统一出参（后端全局格式 {code,message,data}）
export interface BackendResult<T = any> {
  code: number
  message: string
  data: T | null
}

export class HttpError extends Error {
  statusCode: number
  constructor(message: string, statusCode: number) {
    super(message)
    this.statusCode = statusCode
  }
}

function readToken(): string | null {
  return localStorage.getItem('pe_admin_access_token')
}

export function buildAuthHeaders(): Record<string, string> {
  const token = readToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}

/// 401 处理：清本地会话并跳登录页（与 supabase.ts 拦截器行为一致）
function handleUnauthorized() {
  import('./adminSession').then((m) => m.clearLocalSession())
  setTimeout(() => {
    if (!window.location.pathname.includes('/login')) {
      window.location.href = '/pure-enjoy-admin/login'
    }
  }, 0)
}

/// 核心请求：一次 401 自动续期重试（refresh token 换新 access token 后重放原请求）
async function requestCore<T>(
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH',
  path: string,
  body?: unknown,
  retryOn401 = true
): Promise<BackendResult<T>> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 30000)
  let response: Response
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...buildAuthHeaders(),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    })
  } catch (error: any) {
    if (error?.name === 'AbortError') {
      throw new HttpError('请求超时，请稍后重试', 408)
    }
    throw new HttpError('网络异常，请稍后重试', 0)
  } finally {
    clearTimeout(timer)
  }

  if (response.status === 401 && retryOn401) {
    // 尝试静默续期；成功则重放，失败按未授权处理
    const { refreshTokenSilently } = await import('./adminSession')
    const refreshed = await refreshTokenSilently().catch(() => false)
    if (refreshed) {
      return requestCore<T>(method, path, body, false)
    }
    handleUnauthorized()
    throw new HttpError('登录已过期，请重新登录', 401)
  }
  if (response.status === 401) {
    handleUnauthorized()
    throw new HttpError('登录已过期，请重新登录', 401)
  }

  let result: BackendResult<T>
  try {
    result = (await response.json()) as BackendResult<T>
  } catch {
    throw new HttpError(`HTTP ${response.status}`, response.status)
  }
  return result
}

/// 发起请求并解包 data；非 2xx 业务码抛 HttpError(message)
export async function apiRequest<T = any>(
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH',
  path: string,
  body?: unknown
): Promise<T> {
  const result = await requestCore<T>(method, path, body)
  if (result.code !== 200) {
    throw new HttpError(result.message || `请求失败（${result.code}）`, result.code)
  }
  return result.data as T
}

/// 发起请求但不抛业务错误（best-effort 场景：日志上报等），返回完整结果
export async function apiRequestLoose<T = any>(
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH',
  path: string,
  body?: unknown
): Promise<BackendResult<T>> {
  return requestCore<T>(method, path, body)
}

export const API_BASE_URL = BASE_URL

/// multipart 文件上传（FormData；浏览器自动设 Content-Type boundary）。
/// 一次 401 自动续期重试，与 requestCore 同口径。
export async function apiUpload<T = any>(
  path: string,
  formData: FormData
): Promise<T> {
  const doSend = () =>
    fetch(`${BASE_URL}${path}`, {
      method: 'POST',
      headers: buildAuthHeaders(),
      body: formData,
    })

  let response = await doSend()
  if (response.status === 401) {
    const { refreshTokenSilently } = await import('./adminSession')
    const refreshed = await refreshTokenSilently().catch(() => false)
    if (refreshed) {
      response = await doSend()
    } else {
      handleUnauthorized()
      throw new HttpError('登录已过期，请重新登录', 401)
    }
  }
  let result: BackendResult<T>
  try {
    result = (await response.json()) as BackendResult<T>
  } catch {
    throw new HttpError(`HTTP ${response.status}`, response.status)
  }
  if (result.code !== 200) {
    throw new HttpError(result.message || `上传失败（${result.code}）`, result.code)
  }
  return result.data as T
}
