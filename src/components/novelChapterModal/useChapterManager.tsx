// 章节管理状态与业务逻辑（从 NovelChapterModal.tsx 抽离，审查 P1 膨胀）
// 组件只负责渲染两个 Modal，所有状态/数据/处理器/表单集中此处。
import { useState, useEffect, useCallback, useRef } from 'react'
import { message, Form } from 'antd'
import { BaseService, handleApiError } from '../../utils/apiClient'
import { swapChapterNumbers, findAdjacentChapter, findMaxChapterNum } from '../../services/novelChapterService'
import { usePagination } from '../../hooks/usePagination'
import { buildChapterColumns } from './columns'
import type { NovelChapter } from './helpers'

export const useChapterManager = ({ open, novelId }: { open: boolean; novelId: string }) => {
  const [chapters, setChapters] = useState<NovelChapter[]>([])
  const [loading, setLoading] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [editingChapter, setEditingChapter] = useState<NovelChapter | null>(null)
  const [form] = Form.useForm()
  const [saving, setSaving] = useState(false)
  const { pagination, tablePagination, setTotal, resetPage } = usePagination()
  const hasResetRef = useRef(false)

  const chapterService = new BaseService<NovelChapter>('novel_chapters', {
    defaultOrder: { column: 'chapter_num', ascending: true },
  })

  // 加载章节列表
  const loadChapters = useCallback(async () => {
    if (!novelId) return
    setLoading(true)
    try {
      const result = await chapterService.paginate(pagination.current, pagination.pageSize, (q) =>
        q.eq('novel_id', novelId),
      )
      if (!result.success) {
        handleApiError(result.errorMessage, 'NovelChapterModal-加载章节')
        return
      }
      setChapters(result.data?.data || [])
      setTotal(result.data?.total || 0)
    } catch (error) {
      handleApiError(error, 'NovelChapterModal-加载章节')
    } finally {
      setLoading(false)
    }
  }, [novelId, pagination.current, pagination.pageSize, setTotal])

  useEffect(() => {
    if (open && novelId) {
      // 仅在弹窗从关闭到打开时重置页码，翻页时不重置
      if (!hasResetRef.current) {
        resetPage()
        hasResetRef.current = true
      }
      loadChapters()
    } else if (!open) {
      hasResetRef.current = false
    }
  }, [open, novelId, loadChapters, resetPage])

  // 打开新增弹窗（查询全局最大章节号，避免与已有章节冲突）
  const handleAdd = async () => {
    setEditingChapter(null)
    form.resetFields()
    let nextNumber = 1
    const result = await findMaxChapterNum(novelId)
    if (result.success && result.data) {
      nextNumber = (result.data.chapter_num || 0) + 1
    } else if (!result.success && chapters.length > 0) {
      // 仅在查询异常时回退本地（与原文 catch 一致）
      nextNumber = Math.max(...chapters.map((c) => c.chapter_num)) + 1
    }
    form.setFieldsValue({ chapter_num: nextNumber })
    setEditModalOpen(true)
  }

  // 打开编辑弹窗
  const handleEdit = (record: NovelChapter) => {
    setEditingChapter(record)
    form.setFieldsValue({
      ...record,
    })
    setEditModalOpen(true)
  }

  // 删除章节
  const handleDelete = async (id: string) => {
    try {
      const result = await chapterService.delete(id)
      if (!result.success) {
        handleApiError(result.errorMessage, 'NovelChapterModal-删除章节')
        return
      }
      message.success('删除成功')
      loadChapters()
    } catch (error) {
      handleApiError(error, 'NovelChapterModal-删除章节')
    }
  }

  // 保存章节
  const handleSave = async () => {
    if (saving) return
    try {
      setSaving(true)
      const values = await form.validateFields()
      if (editingChapter) {
        const result = await chapterService.update(editingChapter.id, {
          ...values,
          word_count: values.content?.length || 0,
          updated_at: new Date().toISOString(),
        })
        if (!result.success) {
          handleApiError(result.errorMessage, 'NovelChapterModal-更新章节')
          return
        }
        message.success('更新成功')
      } else {
        const result = await chapterService.create({
          ...values,
          novel_id: novelId,
          word_count: values.content?.length || 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as any)
        if (!result.success) {
          handleApiError(result.errorMessage, 'NovelChapterModal-创建章节')
          return
        }
        message.success('创建成功')
      }
      setEditModalOpen(false)
      setEditingChapter(null)
      form.resetFields()
      loadChapters()
    } catch (error) {
      handleApiError(error, 'NovelChapterModal-保存章节')
    } finally {
      setSaving(false)
    }
  }

  // 调整章节顺序（查询数据库真实相邻章节，支持跨页移动）
  const handleMoveChapter = async (chapter: NovelChapter, direction: 'up' | 'down') => {
    try {
      const result = await findAdjacentChapter(novelId, chapter.chapter_num, chapter.id, direction)

      if (!result.success || !result.data || result.data.length === 0) {
        message.warning(direction === 'up' ? '已经是第一章' : '已经是最后一章')
        return
      }

      const targetChapter = result.data[0]
      if (!targetChapter) {
        message.warning(direction === 'up' ? '已经是第一章' : '已经是最后一章')
        return
      }

      // 如果目标章节的 chapter_num 和当前章节相同，说明数据有重复，需要先重排
      if (targetChapter.chapter_num === chapter.chapter_num) {
        message.error('章节号存在重复，请先使用"重新编号"功能整理')
        return
      }

      // 交换章节号
      const [update1, update2] = await swapChapterNumbers(
        chapter.id,
        targetChapter.chapter_num,
        targetChapter.id,
        chapter.chapter_num,
      )

      if (!update1.success || !update2.success) {
        message.error('调整顺序失败')
        return
      }

      message.success('调整成功')
      loadChapters()
    } catch (error) {
      handleApiError(error, 'NovelChapterModal-调整顺序')
    }
  }

  const columns = buildChapterColumns({
    chapters,
    onMove: handleMoveChapter,
    onEdit: handleEdit,
    onDelete: handleDelete,
  })

  // 关闭编辑弹窗并复位表单
  const closeEditModal = () => {
    setEditModalOpen(false)
    setEditingChapter(null)
    form.resetFields()
  }

  return {
    chapters,
    loading,
    editModalOpen,
    editingChapter,
    form,
    saving,
    tablePagination,
    loadChapters,
    handleAdd,
    handleEdit,
    handleDelete,
    handleSave,
    handleMoveChapter,
    closeEditModal,
    columns,
  }
}
