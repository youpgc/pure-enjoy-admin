import { Tooltip, Typography } from 'antd'
import type { UserInfo } from '../../hooks/useUsernames'
import {
  UNKNOWN_USER_LABEL,
  userDisplayName,
} from '../../utils/userDisplay'

interface UserNameProps {
  userId: string | null | undefined
  userMap: Map<string, UserInfo>
}

/**
 * 列表「用户名」列渲染（全后台统一入口）。
 *
 * 显示优先级由 `userDisplayName` 统一（唯一真相，见 `utils/userDisplay.ts`）：
 * `username → nickname → 「未知用户」/原值`。
 *
 * ⚠️ 2026-09-15 变更：解析不到时**不再回退显示原始 user_id**——uuid 或旧业务 ID
 * 都是机器码，会让「用户名」列看起来像「用户ID」列（用户反馈「展示为原来的 id」）。
 * 原始 ID 仍可通过悬停查看，且各页普遍另有「用户ID」列承载。
 */
export function UserName({ userId, userMap }: UserNameProps) {
  if (!userId) return <Typography.Text type="secondary">-</Typography.Text>
  const name = userDisplayName(userId, userMap.get(userId))
  const unresolved = name === UNKNOWN_USER_LABEL
  return (
    <Tooltip title={`用户ID: ${userId}`}>
      <Typography.Text type={unresolved ? 'secondary' : undefined}>
        {name}
      </Typography.Text>
    </Tooltip>
  )
}
