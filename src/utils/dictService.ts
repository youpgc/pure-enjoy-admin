/**
 * 字典服务 - 从Supabase字典表获取动态配置数据
 * 替代硬编码的分类/选项数据
 */

import { supabase } from './supabase'

export interface DictItem {
  code: string
  label: string
  value: string | null
  sort_order: number
  extra: Record<string, any> | null
}

// 字典数据缓存
const dictCache: Record<string, DictItem[]> = {}
let cacheTimestamp: Record<string, number> = {}
const CACHE_TTL = 5 * 60 * 1000 // 5分钟缓存

/**
 * 获取字典项列表
 * @param typeCode 字典类型编码
 * @param useCache 是否使用缓存
 */
export async function getDictItems(typeCode: string, useCache = true): Promise<DictItem[]> {
  // 检查缓存
  if (useCache && dictCache[typeCode]) {
    const lastFetch = cacheTimestamp[typeCode] || 0
    if (Date.now() - lastFetch < CACHE_TTL) {
      return dictCache[typeCode]
    }
  }

  try {
    // 尝试从Supabase字典表获取
    const { data, error } = await supabase
      .rpc('get_dict_items', { p_type_code: typeCode })

    if (error) {
      console.warn(`字典表查询失败(${typeCode}):`, error.message)
      // 降级：返回空数组，调用方需处理
      return []
    }

    const items: DictItem[] = (data || []).map((item: any) => ({
      code: item.code ?? item.item_code,
      label: item.label ?? item.item_name,
      value: item.value ?? item.item_value,
      sort_order: item.sort_order,
      extra: item.extra ?? item.extra_data,
    }))

    // 更新缓存
    dictCache[typeCode] = items
    cacheTimestamp[typeCode] = Date.now()

    return items
  } catch (err) {
    console.error(`获取字典数据异常(${typeCode}):`, err)
    return []
  }
}

/**
 * 获取字典项的Select选项格式
 * @param typeCode 字典类型编码
 * @returns { label: string, value: string }[]
 */
export async function getDictOptions(typeCode: string): Promise<Array<{ label: string; value: string }>> {
  const items = await getDictItems(typeCode)
  return items.map(item => ({
    label: item.label,
    value: item.code,
  }))
}

/**
 * 获取字典项的颜色映射
 * @param typeCode 字典类型编码
 * @returns Record<string, string> - code -> color
 */
export async function getDictColorMap(typeCode: string): Promise<Record<string, string>> {
  const items = await getDictItems(typeCode)
  const map: Record<string, string> = {}
  items.forEach(item => {
    if (item.extra?.color) {
      map[item.code] = item.extra.color
    }
  })
  return map
}

/**
 * 清除字典缓存
 */
export function clearDictCache(typeCode?: string) {
  if (typeCode) {
    delete dictCache[typeCode]
    delete cacheTimestamp[typeCode]
  } else {
    Object.keys(dictCache).forEach(key => {
      delete dictCache[key]
      delete cacheTimestamp[key]
    })
  }
}

/**
 * 消费分类选项（兼容旧代码，异步获取）
 */
export async function getExpenseCategoryOptions(): Promise<Array<{ label: string; value: string }>> {
  const options = await getDictOptions('expense_category')
  // 如果字典表无数据，返回默认选项
  if (options.length === 0) {
    return [
      { label: '餐饮', value: 'food' },
      { label: '交通', value: 'transport' },
      { label: '购物', value: 'shopping' },
      { label: '娱乐', value: 'entertainment' },
      { label: '居住', value: 'housing' },
      { label: '医疗', value: 'medical' },
      { label: '教育', value: 'education' },
      { label: '其他', value: 'other' },
    ]
  }
  return options
}

/**
 * 心情类型选项
 */
export async function getMoodTypeOptions(): Promise<Array<{ label: string; value: string }>> {
  const options = await getDictOptions('mood_type')
  if (options.length === 0) {
    return [
      { label: '开心', value: 'happy' },
      { label: '平静', value: 'calm' },
      { label: '难过', value: 'sad' },
      { label: '生气', value: 'angry' },
      { label: '焦虑', value: 'anxious' },
      { label: '疲惫', value: 'tired' },
    ]
  }
  return options
}

/**
 * 小说分类选项
 */
export async function getNovelCategoryOptions(): Promise<Array<{ label: string; value: string }>> {
  const options = await getDictOptions('novel_category')
  if (options.length === 0) {
    return [
      { label: '玄幻', value: 'fantasy' },
      { label: '都市', value: 'urban' },
      { label: '言情', value: 'romance' },
      { label: '科幻', value: 'scifi' },
      { label: '历史', value: 'history' },
      { label: '游戏', value: 'game' },
      { label: '悬疑', value: 'mystery' },
      { label: '其他', value: 'other' },
    ]
  }
  return options
}

/**
 * 小说状态选项
 */
export async function getNovelStatusOptions(): Promise<Array<{ label: string; value: string }>> {
  const options = await getDictOptions('novel_status')
  if (options.length === 0) {
    return [
      { label: '连载中', value: 'ongoing' },
      { label: '已完结', value: 'completed' },
      { label: '暂停更新', value: 'paused' },
    ]
  }
  return options
}

/**
 * 反馈分类选项
 */
export async function getFeedbackCategoryOptions(): Promise<Array<{ label: string; value: string }>> {
  const options = await getDictOptions('feedback_category')
  if (options.length === 0) {
    return [
      { label: 'Bug反馈', value: 'bug' },
      { label: '功能建议', value: 'feature' },
      { label: '体验优化', value: 'improvement' },
      { label: '其他', value: 'other' },
    ]
  }
  return options
}

/**
 * 反馈状态选项
 */
export async function getFeedbackStatusOptions(): Promise<Array<{ label: string; value: string }>> {
  const options = await getDictOptions('feedback_status')
  if (options.length === 0) {
    return [
      { label: '待处理', value: 'pending' },
      { label: '处理中', value: 'processing' },
      { label: '已解决', value: 'resolved' },
      { label: '已拒绝', value: 'rejected' },
    ]
  }
  return options
}

/**
 * 公告类型选项
 */
export async function getAnnouncementTypeOptions(): Promise<Array<{ label: string; value: string }>> {
  const options = await getDictOptions('announcement_type')
  if (options.length === 0) {
    return [
      { label: '系统公告', value: 'system' },
      { label: '功能更新', value: 'feature' },
      { label: '活动通知', value: 'activity' },
      { label: '维护通知', value: 'maintenance' },
    ]
  }
  return options
}

/**
 * 优先级选项
 */
export async function getPriorityOptions(): Promise<Array<{ label: string; value: string }>> {
  const options = await getDictOptions('priority_level')
  if (options.length === 0) {
    return [
      { label: '低', value: 'low' },
      { label: '中', value: 'normal' },
      { label: '高', value: 'high' },
      { label: '紧急', value: 'urgent' },
    ]
  }
  return options
}

/**
 * 习惯频率选项
 */
export async function getHabitFrequencyOptions(): Promise<Array<{ label: string; value: string }>> {
  const options = await getDictOptions('habit_frequency')
  if (options.length === 0) {
    return [
      { label: '每天', value: 'daily' },
      { label: '每周', value: 'weekly' },
      { label: '每月', value: 'monthly' },
      { label: '自定义', value: 'custom' },
    ]
  }
  return options
}
