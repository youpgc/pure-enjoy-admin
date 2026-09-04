// Feedback 状态流转动作元数据（从 Feedback.tsx 抽取，含图标 JSX，故为 tsx）
import {
  CheckOutlined, CloseOutlined, ClockCircleOutlined,
  DeleteOutlined, SyncOutlined, CheckCircleOutlined,
} from '@ant-design/icons'
import type { ReactNode } from 'react'

export interface ActionMeta {
  color: string
  label: string
  icon: ReactNode
}

export const ACTION_TAG_MAP: Record<string, ActionMeta> = {
  confirmed: { color: 'blue', label: '确认', icon: <CheckOutlined /> },
  in_progress: { color: 'orange', label: '处理中', icon: <SyncOutlined spin /> },
  resolved: { color: 'green', label: '完成', icon: <CheckCircleOutlined /> },
  rejected: { color: 'red', label: '拒绝', icon: <CloseOutlined /> },
  delayed: { color: 'gold', label: '滞后', icon: <ClockCircleOutlined /> },
  deleted: { color: 'default', label: '删除', icon: <DeleteOutlined /> },
}
