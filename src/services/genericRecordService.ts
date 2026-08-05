import { supabase } from '../utils/supabase'
import { apiQuery, apiExecute } from '../utils/apiClient'

/// 通用：按 id 读取任意表记录（供 EditRecordModal 等动态表编辑弹窗，审查 P1-4b：
/// 把组件层裸 supabase.from 收敛到 service 层，组件只调本方法）
/// 注：动态表名无法走强类型（generated database.ts 对写操作解析为 never），builder 级 as any 收敛在 service 内
export const fetchGenericRecord = (table: string, columns: string, id: string) =>
  apiQuery(() => (supabase.from(table) as any).select(columns).eq('id', id).single(), `genericRecord-加载:${table}`)

/// 通用：按 id 更新任意表记录
export const updateGenericRecord = (table: string, id: string, data: Record<string, unknown>) =>
  apiExecute(() => (supabase.from(table) as any).update(data).eq('id', id), `genericRecord-保存:${table}`)
