import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { Form, message } from 'antd'
import { useMounted } from '../../hooks/useMounted'
import { usePagination } from '../../hooks/usePagination'
import { BaseService, handleApiError } from '../../utils/apiClient'
import type { DbNovel } from '../../types/database'

// 使用数据库生成的类型，确保与管理后台、App 端字段一致
type Novel = DbNovel

interface NovelFilters {
  keyword: string
  category: string | undefined
  status: string | undefined
  source: string | undefined
}

const EMPTY_FILTERS: NovelFilters = {
  keyword: '',
  category: undefined,
  status: undefined,
  source: undefined,
}

// 小说页面状态与数据逻辑（审查 P1 膨胀：从 Novels.tsx 抽离到 hook，页面只组合渲染）
export function useNovels() {
  const mountedRef = useMounted()

  const [novels, setNovels] = useState<Novel[]>([])
  const [loading, setLoading] = useState(false)
  const { pagination, resetPage, setTotal, tablePagination } = usePagination()
  const [filters, setFilters] = useState<NovelFilters>(EMPTY_FILTERS)
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([])
  const [modalVisible, setModalVisible] = useState(false)
  const [editingNovel, setEditingNovel] = useState<Novel | null>(null)
  const [chapterModalOpen, setChapterModalOpen] = useState(false)
  const [selectedNovelId, setSelectedNovelId] = useState<string>('')
  const [form] = Form.useForm()

  const novelService = useMemo(
    () =>
      new BaseService<Novel>('novels', {
        defaultOrder: { column: 'created_at', ascending: false },
      }),
    []
  )

  // 加载小说列表
  const loadNovels = useCallback(async () => {
    setLoading(true)
    try {
      const result = await novelService.paginate(pagination.current, pagination.pageSize, (q) => {
        let query = q
        if (filters.keyword) {
          query = query.or(
            `title.ilike.%${filters.keyword}%,author.ilike.%${filters.keyword}%`
          )
        }
        if (filters.category) {
          query = query.eq('category', filters.category)
        }
        if (filters.status) {
          query = query.eq('status', filters.status)
        }
        if (filters.source) {
          query = query.eq('source', filters.source)
        }
        return query
      })

      if (!result.success) {
        handleApiError(result.errorMessage, 'Novels-加载小说列表')
        return
      }

      if (!mountedRef.current) return

      setNovels(result.data?.data || [])
      setTotal(result.data?.total || 0)
    } catch (error) {
      handleApiError(error, 'Novels-加载小说列表')
    } finally {
      setLoading(false)
    }
  }, [pagination.current, pagination.pageSize, filters, novelService, mountedRef, setTotal])

  useEffect(() => {
    loadNovels()
  }, [loadNovels])

  // 搜索
  const handleSearch = () => {
    resetPage()
    loadNovels()
  }

  // 重置筛选
  const handleReset = () => {
    setFilters(EMPTY_FILTERS)
    resetPage()
  }

  // 打开新增弹窗
  const handleAdd = () => {
    setEditingNovel(null)
    form.resetFields()
    setModalVisible(true)
  }

  // 打开编辑弹窗
  const handleEdit = (record: Novel) => {
    setEditingNovel(record)
    form.setFieldsValue({
      ...record,
      // 确保表单字段正确映射
    })
    setModalVisible(true)
  }

  // 删除小说
  const handleDelete = async (id: string) => {
    try {
      const result = await novelService.delete(id)
      if (!result.success) {
        handleApiError(result.errorMessage, 'Novels-删除小说')
        return
      }
      message.success('删除成功')
      loadNovels()
    } catch (error) {
      handleApiError(error, 'Novels-删除小说')
    }
  }

  // 批量删除
  const handleBatchDelete = async () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请先选择要删除的小说')
      return
    }
    try {
      const result = await novelService.batchDelete(selectedRowKeys as string[])
      if (!result.success) {
        handleApiError(result.errorMessage, 'Novels-批量删除')
        return
      }
      message.success(`成功删除 ${selectedRowKeys.length} 本小说`)
      setSelectedRowKeys([])
      loadNovels()
    } catch (error) {
      handleApiError(error, 'Novels-批量删除')
    }
  }

  // 处理弹窗提交
  const handleModalSubmit = async () => {
    try {
      const values = await form.validateFields()
      if (editingNovel) {
        // 更新小说
        const result = await novelService.update(editingNovel.id, {
          ...values,
        })
        if (!result.success) {
          handleApiError(result.errorMessage, 'Novels-更新小说')
          return
        }
        message.success('更新成功')
      } else {
        // 创建小说
        const result = await novelService.create({
          ...values,
          chapter_count: 0,
        })
        if (!result.success) {
          handleApiError(result.errorMessage, 'Novels-创建小说')
          return
        }
        message.success('创建成功')
      }
      setModalVisible(false)
      setEditingNovel(null)
      form.resetFields()
      loadNovels()
    } catch (error) {
      handleApiError(error, 'Novels-保存小说')
    }
  }

  // 打开章节管理弹窗
  const handleManageChapters = (novelId: string) => {
    setSelectedNovelId(novelId)
    setChapterModalOpen(true)
  }

  const closeModal = () => {
    setModalVisible(false)
    setEditingNovel(null)
    form.resetFields()
  }

  const closeChapterModal = () => {
    setChapterModalOpen(false)
    setSelectedNovelId('')
  }

  return {
    // 数据
    novels,
    loading,
    tablePagination,
    // 筛选与选择
    filters,
    setFilters,
    selectedRowKeys,
    setSelectedRowKeys,
    // 弹窗状态
    modalVisible,
    editingNovel,
    form,
    chapterModalOpen,
    selectedNovelId,
    // 操作
    loadNovels,
    handleSearch,
    handleReset,
    handleAdd,
    handleEdit,
    handleDelete,
    handleBatchDelete,
    handleModalSubmit,
    handleManageChapters,
    closeModal,
    closeChapterModal,
  }
}
