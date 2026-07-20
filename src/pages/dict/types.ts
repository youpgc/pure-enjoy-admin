// 字典管理模块共享类型定义

export interface DictType {
  id: string
  code: string
  name: string
  description: string
  sort_order: number
  is_system: boolean
  status: string
  is_active: boolean
  type_code: string | null
  type_name: string | null
  created_at: string
  updated_at: string
}

export interface DictItem {
  id: string
  type_id: string
  code: string
  label: string
  value: string
  extra: Record<string, any>
  sort_order: number
  is_default: boolean
  status: string
  is_active: boolean
  extra_data: Record<string, any> | null
  created_at: string
  updated_at: string
}
