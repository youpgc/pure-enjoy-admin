// 通知模块类型（从 Notifications.tsx 抽离，审查 P1 膨胀）

export interface Notification {
  id: string
  user_id: string
  type: string
  title: string
  body: string
  icon?: string
  color?: string
  payload?: Record<string, unknown>
  is_read: boolean
  read_at?: string
  created_at: string
}

export interface NotificationFilters {
  keyword: string
  type: string | undefined
}
