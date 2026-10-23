// 数据分析页数据访问（页面禁直连 supabase，查询统一收敛到 service）
import { supabase } from '../utils/supabase'
import { apiQuery } from '../utils/apiClient'

/// 查询时间范围内注册用户的 created_at 列表（排除已删除，上限 5000 条）
export const fetchNewUsersByRange = (startDate: string, endDate: string) =>
  apiQuery<Array<{ created_at: string }>>(
    () =>
      supabase
        .from('users')
        .select('created_at')
        .eq('is_deleted', false)
        .gte('created_at', startDate)
        .lte('created_at', endDate + 'T23:59:59')
        .limit(5000),
    'Analytics-用户数据',
  )

/// 查询时间范围内新增反馈的 created_at 列表（排除已删除，上限 5000 条）
export const fetchNewFeedbackByRange = (startDate: string, endDate: string) =>
  apiQuery<Array<{ created_at: string }>>(
    () =>
      supabase
        .from('user_feedback')
        .select('created_at')
        .eq('is_deleted', false)
        .gte('created_at', startDate)
        .lte('created_at', endDate + 'T23:59:59')
        .limit(5000),
    'Analytics-反馈数据',
  )
