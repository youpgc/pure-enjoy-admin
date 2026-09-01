// 标签页级会话缓存工具
// 与 sessionStorage 同生命周期：同一标签页内有效，关闭标签页即失效。
// 用途：浏览器在「切走应用再切回」时常会丢弃后台标签页并整页重载，
// 重载会重置模块级内存缓存、重跑挂载期的初始化请求（is_admin / get_my_role /
// permissions / users.status）。用本工具把初始化结果暂存于 sessionStorage，
// 重载后直接复用，避免对固定接口的无谓重复请求。
// 注意：仅用于「同标签页内跳过重复拉取」，新开标签页或主动 reload() 仍会重新校验。

const PREFIX = 'pe_cache_v1_'

export function getSessionCache<T>(key: string): T | null {
  try {
    const raw = sessionStorage.getItem(PREFIX + key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

export function setSessionCache<T>(key: string, value: T): void {
  try {
    sessionStorage.setItem(PREFIX + key, JSON.stringify(value))
  } catch {
    // 忽略：隐私模式或容量已满时不阻塞主流程
  }
}

export function removeSessionCache(key: string): void {
  try {
    sessionStorage.removeItem(PREFIX + key)
  } catch {
    // 忽略
  }
}
