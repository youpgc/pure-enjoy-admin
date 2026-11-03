import { apiQuery, apiExecute } from '../utils/apiClient'
import { supabase } from '../utils/supabase'
import type { DateRangeValue } from '../components/common/DateRangeFilter'

// pet_checkin_* 为新表，尚未进入 database.ts 生成类型——
// 局部解类型（表结构见签到体系 SQL；生成类型更新后可回归 typed）
const sb = supabase as unknown as { from: (table: string) => any; rpc: (fn: string, args?: Record<string, unknown>) => PromiseLike<any> }

// ==================== 宠物签到配置（宠物模块独享签到体系） ====================
//
// 数据面：
//   pet_checkin_days            月度奖励模板（31 槽，运营唯一编辑面）
//   pet_checkin_month_snapshots 月度快照（固化后当月恒定，只读）
//   pet_checkin_records         签到流水（只读）
//
// 生效语义：奖励随上月配置继承、修改下月生效——保存模板成功后立即预固化
// 次月快照（rpc_pet_checkin_prefetch），生效时点 = 保存时刻，而非用户首次访问。

export interface PetCheckinDayRow {
  day: number
  reward: { gold: number; items: Array<{ code: string; count: number }> }
  updated_at?: string
}

export interface PetCheckinSnapshotRow {
  month_key: string
  days: Record<string, { gold: number; items: Array<{ code: string; count: number }> }>
  milestones: Array<{ day_threshold: number; reward: { gold: number; items: Array<{ code: string; count: number }> } }>
  generated_at: string
}

export interface PetCheckinRecordRow {
  id: string
  user_id: string
  checkin_date: string
  makeup: boolean
  reward: { gold?: number; slot?: number; items?: Array<{ code: string; count: number }> }
  created_at: string
}

const petCheckinService = {
  // ---- 模板（31 槽） ----
  async listDays() {
    return apiQuery<PetCheckinDayRow[]>(
      () => sb.from('pet_checkin_days').select('day,reward,updated_at').order('day'),
      'pet_checkin_days 查询'
    )
  },
  async upsertDay(day: number, reward: PetCheckinDayRow['reward']) {
    return apiExecute(
      () =>
        sb.from('pet_checkin_days').upsert(
          { day, reward, updated_at: new Date().toISOString() },
          { onConflict: 'day' }
        ),
      `pet_checkin_days 保存(${day})`
    )
  },

  // ---- 快照 / 流水（只读） ----
  async listSnapshots() {
    return apiQuery<PetCheckinSnapshotRow[]>(
      () =>
        sb
          .from('pet_checkin_month_snapshots')
          .select('month_key,days,milestones,generated_at')
          .order('month_key'),
      'pet_checkin_month_snapshots 查询'
    )
  },
  async listRecords(limit: number, createdRange?: DateRangeValue | null) {
    return apiQuery<PetCheckinRecordRow[]>(
      () => {
        let q = sb
          .from('pet_checkin_records')
          .select('id,user_id,checkin_date,makeup,reward,created_at')
          .order('created_at', { ascending: false })
        if (createdRange) {
          q = (q as any).gte('created_at', createdRange.start).lte('created_at', createdRange.end)
        }
        return q.limit(limit)
      },
      'pet_checkin_records 查询'
    )
  },

  // 保存成功后预固化次月快照（生效时点 = 保存时刻）
  async prefetchNext() {
    const next = new Date()
    next.setMonth(next.getMonth() + 1)
    const year = next.getFullYear()
    const month = next.getMonth() + 1
    return apiExecute(
      () => sb.rpc('rpc_pet_checkin_prefetch', { p_year: year, p_month: month }),
      `rpc_pet_checkin_prefetch(${year}-${month})`
    )
  },
}

export { petCheckinService }
