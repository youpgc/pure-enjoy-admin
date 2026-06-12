import { useState, useCallback } from 'react'

export interface PaginationState {
  current: number
  pageSize: number
  total: number
}

const DEFAULT_PAGE_SIZE = 10

export function usePagination(defaultPageSize: number = DEFAULT_PAGE_SIZE) {
  const [pagination, setPagination] = useState<PaginationState>({
    current: 1,
    pageSize: defaultPageSize,
    total: 0,
  })

  const handlePageChange = useCallback((page: number, pageSize?: number) => {
    setPagination(prev => ({
      ...prev,
      current: page,
      ...(pageSize ? { pageSize } : {}),
    }))
  }, [])

  const resetPage = useCallback(() => {
    setPagination(prev => ({ ...prev, current: 1 }))
  }, [])

  const setTotal = useCallback((total: number) => {
    setPagination(prev => ({ ...prev, total }))
  }, [])

  // 传给 Ant Design Table 的 pagination 配置
  const tablePagination = {
    current: pagination.current,
    pageSize: pagination.pageSize,
    total: pagination.total,
    showSizeChanger: true,
    showQuickJumper: true,
    showTotal: (total: number) => `共 ${total} 条`,
    onChange: handlePageChange,
  }

  return {
    pagination,
    setPagination,
    handlePageChange,
    resetPage,
    setTotal,
    tablePagination,
  }
}
