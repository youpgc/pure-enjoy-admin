// UserDimensionList 模块类型定义（从 components/UserDimensionList.tsx 抽取）
import type { ColumnsType } from 'antd/es/table'
import type { ReactNode } from 'react'

export interface UserSummary {
  user_id: string
  user_nickname?: string
  total_count: number
  latest_date?: string
  latest_data?: Record<string, unknown>
  categories?: string[]
  stats?: Record<string, number | string>
}

export interface RecordItem {
  id: string
  user_id: string
  created_at: string
  updated_at?: string
  [key: string]: unknown
}

export interface ModuleConfig {
  key: string
  title: string
  tableName: string
  detailColumns: ColumnsType<RecordItem>
  detailTitle?: string
  onUserSelect?: (userId: string) => void
  /** 详情弹窗中表格下方的自定义内容（如打卡记录查看按钮） */
  detailExtraContent?: (record: RecordItem) => ReactNode
}
