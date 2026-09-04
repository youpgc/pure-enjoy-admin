// 文件管理状态与业务逻辑（从 FileManagement.tsx 抽离，审查 P1 膨胀）
// 页面只负责组合渲染，所有状态/数据/处理器集中此处。
import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { message } from 'antd'
import { supabase } from '../../utils/supabase'
import { usePermission } from '../../hooks/usePermission'
import { BaseService, apiExecute, handleApiError } from '../../utils/apiClient'
import { usePagination } from '../../hooks/usePagination'
import { useMounted } from '../../hooks/useMounted'
import { buildFileColumns } from './columns'
import type { FileItem, FileFilters } from './helpers'

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

  const fileService = useMemo(
    () => new BaseService<FileItem>('files', { defaultOrder: { column: 'created_at', ascending: false } }),
    [],
  )

  // 加载文件列表
  const loadFiles = useCallback(async () => {
    setLoading(true)
    try {
      const result = await fileService.paginate(pagination.current, pagination.pageSize, (q) => {
        let query = q
        if (filters.keyword) {
          query = query.ilike('name', `%${filters.keyword}%`)
        }
        if (filters.bucket) {
          query = query.eq('bucket', filters.bucket)
        }
        return query
      })

      if (!result.success) {
        handleApiError(result.errorMessage, 'FileManagement-加载文件')
        return
      }

      if (!mountedRef.current) return
      setFiles(result.data?.data || [])
      setTotal(result.data?.total || 0)
    } catch (error) {
      handleApiError(error, 'FileManagement-加载文件')
    } finally {
      setLoading(false)
    }
  }, [pagination.current, pagination.pageSize, filters])

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

  // 删除文件
  // 顺序：先删数据库记录，再清存储。
  // 理由：DB 删除失败则应中止（不碰存储，不产生孤儿）；DB 删除成功但存储清理失败，
  // 仅残留孤儿存储文件（可后续清理），不会出现「DB 有记录但文件已删」的坏链。
  const handleDelete = async (record: FileItem) => {
    try {
      // 1) 先删除数据库记录
      const result = await fileService.delete(record.id)
      if (!result.success) {
        handleApiError(result.errorMessage, 'FileManagement-删除记录')
        return
      }

      // 2) 再清存储（失败仅告警，DB 已干净）
      const storageResult = await apiExecute(
        () => supabase.storage.from(record.bucket).remove([record.path]),
        'FileManagement-删除存储',
      )
      if (!storageResult.success) {
        message.warning('数据库记录已删除，但存储文件清理失败，可稍后手动清理')
      } else {
        message.success('删除成功')
      }
      loadFiles()
    } catch (error) {
      handleApiError(error, 'FileManagement-删除')
    }
  }

  // 批量删除
  // 顺序：先批量删数据库记录，再按 bucket 分组清存储（与单条删除一致）。
  const handleBatchDelete = async () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请先选择要删除的文件')
      return
    }
    try {
      // 1) 先批量删数据库记录
      const result = await new BaseService('files').batchDelete(selectedRowKeys as string[])
      if (!result.success) {
        handleApiError(result.errorMessage, 'FileManagement-批量删除记录')
        return
      }

      // 2) 再按 bucket 分组清存储（部分失败仅告警，DB 已干净）
      const selectedFiles = files.filter((f) => selectedRowKeys.includes(f.id))
      const bucketGroups = selectedFiles.reduce((acc, file) => {
        const b = file.bucket
        if (!acc[b]) acc[b] = []
        acc[b].push(file.path)
        return acc
      }, {} as Record<string, string[]>)

      let storageFailed = false
      for (const [bucket, paths] of Object.entries(bucketGroups)) {
        const sr = await apiExecute(
          () => supabase.storage.from(bucket).remove(paths as string[]),
          'FileManagement-批量删除存储',
        )
        if (!sr.success) storageFailed = true
      }

      if (storageFailed) {
        message.warning(`已删除 ${selectedRowKeys.length} 条数据库记录，部分存储文件清理失败，可稍后手动清理`)
      } else {
        message.success(`成功删除 ${selectedRowKeys.length} 个文件`)
      }
      setSelectedRowKeys([])
      loadFiles()
    } catch (error) {
      handleApiError(error, 'FileManagement-批量删除')
    }
  }

  // 上传文件
  const handleUpload = async (file: File) => {
    try {
      setUploading(true)
      const bucket = filters.bucket || 'public'
      const fileExt = file.name.split('.').pop()
      const filePath = `${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`

      const uploadResult = await apiExecute(
        () => supabase.storage.from(bucket).upload(filePath, file),
        'FileManagement-上传文件',
      )

      if (!uploadResult.success) {
        message.error('上传失败')
        return false
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from(bucket).getPublicUrl(filePath)

      // 保存文件记录
      const saveResult = await fileService.create({
        file_name: file.name,
        bucket,
        path: filePath,
        size: file.size,
        mime_type: file.type,
        url: publicUrl,
      })

      if (!saveResult.success) {
        handleApiError(saveResult.errorMessage, 'FileManagement-保存记录')
        return false
      }

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
