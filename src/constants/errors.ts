// ==================== Supabase 错误码 ====================

export const SUPABASE_ERROR_CODE_MAP: Record<string, string> = {
  PGRST116: '数据不存在或已被删除',
  PGRST301: '没有权限执行此操作',
  '23505': '数据已存在（唯一性冲突）',
  '23503': '关联数据不存在（外键约束）',
  '42501': '没有权限执行此操作',
}

// ==================== 应用配置类型 ====================

export const CONFIG_TYPE_MAP: Record<string, string> = {
  string: '字符串',
  number: '数字',
  boolean: '布尔',
  json: 'JSON',
}

export const CONFIG_TYPE_OPTIONS = [
  { label: '字符串', value: 'string' as const },
  { label: '数字', value: 'number' as const },
  { label: '布尔', value: 'boolean' as const },
  { label: 'JSON', value: 'json' as const },
]
