import { useState } from 'react'

export function usePagination(defaultPageSize = 20) {
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(defaultPageSize)
  const paginate = <T>(data: T[]) => {
    const start = (currentPage - 1) * pageSize
    return data.slice(start, start + pageSize)
  }
  const resetPage = () => setCurrentPage(1)
  const paginationConfig = {
    current: currentPage,
    pageSize,
    showSizeChanger: true,
    showTotal: (total: number) => `共 ${total} 条`,
    onChange: (page: number, size: number) => { setCurrentPage(page); setPageSize(size) }
  }
  return { currentPage, pageSize, paginate, resetPage, paginationConfig, setCurrentPage, setPageSize }
}
