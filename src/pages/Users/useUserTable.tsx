// 用户列表/筛选/弹窗/CRUD 逻辑（从 useUsers 抽离，审查 P1 膨胀）
// 负责表格数据、搜索筛选、新增/编辑/删除/状态切换、权限与字典选项。
// 构造类纯函数（buildNewUser/buildUpdateUser/createAuthUser）已抽至 userTableHelpers.ts。
import { useState, useEffect, useCallback } from 'react'
import type { Key } from 'react'
import type {
  User,
  UserFormData,
  UserRole,
  MemberLevel,
  UserStatus,
} from '../../types/user'
import {
  USER_ROLE_OPTIONS,
  MEMBER_LEVEL_OPTIONS,
  USER_STATUS_OPTIONS,
} from '../../types/user'
import { useDictOptions, useDictColors } from '../../hooks/useDictOptions'
import { USER_STATUS_ACTIVE, USER_STATUS_DISABLED } from '../../constants/roles'
import { generateUserId } from '../../utils/userId'
import {
  createUser,
  addPointRecordWithRecalc,
  recalcUserPoints,
  logUserOperation,
  userService,
} from '../../services/userService'
import { useAuth } from '../../App'
import { usePermission } from '../../hooks/usePermission'
import { useMounted } from '../../hooks/useMounted'
import { usePagination } from '../../hooks/usePagination'
import { logApiError } from '../../utils/apiClient'
import { message } from 'antd'
import { buildNewUser, buildUpdateUser, createAuthUser } from './userTableHelpers'

export interface UserFilterValues {
  role?: UserRole
  status?: UserStatus
  member_level?: MemberLevel
  dateRange?: [string, string]
}

export const useUserTable = () => {
  const mountedRef = useMounted()

  // 状态
  const [data, setData] = useState<User[]>([])
  const [loading, setLoading] = useState(false)
  const [searchText, setSearchText] = useState('')
  const [selectedRowKeys, setSelectedRowKeys] = useState<Key[]>([])
  const [showFilters, setShowFilters] = useState(false)
  const [filterValues, setFilterValues] = useState<UserFilterValues>({})
  const { pagination, setTotal, tablePagination, handlePageChange, resetPage } = usePagination()

  // 弹窗状态
  const [modalOpen, setModalOpen] = useState(false)
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create')
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // 权限
  const { user: adminUser } = useAuth()
  const { hasPermission } = usePermission()

  // 字典查询
  const { options: roleOptions } = useDictOptions('user_role', USER_ROLE_OPTIONS)
  const { options: statusOptions } = useDictOptions('user_status', USER_STATUS_OPTIONS)
  const { options: memberLevelOptions } = useDictOptions('member_level', MEMBER_LEVEL_OPTIONS)
  const { getColor: getRoleColor } = useDictColors('user_role')
  const { getColor: getStatusColor } = useDictColors('user_status')
  const { getColor: getMemberLevelColor } = useDictColors('member_level')

  // ==================== 数据加载 ====================
  const fetchUsers = useCallback(
    async (page = pagination.current, pageSize = pagination.pageSize) => {
      setLoading(true)

      try {
        const result = await userService.paginateUsers(page, pageSize, {
          searchText: searchText.trim(),
          role: filterValues.role,
          status: filterValues.status,
          memberLevel: filterValues.member_level,
          dateRange: filterValues.dateRange || null,
        })

        if (!mountedRef.current) return

        if (!result.success) {
          logApiError(result.errorMessage, 'Users-获取用户列表')
          message.error('获取用户列表失败: ' + (result.errorMessage || '未知错误'))
          setData([])
        } else {
          setData(result.data?.data || [])
          setTotal(result.data?.total || 0)
        }
      } catch (err) {
        if (!mountedRef.current) return
        logApiError(err, 'Users-获取用户列表')
        message.error('获取用户列表失败，请检查网络连接后重试')
        setData([])
      } finally {
        setLoading(false)
      }
    },
    [searchText, filterValues, pagination.current, pagination.pageSize, setTotal],
  )

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  // ==================== 操作处理 ====================
  // 记录操作日志
  const logOperation = useCallback(
    async (action: string, targetId: string, details: Record<string, unknown>) => {
      try {
        await logUserOperation({
          user_id: adminUser?.id,
          action,
          module: 'users',
          target_id: targetId,
          details: details,
        })
      } catch (err) {
        logApiError(err, 'Users-记录操作日志')
      }
    },
    [adminUser],
  )

  // 新增用户
  const handleCreate = useCallback(
    async (formData: UserFormData) => {
      if (submitting) return
      // 对密码进行 SHA-256 哈希（密码必填，不允许留空）
      if (!formData.password || formData.password.trim() === '') {
        message.error('密码不能为空')
        return
      }

      const newUser = buildNewUser(formData)

      try {
        setSubmitting(true)
        const userId = generateUserId()
        const { error: createError } = await createUser({ id: userId, ...newUser })
        if (createError) {
          message.error('创建用户失败: ' + createError.message)
          return
        }

        // 如果管理员设置了初始积分，插入 point_records 流水，随后主动重算回写 users 展示列
        // （云端无 point_records→users 同步触发器，须后台主动回写，详见 points skill §5.3）
        const initPoints = formData.available_points ?? 0
        if (initPoints > 0) {
          // 原子化：插入初始积分流水 + 重算回写 users 展示列（审查 P1-3）
          const { success, errorMessage } = await addPointRecordWithRecalc({
            user_id: userId,
            type: 'admin_adjust',
            amount: initPoints,
            remark: '创建用户时设置初始积分',
            operator_name: adminUser?.nickname || adminUser?.email || '管理员',
            operator_id: adminUser?.id,
          })
          if (!success) {
            message.warning(errorMessage || '初始积分记录/重算失败，积分展示可能短暂不同步')
          }
        }

        // 同步创建 auth.users 记录（使 App 端可通过 Supabase Auth 登录）
        await createAuthUser({ id: userId, ...newUser } as User, formData.password || '123456')
        await fetchUsers()
        await logOperation('create_user', userId, { email: newUser.email })
      } catch (err) {
        message.error('创建用户失败，请检查网络连接后重试')
      } finally {
        setSubmitting(false)
      }
    },
    [fetchUsers, logOperation, submitting, adminUser],
  )

  // 编辑用户
  const handleEdit = useCallback(
    async (formData: UserFormData) => {
      if (submitting) return
      if (!currentUser) return

      try {
        setSubmitting(true)

        // 可用积分调整：如果 available_points 变动，插入 point_records 流水记录，随后主动重算回写 users 展示列
        // （云端无同步触发器，须后台主动回写，详见 points skill §5.3）
        // G2 修复：表单「积分」字段现绑定 available_points（当前可用余额），delta 以可用余额为基准，
        // 增/减都生效（recalc 后 available 落为新值）；累计获得 points 只读展示，不在此变动。
        const oldAvailable = currentUser.available_points ?? 0
        const newAvailable = formData.available_points ?? 0
        const delta = newAvailable - oldAvailable

        if (delta !== 0) {
          // 原子化：插入积分流水 + 重算回写（审查 P1-3）
          const { success, errorMessage } = await addPointRecordWithRecalc({
            user_id: currentUser.id,
            type: 'admin_adjust',
            amount: delta,
            remark: `管理员调整可用积分：${oldAvailable} → ${newAvailable}`,
            operator_name: adminUser?.nickname || adminUser?.email || '管理员',
            operator_id: adminUser?.id,
          })
          if (!success) {
            message.error(errorMessage || '积分调整失败')
            setSubmitting(false)
            return
          }
        } else {
          // 无积分变动时也确保 users 展示列最新（替代不存在的触发器）
          const recalcOk = await recalcUserPoints(currentUser.id)
          if (!recalcOk) {
            message.warning('积分展示列重算失败，用户积分/连续签到展示可能短暂不同步')
          }
        }

        const updateData = buildUpdateUser(formData)

        const result = await userService.update(currentUser.id, updateData)

        if (!result.success) {
          message.error('更新用户失败: ' + (result.errorMessage || '未知错误'))
          return
        }
        await fetchUsers()
        await logOperation('update_user', currentUser.id, { changes: formData })
      } catch (err) {
        message.error('更新用户失败，请检查网络连接后重试')
      } finally {
        setSubmitting(false)
      }
    },
    [currentUser, fetchUsers, logOperation, submitting, adminUser],
  )

  // 删除用户（软删除）
  const handleDelete = useCallback(
    async (ids: string[]) => {
      try {
        const result = await userService.batchSoftDelete(ids)
        if (!result.success) {
          message.error(result.errorMessage || '禁用用户失败')
          return
        }
        await fetchUsers()
        for (const id of ids) {
          await logOperation('delete_user', id, { type: 'soft_delete' })
        }
        message.success(`成功禁用 ${ids.length} 个用户`)
      } catch (err) {
        message.error('禁用用户失败，请检查网络连接后重试')
      }
      setSelectedRowKeys([])
    },
    [fetchUsers, logOperation],
  )

  // 切换用户状态
  const handleToggleStatus = useCallback(
    async (user: User) => {
      const newStatus: UserStatus =
        user.status === USER_STATUS_ACTIVE ? USER_STATUS_DISABLED : USER_STATUS_ACTIVE

      try {
        const result = await userService.toggleStatus(user.id, newStatus)
        if (!result.success) {
          message.error(result.errorMessage || '切换用户状态失败')
          return
        }
        await fetchUsers()
        await logOperation('toggle_user_status', user.id, { from: user.status, to: newStatus })
        message.success(`用户已${newStatus === 'active' ? '启用' : '禁用'}`)
      } catch (err) {
        message.error('切换用户状态失败，请检查网络连接后重试')
      }
    },
    [fetchUsers, logOperation],
  )

  // 批量禁用
  const handleBatchDisable = useCallback(async () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请先选择要禁用的用户')
      return
    }
    await handleDelete(selectedRowKeys.map((k) => String(k)))
  }, [selectedRowKeys, handleDelete])

  // 打开编辑弹窗
  const handleOpenEdit = useCallback((user: User) => {
    setCurrentUser(user)
    setModalMode('edit')
    setModalOpen(true)
  }, [])

  // 打开新增弹窗
  const handleOpenCreate = useCallback(() => {
    setCurrentUser(null)
    setModalMode('create')
    setModalOpen(true)
  }, [])

  return {
    // 数据
    data,
    loading,
    // 搜索/筛选/选择
    searchText,
    setSearchText,
    selectedRowKeys,
    setSelectedRowKeys,
    showFilters,
    setShowFilters,
    filterValues,
    setFilterValues,
    // 弹窗
    modalOpen,
    setModalOpen,
    modalMode,
    setModalMode,
    currentUser,
    setCurrentUser,
    submitting,
    // 分页
    tablePagination,
    handlePageChange,
    resetPage,
    // 字典
    roleOptions,
    statusOptions,
    memberLevelOptions,
    getRoleColor,
    getStatusColor,
    getMemberLevelColor,
    // 权限
    hasPermission,
    // 操作
    fetchUsers,
    handleCreate,
    handleEdit,
    handleDelete,
    handleToggleStatus,
    handleBatchDisable,
    handleOpenEdit,
    handleOpenCreate,
  }
}
