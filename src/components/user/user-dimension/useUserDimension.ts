// UserDimensionList 数据/操作逻辑 Hook（从 components/UserDimensionList.tsx 抽取，行为保持）
// 数据面已切本地后端：/admin/user-data/{table}/stats|list|delete（表名服务端白名单），
// 用户信息解析走 /admin/users/by-ids（本地单 ID 体系，无 auth_id 双键）
import { useState, useCallback, useEffect, useRef } from 'react'
import type { TablePaginationConfig } from 'antd/es/table'
import { message } from 'antd'
import { apiRequest } from '../../../utils/adminHttp'
import { handleApiError } from '../../../utils/apiClient'
import type { RecordItem, UserSummary } from './types'
import { DEFAULT_PAGE_SIZE, PAGE_SIZE_OPTIONS } from './constants'

interface UseUserDimensionParams {
  tableName: string
  title: string
  defaultPageSize?: number
  pageSizeOptions?: string[]
  onUserSelect?: (userId: string) => void
  /** 是否允许后台删除（P1-6 UGC moderation）；由调用方按模块 + 角色判定后传入 */
  canDelete?: boolean
}

export function useUserDimension({
  tableName,
  title,
  defaultPageSize = DEFAULT_PAGE_SIZE,
  pageSizeOptions = PAGE_SIZE_OPTIONS,
  onUserSelect,
  canDelete = false,
}: UseUserDimensionParams) {
  // 状态
  const [loading, setLoading] = useState(true)
  const [dataLimitWarning, setDataLimitWarning] = useState<string | null>(null)
  const [data, setData] = useState<UserSummary[]>([])
  const [total, setTotal] = useState(0)
  const [totalRecords, setTotalRecords] = useState(0)
  const [pagination, setPagination] = useState<TablePaginationConfig>({
    current: 1,
    pageSize: defaultPageSize,
    total: 0,
    showSizeChanger: true,
    showQuickJumper: true,
    pageSizeOptions,
    showTotal: (total, range) => `显示 ${range[0]}-${range[1]} 条，共 ${total} 个用户`,
  })

  // 详情弹窗状态
  const [detailModalOpen, setDetailModalOpen] = useState(false)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailData, setDetailData] = useState<RecordItem[]>([])
  const [detailTotal, setDetailTotal] = useState(0)
  const [detailPage, setDetailPage] = useState(1)
  const [detailPageSize, setDetailPageSize] = useState(defaultPageSize)
  const [selectedUser, setSelectedUser] = useState<UserSummary | null>(null)

  // 用 ref 防止重复请求
  const detailFetchingRef = useRef(false)

  // 用户信息缓存（从users表关联）
  const [userMap, setUserMap] = useState<Map<string, { nickname: string; username: string }>>(new Map())

  // 加载用户信息
  const fetchUserInfo = useCallback(async (userIds: string[]) => {
    if (userIds.length === 0) return
    try {
      const uniqueIds = [...new Set(userIds)]
      // 后端单端点批量解析（上限 100）；本地单 ID 体系，直接按 id 建入 map
      const map = new Map<string, { nickname: string; username: string }>()
      for (let i = 0; i < uniqueIds.length; i += 100) {
        const batch = uniqueIds.slice(i, i + 100)
        const rows = await apiRequest<Array<{ id: string; nickname: string | null; username: string | null }>>(
          'GET',
          `/admin/users/by-ids?ids=${encodeURIComponent(batch.join(','))}`,
        )
        for (const u of rows) {
          map.set(u.id, { nickname: u.nickname || '', username: u.username || '' })
        }
      }
      setUserMap(map)
    } catch (error) {
      handleApiError(error, 'UserDimension-加载用户信息')
    }
  }, [])

  // ==================== 数据加载（后端聚合：服务端分页） ====================

  const fetchData = useCallback(async (page?: number, pageSize?: number) => {
    const curPage = page ?? pagination.current ?? 1
    const curSize = pageSize ?? pagination.pageSize ?? defaultPageSize
    setLoading(true)
    setDataLimitWarning(null)
    try {
      // 后端聚合：按用户分组行数倒序，返回 {rows, total_users, total_records}
      const payload = await apiRequest<{
        rows: Array<{ user_id: string; count: number; latest_record_at: string }>
        total_users: number
        total_records: number
      }>('GET', `/admin/user-data/${tableName}/stats?page=${curPage}&page_size=${curSize}`)

      const result: UserSummary[] = payload.rows.map((row) => ({
        user_id: row.user_id,
        user_nickname: undefined,
        total_count: row.count,
        latest_date: row.latest_record_at,
        categories: [],
        stats: {},
      }))

      setData(result)
      setTotal(payload.total_users)
      setTotalRecords(payload.total_records)
      setPagination((prev) => ({ ...prev, current: curPage, pageSize: curSize, total: payload.total_users }))
      fetchUserInfo(result.map((u) => u.user_id))
    } catch (error) {
      handleApiError(error, `UserDimensionList-${title}-数据加载`)
    } finally {
      setLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tableName, title, fetchUserInfo])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // ==================== 详情弹窗数据加载（手动触发，避免循环） ====================

  const fetchDetailData = useCallback(async (userId: string, page: number, pageSize: number) => {
    if (!userId || detailFetchingRef.current) return

    detailFetchingRef.current = true
    setDetailLoading(true)
    try {
      const result = await apiRequest<{ list: RecordItem[]; total: number }>(
        'GET',
        `/admin/user-data/${tableName}?user_id=${encodeURIComponent(userId)}&page=${page}&page_size=${pageSize}`,
      )
      setDetailData(result.list || [])
      setDetailTotal(result.total || 0)
    } catch (error) {
      handleApiError(error, 'UserDimensionList-详情数据')
    } finally {
      setDetailLoading(false)
      detailFetchingRef.current = false
    }
  }, [tableName])

  // 打开弹窗时加载第一页
  useEffect(() => {
    if (detailModalOpen && selectedUser) {
      setDetailPage(1)
      setDetailPageSize(defaultPageSize)
      fetchDetailData(selectedUser.user_id, 1, defaultPageSize)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detailModalOpen, selectedUser])

  // ==================== 操作处理 ====================

  const handleViewDetail = useCallback((record: UserSummary) => {
    setSelectedUser(record)
    setDetailModalOpen(true)
    // 通知父组件用户选择变化
    onUserSelect?.(record.user_id)
  }, [onUserSelect])

  const handleDetailModalClose = useCallback(() => {
    setDetailModalOpen(false)
    setSelectedUser(null)
    setDetailData([])
    setDetailTotal(0)
  }, [])

  // 详情分页变化时手动触发请求
  const handleDetailPageChange = useCallback((page: number, pageSize: number) => {
    setDetailPage(page)
    setDetailPageSize(pageSize)
    if (selectedUser) {
      fetchDetailData(selectedUser.user_id, page, pageSize)
    }
  }, [selectedUser, fetchDetailData])

  // ==================== 后台删除（P1-6 UGC moderation） ====================

  // 主表服务端分页：切换页码/页大小后重新请求
  const handlePageChange = useCallback((page: number, pageSize: number) => {
    setPagination((prev) => ({ ...prev, current: page, pageSize }))
    fetchData(page, pageSize)
  }, [fetchData])

  // 删除详情中的单条记录（仅 canDelete 模块开放）
  const handleDeleteRecord = useCallback(async (recordId: string) => {
    if (!canDelete) {
      message.warning('当前模块不支持后台删除')
      return
    }
    if (!selectedUser) return
    try {
      // 删除走后端 /admin/user-data/{table}/{id}：habits 的 habit_checkins 级联清理由服务端同事务处理
      await apiRequest<unknown>('DELETE', `/admin/user-data/${tableName}/${recordId}`)
      message.success('已删除该记录')
      // 重新加载详情（保留当前页）并刷新主表统计
      fetchDetailData(selectedUser.user_id, detailPage, detailPageSize)
      fetchData(pagination.current, pagination.pageSize)
    } catch (error) {
      handleApiError(error, 'UserDimensionList-删除记录')
    }
  }, [canDelete, selectedUser, tableName, detailPage, detailPageSize, fetchDetailData, fetchData, pagination.current, pagination.pageSize])

  return {
    loading,
    dataLimitWarning,
    data,
    total,
    totalRecords,
    pagination,
    setPagination,
    detailModalOpen,
    detailLoading,
    detailData,
    detailTotal,
    detailPage,
    detailPageSize,
    selectedUser,
    userMap,
    fetchData,
    handlePageChange,
    handleDeleteRecord,
    canDelete,
    handleViewDetail,
    handleDetailModalClose,
    handleDetailPageChange,
  }
}
