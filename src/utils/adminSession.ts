// 本地后端管理会话（批 1 基建）
// 本地后端 JWT 是管理端会话的**唯一权威源**：登录、鉴权、权限、登出全部走 /auth/*。
// Supabase 依赖已完全移除——登录不再触碰任何 Supabase 接口。
import { apiRequest, apiRequestLoose } from './adminHttp'

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

export function clearLocalSession() {
  localStorage.removeItem(ACCESS_KEY)
  localStorage.removeItem(REFRESH_KEY)
}

function saveTokens(accessToken: string, refreshToken?: string | null) {
  localStorage.setItem(ACCESS_KEY, accessToken)
  if (refreshToken) localStorage.setItem(REFRESH_KEY, refreshToken)
}

/// 管理端登录（realm=admin）。成功返回 /auth/me 结果（含 role + permissions）。
export async function loginAdmin(username: string, password: string): Promise<AdminMe> {
  const tokens = await apiRequest<{ access_token: string; refresh_token?: string }>(
    'POST',
    '/auth/login',
    { realm: 'admin', account: username, password }
  )
  if (!tokens?.access_token) {
    throw new Error('登录失败：后端未返回令牌')
  }
  saveTokens(tokens.access_token, tokens.refresh_token ?? null)
  try {
    return await apiRequest<AdminMe>('GET', '/auth/me')
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
      const result = await apiRequestLoose<{ access_token?: string; refresh_token?: string }>(
        'POST',
        '/auth/refresh',
        { refresh_token: refreshToken }
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

/// 拉取当前管理主体（角色 + 权限码，服务端实时判定）
export async function fetchAdminMe(): Promise<AdminMe | null> {
  if (!hasLocalSession()) return null
  try {
    return await apiRequest<AdminMe>('GET', '/auth/me')
  } catch {
    return null
  }
}

/// 登出：通知后端吊销 refresh token 并清本地
export async function logoutAdmin(): Promise<void> {
  const refreshToken = localStorage.getItem(REFRESH_KEY)
  if (refreshToken) {
    await apiRequestLoose('POST', '/auth/logout', { refresh_token: refreshToken })
  }
  clearLocalSession()
}
