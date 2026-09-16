// ==================== JSON 表单字段公共工具 ====================
//
// 宠物配置表大量 jsonb 字段（weights / effect / conditions / render3d ...）。
// 编辑弹窗统一走「TextArea 展示格式化 JSON + 保存前 parse 校验」，
// 解析失败提示行内错误而非静默写库。

import { Json } from '../types/database'

export interface JsonParseResult {
  ok: boolean
  value: Json
  error: string | null
}

/// 解析 JSON 文本；空串视为空对象 {}（多数 jsonb 列默认 '{}' 不为 null）
export function parseJsonText(text: string | undefined | null): JsonParseResult {
  const raw = (text ?? '').trim()
  if (!raw) return { ok: true, value: {}, error: null }
  try {
    const parsed = JSON.parse(raw)
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
      // 允许数组（如 unlock_conditions 默认 '[]'），仅拒绝标量
      if (Array.isArray(parsed)) return { ok: true, value: parsed, error: null }
      return { ok: false, value: {}, error: '必须是 JSON 对象或数组' }
    }
    return { ok: true, value: parsed, error: null }
  } catch (e) {
    return { ok: false, value: {}, error: `JSON 格式错误：${e instanceof Error ? e.message : String(e)}` }
  }
}

/// 把 jsonb 值格式化为可编辑文本（编辑回显用；null/undefined 回退默认）
export function stringifyJson(value: Json | null | undefined, fallback = '{}'): string {
  if (value === null || value === undefined) return fallback
  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return fallback
  }
}
