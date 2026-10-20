import { useEffect, useState } from 'react'
import { apiRequest } from '../utils/adminHttp'
import { logApiError } from '../utils/apiClient'

export interface UserInfo {
  username: string | null
  nickname: string | null
}

// 模块级全局缓存：跨组件 / 跨页面 / 跨挂载复用，避免对固定用户 ID 重复请求 users 表。
// 仅记录解析结果；命中即用，未命中才发起一次批量查询。
const moduleUserCache = new Map<string, UserInfo>()

/**
 * 批量解析用户信息（username / nickname）。
 *
 * 用途：列表页在「用户ID」列旁显示「用户名」，无需改动数据库。
 * - 通道一：本地后端 GET /admin/users/by-ids（服务端按 id OR auth_id 双键匹配，
 *   业务历史数据的 user_id 可能是 auth UUID）。
 * - 通道二：纯数字 ID 走 GET /admin/accounts/by-ids —— 双表分离后
 *   operation_logs / error_logs 的管理端操作者写的是 admin_users 数字 ID，
 *   users 表查不到，需第二段解析（两段都失败才落「未知用户」兜底）。
 * - 结果存入模块级全局缓存，跨页/跨组件/跨挂载复用（解决看板因重挂载反复请求闪烁）；
 * - 解析不到的 ID 在 map 中记为 { username: null, nickname: null }，
 *   交由 <UserName /> 回退显示。
 *
 * @param ids 当前页数据中的 user_id 列表（任意顺序、可含空值；业务 ID 或 UUID 均可）
 */
export function useUsernames(ids: Array<string | null | undefined>): Map<string, UserInfo> {
  const [map, setMap] = useState<Map<string, UserInfo>>(() => new Map(moduleUserCache))

  // 用排序后的 id 串做依赖，避免每次渲染（新数组引用）都重查
  const key = Array.from(new Set(ids.filter(Boolean) as string[])).sort().join('|')

  useEffect(() => {
    const valid = Array.from(new Set(ids.filter(Boolean) as string[]))
    if (valid.length === 0) {
      setMap(new Map(moduleUserCache))
      return
    }
    let cancelled = false
    const missing = valid.filter((id) => !moduleUserCache.has(id))
    if (missing.length === 0) {
      setMap(new Map(moduleUserCache))
      return
    }
    // 服务端上限 100，超出部分分批请求
    const batches: string[][] = []
    for (let i = 0; i < missing.length; i += 100) {
      batches.push(missing.slice(i, i + 100))
    }
    // 纯数字 ID：admin_users 数字主键形态，users 表必然查不到，直接走账号通道
    const numericBatches = new Map<string, string[]>()
    const userBatches: Array<[string, string[]]> = []
    for (const batch of batches) {
      const numeric = batch.filter((id) => /^\d+$/.test(id))
      const rest = batch.filter((id) => !/^\d+$/.test(id))
      if (numeric.length > 0) {
        numericBatches.set(batch.join(','), numeric)
      }
      if (rest.length > 0) {
        userBatches.push([batch.join(','), rest])
      }
    }
    const fetchBatch = (path: string, batch: string[]) =>
      apiRequest<Array<{ id: string; auth_id: string | null; username: string | null; nickname: string | null }>>(
        'GET',
        `${path}?ids=${encodeURIComponent(batch.join(','))}`
      )
    Promise.all([
      ...userBatches.map(([, batch]) => fetchBatch('/admin/users/by-ids', batch)),
      // 账号通道对无 admin:account:list 权限的角色预期 403：静默降级为「未知用户」，
      // 不拖垮 users 通道，也不弹错（与该列 best-effort 定位一致）
      ...Array.from(numericBatches.values()).map((batch) =>
        fetchBatch('/admin/accounts/by-ids', batch).catch(() => [])
      ),
    ])
      .then((results) => {
        if (cancelled) return
        const found = new Map<
          string,
          { id: string; auth_id: string | null; username: string | null; nickname: string | null }
        >()
        results.flat().forEach((r) => {
          found.set(String(r.id), r)
          if (r.auth_id) found.set(r.auth_id, r)
        })
        missing.forEach((id) => {
          moduleUserCache.set(id, found.get(id) || { username: null, nickname: null })
        })
        setMap(new Map(moduleUserCache))
      })
      .catch((err) => {
        // 查询失败为 best-effort：静默降级，保留已缓存，缺失项由 <UserName /> 回退原 ID
        // （不弹窗——列表页加载用户名失败不应打断用户操作）
        logApiError(err, '批量查询用户名')
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  return map
}
