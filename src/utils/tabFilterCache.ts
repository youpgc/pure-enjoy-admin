/**
 * 页签筛选状态快照缓存（模块级，跨重挂载存活）。
 *
 * 背景：tabs 右键「刷新」通过递增 key 强制重挂载页面组件，所有 useState
 * 归零 → 页面以初始筛选条件重新查询，用户当前筛选丢失（2026-09-07 反馈）。
 *
 * 约定：页面挂载时用 useState lazy initializer 从这里恢复筛选 state，
 * 卸载时经 usePersistTabFilters 写回。恢复后页码从第 1 页开始。
 */

interface Snapshot {
  state: Record<string, unknown>
}

const store = new Map<string, Snapshot>()

/** 页面挂载时读取快照（无则返回空对象） */
export function loadTabFilters(page: string): Record<string, unknown> {
  return store.get(page)?.state ?? {}
}

/** 页面卸载时保存筛选快照（仅覆盖同页签旧值） */
export function saveTabFilters(page: string, state: Record<string, unknown>): void {
  store.set(page, { state })
}
import { useEffect } from 'react'

/**
 * 页面卸载时持久化当前筛选 state（无 deps → 每次 render 重挂 cleanup，
 * unmount 时闭包捕获的即最新值）。
 */
export function usePersistTabFilters(page: string, state: Record<string, unknown>): void {
  useEffect(() => () => saveTabFilters(page, state))
}
