import React, { useState, useEffect, useCallback } from 'react'
import {
  Table,
  Button,
  Input,
  Space,
  Tag,
  Card,
  message,
  Select,
  DatePicker,
  Avatar,
  Switch,
  Popconfirm,
  Typography,
  Row,
  Col,
  Statistic,
} from 'antd'
import {
  SearchOutlined,
  ReloadOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  UserOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import { supabase } from '../utils/supabase'
import { usePermission } from '../hooks/usePermission'
import { getActionColumn } from '../components/ActionColumn'
import UserFormModal from '../components/UserFormModal'
import { BaseService, handleApiError } from '../utils/apiClient'
import type { User } from '../types/user'

const { Text } = Typography
const { RangePicker } = DatePicker

// ==================== 类型定义 ====================

interface UserFilters {
  keyword: string
  role: string | undefined
  status: string | undefined
  memberLevel: string | undefined
  dateRange: [dayjs.Dayjs | null, dayjs.Dayjs | null] | null
}

// ==================== 组件 ====================

const Users: React.FC = () => {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(false)
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20, total: 0 })
  const [filters, setFilters] = useState<UserFilters>({
    keyword: '',
    role: undefined,
    status: undefined,
    memberLevel: undefined,
    dateRange: null,
  })
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([])
  const [modalVisible, setModalVisible] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const { isAdmin: _isAdmin } = usePermission()

  const userService = new BaseService<User>('users', { defaultOrder: { column: 'created_at', ascending: false } })

  // 加载用户列表
  const loadUsers = useCallback(async () => {
    setLoading(true)
    try {
      const result = await userService.paginate(pagination.current, pagination.pageSize, (q) => {
        let query = q
        if (filters.keyword) {
          query = query.or(`email.ilike.%${filters.keyword}%,nickname.ilike.%${filters.keyword}%,phone.ilike.%${filters.keyword}%`)
        }
        if (filters.role) {
          query = query.eq('role', filters.role)
        }
        if (filters.status) {
          query = query.eq('status', filters.status)
        }
        if (filters.memberLevel) {
          query = query.eq('member_level', filters.memberLevel)
        }
        if (filters.dateRange && filters.dateRange[0] && filters.dateRange[1]) {
          query = query
            .gte('created_at', filters.dateRange[0].format('YYYY-MM-DD'))
            .lte('created_at', filters.dateRange[1].format('YYYY-MM-DD') + 'T23:59:59')
        }
        return query
      })

      if (!result.success) {
        handleApiError(result.errorMessage, 'Users-加载用户列表')
        return
      }

      setUsers(result.data?.data || [])
      setPagination(prev => ({ ...prev, total: result.data?.total || 0 }))
    } catch (error) {
      handleApiError(error, 'Users-加载用户列表')
    } finally {
      setLoading(false)
    }
  }, [pagination.current, pagination.pageSize, filters])

  useEffect(() => {
    loadUsers()
  }, [loadUsers])

  // 搜索
  const handleSearch = () => {
    setPagination(prev => ({ ...prev, current: 1 }))
    loadUsers()
  }

  // 重置筛选
  const handleReset = () => {
    setFilters({
      keyword: '',
      role: undefined,
      status: undefined,
      memberLevel: undefined,
      dateRange: null,
    })
    setPagination(prev => ({ ...prev, current: 1 }))
  }

  // 打开新增弹窗
  const handleAdd = () => {
    setEditingUser(null)
    setModalVisible(true)
  }

  // 打开编辑弹窗
  const handleEdit = (record: User) => {
    setEditingUser(record)
    setModalVisible(true)
  }

  // 删除用户
  const handleDelete = async (id: string) => {
    try {
      const result = await userService.delete(id)
      if (!result.success) {
        handleApiError(result.errorMessage, 'Users-删除用户')
        return
      }
      message.success('删除成功')
      loadUsers()
    } catch (error) {
      handleApiError(error, 'Users-删除用户')
    }
  }

  // 批量删除
  const handleBatchDelete = async () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请先选择要删除的用户')
      return
    }
    try {
      const { error } = await supabase
        .from('users')
        .delete()
        .in('id', selectedRowKeys as string[])
      if (error) {
        handleApiError(error, 'Users-批量删除')
        return
      }
      message.success(`成功删除 ${selectedRowKeys.length} 个用户`)
      setSelectedRowKeys([])
      loadUsers()
    } catch (error) {
      handleApiError(error, 'Users-批量删除')
    }
  }

  // 切换用户状态
  const handleToggleStatus = async (record: User) => {
    try {
      const newStatus = record.status === 'active' ? 'disabled' : 'active'
      const result = await userService.update(record.id, { status: newStatus as any })
      if (!result.success) {
        handleApiError(result.errorMessage, 'Users-切换状态')
        return
      }
      message.success(`用户已${newStatus === 'active' ? '启用' : '停用'}`)
      loadUsers()
    } catch (error) {
      handleApiError(error, 'Users-切换状态')
    }
  }

  // 处理弹窗提交
  const handleModalSubmit = async (values: any) => {
    try {
      if (editingUser) {
        // 更新用户
        const updateData: any = {
          nickname: values.nickname,
          phone: values.phone,
          role: values.role,
          member_level: values.member_level,
          status: values.status,
          points: values.points,
          avatar_url: values.avatar_url,
        }
        if (values.password) {
          updateData.password = values.password
        }
        const result = await userService.update(editingUser.id, updateData)
        if (!result.success) {
          handleApiError(result.errorMessage, 'Users-更新用户')
          return
        }
        message.success('更新成功')
      } else {
        // 创建用户
        const result = await userService.create({
          email: values.email,
          password: values.password,
          nickname: values.nickname,
          phone: values.phone,
          role: values.role || 'user',
          member_level: values.member_level || 'normal',
          status: values.status || 'active',
          points: values.points || 0,
          avatar_url: values.avatar_url,
        } as any)
        if (!result.success) {
          handleApiError(result.errorMessage, 'Users-创建用户')
          return
        }
        message.success('创建成功')
      }
      setModalVisible(false)
      setEditingUser(null)
      loadUsers()
    } catch (error) {
      handleApiError(error, 'Users-保存用户')
    }
  }

  // 表格列定义
  const columns: ColumnsType<User> = [
    {
      title: '用户',
      key: 'user',
      width: 200,
      render: (_, record) => (
        <Space>
          <Avatar src={record.avatar_url} icon={<UserOutlined />} />
          <div>
            <div>{record.nickname || record.email}</div>
            <Text type="secondary" style={{ fontSize: 12 }}>{record.email}</Text>
          </div>
        </Space>
      ),
    },
    {
      title: '角色',
      dataIndex: 'role',
      key: 'role',
      width: 100,
      render: (role: string) => {
        const roleMap: Record<string, { color: string; label: string }> = {
          user: { color: 'default', label: '普通用户' },
          admin: { color: 'blue', label: '管理员' },
          super_admin: { color: 'red', label: '超级管理员' },
        }
        const info = roleMap[role] || { color: 'default', label: role }
        return <Tag color={info.color}>{info.label}</Tag>
      },
    },
    {
      title: '会员等级',
      dataIndex: 'member_level',
      key: 'member_level',
      width: 100,
      render: (level: string) => {
        const levelMap: Record<string, { color: string; label: string }> = {
          normal: { color: 'default', label: '普通' },
          vip: { color: 'gold', label: 'VIP' },
          svip: { color: 'purple', label: 'SVIP' },
        }
        const info = levelMap[level] || { color: 'default', label: level }
        return <Tag color={info.color}>{info.label}</Tag>
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string, record: User) => (
        <Switch
          checked={status === 'active'}
          checkedChildren="启用"
          unCheckedChildren="停用"
          onChange={() => handleToggleStatus(record)}
        />
      ),
    },
    {
      title: '积分',
      dataIndex: 'points',
      key: 'points',
      width: 100,
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 170,
      render: (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm'),
    },
    getActionColumn<User>(
      (record) => [
        {
          key: 'edit',
          label: '编辑',
          icon: <EditOutlined />,
          type: 'primary',
          onClick: () => handleEdit(record),
        },
        {
          key: 'delete',
          label: '删除',
          icon: <DeleteOutlined />,
          danger: true,
          onClick: () => handleDelete(record.id),
        },
      ],
      { width: 200, maxVisible: 2 }
    ),
  ]

  return (
    <div style={{ padding: 24 }}>
      {/* 统计卡片 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="总用户数"
              value={pagination.total}
              prefix={<UserOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="今日新增"
              value={users.filter(u => dayjs(u.created_at).isSame(dayjs(), 'day')).length}
              prefix={<PlusOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="活跃用户数"
              value={users.filter(u => u.status === 'active').length}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
      </Row>

      {/* 筛选栏 */}
      <Card style={{ marginBottom: 16 }}>
        <Space wrap>
          <Input
            placeholder="搜索邮箱/昵称/手机号"
            value={filters.keyword}
            onChange={(e) => setFilters(prev => ({ ...prev, keyword: e.target.value }))}
            onPressEnter={handleSearch}
            prefix={<SearchOutlined />}
            style={{ width: 220 }}
            allowClear
          />
          <Select
            placeholder="角色"
            value={filters.role}
            onChange={(value) => setFilters(prev => ({ ...prev, role: value }))}
            style={{ width: 120 }}
            allowClear
            options={[
              { label: '普通用户', value: 'user' },
              { label: '管理员', value: 'admin' },
              { label: '超级管理员', value: 'super_admin' },
            ]}
          />
          <Select
            placeholder="状态"
            value={filters.status}
            onChange={(value) => setFilters(prev => ({ ...prev, status: value }))}
            style={{ width: 120 }}
            allowClear
            options={[
              { label: '启用', value: 'active' },
              { label: '停用', value: 'disabled' },
            ]}
          />
          <Select
            placeholder="会员等级"
            value={filters.memberLevel}
            onChange={(value) => setFilters(prev => ({ ...prev, memberLevel: value }))}
            style={{ width: 120 }}
            allowClear
            options={[
              { label: '普通', value: 'normal' },
              { label: 'VIP', value: 'vip' },
              { label: 'SVIP', value: 'svip' },
            ]}
          />
          <RangePicker
            value={filters.dateRange}
            onChange={(dates) => setFilters(prev => ({ ...prev, dateRange: dates as any }))}
          />
          <Button type="primary" icon={<SearchOutlined />} onClick={handleSearch}>
            搜索
          </Button>
          <Button icon={<ReloadOutlined />} onClick={handleReset}>
            重置
          </Button>
        </Space>
      </Card>

      {/* 操作栏 */}
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
        <Space>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
            新增用户
          </Button>
          {selectedRowKeys.length > 0 && (
            <Popconfirm
              title="确认批量删除"
              description={`确定要删除选中的 ${selectedRowKeys.length} 个用户吗？`}
              onConfirm={handleBatchDelete}
              okText="确认"
              cancelText="取消"
            >
              <Button danger icon={<DeleteOutlined />}>
                批量删除 ({selectedRowKeys.length})
              </Button>
            </Popconfirm>
          )}
        </Space>
        <Button icon={<ReloadOutlined />} onClick={loadUsers} loading={loading}>
          刷新
        </Button>
      </div>

      {/* 用户表格 */}
      <Table
        columns={columns}
        dataSource={users}
        rowKey="id"
        loading={loading}
        pagination={{
          ...pagination,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total) => `共 ${total} 条`,
          onChange: (page, pageSize) => {
            setPagination(prev => ({ ...prev, current: page, pageSize: pageSize || 20 }))
          },
        }}
        rowSelection={{
          selectedRowKeys,
          onChange: setSelectedRowKeys,
        }}
        scroll={{ x: 1200 }}
      />

      {/* 用户表单弹窗 */}
      <UserFormModal
        open={modalVisible}
        mode={editingUser ? 'edit' : 'create'}
        user={editingUser}
        onCancel={() => {
          setModalVisible(false)
          setEditingUser(null)
        }}
        onSubmit={handleModalSubmit}
      />
    </div>
  )
}

export default Users
