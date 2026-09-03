// UserDimensionList 数据/操作逻辑 Hook（从 components/UserDimensionList.tsx 抽取，行为保持）
import { useState, useCallback, useEffect, useRef } from 'react'
import type { TablePaginationConfig } from 'antd/es/table'
import { message } from 'antd'
import { supabase } from '../../../utils/supabase'
import { BaseService, handleApiError, apiQuery, logApiError } from '../../../utils/apiClient'
import { buildUserLookupOr } from '../../../utils/userId'
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
        // 双键解析：业务存在双 ID 架构，部分历史数据（如早期日志的 user_id 写入的是
        // auth UUID）仅能凭 UUID 命中，故同时按 id 与 auth_id 查询并都建入 map；
        // 但业务ID(U...) 只走 id 列，auth_id(uuid 类型) 仅接收 UUID 形态，否则报 22P02。
        const orFilter = buildUserLookupOr(batch)
        const { data, error } = await supabase
          .from('users' as any)
          .select('id, auth_id, nickname, username')
          .or(orFilter) as any
        if (error) throw error
        for (const u of data || []) {
          const val = { nickname: u.nickname || '', username: u.username || '' }
          map.set(u.id, val)
          if (u.auth_id) map.set(u.auth_id, val)
        }
      }
      setUserMap(map)
    } catch (error) {
      logApiError(error, 'UserDimension-加载用户信息')
    }
  }, [])

  // ==================== 数据加载（优先使用 RPC 后端聚合，降级为全量拉取） ====================

  const fetchData = useCallback(async (page?: number, pageSize?: number) => {
    const curPage = page ?? pagination.current ?? 1
    const curSize = pageSize ?? pagination.pageSize ?? defaultPageSize
    setLoading(true)
    setDataLimitWarning(null)
    try {
      // 优先尝试 RPC 后端聚合（服务端分页：返回 {rows, total_users, total_records}）
      const rpcResult = await apiQuery<
        Array<{ rows: Array<{ user_id: string; count: number; latest_record_at: string }>; total_users: number; total_records: number }>
      >(
        () => (supabase.rpc('get_user_dimension_stats', {
          p_table_name: tableName,
          p_user_ids: null,
          p_limit: curSize,
          p_offset: (curPage - 1) * curSize,
        } as any) as any),
        `UserDimensionList-${title}-RPC聚合`
      )

      if (rpcResult.success && rpcResult.data) {
        // 兼容旧版 RPC（直接返回数组）与新版（单行 {rows, total_users, total_records}）
        type AggRow = { user_id: string; count: number; latest_record_at: string }
        const raw = Array.isArray(rpcResult.data) ? rpcResult.data : [rpcResult.data]
        const payload = (raw[0] ?? {}) as { rows?: AggRow[]; total_users?: number; total_records?: number }
        const rows: AggRow[] = Array.isArray(payload.rows) ? payload.rows : (raw as unknown as AggRow[])
        // RPC 调用成功，直接使用后端聚合结果
        const result: UserSummary[] = rows.map((row) => ({
          user_id: row.user_id,
          user_nickname: undefined,
          total_count: row.count,
          latest_date: row.latest_record_at,
          categories: [],
          stats: {},
        }))
        result.sort((a, b) => b.total_count - a.total_count)

        setData(result)
        const totalUsers = typeof payload.total_users === 'number' ? payload.total_users : result.length
        const totalRecords =
          typeof payload.total_records === 'number'
            ? payload.total_records
            : result.reduce((s, i) => s + i.total_count, 0)
        setTotal(totalUsers)
        setTotalRecords(totalRecords)
        setPagination((prev) => ({ ...prev, current: curPage, pageSize: curSize, total: totalUsers }))
        fetchUserInfo(result.map((u) => u.user_id))
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
      setTotal(fallbackResult.length)
      setTotalRecords(fallbackResult.reduce((s, i) => s + i.total_count, 0))
      setPagination((prev) => ({ ...prev, current: curPage, pageSize: curSize, total: fallbackResult.length }))
      // 加载用户信息
      fetchUserInfo(fallbackResult.map(u => u.user_id))
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
      // habits 删除前先清理子表 habit_checkins，避免 FK 约束阻断（P1-6 续·级联删除）
      if (tableName === 'habits') {
        const checkinService = new BaseService<{ id: string }>('habit_checkins')
        const checkinsRes = await checkinService.findAll((q) => q.eq('habit_id', recordId))
        if (!checkinsRes.success) {
          handleApiError(checkinsRes.errorMessage, 'UserDimensionList-加载习惯打卡记录')
          return
        }
        const checkinIds = (checkinsRes.data || []).map((c) => c.id)
        if (checkinIds.length > 0) {
          const delRes = await checkinService.batchDelete(checkinIds)
          if (!delRes.success) {
            handleApiError(delRes.errorMessage, 'UserDimensionList-删除习惯打卡记录')
            return
          }
        }
      }
      const result = await detailService.delete(recordId)
      if (result.success) {
        message.success('已删除该记录')
        // 重新加载详情（保留当前页）并刷新主表统计
        fetchDetailData(selectedUser.user_id, detailPage, detailPageSize)
        fetchData(pagination.current, pagination.pageSize)
      } else {
        handleApiError(result.errorMessage, 'UserDimensionList-删除记录')
      }
    } catch (error) {
      handleApiError(error, 'UserDimensionList-删除记录')
    }
  }, [canDelete, selectedUser, tableName, detailService, detailPage, detailPageSize, fetchDetailData, fetchData, pagination.current, pagination.pageSize])

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
