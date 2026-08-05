import { supabase, getCurrentBusinessUserId } from '../utils/supabase'
import { apiQuery, apiExecute, logApiError } from '../utils/apiClient'

// ==================== 类型定义 ====================

export interface RankingIntervention {
  pin_ids: string[]
  block_ids: string[]
}

export interface RankingRules {
  rating_min_count: number
  new_book_days_threshold: number
  read_weight: number
  collect_weight: number
  rating_weight: number
}

// 运营干预 / 规则均为全局单行配置，约定主键值
const GLOBAL_ID = 'global'

// ==================== 服务 ====================

/**
 * 排行榜运营干预与规则配置服务。
 * 替代原 localStorage 方案：配置持久化到服务端，跨管理员 / 会话一致。
 * 所有读写经 apiQuery / apiExecute 统一错误处理 + 脱敏 + 错误日志；
 * 写操作额外记录 operation_logs（与 BaseService.audit 口径一致）。
 */
export const rankingService = {
  async getInterventions(): Promise<RankingIntervention> {
    const result = await apiQuery<RankingIntervention>(
      () => supabase
        .from('ranking_interventions')
        .select('pin_ids, block_ids')
        .eq('id', GLOBAL_ID)
        .maybeSingle(),
      'Rankings-加载干预',
    )
    if (result.success && result.data) {
      return {
        pin_ids: (result.data.pin_ids as string[]) || [],
        block_ids: (result.data.block_ids as string[]) || [],
      }
    }
    return { pin_ids: [], block_ids: [] }
  },

  async saveInterventions(pin_ids: string[], block_ids: string[]): Promise<boolean> {
    const result = await apiExecute(
      () => (supabase.from('ranking_interventions') as any)
        .upsert({
          id: GLOBAL_ID,
          pin_ids,
          block_ids,
          updated_at: new Date().toISOString(),
        }),
      'Rankings-保存干预',
    )
    if (result.success) {
      logOperation('update', 'ranking_interventions', { pin_ids, block_ids })
    }
    return result.success
  },

  async getRules(): Promise<RankingRules | null> {
    const result = await apiQuery<RankingRules>(
      () => supabase
        .from('ranking_rules')
        .select('rating_min_count, new_book_days_threshold, read_weight, collect_weight, rating_weight')
        .eq('id', GLOBAL_ID)
        .maybeSingle(),
      'Rankings-加载规则',
    )
    return result.success ? (result.data as RankingRules) : null
  },

  async saveRules(rules: RankingRules): Promise<boolean> {
    const result = await apiExecute(
      () => (supabase.from('ranking_rules') as any)
        .upsert({
          id: GLOBAL_ID,
          ...rules,
          updated_at: new Date().toISOString(),
        }),
      'Rankings-保存规则',
    )
    if (result.success) {
      logOperation('update', 'ranking_rules', { ...rules })
    }
    return result.success
  },
}

// 轻量操作审计（best-effort，与 BaseService.audit 口径一致）
async function logOperation(action: string, module: string, detail: object) {
  try {
    await (supabase.from('operation_logs') as any).insert({
      user_id: await getCurrentBusinessUserId(),
      action,
      module,
      target_id: GLOBAL_ID,
      ip: '127.0.0.1',
      details: detail,
    })
  } catch (err) {
    logApiError(err, `Rankings-${module}-audit`)
  }
}
