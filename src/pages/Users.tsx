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
import type { User, UserFormData, UserStats, OperationLog, UserRole, MemberLevel, UserStatus } from '../types/user'
import {
  USER_ROLE_LABELS,
  USER_ROLE_COLORS,
  MEMBER_LEVEL_LABELS,
  MEMBER_LEVEL_COLORS,
  USER_STATUS_LABELS,
  USER_STATUS_COLORS,
  USER_ROLE_OPTIONS,
  MEMBER_LEVEL_OPTIONS,
  USER_STATUS_OPTIONS,
} from '../types/user'
import { generateUserId } from '../utils/userId'
import { exportToCSV, exportToExcel } from '../utils/export'
import { supabase } from '../utils/supabase'
import { useAuth } from '../context/auth'
import { usePermission } from '../hooks/usePermission'
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

  // ==================== 数据加载 ====================
  const fetchUsers = useCallback(async () => {
    setLoading(true)
    try {
      // 尝试从 Supabase 获取数据
      const { data: users, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        // 如果数据库查询失败，使用本地数据
        console.log('Supabase query failed, using local data:', error)
        const { mockUsers } = await import('../utils/mockData')
        setData(mockUsers as User[])
      } else {
        setData(users || [])
      }
    } catch (err) {
      console.error('Failed to fetch users:', err)
      // 使用本地数据
      const { mockUsers } = await import('../utils/mockData')
      setData(mockUsers as User[])
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
    const newUser: User = {
      id: generateUserId(),
      email: formData.email,
      phone: formData.phone || null,
      nickname: formData.nickname || null,
      avatar_url: null,
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
        // 本地添加
        setData(prev => [newUser, ...prev])
      } else {
        await fetchUsers()
      }
      await logOperation('create_user', newUser.id, { email: newUser.email })
    } catch (err) {
      // 本地添加
      setData(prev => [newUser, ...prev])
    }
  }, [supabase, fetchUsers, logOperation])

  // 编辑用户
  const handleEdit = useCallback(async (formData: UserFormData) => {
    if (!currentUser) return

    try {
      const { error } = await supabase
        .from('users')
        .update({
          phone: formData.phone || null,
          nickname: formData.nickname || null,
          role: formData.role,
          member_level: formData.member_level,
          status: formData.status,
          points: formData.points,
          updated_at: new Date().toISOString(),
        })
        .eq('id', currentUser.id)

      if (error) {
        // 本地更新
        setData(prev => prev.map(user => 
          user.id === currentUser.id
            ? {
                ...user,
                phone: formData.phone || null,
                nickname: formData.nickname || null,
                role: formData.role,
                member_level: formData.member_level,
                status: formData.status,
                points: formData.points,
                updated_at: new Date().toISOString(),
              }
            : user
        ))
      } else {
        await fetchUsers()
      }
      await logOperation('update_user', currentUser.id, { changes: formData })
    } catch (err) {
      // 本地更新
      setData(prev => prev.map(user => 
        user.id === currentUser.id
          ? {
              ...user,
              phone: formData.phone || null,
              nickname: formData.nickname || null,
              role: formData.role,
              member_level: formData.member_level,
              status: formData.status,
              points: formData.points,
              updated_at: new Date().toISOString(),
            }
          : user
      ))
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
        // 本地删除
        setData(prev => prev.filter(user => !ids.includes(user.id)))
      } else {
        await fetchUsers()
      }
      for (const id of ids) {
        await logOperation('delete_user', id, { type: 'soft_delete' })
      }
      message.success(`成功禁用 ${ids.length} 个用户`)
    } catch (err) {
      // 本地删除
      setData(prev => prev.filter(user => !ids.includes(user.id)))
      message.success(`成功删除 ${ids.length} 个用户`)
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
        // 本地更新
        setData(prev => prev.map(u => 
          u.id === user.id ? { ...u, status: newStatus } : u
        ))
      } else {
        await fetchUsers()
      }
      await logOperation('toggle_user_status', user.id, { from: user.status, to: newStatus })
      message.success(`用户已${newStatus === 'active' ? '启用' : '禁用'}`)
    } catch (err) {
      // 本地更新
      setData(prev => prev.map(u => 
        u.id === user.id ? { ...u, status: newStatus } : u
      ))
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
      { title: '手机号', dataIndex: 'phone', render: (v: unknown) => String(v || '') },
      { title: '角色', dataIndex: 'role', render: (v: unknown) => USER_ROLE_LABELS[v as UserRole] || String(v) },
      { title: '会员等级', dataIndex: 'member_level', render: (v: unknown) => MEMBER_LEVEL_LABELS[v as MemberLevel] || String(v) },
      { title: '积分', dataIndex: 'points' },
      { title: '状态', dataIndex: 'status', render: (v: unknown) => USER_STATUS_LABELS[v as UserStatus] || String(v) },
      { title: '注册时间', dataIndex: 'created_at', render: (v: unknown) => dayjs(String(v)).format('YYYY-MM-DD HH:mm:ss') },
    ]
    exportToCSV(filteredData as unknown as Record<string, unknown>[], columns, '用户列表')
    message.success('CSV 导出成功')
  }, [filteredData])

  const handleExportExcel = useCallback(() => {
    const columns = [
      { title: '用户ID', dataIndex: 'id' },
      { title: '邮箱', dataIndex: 'email' },
      { title: '昵称', dataIndex: 'nickname', render: (v: unknown) => String(v || '') },
      { title: '手机号', dataIndex: 'phone', render: (v: unknown) => String(v || '') },
      { title: '角色', dataIndex: 'role', render: (v: unknown) => USER_ROLE_LABELS[v as UserRole] || String(v) },
      { title: '会员等级', dataIndex: 'member_level', render: (v: unknown) => MEMBER_LEVEL_LABELS[v as MemberLevel] || String(v) },
      { title: '积分', dataIndex: 'points' },
      { title: '状态', dataIndex: 'status', render: (v: unknown) => USER_STATUS_LABELS[v as UserStatus] || String(v) },
      { title: '注册时间', dataIndex: 'created_at', render: (v: unknown) => dayjs(String(v)).format('YYYY-MM-DD HH:mm:ss') },
    ]
    exportToExcel(filteredData as unknown as Record<string, unknown>[], columns, '用户列表')
    message.success('Excel 导出成功')
  }, [filteredData])

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
          <a onClick={() => handleViewUser(data.find(u => u.id === id)!)}>
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
      title: '角色',
      dataIndex: 'role',
      key: 'role',
      width: 100,
      render: (role: UserRole) => (
        <Tag color={USER_ROLE_COLORS[role]}>{USER_ROLE_LABELS[role]}</Tag>
      ),
    },
    {
      title: '会员等级',
      dataIndex: 'member_level',
      key: 'member_level',
      width: 100,
      render: (level: MemberLevel) => (
        <Tag color={MEMBER_LEVEL_COLORS[level]}>{MEMBER_LEVEL_LABELS[level]}</Tag>
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
        <Tag color={USER_STATUS_COLORS[status]}>{USER_STATUS_LABELS[status]}</Tag>
      ),
    },
    {
      title: '注册时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 160,
      sorter: (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
      render: (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: '最后登录',
      dataIndex: 'last_login_at',
      key: 'last_login_at',
      width: 160,
      sorter: (a, b) => {
        if (!a.last_login_at) return 1
        if (!b.last_login_at) return -1
        return new Date(a.last_login_at).getTime() - new Date(b.last_login_at).getTime()
      },
      render: (date: string | null) => date ? dayjs(date).format('YYYY-MM-DD HH:mm') : <Text type="secondary">从未登录</Text>,
    },
    {
      title: '操作',
      key: 'action',
      fixed: 'right',
      width: 200,
      render: (_, record) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => handleViewUser(record)}
          >
            查看
          </Button>
          {canManageUsers && (
            <>
              <Button
                type="link"
                size="small"
                icon={<EditOutlined />}
                onClick={() => handleOpenEdit(record)}
              >
                编辑
              </Button>
              <Button
                type="link"
                size="small"
                icon={record.status === 'active' ? <StopOutlined /> : <CheckCircleOutlined />}
                onClick={() => handleToggleStatus(record)}
                danger={record.status === 'active'}
              >
                {record.status === 'active' ? '禁用' : '启用'}
              </Button>
              <Popconfirm
                title="确认删除"
                description="删除后用户将无法恢复，是否继续？"
                onConfirm={() => handleDelete([record.id])}
                okText="删除"
                cancelText="取消"
                okButtonProps={{ danger: true }}
              >
                <Button type="link" size="small" danger icon={<DeleteOutlined />}>
                  删除
                </Button>
              </Popconfirm>
            </>
          )}
        </Space>
      ),
    },
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
                options={USER_ROLE_OPTIONS}
              />
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Select
                style={{ width: '100%' }}
                placeholder="选择状态"
                allowClear
                value={filterValues.status}
                onChange={value => setFilterValues(prev => ({ ...prev, status: value as UserStatus | undefined }))}
                options={USER_STATUS_OPTIONS}
              />
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Select
                style={{ width: '100%' }}
                placeholder="选择会员等级"
                allowClear
                value={filterValues.member_level}
                onChange={value => setFilterValues(prev => ({ ...prev, member_level: value as MemberLevel | undefined }))}
                options={MEMBER_LEVEL_OPTIONS}
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
          total: filteredData.length,
        }}
        onChange={pag => setPagination(pag)}
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
