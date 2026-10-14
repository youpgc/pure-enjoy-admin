/**
 * 字典服务 - 从本地后端字典端点获取动态配置数据
 * 替代硬编码的分类/选项数据
 * 数据源：GET /dict/items?typeCode=（公开端点，服务端返回启用态字典项并按 sort_order 排序）
 */

import { apiRequest } from './adminHttp'

export interface DictItem {
  code: string
  label: string
  value: string | null
  sort_order: number
  extra: Record<string, any> | null
}

/// 后端 DictItemVO 形态（extra 为 jsonb 序列化的字符串，需解析为对象）
interface DictItemRaw {
  code: string
  label: string
  value: string | null
  sort_order: number
  extra: string | null
}

/// 解析后端 extra（JSON 字符串）为对象；空/非法返回 null
function parseExtra(raw: string | null): Record<string, any> | null {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed : null
  } catch {
    return null
  }
}

// 字典数据缓存
const dictCache: Record<string, DictItem[]> = {}
let cacheTimestamp: Record<string, number> = {}
const CACHE_TTL = 5 * 60 * 1000 // 5分钟缓存

// 并发去重：同一 typeCode 的多个并发请求只发一次真实查询。
// TTL 缓存只能拦住「上一次已落定」的请求，拦不住同帧并发——
// 例如 UserDetailDrawer 挂载时，同一 typeCode 的 useDictOptions 与 useDictColors
// 会并发触发两次 getDictItems，须用 in-flight Promise 去重，否则每种类型都被打 2 次
// dict_types + dict_items 查询。
const dictInflight: Record<string, Promise<DictItem[]>> = {}

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

  // 并发去重：已有同 typeCode 的在途请求则直接复用其结果
  if (dictInflight[typeCode]) {
    return dictInflight[typeCode]
  }

  const inflight = (async (): Promise<DictItem[]> => {
    try {
      const rows = await apiRequest<DictItemRaw[]>(
        'GET',
        `/dict/items?typeCode=${encodeURIComponent(typeCode)}`
      )
      const items: DictItem[] = ((rows || []) as DictItemRaw[]).map((item) => ({
        code: item.code ?? '',
        label: item.label ?? '',
        value: item.value ?? null,
        sort_order: item.sort_order ?? 0,
        extra: parseExtra(item.extra ?? null),
      }))

      // 更新缓存
      dictCache[typeCode] = items
      cacheTimestamp[typeCode] = Date.now()

      return items
    } catch (err) {
      // 类型不存在/网络异常：空列表回退（调用方有硬编码默认项兜底）
      if (import.meta.env.DEV) {
        console.warn(`获取字典数据失败(${typeCode}):`, err)
      }
      return []
    } finally {
      delete dictInflight[typeCode]
    }
  })()

  dictInflight[typeCode] = inflight
  return inflight
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
    delete dictInflight[typeCode]
  } else {
    Object.keys(dictCache).forEach(key => {
      delete dictCache[key]
      delete cacheTimestamp[key]
    })
    Object.keys(dictInflight).forEach(key => {
      delete dictInflight[key]
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
      { label: '通讯', value: 'communication' },
      { label: '购物', value: 'shopping' },
      { label: '娱乐', value: 'entertainment' },
      { label: '居住', value: 'housing' },
      { label: '医疗', value: 'health' },
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
      { label: '玄幻', value: '玄幻' },
      { label: '修真', value: '修真' },
      { label: '都市', value: '都市' },
      { label: '言情', value: '言情' },
      { label: '科幻', value: '科幻' },
      { label: '历史', value: '历史' },
      { label: '游戏', value: '游戏' },
      { label: '悬疑', value: '悬疑' },
      { label: '武侠', value: '武侠' },
      { label: '灵异', value: '灵异' },
      { label: '其他', value: '其他' },
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
      { label: '待确认', value: 'pending' },
      { label: '已确认', value: 'confirmed' },
      { label: '处理中', value: 'in_progress' },
      { label: '已完结', value: 'resolved' },
      { label: '已拒绝', value: 'rejected' },
      { label: '已滞后', value: 'delayed' },
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
      { label: '高', value: 'high' },
      { label: '中', value: 'medium' },
      { label: '低', value: 'low' },
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
