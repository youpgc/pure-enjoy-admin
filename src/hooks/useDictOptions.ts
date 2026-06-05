/**
 * useDictOptions - 字典选项自定义Hook
 * 从Supabase字典表动态获取选项数据，替代硬编码常量
 * 支持降级：字典表不可用时返回默认选项
 */

import { useState, useEffect } from 'react'
import { getDictOptions, getDictColorMap } from '../utils/dictService'

export interface DictOption {
  label: string
  value: string
}

/**
 * 获取字典选项列表（Select/ Radio等组件用）
 * @param typeCode 字典类型编码
 * @param fallback 降级选项（字典表不可用时使用）
 */
export function useDictOptions(typeCode: string, fallback: DictOption[] = []) {
  const [options, setOptions] = useState<DictOption[]>(fallback)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    setLoading(true)

    getDictOptions(typeCode).then(items => {
      if (mounted) {
        setOptions(items.length > 0 ? items : fallback)
        setLoading(false)
      }
    })

    return () => { mounted = false }
  }, [typeCode])

  return { options, loading }
}

/**
 * 获取字典颜色映射（Tag/ Badge等组件用）
 * @param typeCode 字典类型编码
 * @param fallbackColor 默认颜色
 */
export function useDictColors(typeCode: string, fallbackColor = '#999') {
  const [colorMap, setColorMap] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    setLoading(true)

    getDictColorMap(typeCode).then(map => {
      if (mounted) {
        setColorMap(map)
        setLoading(false)
      }
    })

    return () => { mounted = false }
  }, [typeCode])

  const getColor = (code: string) => colorMap[code] || fallbackColor

  return { colorMap, getColor, loading }
}
