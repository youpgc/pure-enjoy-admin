import React, { useState, useEffect, useCallback } from 'react'
import {
  Table,
  Button,
  Space,
  Tag,
  Input,
  Popconfirm,
  message,
  Dropdown,
  DatePicker,
  Row,
  Col,
  Select,
  Card,
  Typography,
  Tooltip,
  Badge,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import type { Key } from 'react'
import {
  SearchOutlined,
  PlusOutlined,
  ExportOutlined,
  DeleteOutlined,
  FilterOutlined,
  DownOutlined,
  ReloadOutlined,
  EyeOutlined,
  EditOutlined,
  StopOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import sha256 from 'crypto-js/sha256'
import type { User, UserFormData, UserStats, OperationLog, UserRole, MemberLevel, UserStatus } from '../types/user'
import {
  USER_ROLE_OPTIONS,
  MEMBER_LEVEL_OPTIONS,
  USER_STATUS_OPTIONS,
} from '../types/user'
import { useDictOptions, useDictColors } from '../hooks/useDictOptions'
import { generateUserId } from '../utils/userId'
import { createUser, addPointRecord, logUserOperation, fetchUserActivity } from '../services/userService'
import { exportToCSV, exportToExcel } from '../utils/export'
import { getActionColumn } from '../components/ActionColumn'
import { supabase } from '../utils/supabase'
import { userService } from '../services/userService'
import { useAuth } from '../App'
import { usePermission } from '../hooks/usePermission'
import { useMounted } from '../hooks/useMounted'
import { usePagination } from '../hooks/usePagination'
import { formatDateTime } from '../utils/format'
import UserFormModal from '../components/UserFormModal'
import UserDetailDrawer from '../components/UserDetailDrawer'

const { RangePicker } = DatePicker
const { Text } = Typography

// ==================== 主组件 ====================
const Users: React.FC = () => {
  const mountedRef = useMounted()

  // 状态
  const [data, setData] = useState<User[]>([])
  const [loading, setLoading] = useState(false)
  const [searchText, setSearchText] = useState('')
  const [selectedRowKeys, setSelectedRowKeys] = useState<Key[]>([])
  const [showFilters, setShowFilters] = useState(false)
  const [filterValues, setFilterValues] = useState<{
    role?: UserRole
    status?: UserStatus
    member_level?: MemberLevel
    dateRange?: [string, string]
  }>({})
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
        detail: details,
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
      // points 由 point_records 触发器自动维护，新用户默认 0
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

      // 如果管理员设置了初始积分，插入 point_records 流水（触发器自动同步 users.points）
      const initPoints = formData.points ?? 0
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

      // 积分调整：如果 points 变动，插入 point_records 流水记录
      // 数据库触发器会自动同步 users.effective_points / points
      const oldPoints = currentUser.points ?? 0
      const newPoints = formData.points ?? 0
      const delta = newPoints - oldPoints

      if (delta !== 0) {
        const { error: recordError } = await addPointRecord({
          user_id: currentUser.id,
          type: 'admin_adjust',
          amount: delta,
          remark: `管理员调整：${oldPoints} → ${newPoints}`,
          operator_name: adminUser?.nickname || adminUser?.email || '管理员',
          operator_id: adminUser?.id,
        })
        if (recordError) {
          message.error('积分调整记录失败: ' + recordError.message)
          setSubmitting(false)
          return
        }
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
        // points 不再直接更新，由 point_records 触发器自动维护
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

  // ==================== 导出 ====================
  const handleExportCSV = useCallback(() => {
    const columns = [
      { title: '用户ID', dataIndex: 'id' },
      { title: '邮箱', dataIndex: 'email' },
      { title: '昵称', dataIndex: 'nickname', render: (v: unknown) => String(v || '') },
      { title: '用户名', dataIndex: 'username', render: (v: unknown) => String(v || '') },
      { title: '手机号', dataIndex: 'phone', render: (v: unknown) => String(v || '') },
      { title: '性别', dataIndex: 'gender', render: (v: unknown) => String(v || '') },
      { title: '个性签名', dataIndex: 'bio', render: (v: unknown) => String(v || '') },
      { title: '所在地', dataIndex: 'location', render: (v: unknown) => String(v || '') },
      { title: '职业', dataIndex: 'occupation', render: (v: unknown) => String(v || '') },
      { title: '公司', dataIndex: 'company', render: (v: unknown) => String(v || '') },
      { title: '角色', dataIndex: 'role', render: (v: unknown) => roleOptions.find(opt => opt.value === v)?.label || String(v) },
      { title: '会员等级', dataIndex: 'member_level', render: (v: unknown) => memberLevelOptions.find(opt => opt.value === v)?.label || String(v) },
      { title: '积分', dataIndex: 'points' },
      { title: '状态', dataIndex: 'status', render: (v: unknown) => statusOptions.find(opt => opt.value === v)?.label || String(v) },
      { title: '注册时间', dataIndex: 'created_at', render: (v: unknown) => dayjs(String(v)).format('YYYY-MM-DD HH:mm:ss') },
    ]
    exportToCSV(data as unknown as Record<string, unknown>[], columns, '用户列表')
    message.success('CSV 导出成功')
  }, [data, roleOptions, memberLevelOptions, statusOptions])

  const handleExportExcel = useCallback(() => {
    const columns = [
      { title: '用户ID', dataIndex: 'id' },
      { title: '邮箱', dataIndex: 'email' },
      { title: '昵称', dataIndex: 'nickname', render: (v: unknown) => String(v || '') },
      { title: '用户名', dataIndex: 'username', render: (v: unknown) => String(v || '') },
      { title: '手机号', dataIndex: 'phone', render: (v: unknown) => String(v || '') },
      { title: '性别', dataIndex: 'gender', render: (v: unknown) => String(v || '') },
      { title: '个性签名', dataIndex: 'bio', render: (v: unknown) => String(v || '') },
      { title: '所在地', dataIndex: 'location', render: (v: unknown) => String(v || '') },
      { title: '职业', dataIndex: 'occupation', render: (v: unknown) => String(v || '') },
      { title: '公司', dataIndex: 'company', render: (v: unknown) => String(v || '') },
      { title: '角色', dataIndex: 'role', render: (v: unknown) => roleOptions.find(opt => opt.value === v)?.label || String(v) },
      { title: '会员等级', dataIndex: 'member_level', render: (v: unknown) => memberLevelOptions.find(opt => opt.value === v)?.label || String(v) },
      { title: '积分', dataIndex: 'points' },
      { title: '状态', dataIndex: 'status', render: (v: unknown) => statusOptions.find(opt => opt.value === v)?.label || String(v) },
      { title: '注册时间', dataIndex: 'created_at', render: (v: unknown) => dayjs(String(v)).format('YYYY-MM-DD HH:mm:ss') },
    ]
    exportToExcel(data as unknown as Record<string, unknown>[], columns, '用户列表')
    message.success('Excel 导出成功')
  }, [data, roleOptions, memberLevelOptions, statusOptions])

  const exportMenuItems = [
    { key: 'csv', label: '导出 CSV', icon: <ExportOutlined /> },
    { key: 'excel', label: '导出 Excel', icon: <ExportOutlined /> },
  ]

  const handleExportMenuClick = useCallback(
    ({ key }: { key: string }) => {
      if (key === 'csv') handleExportCSV()
      else if (key === 'excel') handleExportExcel()
    },
    [handleExportCSV, handleExportExcel]
  )

  // ==================== 表格列定义 ====================
  const columns: ColumnsType<User> = [
    {
      title: '用户ID',
      dataIndex: 'id',
      key: 'id',
      width: 200,
      fixed: 'left',
      render: (id: string) => (
        <Tooltip title="点击查看详情">
          <a onClick={() => {
            const found = data.find(u => u.id === id)
            if (found) handleViewUser(found)
          }}>
            <Text style={{ fontSize: 12 }}>{id}</Text>
          </a>
        </Tooltip>
      ),
    },
    {
      title: '邮箱',
      dataIndex: 'email',
      key: 'email',
      width: 200,
      ellipsis: true,
    },
    {
      title: '昵称',
      dataIndex: 'nickname',
      key: 'nickname',
      width: 120,
      render: (nickname: string | null) => nickname || <Text type="secondary">未设置</Text>,
    },
    {
      title: '手机号',
      dataIndex: 'phone',
      key: 'phone',
      width: 130,
      render: (phone: string | null) => phone || <Text type="secondary">未设置</Text>,
    },
    {
      title: '用户名',
      dataIndex: 'username',
      key: 'username',
      width: 100,
      render: (username: string | null) => username || <Text type="secondary">-</Text>,
    },
    {
      title: '性别',
      dataIndex: 'gender',
      key: 'gender',
      width: 70,
      render: (gender: string | null) => gender || <Text type="secondary">-</Text>,
    },
    {
      title: '身高(cm)',
      dataIndex: 'height',
      key: 'height',
      width: 100,
      render: (height: number | null) => height != null ? `${height}` : <Text type="secondary">-</Text>,
    },
    {
      title: '角色',
      dataIndex: 'role',
      key: 'role',
      width: 100,
      render: (role: UserRole) => (
        <Tag color={getRoleColor(role)}>{roleOptions.find(opt => opt.value === role)?.label || role}</Tag>
      ),
    },
    {
      title: '会员等级',
      dataIndex: 'member_level',
      key: 'member_level',
      width: 100,
      render: (level: MemberLevel) => (
        <Tag color={getMemberLevelColor(level)}>{memberLevelOptions.find(opt => opt.value === level)?.label || level}</Tag>
      ),
    },
    {
      title: '积分',
      dataIndex: 'points',
      key: 'points',
      width: 80,
      sorter: (a, b) => a.points - b.points,
      render: (points: number) => <Badge count={points} showZero style={{ backgroundColor: '#faad14' }} />,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 80,
      render: (status: UserStatus) => (
        <Tag color={getStatusColor(status)}>{statusOptions.find(opt => opt.value === status)?.label || status}</Tag>
      ),
    },
    {
      title: '注册时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 160,
      render: (date: string) => formatDateTime(date),
    },
    {
      title: '最后登录',
      dataIndex: 'last_login_at',
      key: 'last_login_at',
      width: 160,
      render: (date: string | null) => date ? formatDateTime(date) : <Text type="secondary">从未登录</Text>,
    },
    getActionColumn<User>(
      (record) => {
        const actions: import('../components/ActionColumn').ActionButton[] = [
          {
            key: 'view',
            label: '查看',
            icon: <EyeOutlined />,
            onClick: () => handleViewUser(record),
          },
        ]
        if (hasPermission('users:write') || hasPermission('users:delete')) {
          actions.push(
            {
              key: 'edit',
              label: '编辑',
              icon: <EditOutlined />,
              onClick: () => handleOpenEdit(record),
            },
            {
              key: 'toggle',
              label: record.status === 'active' ? '禁用' : '启用',
              icon: record.status === 'active' ? <StopOutlined /> : <CheckCircleOutlined />,
              danger: record.status === 'active',
              onClick: () => handleToggleStatus(record),
            },
            {
              key: 'delete',
              label: '删除',
              icon: <DeleteOutlined />,
              danger: true,
              onClick: () => handleDelete([record.id]),
            }
          )
        }
        return actions
      },
      { width: 240, maxVisible: 2 }
    ),
  ]

  // ==================== 渲染 ====================
  return (
    <div>
      {/* 顶部工具栏 */}
      <Card size="small" style={{ marginBottom: 16 }}>
        <Row gutter={[16, 16]} align="middle">
          <Col flex="auto">
            <Space size="middle" wrap>
              <Input
                placeholder="搜索邮箱、昵称、手机号或ID"
                prefix={<SearchOutlined />}
                value={searchText}
                onChange={e => {
                  setSearchText(e.target.value)
                  resetPage()
                }}
                allowClear
                style={{ width: 280 }}
              />
              <Button
                icon={<FilterOutlined />}
                onClick={() => setShowFilters(prev => !prev)}
                type={showFilters ? 'primary' : 'default'}
              >
                高级筛选
                {showFilters && (
                  <Tag color="blue" style={{ marginLeft: 4 }}>
                    {Object.values(filterValues).filter(v => v !== undefined && v !== null).length}
                  </Tag>
                )}
              </Button>
            </Space>
          </Col>
          <Col>
            <Space size="middle">
              {(hasPermission('users:write') || hasPermission('users:delete')) && (
                <>
                  <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={handleOpenCreate}
                  >
                    新增用户
                  </Button>
                  {selectedRowKeys.length > 0 && (
                    <Popconfirm
                      title="批量禁用"
                      description={`确认禁用选中的 ${selectedRowKeys.length} 个用户？`}
                      onConfirm={handleBatchDisable}
                      okText="禁用"
                      cancelText="取消"
                      okButtonProps={{ danger: true }}
                    >
                      <Button danger icon={<StopOutlined />}>
                        批量禁用 ({selectedRowKeys.length})
                      </Button>
                    </Popconfirm>
                  )}
                </>
              )}
              <Dropdown menu={{ items: exportMenuItems, onClick: handleExportMenuClick }}>
                <Button icon={<ExportOutlined />}>
                  导出 <DownOutlined />
                </Button>
              </Dropdown>
              <Button
                icon={<ReloadOutlined />}
                onClick={() => {
                  setSearchText('')
                  setFilterValues({})
                  setSelectedRowKeys([])
                  fetchUsers()
                }}
              >
                刷新
              </Button>
            </Space>
          </Col>
        </Row>

        {/* 高级筛选区域 */}
        {showFilters && (
          <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
            <Col xs={24} sm={12} md={6}>
              <Select
                style={{ width: '100%' }}
                placeholder="选择角色"
                allowClear
                value={filterValues.role}
                onChange={value => setFilterValues(prev => ({ ...prev, role: value as UserRole | undefined }))}
                options={roleOptions}
              />
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Select
                style={{ width: '100%' }}
                placeholder="选择状态"
                allowClear
                value={filterValues.status}
                onChange={value => setFilterValues(prev => ({ ...prev, status: value as UserStatus | undefined }))}
                options={statusOptions}
              />
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Select
                style={{ width: '100%' }}
                placeholder="选择会员等级"
                allowClear
                value={filterValues.member_level}
                onChange={value => setFilterValues(prev => ({ ...prev, member_level: value as MemberLevel | undefined }))}
                options={memberLevelOptions}
              />
            </Col>
            <Col xs={24} sm={12} md={6}>
              <RangePicker
                style={{ width: '100%' }}
                placeholder={['注册开始日期', '注册结束日期']}
                onChange={(_, dateStrings) => {
                  setFilterValues(prev => ({
                    ...prev,
                    dateRange: dateStrings[0] && dateStrings[1] ? dateStrings as [string, string] : undefined,
                  }))
                }}
              />
            </Col>
          </Row>
        )}
      </Card>

      {/* 数据表格 */}
      <Table<User>
        columns={columns}
        dataSource={data}
        rowKey="id"
        loading={loading}
        pagination={{
          ...tablePagination,
          pageSizeOptions: ['10', '20', '50', '100'],
          showTotal: (total, range) => `显示 ${range[0]}-${range[1]} 条，共 ${total} 条`,
        }}
        onChange={pag => {
          const page = pag.current ?? 1
          const size = pag.pageSize ?? 10
          handlePageChange(page, size)
          fetchUsers(page, size)
        }}
        scroll={{ x: 1400 }}
        rowSelection={
          (hasPermission('users:write') || hasPermission('users:delete'))
            ? {
                selectedRowKeys,
                onChange: (keys: Key[]) => setSelectedRowKeys(keys),
              }
            : undefined
        }
        size="middle"
        bordered
      />

      {/* 用户表单弹窗 */}
      <UserFormModal
        open={modalOpen}
        mode={modalMode}
        user={currentUser}
        onCancel={() => {
          setModalOpen(false)
          setCurrentUser(null)
        }}
        onSubmit={modalMode === 'create' ? handleCreate : handleEdit}
      />

      {/* 用户详情抽屉 */}
      <UserDetailDrawer
        open={drawerOpen}
        user={detailUser}
        stats={userStats}
        logs={userLogs}
        loading={detailLoading}
        onClose={() => {
          setDrawerOpen(false)
          setDetailUser(null)
          setUserStats(null)
          setUserLogs([])
        }}
      />
    </div>
  )
}

export default Users
