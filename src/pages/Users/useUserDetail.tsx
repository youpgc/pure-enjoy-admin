// 用户详情抽屉逻辑（从 useUsers 抽离，审查 P1 膨胀）
// 负责详情用户、抽屉开关、统计数据、操作日志与活动加载，独立于列表逻辑。
import { useState, useCallback } from 'react'
import type { User, UserStats, OperationLog } from '../../types/user'
import { fetchUserActivity } from '../../services/userService'
import { useMounted } from '../../hooks/useMounted'
import { logApiError } from '../../utils/apiClient'

export const useUserDetail = () => {
  const mountedRef = useMounted()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [detailUser, setDetailUser] = useState<User | null>(null)
  const [userStats, setUserStats] = useState<UserStats | null>(null)
  const [userLogs, setUserLogs] = useState<OperationLog[]>([])
  const [detailLoading, setDetailLoading] = useState(false)

  // 查看用户详情
  const handleViewUser = useCallback(async (user: User) => {
    setDetailUser(user)
    setDrawerOpen(true)
    setDetailLoading(true)

    try {
      // 后端单端点聚合：5 张生活/小说域表行数 + 最近 10 条操作日志
      const activity = await fetchUserActivity(user.id)

      if (!mountedRef.current) return

      setUserStats({
        expense_count: activity.expense_count,
        mood_count: activity.mood_count,
        weight_count: activity.weight_count,
        note_count: activity.note_count,
        novel_count: activity.novel_count,
      })
      setUserLogs(activity.logs || [])
    } catch (err) {
      logApiError(err, 'Users-获取用户详情')
      setUserStats(null)
      setUserLogs([])
    } finally {
      setDetailLoading(false)
    }
  }, [])

  return {
    drawerOpen,
    setDrawerOpen,
    detailUser,
    setDetailUser,
    userStats,
    setUserStats,
    userLogs,
    setUserLogs,
    detailLoading,
    handleViewUser,
  }
}
