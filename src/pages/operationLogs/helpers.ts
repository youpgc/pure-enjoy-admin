import { DETAIL_ENUM_MAP } from '../../constants'

// 详情中需隐藏的系统字段，仅保留业务可读字段
const DETAIL_HIDDEN_FIELDS = new Set(['id', 'created_at', 'updated_at', 'auth_id', 'user_id', 'is_deleted'])

/** 把一条记录快照转成可读文本（隐藏系统字段、跳过空值），并按所属模块翻译枚举值 */
export function snapshotToText(rec: Record<string, unknown>, module?: string): string {
  const enumByField = module ? DETAIL_ENUM_MAP[module] : undefined
  const parts: string[] = []
  for (const [k, v] of Object.entries(rec)) {
    if (DETAIL_HIDDEN_FIELDS.has(k)) continue
    if (v === null || v === undefined || v === '') continue
    let display = typeof v === 'object' ? JSON.stringify(v) : String(v)
    // 枚举值翻译：命中「模块 + 字段 + 值」时显示中文，否则保留原始值（不丢信息）
    const fieldMap = enumByField?.[k]
    if (fieldMap) {
      const mapped = fieldMap[display]
      if (mapped !== undefined) display = mapped
    }
    parts.push(`${k}=${display}`)
  }
  return parts.length ? parts.join('，') : '(无其它业务字段)'
}

/** 把 details 渲染为可读摘要：删除/更新快照优先展示业务内容（枚举已翻译），其余原样 JSON */
export function formatDetails(details: Record<string, unknown> | undefined, module?: string): string {
  if (!details) return ''
  if (details.deleted !== undefined) {
    const d = details.deleted
    if (Array.isArray(d)) {
      if (d.length === 0) return `共删除 ${details.count ?? 0} 条（快照缺失）`
      return `共删除 ${details.count ?? d.length} 条：${d.map((r) => snapshotToText(r as Record<string, unknown>, module)).join('；')}`
    }
    return snapshotToText(d as Record<string, unknown>, module)
  }
  if (details.changes !== undefined) {
    return `变更：${snapshotToText(details.changes as Record<string, unknown>, module)}`
  }
  return JSON.stringify(details)
}
