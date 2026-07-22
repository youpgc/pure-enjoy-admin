// 用户管理页数据/操作逻辑 Hook（从 Users.tsx 抽取，行为保持）
import { useState, useEffect, useCallback } from 'react'
import type { Key } from 'react'
import dayjs from 'dayjs'
import sha256 from 'crypto-js/sha256'
import type {
  User,
  UserFormData,
  UserStats,
  OperationLog,
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
import { generateUserId } from '../../utils/userId'
import {
  createUser,
  addPointRecord,
  recalcUserPoints,
  logUserOperation,
  fetchUserActivity,
} from '../../services/userService'
import { userService } from '../../services/userService'
import { useAuth } from '../../App'
import { usePermission } from '../../hooks/usePermission'
import { useMounted } from '../../hooks/useMounted'
import { usePagination } from '../../hooks/usePagination'
import { supabase } from '../../utils/supabase'
import { message } from 'antd'

export interface UserFilterValues {
  role?: UserRole
  status?: UserStatus
  member_level?: MemberLevel
  dateRange?: [string, string]
}

export function useUsers() {
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

  // 详情抽屉状态
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [detailUser, setDetailUser] = useState<User | null>(null)
  const [userStats, setUserStats] = useState<UserStats | null>(null)
  const [userLogs, setUserLogs] = useState<OperationLog[]>([])
  const [detailLoading, setDetailLoading] = useState(false)

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
  const fetchUsers = useCallback(async (page = pagination.current, pageSize = pagination.pageSize) => {
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
        console.error('[Users] 查询失败:', result.errorMessage)
        message.error('获取用户列表失败: ' + (result.errorMessage || '未知错误'))
        setData([])
      } else {
        setData(result.data?.data || [])
        setTotal(result.data?.total || 0)
      }
    } catch (err) {
      if (!mountedRef.current) return
      console.error('[Users] 获取用户列表失败:', err)
      message.error('获取用户列表失败，请检查网络连接后重试')
      setData([])
    } finally {
      setLoading(false)
    }
  }, [searchText, filterValues, pagination.current, pagination.pageSize, setTotal])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  // ==================== 操作处理 ====================
  // 记录操作日志
  const logOperation = useCallback(async (
    action: string,
    targetId: string,
    details: Record<string, unknown>
  ) => {
    try {
      await logUserOperation({
        user_id: adminUser?.id,
        action,
        module: 'users',
        target_id: targetId,
        details: details,
      })
    } catch (err) {
      console.error('Failed to log operation:', err)
    }
  }, [adminUser])

  /**
   * 同步创建 Supabase Auth 用户（仅管理员操作，确保 App 端可用邮箱+密码登录）
   *
   * 安全说明（治理红线）：service_role 绝不下发到前端。原实现用
   * import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY 直调 /auth/v1/admin/users，
   * 该 key 会被 Vite 打进浏览器 bundle（泄露 + 绕过 RLS），已回滚多次。
   * 现改为数据库 RPC（create_auth_user，SECURITY DEFINER）创建 auth.users：
   *   - 密钥仅存在于数据库函数内，永不进前端 bundle；
   *   - 函数内部用 JWT 角色声明校验，非管理员拒绝（errcode 42501）；
   *   - 需先在 Supabase SQL Editor 执行 fix_create_auth_user_rpc.sql 迁移。
   * 调用失败仅告警、不抛错，保证 public.users 主流程不受影响（逻辑闭环、可灰度）。
   */
  const createAuthUser = async (user: User, plainPassword: string) => {
    try {
      const { error } = await supabase.rpc('create_auth_user', {
        p_email: user.email,
        p_password: plainPassword,
        p_phone: user.phone || null,
        p_user_metadata: {
          app_user_id: user.id,
          username: user.username || null,
          nickname: user.nickname || null,
          role: user.role,
        },
      } as any)
      if (error) {
        console.warn('auth.users 同步失败（请确认已执行 create_auth_user RPC 迁移）:', error.message)
      }
    } catch (err) {
      console.warn('auth.users 同步异常:', err)
    }
  }

  // 新增用户
  const handleCreate = useCallback(async (formData: UserFormData) => {
    if (submitting) return
    // 对密码进行 SHA-256 哈希（密码必填，不允许留空）
    if (!formData.password || formData.password.trim() === '') {
      message.error('密码不能为空')
      return
    }
    const passwordHash = sha256(formData.password).toString()

    // 处理 birthday 字段
    const birthdayValue = formData.birthday
      ? (typeof formData.birthday === 'string'
          ? formData.birthday
          : (formData.birthday as dayjs.Dayjs).format('YYYY-MM-DD'))
      : null

    const newUser: Omit<User, 'id' | 'created_at' | 'updated_at'> = {
      email: formData.email,
      phone: formData.phone || null,
      password_hash: passwordHash,
      nickname: formData.nickname || null,
      avatar_url: formData.avatar_url || null,
      // 扩展资料字段
      username: formData.username || null,
      bio: formData.bio || null,
      gender: formData.gender || null,
      birthday: birthdayValue,
      location: formData.location || null,
      occupation: formData.occupation || null,
      company: formData.company || null,
      website: formData.website || null,
      height: formData.height ?? null,
      role: formData.role,
      member_level: formData.member_level,
      // 新建用户展示列默认 0；若设置初始积分，下方 addPointRecord + recalcUserPoints 会重算回写（无触发器）
      points: 0,
      effective_points: 0,
      available_points: 0,
      expiring_points: 0,
      consecutive_checkin_days: 0,
      last_checkin_date: null,
      tts_speech_rate: null,
      tts_timer_minutes: null,
      tts_playback_mode: null,
      tts_enabled: true,
      status: formData.status,
      register_ip: null,
      last_login_ip: null,
      last_login_at: null,
      login_count: 0,
    }

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
        const { data: pointRecord, error: recordError } = await addPointRecord({
          user_id: userId,
          type: 'admin_adjust',
          amount: initPoints,
          remark: '创建用户时设置初始积分',
          operator_name: adminUser?.nickname || adminUser?.email || '管理员',
          operator_id: adminUser?.id,
        })
        if (recordError) {
          console.warn('初始积分记录失败:', recordError.message)
        } else if (!pointRecord || pointRecord.length === 0) {
          console.warn('初始积分记录未写入：可能 RLS 策略阻止')
        }
      }
      // 主动重算并回写 users 全部展示列（替代不存在的触发器）
      const recalcOk = await recalcUserPoints(userId)
      if (!recalcOk) {
        message.warning('积分展示列重算失败，用户积分/连续签到展示可能短暂不同步')
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
  }, [fetchUsers, logOperation, submitting, adminUser])

  // 编辑用户
  const handleEdit = useCallback(async (formData: UserFormData) => {
    if (submitting) return
    if (!currentUser) return

    // 处理 birthday 字段：如果是 Dayjs 对象，转换为字符串
    const birthdayValue = formData.birthday
      ? (typeof formData.birthday === 'string'
          ? formData.birthday
          : (formData.birthday as dayjs.Dayjs).format('YYYY-MM-DD'))
      : null

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
        const { error: recordError } = await addPointRecord({
          user_id: currentUser.id,
          type: 'admin_adjust',
          amount: delta,
          remark: `管理员调整可用积分：${oldAvailable} → ${newAvailable}`,
          operator_name: adminUser?.nickname || adminUser?.email || '管理员',
          operator_id: adminUser?.id,
        })
        if (recordError) {
          message.error('积分调整记录失败: ' + recordError.message)
          setSubmitting(false)
          return
        }
      }
      // 主动重算并回写 users 全部展示列（替代不存在的触发器）
      const recalcOk = await recalcUserPoints(currentUser.id)
      if (!recalcOk) {
        message.warning('积分展示列重算失败，用户积分/连续签到展示可能短暂不同步')
      }

      const updateData: Partial<User> = {
        phone: formData.phone || null,
        nickname: formData.nickname || null,
        avatar_url: formData.avatar_url || null,
        // 扩展资料字段
        username: formData.username || null,
        bio: formData.bio || null,
        gender: formData.gender || null,
        birthday: birthdayValue,
        location: formData.location || null,
        occupation: formData.occupation || null,
        company: formData.company || null,
        website: formData.website || null,
        height: formData.height ?? null,
        role: formData.role,
        member_level: formData.member_level,
        status: formData.status,
        // points 不再直接更新；展示列由 recalc_user_points RPC 后台主动重算回写（无触发器）
      }

      // 如果填写了新密码，更新密码哈希
      if (formData.password) {
        updateData.password_hash = sha256(formData.password).toString()
      }

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
  }, [currentUser, supabase, fetchUsers, logOperation, submitting, adminUser])

  // 删除用户（软删除）
  const handleDelete = useCallback(async (ids: string[]) => {
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
  }, [fetchUsers, logOperation])

  // 切换用户状态
  const handleToggleStatus = useCallback(async (user: User) => {
    const newStatus: UserStatus = user.status === 'active' ? 'disabled' : 'active'

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
  }, [fetchUsers, logOperation])

  // 批量禁用
  const handleBatchDisable = useCallback(async () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请先选择要禁用的用户')
      return
    }
    await handleDelete(selectedRowKeys.map(k => String(k)))
  }, [selectedRowKeys, handleDelete])

  // 查看用户详情
  const handleViewUser = useCallback(async (user: User) => {
    setDetailUser(user)
    setDrawerOpen(true)
    setDetailLoading(true)

    try {
      // 获取用户统计数据
      const [expensesResult, moodsResult, weightsResult, notesResult, novelsResult, logsResult] = await fetchUserActivity(user.id)

      if (!mountedRef.current) return

      setUserStats({
        expense_count: expensesResult.count || 0,
        mood_count: moodsResult.count || 0,
        weight_count: weightsResult.count || 0,
        note_count: notesResult.count || 0,
        novel_count: novelsResult.count || 0,
      })
      setUserLogs((logsResult.data || []) as unknown as OperationLog[])
    } catch (err) {
      console.error('Failed to fetch user details:', err)
      setUserStats(null)
      setUserLogs([])
    } finally {
      setDetailLoading(false)
    }
  }, [])

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
    // 抽屉
    drawerOpen,
    setDrawerOpen,
    detailUser,
    setDetailUser,
    userStats,
    setUserStats,
    userLogs,
    setUserLogs,
    detailLoading,
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
    handleViewUser,
    handleOpenEdit,
    handleOpenCreate,
  }
}
