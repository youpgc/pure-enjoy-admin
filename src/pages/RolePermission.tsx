import React, { useState, useEffect, useCallback } from 'react'
import {
  Table,
  Button,
  Input,
  Space,
  Card,
  message,
  Modal,
  Form,
  Popconfirm,
  Tree,
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
  SafetyOutlined,
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import { BaseService, handleApiError } from '../utils/apiClient'

const { Text } = Typography

// ==================== 类型定义 ====================

interface Role {
  id: string
  name: string
  code: string
  description?: string
  permissions: string[]
  created_at: string
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

  const service = new BaseService<Role>('roles', { defaultOrder: { column: 'created_at', ascending: false } })

  // 加载数据
  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const result = await service.findAll((q) => {
        if (searchKeyword) {
          return q.or(`name.ilike.%${searchKeyword}%,code.ilike.%${searchKeyword}%`)
        }
        return q
      })
      if (!result.success) {
        handleApiError(result.errorMessage, 'RolePermission-加载数据')
        return
      }
      setRoles(result.data || [])
    } catch (error) {
      handleApiError(error, 'RolePermission-加载数据')
    } finally {
      setLoading(false)
    }
  }, [searchKeyword])

  useEffect(() => {
    loadData()
  }, [loadData])

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
    try {
      const result = await service.delete(id)
      if (!result.success) {
        handleApiError(result.errorMessage, 'RolePermission-删除')
        return
      }
      message.success('删除成功')
      loadData()
    } catch (error) {
      handleApiError(error, 'RolePermission-删除')
    }
  }

  // 保存角色
  const handleSave = async () => {
    try {
      const values = await form.validateFields()
      if (editingRole) {
        const result = await service.update(editingRole.id, values)
        if (!result.success) {
          handleApiError(result.errorMessage, 'RolePermission-更新')
          return
        }
        message.success('更新成功')
      } else {
        const result = await service.create({
          ...values,
          permissions: [],
          created_at: new Date().toISOString(),
        })
        if (!result.success) {
          handleApiError(result.errorMessage, 'RolePermission-创建')
          return
        }
        message.success('创建成功')
      }
      setModalVisible(false)
      setEditingRole(null)
      form.resetFields()
      loadData()
    } catch (error) {
      handleApiError(error, 'RolePermission-保存')
    }
  }

  // 保存权限
  const handleSavePermission = async () => {
    if (!editingRole) return
    try {
      const result = await service.update(editingRole.id, {
        permissions: selectedPermissions,
      })
      if (!result.success) {
        handleApiError(result.errorMessage, 'RolePermission-保存权限')
        return
      }
      message.success('权限配置成功')
      setPermissionModalOpen(false)
      setEditingRole(null)
      setSelectedPermissions([])
      loadData()
    } catch (error) {
      handleApiError(error, 'RolePermission-保存权限')
    }
  }

  // 权限树数据（示例）
  const permissionTreeData = [
    {
      title: '用户管理',
      key: 'user',
      children: [
        { title: '查看用户', key: 'user:read' },
        { title: '创建用户', key: 'user:create' },
        { title: '编辑用户', key: 'user:update' },
        { title: '删除用户', key: 'user:delete' },
      ],
    },
    {
      title: '小说管理',
      key: 'novel',
      children: [
        { title: '查看小说', key: 'novel:read' },
        { title: '创建小说', key: 'novel:create' },
        { title: '编辑小说', key: 'novel:update' },
        { title: '删除小说', key: 'novel:delete' },
      ],
    },
    {
      title: '系统管理',
      key: 'system',
      children: [
        { title: '查看配置', key: 'system:read' },
        { title: '编辑配置', key: 'system:update' },
      ],
    },
  ]

  // 表格列定义
  const columns: ColumnsType<Role> = [
    {
      title: '角色名称',
      dataIndex: 'name',
      key: 'name',
      render: (name: string) => <Text strong>{name}</Text>,
    },
    {
      title: '角色编码',
      dataIndex: 'code',
      key: 'code',
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
    },
    {
      title: '权限数',
      key: 'permission_count',
      width: 100,
      render: (_, record: Role) => (record.permissions || []).length,
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      render: (_, record) => (
        <Space>
          <Button type="primary" size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)}>
            编辑
          </Button>
          <Button size="small" icon={<SafetyOutlined />} onClick={() => handlePermission(record)}>
            权限
          </Button>
          <Popconfirm
            title="确认删除"
            onConfirm={() => handleDelete(record.id)}
            okText="确认"
            cancelText="取消"
          >
            <Button danger size="small" icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <div style={{ padding: 24 }}>
      {/* 统计卡片 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12}>
          <Card>
            <Statistic
              title="总角色数"
              value={roles.length}
              prefix={<SafetyOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12}>
          <Card>
            <Statistic
              title="平均权限数"
              value={roles.length > 0 ? Math.round(roles.reduce((sum, r) => sum + (r.permissions || []).length, 0) / roles.length) : 0}
              prefix={<SafetyOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
      </Row>

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
        dataSource={roles}
        rowKey="id"
        loading={loading}
        pagination={{ pageSize: 20 }}
        scroll={{ x: 800 }}
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
        </Form>
      </Modal>

      {/* 权限配置弹窗 */}
      <Modal
        title="配置权限"
        open={permissionModalOpen}
        onOk={handleSavePermission}
        onCancel={() => {
          setPermissionModalOpen(false)
          setEditingRole(null)
          setSelectedPermissions([])
        }}
        width={500}
      >
        <Tree
          checkable
          checkedKeys={selectedPermissions}
          onCheck={(checkedKeys) => setSelectedPermissions(checkedKeys as string[])}
          treeData={permissionTreeData}
        />
      </Modal>
    </div>
  )
}

export default RolePermission
