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
      // 获取用户统计数据
      const [expensesResult, moodsResult, weightsResult, notesResult, novelsResult, logsResult] =
        await fetchUserActivity(user.id)

      if (!mountedRef.current) return

      setUserStats({
        expense_count: expensesResult.count || 0,
        mood_count: moodsResult.count || 0,
        weight_count: weightsResult.count || 0,
        note_count: notesResult.count || 0,
        novel_count: novelsResult.count || 0,
      })
      setUserLogs((logsResult.data || []) as unknown as OperationLog[])
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
