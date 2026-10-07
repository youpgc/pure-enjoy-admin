import { supabase } from '../utils/supabase'
import { apiQuery, handleApiError, successResponse, errorResponse } from '../utils/apiClient'

/// 通用：按 id 读取任意表记录（供 EditRecordModal 等动态表编辑弹窗，审查 P1-4b：
/// 把组件层裸 supabase.from 收敛到 service 层，组件只调本方法）
/// 注：动态表名无法走强类型（generated database.ts 对写操作解析为 never），builder 级 as any 收敛在 service 内
export const fetchGenericRecord = (table: string, columns: string, id: string) =>
  apiQuery(() => (supabase.from(table) as any).select(columns).eq('id', id).single(), `genericRecord-加载:${table}`)

/// 通用：按 id 更新任意表记录
/// ★ 带 .select() 受影响行校验（审查报告 Admin·基建#1）：此前走 apiExecute 只看
/// error——0 行命中（RLS 拒绝 / id 不存在）静默返回成功，用户以为已保存。
/// 现更新后回读校验行数，0 行按失败上报；BaseService.update 同类问题已修，此处补齐。
export async function updateGenericRecord(
  table: string,
  id: string,
  data: Record<string, unknown>,
) {
  try {
    const { data: rows, error } = await (supabase.from(table) as any)
      .update(data)
      .eq('id', id)
      .select()

    if (error) throw error
    if (!rows || rows.length === 0) {
      throw new Error('未更新任何行（记录不存在或无权限）')
    }
    return successResponse(rows[0] as Record<string, unknown>)
  } catch (err) {
    const msg = handleApiError(err, `genericRecord-保存:${table}`)
    return errorResponse(msg)
  }
}
