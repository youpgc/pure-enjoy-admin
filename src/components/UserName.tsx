import { Tooltip, Typography } from 'antd'
import type { UserInfo } from '../hooks/useUsernames'

interface UserNameProps {
  userId: string | null | undefined
  userMap: Map<string, UserInfo>
}

/**
 * 列表「用户名」列渲染。
 * 显示优先级：username → nickname → 原始 user_id（解析不到时回退原始 ID）。
 * 悬停显示完整 user_id，便于精确定位数据。
 */
export function UserName({ userId, userMap }: UserNameProps) {
  if (!userId) return <Typography.Text type="secondary">-</Typography.Text>
  const info = userMap.get(userId)
  const name = info?.username || info?.nickname || userId
  return (
    <Tooltip title={`用户ID: ${userId}`}>
      <Typography.Text>{name}</Typography.Text>
    </Tooltip>
  )
}
