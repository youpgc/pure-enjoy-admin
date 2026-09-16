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

/// 安全把 jsonb 值读成对象
export function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? { ...(value as Record<string, unknown>) }
    : {}
}

/// 安全把 jsonb 值读成数组
export function asArray(value: unknown): Record<string, unknown>[] {
  if (!Array.isArray(value)) return []
  return value.filter(
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
