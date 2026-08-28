// 批注审核状态与业务逻辑（从 Annotations.tsx 抽离，审查 P1 膨胀）
// 页面只负责组合渲染，所有状态/数据/处理器/派生统计集中此处。
import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { message } from 'antd'
import dayjs from 'dayjs'
import type { Dayjs } from 'dayjs'
import { DeleteOutlined, CheckOutlined, StopOutlined } from '@ant-design/icons'
import { type ActionButton } from '../../components/ActionColumn'
import { BaseService, apiExecute, handleApiError } from '../../utils/apiClient'
import { usePagination } from '../../hooks/usePagination'
import { usePermission } from '../../hooks/usePermission'
import { useAuth } from '../../App'
import { useMounted } from '../../hooks/useMounted'
import { useUsernames } from '../../hooks/useUsernames'
import { containsSensitive } from './constants'
import {
  ANNOTATION_STATUS_PENDING,
  ANNOTATION_STATUS_APPROVED,
  ANNOTATION_STATUS_REJECTED,
  type AnnotationStatus,
} from '../../constants'
import type { NovelAnnotation, TrendItem } from './types'

export const useAnnotations = () => {
  const mountedRef = useMounted()
  const [activeTab, setActiveTab] = useState('list')
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<NovelAnnotation[]>([])

  // 批量解析列表中涉及的用户名（用于「用户名」列）
  const userMap = useUsernames(data.map((d) => d.user_id))
  const [filtered, setFiltered] = useState<NovelAnnotation[]>([])
  const [searchUser, setSearchUser] = useState('')
  const [searchNovel, setSearchNovel] = useState('')
  const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null]>([null, null])
  const [selectedIds, setSelectedIds] = useState<React.Key[]>([])
  const [trendData, setTrendData] = useState<TrendItem[]>([])
  const annotationService = useMemo(
    () => new BaseService<NovelAnnotation>('novel_annotations', { defaultOrder: { column: 'created_at', ascending: false } }),
    [],
  )
  const { pagination, resetPage, setTotal, tablePagination } = usePagination(20)
  const { hasPermission } = usePermission()
  const { user: adminUser } = useAuth()

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const result = await annotationService.paginate(pagination.current, pagination.pageSize, (q) => {
        let query = q.eq('is_deleted', false)
        if (searchUser) query = query.eq('user_id', searchUser)
        if (searchNovel) query = query.eq('novel_id', searchNovel)
        if (dateRange[0] && dateRange[1]) {
          query = query
            .gte('created_at', dateRange[0].format('YYYY-MM-DD'))
            .lte('created_at', dateRange[1].format('YYYY-MM-DD') + 'T23:59:59')
        }
        return query
      })
      if (result.success && result.data) {
        if (!mountedRef.current) return
        setData(result.data.data)
        setFiltered(result.data.data)
        setTotal(result.data.total)
      }
    } catch (error) {
      handleApiError(error, 'Annotations-加载数据')
    } finally {
      setLoading(false)
    }
  }, [searchUser, searchNovel, dateRange, annotationService, pagination.current, pagination.pageSize, setTotal])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const fetchTrend = useCallback(async () => {
    setLoading(true)
    try {
      const result = await annotationService.findAll((q) => q.eq('is_deleted', false))
      if (result.success && result.data) {
        const allData = result.data
        // 按日期分组统计
        const dateMap = new Map<string, number>()
        const today = dayjs()
        for (let i = 29; i >= 0; i--) {
          dateMap.set(today.subtract(i, 'day').format('YYYY-MM-DD'), 0)
        }
        allData.forEach((a) => {
          const d = dayjs(a.created_at).format('YYYY-MM-DD')
          if (dateMap.has(d)) {
            dateMap.set(d, (dateMap.get(d) || 0) + 1)
          }
        })
        const trend = Array.from(dateMap.entries())
          .map(([date, count]) => ({ date, count }))
          .sort((a, b) => a.date.localeCompare(b.date))
        if (!mountedRef.current) return
        setTrendData(trend)
      }
    } catch (error) {
      handleApiError(error, 'Annotations-加载趋势')
    } finally {
      setLoading(false)
    }
  }, [annotationService])

  useEffect(() => {
    if (activeTab === 'stats') {
      fetchTrend()
    }
  }, [activeTab, fetchTrend])

  const handleDelete = async (id: string) => {
    try {
      const result = await apiExecute(
        () => annotationService.update(id, { is_deleted: true, deleted_at: new Date().toISOString() }),
        'Annotations-删除批注',
      )
      if (result.success) {
        message.success('批注已删除')
        fetchData()
      }
    } catch (error) {
      handleApiError(error, 'Annotations-删除批注')
    }
  }

  const handleBatchDelete = async () => {
    if (selectedIds.length === 0) return message.warning('请先选择批注')
    try {
      const result = await annotationService.batchUpdate(selectedIds as string[], {
        is_deleted: true,
        deleted_at: new Date().toISOString(),
      })
      if (result.success) {
        message.success(`已删除 ${selectedIds.length} 条批注`)
        setSelectedIds([])
        fetchData()
      }
    } catch (error) {
      handleApiError(error, 'Annotations-批量删除')
    }
  }

  const handleExport = () => {
    const headers = ['ID', '用户ID', '小说ID', '章节', '高亮文本', '笔记', '颜色', '创建时间']
    const rows = data.map((a) => [
      a.id,
      a.user_id,
      a.novel_id,
      a.chapter_order,
      a.highlighted_text,
      a.note || '',
      a.color,
      a.created_at,
    ])
    const csv = [headers, ...rows]
      .map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))
      .join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `批注导出_${dayjs().format('YYYYMMDD')}.csv`
    a.click()
    URL.revokeObjectURL(a.href)
    message.success('导出成功')
  }

  // 审核写回：通过 / 封禁（feature_admin_annotations_review.sql 注册 review_status 列）
  // 通过 -> review_status=ANNOTATION_STATUS_APPROVED；封禁 -> ANNOTATION_STATUS_REJECTED 并软删（is_deleted=true）
  const handleReview = async (id: string, status: AnnotationStatus) => {
    const patch: Partial<NovelAnnotation> = {
      review_status: status,
      reviewed_at: new Date().toISOString(),
      reviewed_by: adminUser?.id ?? null,
    }
    if (status === ANNOTATION_STATUS_REJECTED) {
      patch.is_deleted = true
      patch.deleted_at = new Date().toISOString()
    }
    try {
      const result = await annotationService.update(id, patch)
      if (result.success) {
        message.success(status === ANNOTATION_STATUS_APPROVED ? '已通过审核' : '已封禁并删除')
        fetchData()
      } else {
        handleApiError(result.errorMessage, 'Annotations-审核')
      }
    } catch (error) {
      handleApiError(error, 'Annotations-审核')
    }
  }

  // 待审核 = 含敏感词 且 审核状态为 pending/null（已审核通过的不再出现）
  const reviewData = data.filter((a) => {
    const text = (a.highlighted_text || '') + (a.note || '')
    const isPending = !a.review_status || a.review_status === ANNOTATION_STATUS_PENDING
    return isPending && containsSensitive(text).length > 0
  })

  const renderActions = (record: NovelAnnotation): ActionButton[] => {
    const actions: ActionButton[] = []
    if (hasPermission('novels:delete')) {
      actions.push({
        key: 'delete',
        label: '删除',
        icon: <DeleteOutlined />,
        danger: true,
        onClick: () => handleDelete(record.id),
      })
    }
    return actions
  }

  // 审核页操作：通过 / 封禁 / 删除（写回 review_status）
  const renderReviewActions = (record: NovelAnnotation): ActionButton[] => {
    const actions: ActionButton[] = []
    if (hasPermission('novels:delete')) {
      actions.push({
        key: 'approve',
        label: '通过',
        icon: <CheckOutlined />,
        onClick: () => handleReview(record.id, ANNOTATION_STATUS_APPROVED),
      })
      actions.push({
        key: 'ban',
        label: '封禁',
        icon: <StopOutlined />,
        danger: true,
        onClick: () => handleReview(record.id, ANNOTATION_STATUS_REJECTED),
      })
      actions.push({
        key: 'delete',
        label: '删除',
        icon: <DeleteOutlined />,
        danger: true,
        onClick: () => handleDelete(record.id),
      })
    }
    return actions
  }

  const totalUsers = new Set(data.map((d) => d.user_id)).size
  const thisWeek = data.filter((d) => dayjs(d.created_at).isAfter(dayjs().subtract(7, 'day')))

  // 趋势数据：计算最大值用于图表高度
  const maxTrendCount = trendData.length > 0 ? Math.max(...trendData.map((t) => t.count)) : 1

  return {
    activeTab,
    setActiveTab,
    loading,
    data,
    userMap,
    filtered,
    searchUser,
    setSearchUser,
    searchNovel,
    setSearchNovel,
    dateRange,
    setDateRange,
    selectedIds,
    setSelectedIds,
    trendData,
    tablePagination,
    resetPage,
    fetchData,
    handleBatchDelete,
    handleExport,
    handleReview,
    reviewData,
    totalUsers,
    thisWeek,
    maxTrendCount,
    renderActions,
    renderReviewActions,
  }
}
