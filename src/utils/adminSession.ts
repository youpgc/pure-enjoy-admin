// 本地后端管理会话（批 1 基建）
// 本地后端 JWT 是管理端会话的**唯一权威源**：登录、鉴权、权限、登出全部走 /auth/*。
// Supabase 依赖已完全移除——登录不再触碰任何 Supabase 接口。
import { apiRequest, apiRequestLoose } from './adminHttp'
import { getSessionCache, removeSessionCache, setSessionCache } from './sessionCache'

const ACCESS_KEY = 'pe_admin_access_token'
const REFRESH_KEY = 'pe_admin_refresh_token'

/// /auth/me 出参（与后端 LoginUserVO 对齐，SNAKE_CASE）
export interface AdminMe {
  id: string
  realm: string
  username: string
  nickname: string | null
  email: string | null
  avatar_url: string | null
  role: string
  permissions: string[]
}

export function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_KEY)
}

export function hasLocalSession(): boolean {
  return !!localStorage.getItem(ACCESS_KEY)
}

/** AuthGuard 标签页级角色校验缓存的键（登出/清会话时须同步清理，防换账号跳过服务端校验） */
export const AUTH_CACHE_KEY = 'auth'
/** /auth/me 结果缓存键（绑定 token，标签页级）：登录会话内全消费方共享一次请求 */
const ME_CACHE_KEY = 'me'

export function clearLocalSession() {
  localStorage.removeItem(ACCESS_KEY)
  localStorage.removeItem(REFRESH_KEY)
  removeSessionCache(AUTH_CACHE_KEY)
  removeSessionCache(ME_CACHE_KEY)
}

function saveTokens(accessToken: string, refreshToken?: string | null) {
  localStorage.setItem(ACCESS_KEY, accessToken)
  if (refreshToken) localStorage.setItem(REFRESH_KEY, refreshToken)
}

/// 管理端登录（realm=admin）。成功返回 /auth/me 结果（含 role + permissions）。
export async function loginAdmin(username: string, password: string): Promise<AdminMe> {
  // authEndpoint=true：登录 401（如账号或密码错误）直接透出后端文案，不走续期/清会话
  const tokens = await apiRequest<{ access_token: string; refresh_token?: string }>(
    'POST',
    '/auth/login',
    { realm: 'admin', account: username, password },
    true
  )
  if (!tokens?.access_token) {
    throw new Error('登录失败：后端未返回令牌')
  }
  saveTokens(tokens.access_token, tokens.refresh_token ?? null)
  try {
    // 走 fetchAdminMe（并发去重 + 结果落 ME_CACHE）：登录会话内后续消费方
    // （AuthProvider/AuthGuard/usePermission）命中缓存，整链只发这一次 /auth/me
    const me = await fetchAdminMe()
    if (!me) throw new Error('登录失败：会话校验未通过')
    return me
  } catch (e) {
    clearLocalSession()
    throw e
  }
}

/// 静默续期：refresh token 换新 access token（成功返回 true 并落盘）
let refreshInflight: Promise<boolean> | null = null

export function refreshTokenSilently(): Promise<boolean> {
  if (refreshInflight) return refreshInflight
  refreshInflight = (async () => {
    const refreshToken = localStorage.getItem(REFRESH_KEY)
    if (!refreshToken) return false
    try {
      // authEndpoint=true：刷新端点自身 401（refresh token 失效）不得重入
      // refreshTokenSilently（返回同一 Promise 自等死锁），直接返回 false 走登出
      const result = await apiRequestLoose<{ access_token?: string; refresh_token?: string }>(
        'POST',
        '/auth/refresh',
        { refresh_token: refreshToken },
        true
      )
      if (result.code === 200 && result.data?.access_token) {
        saveTokens(result.data.access_token, result.data.refresh_token ?? null)
        return true
      }
      return false
    } finally {
      refreshInflight = null
    }
  })()
  return refreshInflight
}

/// 拉取当前管理主体（角色 + 权限码，服务端实时判定）。
/// 三级收敛，登录会话内全消费方（AuthProvider/AuthGuard/usePermission）只发一次 /auth/me：
/// ① ME_CACHE（标签页级、绑定 token）命中直接返回；② 同 token 并发在途合并（StrictMode
/// 双挂载/多消费方同时拉取）；③ 成功后写 ME_CACHE 与 AUTH_CACHE（AuthGuard 命中跳过校验）。
let meInflight: Promise<AdminMe | null> | null = null
let meInflightToken: string | null = null

export async function fetchAdminMe(): Promise<AdminMe | null> {
  if (!hasLocalSession()) return null
  const token = localStorage.getItem(ACCESS_KEY)
  const cached = getSessionCache<{ token: string; me: AdminMe }>(ME_CACHE_KEY)
  if (cached && cached.token === token) return cached.me
  if (meInflight && meInflightToken === token) return meInflight
  meInflightToken = token
  meInflight = (async () => {
    try {
      const me = await apiRequest<AdminMe>('GET', '/auth/me')
      setSessionCache(ME_CACHE_KEY, { token, me })
      // 成功即写标签页级鉴权缓存：AuthGuard 命中后跳过重复校验请求
      setSessionCache(AUTH_CACHE_KEY, { ok: true })
      return me
    } catch {
      return null
    } finally {
      if (meInflightToken === token) meInflight = null
    }
  })()
  return meInflight
}

/// 登出：通知后端吊销 refresh token 并清本地。
/// 后端不可达时也必须清本地令牌（否则残留令牌无法登出、且下次进入仍持旧会话）。
export async function logoutAdmin(): Promise<void> {
  const refreshToken = localStorage.getItem(REFRESH_KEY)
  try {
    if (refreshToken) {
      await apiRequestLoose('POST', '/auth/logout', { refresh_token: refreshToken })
    }
  } finally {
    clearLocalSession()
  }
}
