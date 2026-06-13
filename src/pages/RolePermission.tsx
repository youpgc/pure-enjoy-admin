import React, { useState, useEffect, useCallback, useMemo } from 'react'
import {
  Table,
  Button,
  Input,
  Space,
  Card,
  message,
  Modal,
  Form,
  Tree,
  Typography,
  Switch,
  Tag,
} from 'antd'
import {
  SearchOutlined,
  ReloadOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SafetyOutlined,
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import { handleApiError } from '../utils/apiClient'
import { supabase } from '../utils/supabase'
import { getActionColumn } from '../components/ActionColumn'

const { Text } = Typography

// ==================== 类型定义 ====================

interface Role {
  id: string
  name: string
  code: string
  description?: string
  permissions: string[]
  is_active: boolean
  created_at: string
  updated_at: string
}

// ==================== 组件 ====================

const RolePermission: React.FC = () => {
  const [roles, setRoles] = useState<Role[]>([])
  const [loading, setLoading] = useState(false)
  const [searchKeyword, setSearchKeyword] = useState('')
  const [modalVisible, setModalVisible] = useState(false)
  const [permissionModalOpen, setPermissionModalOpen] = useState(false)
  const [editingRole, setEditingRole] = useState<Role | null>(null)
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([])
  const [form] = Form.useForm()

  // 从 system_configs 加载角色数据
  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('system_configs')
        .select('*')
        .eq('key', 'roles')
        .single()

      if (error) {
        // 如果没有 roles 配置，使用默认数据
        if (error.code === 'PGRST116') {
          const defaultRoles: Role[] = [
            {
              id: 'user',
              name: '普通用户',
              code: 'user',
              description: '普通用户，拥有基本查看权限',
              permissions: ['users:read', 'novels:read', 'content:read'],
              is_active: true,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
            {
              id: 'admin',
              name: '管理员',
              code: 'admin',
              description: '管理员，拥有大部分管理权限',
              permissions: ['users:read', 'users:write', 'novels:read', 'novels:write', 'novels:delete', 'feedback:read', 'feedback:write', 'content:read', 'content:write', 'content:delete', 'settings:read', 'settings:write', 'analytics:read', 'files:read', 'files:write', 'files:delete', 'sensitive:read', 'sensitive:write'],
              is_active: true,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
            {
              id: 'super_admin',
              name: '超级管理员',
              code: 'super_admin',
              description: '超级管理员，拥有所有权限',
              permissions: ['users:read', 'users:write', 'users:delete', 'users:export', 'novels:read', 'novels:write', 'novels:delete', 'feedback:read', 'feedback:write', 'feedback:delete', 'content:read', 'content:write', 'content:delete', 'settings:read', 'settings:write', 'analytics:read', 'files:read', 'files:write', 'files:delete', 'sensitive:read', 'sensitive:write', 'sensitive:delete'],
              is_active: true,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
          ]
          setRoles(defaultRoles)
          return
        }
        handleApiError(error, 'RolePermission-加载数据')
        return
      }

      if (data && data.value) {
        const parsed = typeof data.value === 'string' ? JSON.parse(data.value) : data.value
        const rolesData: Role[] = Array.isArray(parsed) ? parsed : parsed.roles || []
        setRoles(rolesData)
      } else {
        setRoles([])
      }
    } catch (error) {
      handleApiError(error, 'RolePermission-加载数据')
    } finally {
      setLoading(false)
    }
  }, [searchKeyword])

  useEffect(() => {
    loadData()
  }, [loadData])

  // 保存角色到 system_configs
  const saveRoles = async (newRoles: Role[]) => {
    try {
      const { data: existing } = await supabase
        .from('system_configs')
        .select('id')
        .eq('key', 'roles')
        .single()

      const payload = {
        key: 'roles',
        value: JSON.stringify({ roles: newRoles }),
        description: '系统角色权限配置',
        updated_at: new Date().toISOString(),
      }

      if (existing) {
        const { error } = await supabase
          .from('system_configs')
          .update(payload)
          .eq('key', 'roles')
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('system_configs')
          .insert({ ...payload, created_at: new Date().toISOString() })
        if (error) throw error
      }

      return true
    } catch (error) {
      handleApiError(error, 'RolePermission-保存角色')
      return false
    }
  }

  // 搜索
  const handleSearch = () => {
    loadData()
  }

  // 打开新增弹窗
  const handleAdd = () => {
    setEditingRole(null)
    form.resetFields()
    setModalVisible(true)
  }

  // 打开编辑弹窗
  const handleEdit = (record: Role) => {
    setEditingRole(record)
    form.setFieldsValue({
      ...record,
    })
    setModalVisible(true)
  }

  // 打开权限配置弹窗
  const handlePermission = (record: Role) => {
    setEditingRole(record)
    setSelectedPermissions(record.permissions || [])
    setPermissionModalOpen(true)
  }

  // 删除记录
  const handleDelete = async (id: string) => {
    const newRoles = roles.filter((r) => r.id !== id)
    const success = await saveRoles(newRoles)
    if (success) {
      message.success('删除成功')
      setRoles(newRoles)
    }
  }

  // 保存角色
  const handleSave = async () => {
    try {
      const values = await form.validateFields()
      let newRoles: Role[]
      if (editingRole) {
        newRoles = roles.map((r) =>
          r.id === editingRole.id
            ? { ...r, ...values, updated_at: new Date().toISOString() }
            : r
        )
      } else {
        const newRole: Role = {
          ...values,
          id: values.code,
          permissions: [],
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }
        newRoles = [...roles, newRole]
      }
      const success = await saveRoles(newRoles)
      if (success) {
        message.success(editingRole ? '更新成功' : '创建成功')
        setModalVisible(false)
        setEditingRole(null)
        form.resetFields()
        setRoles(newRoles)
      }
    } catch (error) {
      handleApiError(error, 'RolePermission-保存')
    }
  }

  // 保存权限
  const handleSavePermission = async () => {
    if (!editingRole) return
    const newRoles = roles.map((r) =>
      r.id === editingRole.id
        ? { ...r, permissions: selectedPermissions, updated_at: new Date().toISOString() }
        : r
    )
    const success = await saveRoles(newRoles)
    if (success) {
      message.success('权限配置成功')
      setPermissionModalOpen(false)
      setEditingRole(null)
      setSelectedPermissions([])
      setRoles(newRoles)
    }
  }

  // 权限树数据（3个模块：用户管理、小说管理、系统管理）
  const permissionTreeData = [
    {
      title: '用户管理',
      key: 'users',
      children: [
        { title: '查看用户', key: 'users:read' },
        { title: '编辑用户', key: 'users:write' },
        { title: '删除用户', key: 'users:delete' },
        { title: '导出用户', key: 'users:export' },
      ],
    },
    {
      title: '小说管理',
      key: 'novels',
      children: [
        { title: '查看小说', key: 'novels:read' },
        { title: '编辑小说', key: 'novels:write' },
        { title: '删除小说', key: 'novels:delete' },
      ],
    },
    {
      title: '系统管理',
      key: 'system',
      children: [
        { title: '查看反馈', key: 'feedback:read' },
        { title: '编辑反馈', key: 'feedback:write' },
        { title: '删除反馈', key: 'feedback:delete' },
        { title: '查看内容', key: 'content:read' },
        { title: '编辑内容', key: 'content:write' },
        { title: '删除内容', key: 'content:delete' },
        { title: '查看设置', key: 'settings:read' },
        { title: '编辑设置', key: 'settings:write' },
        { title: '查看统计', key: 'analytics:read' },
        { title: '查看文件', key: 'files:read' },
        { title: '上传/编辑文件', key: 'files:write' },
        { title: '删除文件', key: 'files:delete' },
        { title: '查看敏感词', key: 'sensitive:read' },
        { title: '编辑敏感词', key: 'sensitive:write' },
        { title: '删除敏感词', key: 'sensitive:delete' },
      ],
    },
  ]

  // 收集所有父节点 key（非叶子节点），用于在 onCheck 中过滤
  const parentKeys = useMemo(() => {
    const keys: string[] = []
    const collect = (nodes: any[]) => {
      for (const node of nodes) {
        if (node.children && node.children.length > 0) {
          keys.push(node.key)
          collect(node.children)
        }
      }
    }
    collect(permissionTreeData)
    return new Set(keys)
  }, [])

  // 过滤后的角色列表
  const filteredRoles = roles.filter(
    (r) =>
      !searchKeyword ||
      r.name.includes(searchKeyword) ||
      r.code.includes(searchKeyword)
  )

  // 表格列定义
  const columns: ColumnsType<Role> = [
    {
      title: '角色名称',
      dataIndex: 'name',
      key: 'name',
      width: 150,
      render: (name: string) => <Text strong>{name}</Text>,
    },
    {
      title: '角色编码',
      dataIndex: 'code',
      key: 'code',
      width: 120,
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      width: 200,
      ellipsis: true,
    },
    {
      title: '权限数量',
      key: 'permission_count',
      width: 100,
      render: (_, record: Role) => (record.permissions || []).length,
    },
    {
      title: '状态',
      dataIndex: 'is_active',
      key: 'is_active',
      width: 100,
      render: (isActive: boolean) => (
        <Tag color={isActive ? 'green' : 'default'}>{isActive ? '启用' : '停用'}</Tag>
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 170,
      render: (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm'),
    },
    getActionColumn<Role>(
      (record) => [
        {
          key: 'edit',
          label: '编辑',
          icon: <EditOutlined />,
          type: 'primary',
          onClick: () => handleEdit(record),
        },
        {
          key: 'permission',
          label: '配置权限',
          icon: <SafetyOutlined />,
          onClick: () => handlePermission(record),
        },
        {
          key: 'delete',
          label: '删除',
          icon: <DeleteOutlined />,
          danger: true,
          onClick: () => handleDelete(record.id),
        },
      ],
      { width: 280, maxVisible: 3 }
    ),
  ]

  return (
    <div style={{ padding: 24 }}>
      {/* 筛选栏 */}
      <Card style={{ marginBottom: 16 }}>
        <Space wrap>
          <Input
            placeholder="搜索角色名称/编码"
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            onPressEnter={handleSearch}
            prefix={<SearchOutlined />}
            style={{ width: 300 }}
            allowClear
          />
          <Button type="primary" icon={<SearchOutlined />} onClick={handleSearch}>
            搜索
          </Button>
        </Space>
      </Card>

      {/* 操作栏 */}
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
          新增角色
        </Button>
        <Button icon={<ReloadOutlined />} onClick={loadData} loading={loading}>
          刷新
        </Button>
      </div>

      {/* 数据表格 */}
      <Table
        columns={columns}
        dataSource={filteredRoles}
        rowKey="id"
        loading={loading}
        pagination={{ pageSize: 20 }}
        scroll={{ x: 'max-content' }}
      />

      {/* 角色表单弹窗 */}
      <Modal
        title={editingRole ? '编辑角色' : '新增角色'}
        open={modalVisible}
        onOk={handleSave}
        onCancel={() => {
          setModalVisible(false)
          setEditingRole(null)
          form.resetFields()
        }}
        width={500}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="name"
            label="角色名称"
            rules={[{ required: true, message: '请输入角色名称' }]}
          >
            <Input placeholder="请输入角色名称" />
          </Form.Item>
          <Form.Item
            name="code"
            label="角色编码"
            rules={[{ required: true, message: '请输入角色编码' }]}
          >
            <Input placeholder="请输入角色编码" disabled={!!editingRole} />
          </Form.Item>
          <Form.Item
            name="description"
            label="描述"
          >
            <Input.TextArea rows={2} placeholder="请输入描述" />
          </Form.Item>
          <Form.Item
            name="is_active"
            label="状态"
            valuePropName="checked"
          >
            <Switch checkedChildren="启用" unCheckedChildren="停用" />
          </Form.Item>
        </Form>
      </Modal>

      {/* 权限配置弹窗 */}
      <Modal
        title={`配置权限 - ${editingRole?.name || ''}`}
        open={permissionModalOpen}
        onOk={handleSavePermission}
        onCancel={() => {
          setPermissionModalOpen(false)
          setEditingRole(null)
          setSelectedPermissions([])
        }}
        width={600}
      >
        <Tree
          checkable
          checkedKeys={selectedPermissions}
          onCheck={(checkedKeys) => {
            // 过滤掉父节点 key，只保留叶子节点（具体权限）
            const keys = (checkedKeys as string[]).filter((key) => !parentKeys.has(key))
            setSelectedPermissions(keys)
          }}
          treeData={permissionTreeData}
        />
      </Modal>
    </div>
  )
}

export default RolePermission
