import { useState, useEffect, useMemo, useCallback } from 'react'
import type { JourneyFilterDef } from './journeyTabSchema'
import { loadTabFilters, usePersistTabFilters } from '../../utils/tabFilterCache'

/// 文本筛选输入防抖时长（毫秒）：避免逐字符触发服务端查询。
const TEXT_FILTER_DEBOUNCE_MS = 300

/// 西行管理表格筛选状态：区分即时 UI 值与防抖后的查询值。
/// text 输入延迟同步到查询值以减轻请求；lookup/static 选择即时生效。
/// 筛选值按 schema.key 跨页签重挂载持久化。
export function useJourneyFilters(
  cacheKey: string,
  defs: JourneyFilterDef[],
  disabled: boolean,
) {
  const restored = disabled ? null : loadTabFilters(cacheKey)
  // 兼容旧的单值缓存结构（filterValue），迁移到首个筛选字段
  const legacyValues = restored?.filterValue && defs[0]
    ? { [defs[0].field]: restored.filterValue as string }
    : {}
  const initialValues = (restored?.filterValues as Record<string, string> | undefined) ?? legacyValues

  const [values, setValues] = useState<Record<string, string>>(initialValues)
  const [queryValues, setQueryValues] = useState<Record<string, string>>(initialValues)

  usePersistTabFilters(cacheKey, disabled ? {} : { filterValues: values })

  // 仅文本字段参与防抖签名：下拉选择改变 values 时不重启文本防抖计时
  const textSignature = useMemo(
    () => defs
      .filter((d) => d.kind === 'text')
      .map((d) => `${d.field}=${values[d.field] ?? ''}`)
      .join('&'),
    [defs, values],
  )

  useEffect(() => {
    if (disabled) return
    const timer = window.setTimeout(() => {
      setQueryValues((prev) => {
        const next = { ...prev }
        let changed = false
        for (const def of defs) {
          if (def.kind !== 'text') continue
          const value = values[def.field] ?? ''
          if ((prev[def.field] ?? '') !== value) {
            next[def.field] = value
            changed = true
          }
        }
        return changed ? next : prev
      })
    }, TEXT_FILTER_DEBOUNCE_MS)
    return () => window.clearTimeout(timer)
    // textSignature 覆盖文本字段变化；defs 由调用方 useMemo 稳定引用
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [textSignature, defs, disabled])

  /// 写入某个筛选字段：text 只更 UI 值（查询由防抖同步），其余立即生效；
  /// 值无变化时保留原对象引用，避免重复选同值引发多余查询。
  const setFilter = useCallback((field: string, value: string, isText: boolean) => {
    setValues((prev) => (prev[field] === value ? prev : { ...prev, [field]: value }))
    if (!isText) {
      setQueryValues((prev) => (prev[field] === value ? prev : { ...prev, [field]: value }))
    }
  }, [])

  return { values, queryValues, setFilter }
}
