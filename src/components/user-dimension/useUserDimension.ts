// UserDimensionList 数据/操作逻辑 Hook（从 components/UserDimensionList.tsx 抽取，行为保持）
import { useState, useCallback, useEffect, useRef } from 'react'
import type { TablePaginationConfig } from 'antd/es/table'
import { supabase } from '../../utils/supabase'
import { BaseService, handleApiError, apiQuery } from '../../utils/apiClient'
import type { RecordItem, UserSummary } from './types'
import { DEFAULT_PAGE_SIZE, PAGE_SIZE_OPTIONS } from './constants'

interface UseUserDimensionParams {
  tableName: string
  title: string
  defaultPageSize?: number
  pageSizeOptions?: string[]
  onUserSelect?: (userId: string) => void
}

export function useUserDimension({
  tableName,
  title,
  defaultPageSize = DEFAULT_PAGE_SIZE,
  pageSizeOptions = PAGE_SIZE_OPTIONS,
  onUserSelect,
}: UseUserDimensionParams) {
  // 状态
  const [loading, setLoading] = useState(true)
  const [dataLimitWarning, setDataLimitWarning] = useState<string | null>(null)
  const [data, setData] = useState<UserSummary[]>([])
  const [pagination, setPagination] = useState<TablePaginationConfig>({
    current: 1,
    pageSize: defaultPageSize,
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

  const recordService = new BaseService<RecordItem>(tableName, { defaultOrder: { column: 'user_id', ascending: true } })
  const detailService = new BaseService<RecordItem>(tableName, { defaultOrder: { column: 'created_at', ascending: false } })

  // 用户信息缓存（从users表关联）
  const [userMap, setUserMap] = useState<Map<string, { nickname: string; username: string }>>(new Map())

  // 加载用户信息
  const fetchUserInfo = useCallback(async (userIds: string[]) => {
    if (userIds.length === 0) return
    try {
      const uniqueIds = [...new Set(userIds)]
      // 分批查询，每批最多100个ID
      const batchSize = 100
      const map = new Map<string, { nickname: string; username: string }>()
      for (let i = 0; i < uniqueIds.length; i += batchSize) {
        const batch = uniqueIds.slice(i, i + batchSize)
        const { data, error } = await supabase
          .from('users' as any)
          .select('id, nickname, username')
          .in('id', batch) as any
        if (error) throw error
        for (const u of data || []) {
          map.set(u.id, { nickname: u.nickname || '', username: u.username || '' })
        }
      }
      setUserMap(map)
    } catch (error) {
      console.error('加载用户信息失败:', error)
    }
  }, [])

  // ==================== 数据加载（优先使用 RPC 后端聚合，降级为全量拉取） ====================

  const fetchData = useCallback(async () => {
    setLoading(true)
    setDataLimitWarning(null)
    try {
      // 优先尝试 RPC 后端聚合
      const rpcResult = await apiQuery<{ user_id: string; count: number; latest_record_at: string }[]>(
        () => (supabase.rpc('get_user_dimension_stats', {
          p_table_name: tableName,
          p_user_ids: null,
        } as any) as any),
        `UserDimensionList-${title}-RPC聚合`
      )

      if (rpcResult.success && rpcResult.data) {
        // RPC 调用成功，直接使用后端聚合结果
        const result: UserSummary[] = rpcResult.data.map((row) => ({
          user_id: row.user_id,
          user_nickname: undefined,
          total_count: row.count,
          latest_date: row.latest_record_at,
          categories: [],
          stats: {},
        }))
        result.sort((a, b) => b.total_count - a.total_count)

        setData(result)
        fetchUserInfo(result.map(u => u.user_id))
        return
      }

      // RPC 调用失败（函数不存在等），降级为原来的分批拉取逻辑
      console.warn(
        `[UserDimensionList] RPC 调用失败，降级为全量拉取。`,
        `请确保已创建 get_user_dimension_stats 函数。错误: ${rpcResult.errorMessage}`
      )

      // --- 降级逻辑：分批拉取全部数据 ---
      const MAX_RECORDS = 10000
      const allItems: Record<string, unknown>[] = []
      let offset = 0
      const batchSize = 1000
      let hasMore = true

      while (hasMore) {
        const batchResult = await recordService.findAll((q) => q.range(offset, offset + batchSize - 1))
        if (!batchResult.success) {
          handleApiError(batchResult.errorMessage, `UserDimensionList-${title}-数据加载`)
          break
        }
        const batch = batchResult.data || []
        if (batch.length === 0) {
          hasMore = false
        } else {
          allItems.push(...batch)
          if (batch.length < batchSize) {
            hasMore = false
          }
          offset += batchSize

          // 超过最大限制时停止拉取并显示警告
          if (allItems.length >= MAX_RECORDS) {
            setDataLimitWarning(`数据量超过 ${MAX_RECORDS} 条限制，仅加载了前 ${MAX_RECORDS} 条记录，统计结果可能不完整`)
            hasMore = false
          }
        }
      }

      // 按用户聚合
      const aggregatedMap = new Map<string, UserSummary>()

      for (const item of allItems) {
        const uid = item.user_id as string
        if (!uid) continue

        if (!aggregatedMap.has(uid)) {
          const displayName = (item.user_nickname as string) || `用户${uid.substring(0, 6)}`

          aggregatedMap.set(uid, {
            user_id: uid,
            user_nickname: displayName,
            total_count: 0,
            latest_date: (item.created_at as string) || (item.updated_at as string),
            categories: [],
            stats: {},
          })
        }

        const summary = aggregatedMap.get(uid)!
        summary.total_count++

        // 更新最新日期
        const itemDate = (item.created_at as string) || (item.updated_at as string)
        if (itemDate && (!summary.latest_date || itemDate > summary.latest_date)) {
          summary.latest_date = itemDate
          summary.latest_data = item
        }

        // 收集分类
        const cat = item.category as string
        if (cat && !summary.categories?.includes(cat)) {
          summary.categories = [...(summary.categories || []), cat]
        }
      }

      // 转换为数组并排序
      const fallbackResult = Array.from(aggregatedMap.values())
      fallbackResult.sort((a, b) => b.total_count - a.total_count)

      setData(fallbackResult)
      // 加载用户信息
      fetchUserInfo(fallbackResult.map(u => u.user_id))
    } catch (error) {
      handleApiError(error, `UserDimensionList-${title}-数据加载`)
    } finally {
      setLoading(false)
    }
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
      const result = await detailService.paginate(page, pageSize, (q) => q.eq('user_id', userId))
      if (!result.success) {
        handleApiError(result.errorMessage, 'UserDimensionList-详情数据')
        return
      }
      setDetailData((result.data?.data || []) as RecordItem[])
      setDetailTotal(result.data?.total || 0)
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

  return {
    loading,
    dataLimitWarning,
    data,
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
    handleViewDetail,
    handleDetailModalClose,
    handleDetailPageChange,
  }
}
