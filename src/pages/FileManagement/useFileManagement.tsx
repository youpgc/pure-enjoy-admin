// 文件管理状态与业务逻辑（从 FileManagement.tsx 抽离，审查 P1 膨胀）
// 页面只负责组合渲染，所有状态/数据/处理器集中此处。
// 通道（2026-10-13 去 Supabase 化）：列表/删除走本地后端 /files 列表与删除端点
// （原 supabase.storage 上传 → POST /files/upload 服务端入库+落盘一步完成）。
import React, { useState, useEffect, useCallback } from 'react'
import { message } from 'antd'
import { usePermission } from '../../hooks/usePermission'
import { apiRequest, apiUpload } from '../../utils/adminHttp'
import { handleApiError } from '../../utils/apiClient'
import { usePagination } from '../../hooks/usePagination'
import { useMounted } from '../../hooks/useMounted'
import { buildFileColumns } from './columns'
import type { FileItem, FileFilters } from './helpers'

/// 后端 FileMetaVO（全局 snake_case 序列化）→ 页面 FileItem（snake_case）
interface FileMetaVO {
  id: string
  file_name: string
  original_name: string
  file_category: string | null
  mime_type: string | null
  size: number | null
  url: string | null
  created_at: string
}

const toFileItem = (v: FileMetaVO): FileItem => ({
  id: v.id,
  file_name: v.file_name || v.original_name,
  bucket: v.file_category ?? '-',
  path: v.id,
  size: v.size ?? 0,
  mime_type: v.mime_type ?? '',
  url: v.url ?? '',
  created_at: v.created_at,
})

export const useFileManagement = () => {
  const mountedRef = useMounted()
  const [files, setFiles] = useState<FileItem[]>([])
  const [loading, setLoading] = useState(false)
  const { pagination, resetPage, setTotal, tablePagination } = usePagination()
  const [filters, setFilters] = useState<FileFilters>({
    keyword: '',
    bucket: undefined,
  })
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([])
  const [uploadModalOpen, setUploadModalOpen] = useState(false)
  const [_uploading, setUploading] = useState(false)
  const { isAdmin: _isAdmin } = usePermission()

  // 加载文件列表（keyword 模糊匹配文件名；bucket 筛选 → 服务端类目过滤）
  const loadFiles = useCallback(async () => {
    setLoading(true)
    try {
      const sp = new URLSearchParams({
        page: String(pagination.current),
        page_size: String(pagination.pageSize),
      })
      if (filters.keyword) sp.set('keyword', filters.keyword)
      if (filters.bucket) sp.set('category', filters.bucket)
      const data = await apiRequest<{ list: FileMetaVO[]; total: number }>(
        'GET',
        `/files?${sp.toString()}`
      )
      if (!mountedRef.current) return
      setFiles((data?.list || []).map(toFileItem))
      setTotal(data?.total || 0)
    } catch (error) {
      handleApiError(error, 'FileManagement-加载文件')
    } finally {
      setLoading(false)
    }
  }, [pagination.current, pagination.pageSize, filters, mountedRef])

  useEffect(() => {
    loadFiles()
  }, [loadFiles])

  // 搜索
  const handleSearch = () => {
    resetPage()
    loadFiles()
  }

  // 重置筛选
  const handleReset = () => {
    setFilters({
      keyword: '',
      bucket: undefined,
    })
    resetPage()
  }

  // 删除文件（服务端原子删除：存储文件 + 数据库记录一步完成）
  const handleDelete = async (record: FileItem) => {
    try {
      await apiRequest('DELETE', `/files/${record.id}`)
      message.success('删除成功')
      loadFiles()
    } catch (error) {
      handleApiError(error, 'FileManagement-删除')
    }
  }

  // 批量删除（服务端逐条删除，单条失败不中断）
  const handleBatchDelete = async () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请先选择要删除的文件')
      return
    }
    try {
      const data = await apiRequest<{ affected: number }>(
        'POST',
        '/files/batch-delete',
        selectedRowKeys as string[]
      )
      if (data.affected < selectedRowKeys.length) {
        message.warning(`已删除 ${data.affected}/${selectedRowKeys.length} 条（其余无权或已不存在）`)
      } else {
        message.success(`成功删除 ${data.affected} 个文件`)
      }
      setSelectedRowKeys([])
      loadFiles()
    } catch (error) {
      handleApiError(error, 'FileManagement-批量删除')
    }
  }

  // 上传文件（服务端一步完成：落盘 + files 记录入库，返回元数据）
  const handleUpload = async (file: File) => {
    try {
      setUploading(true)
      // 上传类目：跟随当前类目筛选；未筛选时不强制归类（file_category 存 null，列表显示 '-'）
      const category = filters.bucket
      const fd = new FormData()
      fd.append('file', file)
      if (category) fd.append('category', category)
      await apiUpload('/files/upload', fd)
      message.success('上传成功')
      loadFiles()
      return false
    } catch (error) {
      handleApiError(error, 'FileManagement-上传')
      return false
    } finally {
      setUploading(false)
    }
  }

  // columns 每次渲染重建，保证 handleDelete 闭包始终读到最新的分页/筛选状态
  // （不能用 useMemo([]) 固化——会捕获首次渲染的 handleDelete，删除后按旧参数刷新）
  const columns = buildFileColumns({ handleDelete })

  return {
    files,
    loading,
    filters,
    setFilters,
    selectedRowKeys,
    setSelectedRowKeys,
    uploadModalOpen,
    setUploadModalOpen,
    tablePagination,
    loadFiles,
    handleSearch,
    handleReset,
    handleBatchDelete,
    handleUpload,
    columns,
  }
}
