import { supabase } from '../utils/supabase'
import type { DbGameBestScore } from '../types/database'

/// 游戏中心 RPC 聚合：最佳成绩 / 积分流水合计 / 排行榜。

/// 游戏最佳成绩聚合（走 get_game_best_scores RPC）。
/// 注意：函数内按 get_user_business_id() 过滤，仅返回当前登录用户本人数据；
/// 后台全局概览请直接聚合 game_scores，勿依赖本方法。
export const getGameBestScores = (
  pGameId?: string | null
): Promise<{ data: DbGameBestScore[] | null; error: unknown }> =>
  supabase.rpc('get_game_best_scores', { p_game_id: pGameId ?? null } as any) as unknown as Promise<{
    data: DbGameBestScore[] | null
    error: unknown
  }>

/// 游戏积分流水聚合（奖励记录页「获取/消费合计」）：
/// 走 get_game_flow_totals RPC 按时间窗 SUM（数据量巨大，不做全表聚合）。
/// [fromIso]/[toIso] 为 ISO 字符串（to 为开区间上界）；error 上抛由调用方提示，
/// 不静默兜底 0（避免 RPC 被门禁拒绝时被误显示为 0）。
export async function getGameFlowTotals(
  fromIso?: string,
  toIso?: string
): Promise<{ earn: number; spend: number }> {
  const { data, error } = await (supabase.rpc('get_game_flow_totals', {
    p_from: fromIso ?? null,
    p_to: toIso ?? null,
  } as any) as any)
  if (error) throw new Error(error.message || 'get_game_flow_totals 调用失败')
  if (!Array.isArray(data)) throw new Error('get_game_flow_totals 返回结构异常')
  const earn = Number(data.find((r: any) => r.flow_type === 'game_earn')?.total ?? 0)
  const spend = Number(data.find((r: any) => r.flow_type === 'game_spend')?.total ?? 0)
  return { earn, spend }
}

/// 游戏排行榜（get_game_leaderboard RPC）。
/// security definer 跨玩家聚合：仅返回昵称/头像/最佳值/游玩次数/最近游玩，
/// 不含其他用户敏感字段；[pScope] 'all'=总榜 | 'week'=周榜（北京自然周）；
/// [pModeId] null=全模式合计；[pDimension] 为该游戏主维度码（is_primary）。
export interface GameLeaderboardRow {
  rank: number
  user_id: string
  nickname: string | null
  avatar_url: string | null
  best_value: number
  play_count: number
  last_played_at: string | null
  is_me: boolean
}

export async function getGameLeaderboard(
  pGameId: string,
  pDimension: string,
  pScope: 'all' | 'week',
  pModeId?: string | null,
  pLimit = 50
): Promise<GameLeaderboardRow[]> {
  const { data, error } = await (supabase.rpc('get_game_leaderboard', {
    p_game_id: pGameId,
    p_dimension: pDimension,
    p_scope: pScope,
    p_mode_id: pModeId ?? null,
    p_limit: pLimit,
  } as any) as any)
  if (error) throw new Error(error.message || 'get_game_leaderboard 调用失败')
  return (Array.isArray(data) ? data : []) as GameLeaderboardRow[]
}
