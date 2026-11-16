import React from 'react'
import type { DbJourneyProgress } from '../../types/database'
import { userService } from '../../services/userService'
import { JOURNEY_MERIT_SOURCE_MAP } from '../../constants/game'

// ==================== 西行钱包共享常量与工具 ====================
// 三个 Tab 共用的筛选常量、展示组件与解析函数。

export const PAGE_SIZE = 10

// 用户筛选输入为完整 UUID 时按 user_id 精确过滤，否则走用户名/昵称模糊解析
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export const MERIT_SOURCE_OPTIONS = Object.entries(JOURNEY_MERIT_SOURCE_MAP).map(
  ([value, v]) => ({ value, label: v.label })
)

export const CLEARED_OPTIONS = [
  { value: 'true', label: '通关' },
  { value: 'false', label: '失败' },
]

/// 单条流水变动展示（正绿负红，与宠物金币流水同口径）
export const DeltaText: React.FC<{ value: number }> = ({ value }) => (
  <span style={{ color: value >= 0 ? '#52c41a' : '#ff4d4f', fontWeight: 500 }}>
    {value >= 0 ? '+' : ''}
    {value}
  </span>
)

/// 对局时长展示：不足 1 分钟显示秒（1 位小数），否则显示「X分XX秒」
export const formatDuration = (ms: number | null | undefined): string => {
  if (ms === null || ms === undefined) return '-'
  const totalSec = ms / 1000
  if (totalSec < 60) return `${totalSec.toFixed(1)}s`
  const m = Math.floor(totalSec / 60)
  const s = Math.floor(totalSec % 60)
  return `${m}分${String(s).padStart(2, '0')}秒`
}

/// 用户筛选输入 → user_id 集合（UUID 直取；关键词经用户名/昵称解析）。
/// 返回 undefined = 不筛选；空数组 = 无匹配用户（调用方直接清空列表）。
export const resolveUserIds = async (keyword: string): Promise<string[] | undefined | null> => {
  const kw = keyword.trim()
  if (!kw) return undefined
  if (UUID_RE.test(kw)) return [kw]
  const ids = await userService.findUserIdsByKeyword(kw)
  if (!ids.success) return null
  return ids.data ?? []
}

/// 快照 sanity 校验：merit_balance>=0 且 farthest<=81（表有 CHECK 兜底，
/// 此处防数据漂移/双写回退类异常），违例行红标
export const isProgressAnomaly = (r: DbJourneyProgress): boolean =>
  r.merit_balance < 0 || r.farthest_level_no > 81
