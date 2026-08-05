import { supabase } from '../utils/supabase'
import { logApiError, handleApiError } from '../utils/apiClient'

/// 推荐配置行（与 recommend_config 表列及页面 RecConfig 对齐：cold_start 为文本枚举，exclude_ids 为逗号分隔文本）
export interface RecommendConfig {
  cold_start: string
  cold_min_reads: number
  rec_limit: number
  exclude_ongoing: boolean
  exclude_draft: boolean
  exclude_ids: string
  weight_category: number
  weight_read: number
  weight_collect: number
}

const CONFIG_COLUMNS =
  'cold_start, cold_min_reads, rec_limit, exclude_ongoing, exclude_draft, exclude_ids, weight_category, weight_read, weight_collect'

/// 读取 recommend_config 全局单行（审查 P1-4b：收敛页面层裸 supabase.from 到 service）
export const fetchRecommendConfig = async (): Promise<RecommendConfig | null> => {
  const { data, error } = await supabase
    .from('recommend_config')
    .select(CONFIG_COLUMNS)
    .eq('id', 'global')
    .maybeSingle()
  if (error) {
    logApiError(error, 'recommendConfig-加载')
    return null
  }
  return (data as RecommendConfig | null) ?? null
}

/// 保存 recommend_config（upsert 全局单行）
/// 注：recommend_config 写操作在 generated database.ts 解析为 never，builder 级 as any 收敛在 service 内
export const saveRecommendConfig = async (config: RecommendConfig): Promise<boolean> => {
  const { error } = await (supabase.from('recommend_config') as any)
    .upsert({ id: 'global', ...config })
  if (error) {
    handleApiError(error, 'recommendConfig-保存')
    return false
  }
  return true
}
