// 应用版本管理页数据/操作逻辑 Hook（从 VersionManagement.tsx 抽取，行为保持）
import { useState, useEffect, useCallback, useMemo } from 'react'
import type { Key } from 'react'
import { Modal, message, Form } from 'antd'
import { supabase } from '../../utils/supabase'
import { appVersionService } from '../../services/appVersionService'
import { usePermission } from '../../hooks/usePermission'
import { BaseService, handleApiError } from '../../utils/apiClient'
import { usePagination } from '../../hooks/usePagination'
import { useMounted } from '../../hooks/useMounted'
import type { AppVersion, VersionFilters } from './types'

export function useVersions() {
  const mountedRef = useMounted()
  const [versions, setVersions] = useState<AppVersion[]>([])
  const [loading, setLoading] = useState(false)
  const { pagination, resetPage, setTotal, tablePagination } = usePagination()
  const [filters, setFilters] = useState<VersionFilters>({
    keyword: '',
    platform: undefined,
    status: undefined,
  })
  const [selectedRowKeys, setSelectedRowKeys] = useState<Key[]>([])
  const [modalVisible, setModalVisible] = useState(false)
  const [editingVersion, setEditingVersion] = useState<AppVersion | null>(null)
  const [form] = Form.useForm()
  const [currentVersion, setCurrentVersion] = useState<AppVersion | null>(null)
  const [qrCodeVersion, setQrCodeVersion] = useState<AppVersion | null>(null)
  const [saving, setSaving] = useState(false)
  const { isAdmin: _isAdmin } = usePermission()

  const versionService = useMemo(() => new BaseService<AppVersion>('app_versions', { defaultOrder: { column: 'created_at', ascending: false } }), [])

  // 加载版本列表
  const loadVersions = useCallback(async () => {
    setLoading(true)
    try {
      const result = await versionService.paginate(pagination.current, pagination.pageSize, (q) => {
        let query = q
        if (filters.keyword) {
          query = query.or(`version.ilike.%${filters.keyword}%,release_notes.ilike.%${filters.keyword}%`)
        }
        if (filters.platform) {
          query = query.eq('platform', filters.platform)
        }
        if (filters.status) {
          query = query.eq('status', filters.status)
        }
        return query
      })

      if (!result.success) {
        handleApiError(result.errorMessage, 'VersionManagement-加载版本')
        return
      }

      if (!mountedRef.current) return
      setVersions(result.data?.data || [])
      setTotal(result.data?.total || 0)

      // 获取当前发布版本（status=released 的最新版本）
      const activeRes = await versionService.findAll((q: any) =>
        q.eq('status', 'released').order('created_at', { ascending: false }).limit(1)
      )
      if (activeRes.data && activeRes.data.length > 0) {
        if (!mountedRef.current) return
        setCurrentVersion(activeRes.data[0] as AppVersion)
      }
    } catch (error) {
      handleApiError(error, 'VersionManagement-加载版本')
    } finally {
      setLoading(false)
    }
  }, [pagination.current, pagination.pageSize, filters])

  useEffect(() => {
    loadVersions()
  }, [loadVersions])

  // 搜索
  const handleSearch = () => {
    resetPage()
    loadVersions()
  }

  // 重置筛选
  const handleReset = () => {
    setFilters({
      keyword: '',
      platform: undefined,
      status: undefined,
    })
    resetPage()
  }

  // 打开新增弹窗
  const handleAdd = () => {
    setEditingVersion(null)
    form.resetFields()
    setModalVisible(true)
  }

  // 打开编辑弹窗
  const handleEdit = (record: AppVersion) => {
    setEditingVersion(record)
    form.setFieldsValue({
      platform: record.platform,
      version: record.version,
      build_number: record.build_number,
      release_notes: record.release_notes,
      apk_url: record.apk_url,
      file_name: record.file_name,
      apk_size: record.apk_size,
      checksum: record.checksum,
      is_force_update: record.is_force_update,
      status: record.status,
    })
    setModalVisible(true)
  }

  // 删除版本
  const handleDelete = async (id: string) => {
    try {
      const result = await versionService.delete(id)
      if (!result.success) {
        handleApiError(result.errorMessage, 'VersionManagement-删除')
        return
      }
      message.success('删除成功')
      loadVersions()
    } catch (error) {
      handleApiError(error, 'VersionManagement-删除')
    }
  }

  // 批量删除
  const handleBatchDelete = async () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请先选择要删除的版本')
      return
    }
    try {
      const { error } = await supabase
        .from('app_versions')
        .delete()
        .in('id', selectedRowKeys as string[])
      if (error) {
        handleApiError(error, 'VersionManagement-批量删除')
        return
      }
      message.success(`成功删除 ${selectedRowKeys.length} 个版本`)
      setSelectedRowKeys([])
      loadVersions()
    } catch (error) {
      handleApiError(error, 'VersionManagement-批量删除')
    }
  }

  // 回滚版本：将当前版本标记为 released，其他版本标记为 revoked
  const handleRollback = async (record: AppVersion) => {
    Modal.confirm({
      title: '确认回滚',
      content: `确定要将版本 ${record.version} (build ${record.build_number}) 回滚为当前发布版本吗？\n\n其他已发布版本将被标记为已下架。`,
      okText: '确认回滚',
      cancelText: '取消',
      onOk: async () => {
        try {
          // 1. 将所有 released 版本标记为 revoked
          const { error: revokeError } = await appVersionService.revokeAllReleased()

          if (revokeError) {
            handleApiError(revokeError, 'VersionManagement-回滚')
            return
          }

          // 2. 将目标版本标记为 released
          const { error: releaseError } = await appVersionService.releaseVersion(record.id)

          if (releaseError) {
            handleApiError(releaseError, 'VersionManagement-回滚')
            return
          }

          message.success(`版本 ${record.version} 已回滚为当前发布版本`)
          loadVersions()
        } catch (error) {
          handleApiError(error, 'VersionManagement-回滚')
        }
      },
    })
  }

  // 强制更新：切换 is_force_update 和 release_type
  const handleForceUpdate = async (record: AppVersion) => {
    const newForceUpdate = !record.is_force_update
    Modal.confirm({
      title: newForceUpdate ? '开启强制更新' : '关闭强制更新',
      content: newForceUpdate
        ? `确定要强制用户更新到版本 ${record.version} 吗？开启后所有用户必须更新才能继续使用。`
        : `确定要关闭版本 ${record.version} 的强制更新吗？`,
      okText: '确认',
      cancelText: '取消',
      onOk: async () => {
        try {
          const { error } = await appVersionService.setForceUpdate(record.id, newForceUpdate)

          if (error) {
            handleApiError(error, 'VersionManagement-强制更新')
            return
          }

          message.success(
            newForceUpdate
              ? `版本 ${record.version} 已开启强制更新`
              : `版本 ${record.version} 已关闭强制更新`
          )
          loadVersions()
        } catch (error) {
          handleApiError(error, 'VersionManagement-强制更新')
        }
      },
    })
  }

  // 保存版本
  const handleSave = async () => {
    if (saving) return
    try {
      setSaving(true)
      const values = await form.validateFields()

      // 如果将版本设为 released，确保没有其他已发布的版本
      if (values.status === 'released') {
        const { data: existingReleased, error: checkError } = await supabase
          .from('app_versions')
          .select('id, version, build_number')
          .eq('status', 'released')
          .limit(1)

        if (checkError) {
          handleApiError(checkError, 'VersionManagement-检查已发布版本')
          return
        }

        const firstReleased = (existingReleased as unknown as Array<{ id: number; version: string; build_number: number }>)?.[0]
        if (firstReleased && String(firstReleased.id) !== editingVersion?.id) {
          message.warning(`已有已发布版本 v${firstReleased.version} (build ${firstReleased.build_number})，请先将其状态改为其他值，或使用回滚功能`)
          return
        }
      }

      if (editingVersion) {
        const result = await versionService.update(editingVersion.id, {
          ...values,
        })
        if (!result.success) {
          handleApiError(result.errorMessage, 'VersionManagement-更新')
          return
        }
        message.success('更新成功')
      } else {
        const result = await versionService.create({
          ...values,
        })
        if (!result.success) {
          handleApiError(result.errorMessage, 'VersionManagement-创建')
          return
        }
        message.success('创建成功')
      }
      setModalVisible(false)
      setEditingVersion(null)
      form.resetFields()
      loadVersions()
    } catch (error) {
      handleApiError(error, 'VersionManagement-保存')
    } finally {
      setSaving(false)
    }
  }

  // 获取下载链接
  const getDownloadUrl = (record: AppVersion) => record.apk_url || ''

  return {
    // 数据
    versions,
    loading,
    // 筛选/选择
    filters,
    setFilters,
    selectedRowKeys,
    setSelectedRowKeys,
    // 弹窗
    modalVisible,
    setModalVisible,
    editingVersion,
    setEditingVersion,
    form,
    saving,
    // 当前版本 / 二维码
    currentVersion,
    qrCodeVersion,
    setQrCodeVersion,
    // 分页
    resetPage,
    tablePagination,
    // 操作
    loadVersions,
    handleSearch,
    handleReset,
    handleAdd,
    handleEdit,
    handleDelete,
    handleBatchDelete,
    handleRollback,
    handleForceUpdate,
    handleSave,
    getDownloadUrl,
  }
}
