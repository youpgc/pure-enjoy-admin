import React, { useState, useEffect, useCallback, useMemo } from 'react'
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
import type { TablePaginationConfig, ColumnsType } from 'antd/es/table'
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
import { exportToCSV, exportToExcel } from '../utils/export'
import { getActionColumn } from '../components/ActionColumn'
import { supabase } from '../utils/supabase'
import { useAuth } from '../App'
import { usePermission } from '../hooks/usePermission'
import { formatDateTime } from '../utils/format'
import UserFormModal from '../components/UserFormModal'
import UserDetailDrawer from '../components/UserDetailDrawer'

const { RangePicker } = DatePicker
const { Text } = Typography

// ==================== 主组件 ====================
const Users: React.FC = () => {
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
  const [pagination, setPagination] = useState<TablePaginationConfig>({
    current: 1,
    pageSize: 10,
    showSizeChanger: true,
    showQuickJumper: true,
    pageSizeOptions: ['10', '20', '50', '100'],
    showTotal: (total) => `共 ${total} 条`,
  })

  // 弹窗状态
  const [modalOpen, setModalOpen] = useState(false)
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create')
  const [currentUser, setCurrentUser] = useState<User | null>(null)

  // 详情抽屉状态
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [detailUser, setDetailUser] = useState<User | null>(null)
  const [userStats, setUserStats] = useState<UserStats | null>(null)
  const [userLogs, setUserLogs] = useState<OperationLog[]>([])
  const [detailLoading, setDetailLoading] = useState(false)

  // 权限
  const { user: adminUser } = useAuth()
  const { canManageUsers } = usePermission()

  // 字典查询
  const { options: roleOptions } = useDictOptions('user_role', USER_ROLE_OPTIONS)
  const { options: statusOptions } = useDictOptions('user_status', USER_STATUS_OPTIONS)
  const { options: memberLevelOptions } = useDictOptions('member_level', MEMBER_LEVEL_OPTIONS)
  const { getColor: getRoleColor } = useDictColors('user_role')
  const { getColor: getStatusColor } = useDictColors('user_status')
  const { getColor: getMemberLevelColor } = useDictColors('member_level')

  // ==================== 数据加载 ====================
  const fetchUsers = useCallback(async (page = 1, pageSize = 10) => {
    setLoading(true)

    try {
      // 先获取总数
      const { count, error: countError } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
      if (countError) throw countError

      // 分页查询
      const from = (page - 1) * pageSize
      const to = from + pageSize - 1
      const { data: users, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false })
        .range(from, to)

      if (error) {
        console.error('[Users] Supabase 查询失败:', error)
        message.error('获取用户列表失败: ' + error.message)
        setData([])
      } else {
        setData(users || [])
        setPagination(prev => ({ ...prev, current: page, pageSize, total: count || 0 }))
      }
    } catch (err) {
      console.error('[Users] 获取用户列表失败:', err)
      message.error('获取用户列表失败，请检查网络连接后重试')
      setData([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  // ==================== 筛选逻辑 ====================
  const filteredData = useMemo(() => {
    let result = [...data]

    // 关键词搜索
    if (searchText.trim()) {
      const keyword = searchText.trim().toLowerCase()
      result = result.filter(user => {
        return (
          user.email.toLowerCase().includes(keyword) ||
          (user.nickname && user.nickname.toLowerCase().includes(keyword)) ||
          (user.phone && user.phone.includes(keyword)) ||
          user.id.toLowerCase().includes(keyword)
        )
      })
    }

    // 角色筛选
    if (filterValues.role) {
      result = result.filter(user => user.role === filterValues.role)
    }

    // 状态筛选
    if (filterValues.status) {
      result = result.filter(user => user.status === filterValues.status)
    }

    // 会员等级筛选
    if (filterValues.member_level) {
      result = result.filter(user => user.member_level === filterValues.member_level)
    }

    // 注册时间范围筛选
    if (filterValues.dateRange && filterValues.dateRange[0] && filterValues.dateRange[1]) {
      result = result.filter(user => {
        const createdAt = user.created_at?.split('T')[0]
        return createdAt && createdAt >= filterValues.dateRange![0] && createdAt <= filterValues.dateRange![1]
      })
    }

    return result
  }, [data, searchText, filterValues])

  // ==================== 操作处理 ====================
  // 记录操作日志
  const logOperation = useCallback(async (
    action: string,
    targetId: string,
    details: Record<string, unknown>
  ) => {
    try {
      await supabase.from('operation_logs').insert({
        user_id: adminUser?.id,
        action,
        module: 'users',
        target_id: targetId,
        details,
        created_at: new Date().toISOString(),
      })
    } catch (err) {
      console.error('Failed to log operation:', err)
    }
  }, [adminUser])

  // 新增用户
  const handleCreate = useCallback(async (formData: UserFormData) => {
    // 对密码进行 SHA-256 哈希
    const passwordHash = formData.password
      ? sha256(formData.password).toString()
      : sha256('123456').toString() // 默认密码

    // 处理 birthday 字段
    const birthdayValue = formData.birthday
      ? (typeof formData.birthday === 'string'
          ? formData.birthday
          : (formData.birthday as dayjs.Dayjs).format('YYYY-MM-DD'))
      : null

    const newUser: User = {
      id: generateUserId(),
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
      role: formData.role,
      member_level: formData.member_level,
      points: formData.points,
      status: formData.status,
      register_ip: null,
      last_login_ip: null,
      last_login_at: null,
      login_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    try {
      const { error } = await supabase.from('users').insert(newUser)
      if (error) {
        message.error('创建用户失败: ' + error.message)
        return
      }
      await fetchUsers()
      await logOperation('create_user', newUser.id, { email: newUser.email })
    } catch (err) {
      message.error('创建用户失败，请检查网络连接后重试')
    }
  }, [supabase, fetchUsers, logOperation])

  // 编辑用户
  const handleEdit = useCallback(async (formData: UserFormData) => {
    if (!currentUser) return

    // 处理 birthday 字段：如果是 Dayjs 对象，转换为字符串
    const birthdayValue = formData.birthday
      ? (typeof formData.birthday === 'string'
          ? formData.birthday
          : (formData.birthday as dayjs.Dayjs).format('YYYY-MM-DD'))
      : null

    try {
      const updateData: Record<string, string | number | null> = {
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
        role: formData.role,
        member_level: formData.member_level,
        status: formData.status,
        points: formData.points,
        updated_at: new Date().toISOString(),
      }

      // 如果填写了新密码，更新密码哈希
      if (formData.password) {
        updateData.password_hash = sha256(formData.password).toString()
      }

      const { error } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', currentUser.id)

      if (error) {
        message.error('更新用户失败: ' + error.message)
        return
      }
      await fetchUsers()
      await logOperation('update_user', currentUser.id, { changes: formData })
    } catch (err) {
      message.error('更新用户失败，请检查网络连接后重试')
    }
  }, [currentUser, supabase, fetchUsers, logOperation])

  // 删除用户（软删除）
  const handleDelete = useCallback(async (ids: string[]) => {
    try {
      const { error } = await supabase
        .from('users')
        .update({ status: 'disabled', updated_at: new Date().toISOString() })
        .in('id', ids)

      if (error) {
        message.error('禁用用户失败: ' + error.message)
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
  }, [supabase, fetchUsers, logOperation])

  // 切换用户状态
  const handleToggleStatus = useCallback(async (user: User) => {
    const newStatus: UserStatus = user.status === 'active' ? 'disabled' : 'active'
    
    try {
      const { error } = await supabase
        .from('users')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', user.id)

      if (error) {
        message.error('切换用户状态失败: ' + error.message)
        return
      }
      await fetchUsers()
      await logOperation('toggle_user_status', user.id, { from: user.status, to: newStatus })
      message.success(`用户已${newStatus === 'active' ? '启用' : '禁用'}`)
    } catch (err) {
      message.error('切换用户状态失败，请检查网络连接后重试')
    }
  }, [supabase, fetchUsers, logOperation])

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
      const [expensesResult, moodsResult, weightsResult, notesResult, novelsResult, logsResult] = await Promise.all([
        supabase.from('expenses').select('id', { count: 'exact' }).eq('user_id', user.id),
        supabase.from('mood_diaries').select('id', { count: 'exact' }).eq('user_id', user.id),
        supabase.from('weight_records').select('id', { count: 'exact' }).eq('user_id', user.id),
        supabase.from('notes').select('id', { count: 'exact' }).eq('user_id', user.id),
        supabase.from('user_novels').select('id', { count: 'exact' }).eq('user_id', user.id),
        supabase.from('operation_logs').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(10),
      ])

      setUserStats({
        expense_count: expensesResult.count || 0,
        mood_count: moodsResult.count || 0,
        weight_count: weightsResult.count || 0,
        note_count: notesResult.count || 0,
        novel_count: novelsResult.count || 0,
      })
      setUserLogs((logsResult.data || []) as OperationLog[])
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
    exportToCSV(filteredData as unknown as Record<string, unknown>[], columns, '用户列表')
    message.success('CSV 导出成功')
  }, [filteredData, roleOptions, memberLevelOptions, statusOptions])

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
    exportToExcel(filteredData as unknown as Record<string, unknown>[], columns, '用户列表')
    message.success('Excel 导出成功')
  }, [filteredData, roleOptions, memberLevelOptions, statusOptions])

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
        if (canManageUsers) {
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
                  setPagination(prev => ({ ...prev, current: 1 }))
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
              {canManageUsers && (
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
        dataSource={filteredData}
        rowKey="id"
        loading={loading}
        pagination={{
          ...pagination,
          showSizeChanger: true,
          showQuickJumper: true,
          pageSizeOptions: ['10', '20', '50', '100'],
          showTotal: (total, range) => `显示 ${range[0]}-${range[1]} 条，共 ${total} 条`,
        }}
        onChange={pag => fetchUsers(pag.current, pag.pageSize)}
        scroll={{ x: 1400 }}
        rowSelection={
          canManageUsers
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
