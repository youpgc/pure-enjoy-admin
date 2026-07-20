// 应用版本模块共享类型定义

export interface AppVersion {
  id: string
  platform: 'ios' | 'android' | 'web'
  version: string
  build_number: number
  is_force_update: boolean
  release_notes?: string
  release_type?: string
  apk_url?: string
  apk_size?: number
  status?: string
  released_at?: string
  revoked_at?: string
  created_by?: string
  checksum?: string
  file_name?: string
  created_at: string
  updated_at: string
}

export interface VersionFilters {
  keyword: string
  platform: string | undefined
  status: string | undefined
}
