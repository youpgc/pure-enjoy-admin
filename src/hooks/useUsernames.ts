import { useEffect, useRef, useState } from 'react'
import { supabase } from '../utils/supabase'
import { apiQuery } from '../utils/apiClient'

export interface UserInfo {
  username: string | null
  nickname: string | null
}

/**
 * 批量解析用户信息（username / nickname）。
 *
 * 用途：列表页在「用户ID」列旁显示「用户名」，无需改动数据库。
 * - 同时按业务 ID（users.id）与 auth_id（UUID）建映射：业务存在双 ID 架构，
 *   部分历史数据（如早期 operation_logs/error_logs 的 user_id 写入的是 auth UUID）
 *   仅能凭 UUID 命中，故两键都建，避免回退显示原始 ID。
 * - 结果带内存缓存，跨页/跨组件复用；
 * - 解析不到的 ID 在 map 中记为 { username: null, nickname: null }，
 *   交由 <UserName /> 回退显示原始 user_id。
 *
 * @param ids 当前页数据中的 user_id 列表（任意顺序、可含空值；业务 ID 或 UUID 均可）
 */
export function useUsernames(ids: Array<string | null | undefined>): Map<string, UserInfo> {
  const [map, setMap] = useState<Map<string, UserInfo>>(new Map())
  const cacheRef = useRef<Map<string, UserInfo>>(new Map())

  // 用排序后的 id 串做依赖，避免每次渲染（新数组引用）都重查
  const key = Array.from(new Set(ids.filter(Boolean) as string[])).sort().join('|')

  useEffect(() => {
    const valid = Array.from(new Set(ids.filter(Boolean) as string[]))
    if (valid.length === 0) {
      setMap(new Map(cacheRef.current))
      return
    }
    let cancelled = false
    const missing = valid.filter((id) => !cacheRef.current.has(id))
    if (missing.length === 0) {
      setMap(new Map(cacheRef.current))
      return
    }
    const idsList = missing.join(',')
    apiQuery<Array<{ id: string; auth_id: string | null; username: string | null; nickname: string | null }>>(
      () =>
        supabase
          .from('users')
          .select('id, auth_id, username, nickname')
          .or(`id.in.(${idsList}),auth_id.in.(${idsList})`),
      '批量查询用户名'
    )
      .then((res) => {
        if (cancelled) return
        const next = new Map(cacheRef.current)
        const found = new Map<
          string,
          { id: string; auth_id: string | null; username: string | null; nickname: string | null }
        >()
        ;(res.data || []).forEach((r) => {
          found.set(r.id, r)
          if (r.auth_id) found.set(r.auth_id, r)
        })
        missing.forEach((id) => {
          next.set(id, found.get(id) || { username: null, nickname: null })
        })
        cacheRef.current = next
        setMap(new Map(next))
      })
      .catch(() => {
        // 查询失败不阻塞列表：保留已缓存，缺失项由 <UserName /> 回退原 ID
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  return map
}
