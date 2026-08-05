import { useState, useEffect, useCallback, useMemo } from 'react'
import type { Key } from 'react'
import { message } from 'antd'
import { BaseService, handleApiError } from '../../utils/apiClient'
import { usePagination } from '../../hooks/usePagination'
import { usePermission } from '../../hooks/usePermission'
import { useMounted } from '../../hooks/useMounted'
import { useUsernames } from '../../hooks/useUsernames'
import type { LogFilters, OperationLog, UserMap } from './types'

// 操作日志页面全部状态 + 数据加载 + 操作处理（从 OperationLogs.tsx 抽离，审查 P1 膨胀）
export const useOperationLogs = () => {
  const mountedRef = useMounted()

  const [logs, setLogs] = useState<OperationLog[]>([])
  const [loading, setLoading] = useState(false)
  const [filters, setFilters] = useState<LogFilters>({
    keyword: '',
    action: undefined,
    module: undefined,
    dateRange: null,
  })
  const [selectedRowKeys, setSelectedRowKeys] = useState<Key[]>([])
  const { pagination, resetPage, setTotal, tablePagination } = usePagination()
  const { hasPermission } = usePermission()

  // 批量解析列表中涉及的用户名（用于「用户名」列）
  const userMap: UserMap = useUsernames(logs.map((l) => l.user_id))

  const logService = useMemo(
    () => new BaseService<OperationLog>('operation_logs', {
      defaultOrder: { column: 'created_at', ascending: false },
    }),
    [],
  )

  // 加载日志列表
  const loadLogs = useCallback(async () => {
    setLoading(true)
    try {
      const result = await logService.paginate(pagination.current, pagination.pageSize, (q) => {
        let query = q
        if (filters.keyword) {
          query = query.or(
            `action.ilike.%${filters.keyword}%,module.ilike.%${filters.keyword}%,user_id.ilike.%${filters.keyword}%`,
          )
        }
        if (filters.action) {
          query = query.eq('action', filters.action)
        }
        if (filters.module) {
          query = query.eq('module', filters.module)
        }
        if (filters.dateRange && filters.dateRange[0] && filters.dateRange[1]) {
          query = query
            .gte('created_at', filters.dateRange[0].format('YYYY-MM-DD'))
            .lte('created_at', filters.dateRange[1].format('YYYY-MM-DD') + 'T23:59:59')
        }
        return query
      })

      if (!result.success) {
        handleApiError(result.errorMessage, 'OperationLogs-加载日志')
        return
      }

      if (!mountedRef.current) return

      setLogs(result.data?.data || [])
      setTotal(result.data?.total || 0)
    } catch (error) {
      handleApiError(error, 'OperationLogs-加载日志')
    } finally {
      setLoading(false)
    }
  }, [pagination.current, pagination.pageSize, filters])

  useEffect(() => {
    loadLogs()
  }, [loadLogs])

  // 搜索
  const handleSearch = () => {
    resetPage()
    loadLogs()
  }

  // 重置筛选
  const handleReset = () => {
    setFilters({
      keyword: '',
      action: undefined,
      module: undefined,
      dateRange: null,
    })
    resetPage()
  }

  // 删除单条
  const handleDelete = async (id: string) => {
    try {
      const result = await logService.delete(id)
      if (!result.success) {
        handleApiError(result.errorMessage, 'OperationLogs-删除')
        return
      }
      message.success('删除成功')
      loadLogs()
    } catch (error) {
      handleApiError(error, 'OperationLogs-删除')
    }
  }

  // 批量删除
  const handleBatchDelete = async () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请先选择要删除的日志')
      return
    }
    try {
      const result = await logService.batchDelete(selectedRowKeys as string[])
      if (!result.success) {
        handleApiError(result.errorMessage, 'OperationLogs-批量删除')
        return
      }
      message.success(`成功删除 ${selectedRowKeys.length} 条日志`)
      setSelectedRowKeys([])
      loadLogs()
    } catch (error) {
      handleApiError(error, 'OperationLogs-批量删除')
    }
  }

  return {
    logs,
    loading,
    filters,
    setFilters,
    selectedRowKeys,
    setSelectedRowKeys,
    tablePagination,
    hasPermission,
    userMap,
    loadLogs,
    handleSearch,
    handleReset,
    handleDelete,
    handleBatchDelete,
  }
}
