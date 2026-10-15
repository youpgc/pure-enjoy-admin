// 应用版本管理页数据/操作逻辑 Hook（从 VersionManagement.tsx 抽取）
// 数据源：本地后端 /admin/app-versions（SNAKE_CASE VO；分页参数 page/page_size）
import { useState, useEffect, useCallback } from 'react'
import type { Key } from 'react'
import { Modal, message, Form } from 'antd'
import { appVersionService } from '../../../services/appVersionService'
import { usePermission } from '../../../hooks/usePermission'
import { handleApiError } from '../../../utils/apiClient'
import { apiRequest } from '../../../utils/adminHttp'
import { usePagination } from '../../../hooks/usePagination'
import { useMounted } from '../../../hooks/useMounted'
import type { AppVersion, VersionFilters } from './types'

/// 后端 AppVersionVO 形态（SNAKE_CASE）
type AppVersionVO = Record<string, any>

/// 后端 PageResult 形态
interface PageResultVO { list: AppVersionVO[]; total: number }

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
  const { hasPermission } = usePermission()
  const canWrite = hasPermission('admin:version:update')
  const canDelete = hasPermission('admin:version:delete')

  // 加载版本列表（后端按 buildNumber/id 倒序；keyword 过滤后端未提供，仅平台/状态生效）
  const loadVersions = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: String(pagination.current),
        page_size: String(pagination.pageSize),
      })
      if (filters.platform) params.set('platform', filters.platform)
      if (filters.status) params.set('status', filters.status)
      const result = await apiRequest<PageResultVO>('GET', `/admin/app-versions?${params.toString()}`)

      if (!mountedRef.current) return
      setVersions((result?.list || []) as unknown as AppVersion[])
      setTotal(result?.total || 0)

      // 获取当前发布版本（status=released，同平台唯一，由状态机保证）
      const active = await apiRequest<PageResultVO>(
        'GET', '/admin/app-versions?status=released&page=1&page_size=1'
      )
      if (!mountedRef.current) return
      setCurrentVersion(((active?.list || [])[0] as unknown as AppVersion) ?? null)
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
      github_url: record.github_url,
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
      await apiRequest<void>('DELETE', `/admin/app-versions/${id}`)
      message.success('删除成功')
      loadVersions()
    } catch (error) {
      handleApiError(error, 'VersionManagement-删除')
    }
  }

  // 批量删除（后端无批量端点，逐个删除；中途失败即中止并提示已完成数）
  const handleBatchDelete = async () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请先选择要删除的版本')
      return
    }
    const ids = selectedRowKeys as string[]
    let done = 0
    try {
      for (const id of ids) {
        await apiRequest<void>('DELETE', `/admin/app-versions/${id}`)
        done += 1
      }
      message.success(`成功删除 ${done} 个版本`)
      setSelectedRowKeys([])
      loadVersions()
    } catch (error) {
      handleApiError(error, `VersionManagement-批量删除(已完成 ${done}/${ids.length})`)
      loadVersions()
    }
  }

  // 回滚/发布版本：后端状态机单事务完成「提升目标 + 降级同平台其他 released」
  const handleRollback = async (record: AppVersion) => {
    Modal.confirm({
      title: '确认回滚',
      content: `确定要将版本 ${record.version} (build ${record.build_number}) 回滚为当前发布版本吗？\n\n其他已发布版本将被标记为已下架。`,
      okText: '确认回滚',
      cancelText: '取消',
      onOk: async () => {
        try {
          // 已下架(revoked)版本走 rollback，其余走 release（后端校验状态合法性）
          const action = record.status === 'revoked' ? 'rollback' as const : 'release' as const
          await appVersionService.changeStatus(record.id, action)
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

      // 后端 SaveAppVersionRequest（SNAKE_CASE 入参）；status 仅新增生效
      if (editingVersion) {
        await apiRequest<unknown>('PUT', `/admin/app-versions/${editingVersion.id}`, values)
        // 编辑态状态变更走状态机：released→release、revoked→revoke（superseded 无动作，后端校验会拦截）
        if (values.status && values.status !== editingVersion.status) {
          if (values.status === 'released') {
            await appVersionService.changeStatus(editingVersion.id, 'release')
          } else if (values.status === 'revoked') {
            await appVersionService.changeStatus(editingVersion.id, 'revoke')
          } else {
            message.warning('superseded 状态仅能由系统回滚窗口流转，不能手动设置')
          }
        }
        message.success('更新成功')
      } else {
        await apiRequest<unknown>('POST', '/admin/app-versions', values)
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
    // 权限
    canWrite,
    canDelete,
  }
}
