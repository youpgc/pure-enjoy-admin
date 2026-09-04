// 通知状态与业务逻辑（从 Notifications.tsx 抽离，审查 P1 膨胀）
// 页面只负责组合渲染，所有状态/数据/处理器/表单集中此处。
import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { message, Form } from 'antd'
import { BaseService, handleApiError } from '../../utils/apiClient'
import { usePagination } from '../../hooks/usePagination'
import { usePermission } from '../../hooks/usePermission'
import { useMounted } from '../../hooks/useMounted'
import { buildNotificationColumns } from './columns'
import type { Notification, NotificationFilters } from './types'

export const useNotifications = () => {
  const mountedRef = useMounted()

  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(false)
  const [filters, setFilters] = useState<NotificationFilters>({
    keyword: '',
    type: undefined,
  })
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([])
  const [modalVisible, setModalVisible] = useState(false)
  const [editingNotification, setEditingNotification] = useState<Notification | null>(null)
  const [form] = Form.useForm()
  const [saving, setSaving] = useState(false)
  const { pagination, resetPage, setTotal, tablePagination } = usePagination()
  const { hasPermission } = usePermission()

  const notificationService = useMemo(
    () =>
      new BaseService<Notification>('notifications', {
        defaultOrder: { column: 'created_at', ascending: false },
      }),
    [],
  )

  // 加载通知列表
  const loadNotifications = useCallback(async () => {
    setLoading(true)
    try {
      const result = await notificationService.paginate(pagination.current, pagination.pageSize, (q) => {
        let query = q
        if (filters.keyword) {
          query = query.or(`title.ilike.%${filters.keyword}%,body.ilike.%${filters.keyword}%`)
        }
        if (filters.type) {
          query = query.eq('type', filters.type)
        }
        return query
      })

      if (!result.success) {
        handleApiError(result.errorMessage, 'Notifications-加载通知')
        return
      }

      if (!mountedRef.current) return

      setNotifications(result.data?.data || [])
      setTotal(result.data?.total || 0)
    } catch (error) {
      handleApiError(error, 'Notifications-加载通知')
    } finally {
      setLoading(false)
    }
  }, [pagination.current, pagination.pageSize, filters])

  useEffect(() => {
    loadNotifications()
  }, [loadNotifications])

  // 搜索
  const handleSearch = () => {
    resetPage()
    loadNotifications()
  }

  // 重置筛选
  const handleReset = () => {
    setFilters({
      keyword: '',
      type: undefined,
    })
    resetPage()
  }

  // 打开新增弹窗
  const handleAdd = () => {
    setEditingNotification(null)
    form.resetFields()
    setModalVisible(true)
  }

  // 打开编辑弹窗
  const handleEdit = (record: Notification) => {
    setEditingNotification(record)
    form.setFieldsValue({
      ...record,
    })
    setModalVisible(true)
  }

  // 删除通知
  const handleDelete = async (id: string) => {
    try {
      const result = await notificationService.delete(id)
      if (!result.success) {
        handleApiError(result.errorMessage, 'Notifications-删除')
        return
      }
      message.success('删除成功')
      loadNotifications()
    } catch (error) {
      handleApiError(error, 'Notifications-删除')
    }
  }

  // 批量删除
  const handleBatchDelete = async () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请先选择要删除的通知')
      return
    }
    try {
      const result = await notificationService.batchDelete(selectedRowKeys as string[])
      if (!result.success) {
        handleApiError(result.errorMessage, 'Notifications-批量删除')
        return
      }
      message.success(`成功删除 ${selectedRowKeys.length} 条通知`)
      setSelectedRowKeys([])
      loadNotifications()
    } catch (error) {
      handleApiError(error, 'Notifications-批量删除')
    }
  }

  // 保存通知
  const handleSave = async () => {
    if (saving) return
    try {
      setSaving(true)
      const values = await form.validateFields()
      if (editingNotification) {
        const result = await notificationService.update(editingNotification.id, values)
        if (!result.success) {
          handleApiError(result.errorMessage, 'Notifications-更新')
          return
        }
        message.success('更新成功')
      } else {
        const result = await notificationService.create({
          ...values,
          user_id: values.user_id || null,
          is_read: false,
        })
        if (!result.success) {
          handleApiError(result.errorMessage, 'Notifications-创建')
          return
        }
        message.success('创建成功')
      }
      setModalVisible(false)
      setEditingNotification(null)
      form.resetFields()
      loadNotifications()
    } catch (error) {
      handleApiError(error, 'Notifications-保存')
    } finally {
      setSaving(false)
    }
  }

  const columns = buildNotificationColumns({
    hasPermission,
    onEdit: handleEdit,
    onDelete: handleDelete,
  })

  return {
    notifications,
    loading,
    filters,
    setFilters,
    selectedRowKeys,
    setSelectedRowKeys,
    modalVisible,
    setModalVisible,
    editingNotification,
    setEditingNotification,
    form,
    saving,
    tablePagination,
    loadNotifications,
    handleSearch,
    handleReset,
    handleAdd,
    handleEdit,
    handleDelete,
    handleBatchDelete,
    handleSave,
    columns,
  }
}
