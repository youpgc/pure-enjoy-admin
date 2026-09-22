// ==================== 结构化 jsonb 编辑器公共工具 ====================
//
// 目标：jsonb 配置不再让运营手写 JSON，按「RPC 真实消费结构」拆成表单单项。
// 所有编辑器为受控组件（value/onChange），可直接放入 antd Form.Item；
// 未知键一律保留（防覆写清空服务端/种子写入的扩展键，如 note/mode）。

import type { Json } from '../../../../types/database'

/// 取对象中不属于已知键集合的其余键（未知键保留用）
export function extraKeys(
  value: unknown,
  known: string[]
): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (!known.includes(k)) out[k] = v
  }
  return out
}

/// jsonb 脏值还原：字符串（"{"a":1}" 形态）尝试 JSON.parse，失败原样返回
function unwrapJsonb(value: unknown): unknown {
  if (typeof value !== 'string' || !value.trim()) return value
  try {
    return JSON.parse(value)
  } catch {
    return value
  }
}

function warnUnreadableJsonb(expect: 'object' | 'array', value: unknown): void {
  if (import.meta.env.DEV) {
    console.warn(
      `[pet jsonb 编辑器] 值无法读成${expect === 'object' ? '对象' : '数组'}，已按空值处理（保存将覆盖原值）:`,
      value
    )
  }
}

/// 安全把 jsonb 值读成对象。
///
/// PostgREST 正常返回已解析对象，但线上存在「jsonb 列里存了 JSON 字符串」的脏值可能
/// （与已修的 JsonFormItem 缺陷同类）。此前脏值一律静默读成 {}，表单打开即丢显示、
/// 保存就把原值覆盖为空——无痕丢数据最难查。现改为：
/// - 字符串：先尝试 JSON.parse 还原对象；
/// - 还原失败或解析结果非对象（数组/标量）：开发态显式告警后返回 {}，
///   保存前运维可见键名，便于回查该列脏数据。
/// null / undefined / 空串属正常「未配置」，静默返回 {}。
export function asObject(value: unknown): Record<string, unknown> {
  if (value === null || value === undefined || value === '') return {}
  const raw = unwrapJsonb(value)
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    return { ...(raw as Record<string, unknown>) }
  }
  warnUnreadableJsonb('object', value)
  return {}
}

/// 安全把 jsonb 值读成数组（脏值还原策略同 asObject）
export function asArray(value: unknown): Record<string, unknown>[] {
  if (value === null || value === undefined || value === '') return []
  const raw = unwrapJsonb(value)
  if (!Array.isArray(raw)) {
    warnUnreadableJsonb('array', value)
    return []
  }
  return raw.filter(
    (v): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v)
  )
}

/// 数字读取（null/undefined/NaN → fallback）
export function numOf(value: unknown, fallback: number | null = null): number | null {
  if (value === null || value === undefined || value === '') return fallback
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}

export type JsonValue = Json
