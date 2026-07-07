import React, { useState, useEffect, useCallback } from 'react'
import {
  Card,
  Table,
  Button,
  Modal,
  Form,
  Input,
  Switch,
  Tag,
  Tree,
  Space,
  message,
  Popconfirm,
  Typography,
  Row,
  Col,
} from 'antd'
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SafetyOutlined,
} from '@ant-design/icons'
import { supabase } from '../utils/supabase'
import { handleApiError } from '../utils/apiClient'
import { usePermission } from '../hooks/usePermission'
import type { Role, Permission } from '../types/permission'
import { ROLE_STATUS_LABELS, ROLE_STATUS_COLORS } from '../types/permission'

const { Title } = Typography

// ==================== 角色管理页面 ====================

const RolePermissionPage: React.FC = () => {
  const [roles, setRoles] = useState<Role[]>([])
  const [permissions, setPermissions] = useState<Permission[]>([])
  const [loading, setLoading] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)
  const [editingRole, setEditingRole] = useState<Role | null>(null)
  const [form] = Form.useForm()
  const [saving, setSaving] = useState(false)
  const [selectedPermissions, setSelectedPermissions] = useState<number[]>([])
  const { hasPermission } = usePermission()

  // 加载角色列表
  const loadRoles = useCallback(async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('roles' as any)
        .select('*')
        .order('id') as any

      if (error) throw error
      setRoles(data || [])
    } catch (error) {
      handleApiError(error, 'RolePermission-加载角色')
    } finally {
      setLoading(false)
    }
  }, [])

  // 加载权限列表
  const loadPermissions = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('permissions' as any)
        .select('*')
        .order('sort_order') as any

      if (error) throw error
      setPermissions(data || [])
    } catch (error) {
      handleApiError(error, 'RolePermission-加载权限')
    }
  }, [])

  // 加载角色的权限
  const loadRolePermissions = useCallback(async (roleId: number) => {
    try {
      const { data, error } = await (supabase
        .from('role_permissions') as any)
        .select('permission_id')
        .eq('role_id', roleId)

      if (error) throw error
      setSelectedPermissions(data?.map((rp: any) => rp.permission_id) || [])
    } catch (error) {
      handleApiError(error, 'RolePermission-加载角色权限')
    }
  }, [])

  useEffect(() => {
    loadRoles()
    loadPermissions()
  }, [loadRoles, loadPermissions])

  // 打开新增/编辑弹窗
  const handleOpenModal = (role?: Role) => {
    if (role) {
      setEditingRole(role)
      form.setFieldsValue({
        name: role.name,
        code: role.code,
        description: role.description,
        status: role.status === 'active',
      })
      loadRolePermissions(role.id)
    } else {
      setEditingRole(null)
      form.resetFields()
      setSelectedPermissions([])
    }
    setModalVisible(true)
  }

  // 保存角色
  const handleSave = async () => {
    if (saving) return
    try {
      setSaving(true)
      const values = await form.validateFields()
      const roleData = {
        name: values.name,
        code: values.code,
        description: values.description,
        status: values.status ? 'active' : 'disabled',
      }

      if (editingRole) {
        // 更新角色
        const { error } = await (supabase
          .from('roles') as any)
          .update(roleData)
          .eq('id', editingRole.id)

        if (error) throw error

        // 更新权限关联
        await supabase
          .from('role_permissions' as any)
          .delete()
          .eq('role_id', editingRole.id) as any

        if (selectedPermissions.length > 0) {
          const rolePerms = selectedPermissions.map(pid => ({
            role_id: editingRole.id,
            permission_id: pid,
          }))
          const { error: rpError } = await supabase
            .from('role_permissions' as any)
            .insert(rolePerms as any) as any
          if (rpError) throw rpError
        }

        message.success('角色更新成功')
      } else {
        // 新增角色
        const { data, error } = await supabase
          .from('roles' as any)
          .insert(roleData as any)
          .select()
          .single() as any

        if (error) throw error

        // 添加权限关联
        if (selectedPermissions.length > 0 && data) {
          const rolePerms = selectedPermissions.map(pid => ({
            role_id: data.id,
            permission_id: pid,
          }))
          const { error: rpError } = await supabase
            .from('role_permissions' as any)
            .insert(rolePerms as any) as any
          if (rpError) throw rpError
        }

        message.success('角色创建成功')
      }

      setModalVisible(false)
      loadRoles()
    } catch (error) {
      handleApiError(error, 'RolePermission-保存角色')
    } finally {
      setSaving(false)
    }
  }

  // 删除角色
  const handleDelete = async (role: Role) => {
    try {
      if (role.is_system) {
        message.error('系统内置角色不能删除')
        return
      }

      const { error } = await supabase
        .from('roles' as any)
        .delete()
        .eq('id', role.id) as any

      if (error) throw error
      message.success('角色删除成功')
      loadRoles()
    } catch (error) {
      handleApiError(error, 'RolePermission-删除角色')
    }
  }

  // 从 action 名称中提取资源名称（如"查看小说" -> "小说"）
  const extractResourceName = (displayName: string): string => {
    const prefixes = ['查看', '编辑', '删除', '导出']
    for (const prefix of prefixes) {
      if (displayName.startsWith(prefix)) {
        return displayName.slice(prefix.length)
      }
    }
    return displayName
  }

  // 构建权限树：目录 -> 菜单 -> 权限（三层）
  const buildPermissionTree = useCallback(() => {
    const menuPerms = permissions.filter(p => p.type === 'menu')
    const actionPerms = permissions.filter(p => p.type === 'action')

    return menuPerms.map(menu => {
      const menuActions = actionPerms.filter(action => action.parent_id === menu.id)

      // 按资源名称分组形成菜单层
      const groups: Record<string, Permission[]> = {}
      menuActions.forEach(action => {
        const resourceName = extractResourceName(action.display_name)
        if (!groups[resourceName]) {
          groups[resourceName] = []
        }
        groups[resourceName].push(action)
      })

      return {
        title: menu.display_name,
        key: `menu_${menu.id}`,
        children: Object.entries(groups).map(([resourceName, actions]) => ({
          title: `${resourceName}管理`,
          key: `group_${menu.id}_${resourceName}`,
          children: actions.map(action => ({
            title: action.display_name,
            key: action.id,
          })),
        })),
      }
    })
  }, [permissions])

  // 表格列定义
  const columns = [
    {
      title: '角色名称',
      dataIndex: 'name',
      key: 'name',
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
      title: '类型',
      dataIndex: 'is_system',
      key: 'is_system',
      render: (isSystem: boolean) => (
        <Tag color={isSystem ? 'blue' : 'default'}>
          {isSystem ? '系统内置' : '自定义'}
        </Tag>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={ROLE_STATUS_COLORS[status]}>
          {ROLE_STATUS_LABELS[status]}
        </Tag>
      ),
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: Role) => (
        <Space>
          {hasPermission('roles:write') && (
            <Button
              type="link"
              icon={<EditOutlined />}
              onClick={() => handleOpenModal(record)}
            >
              编辑
            </Button>
          )}
          {!record.is_system && hasPermission('roles:delete') && (
            <Popconfirm
              title="确认删除"
              description={`确定要删除角色 "${record.name}" 吗？`}
              onConfirm={() => handleDelete(record)}
              okText="删除"
              cancelText="取消"
            >
              <Button type="link" danger icon={<DeleteOutlined />}>
                删除
              </Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ]

  return (
    <div>
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Col>
          <Title level={4} style={{ margin: 0 }}>
            <SafetyOutlined /> 角色权限管理
          </Title>
        </Col>
        <Col>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => handleOpenModal()}
          >
            新增角色
          </Button>
        </Col>
      </Row>

      <Card>
        <Table
          columns={columns}
          dataSource={roles}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 10 }}
        />
      </Card>

      {/* 新增/编辑角色弹窗 */}
      <Modal
        title={editingRole ? '编辑角色' : '新增角色'}
        open={modalVisible}
        onOk={handleSave}
        confirmLoading={saving}
        onCancel={() => setModalVisible(false)}
        width={700}
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{ status: true }}
        >
          <Form.Item
            name="name"
            label="角色名称"
            rules={[{ required: true, message: '请输入角色名称' }]}
          >
            <Input placeholder="如：运营管理员" />
          </Form.Item>
          <Form.Item
            name="code"
            label="角色编码"
            rules={[
              { required: true, message: '请输入角色编码' },
              { pattern: /^[a-z0-9_]+$/, message: '只能使用小写字母、数字和下划线' },
            ]}
          >
            <Input placeholder="如：operation_admin" disabled={!!editingRole} />
          </Form.Item>
          <Form.Item
            name="description"
            label="描述"
          >
            <Input.TextArea rows={2} placeholder="角色描述" />
          </Form.Item>
          <Form.Item
            name="status"
            label="状态"
            valuePropName="checked"
          >
            <Switch checkedChildren="启用" unCheckedChildren="禁用" />
          </Form.Item>

          <Form.Item label="权限配置">
            <Card size="small" title="选择权限" style={{ maxHeight: 400, overflow: 'auto' }}>
              <Tree
                checkable
                treeData={buildPermissionTree()}
                checkedKeys={selectedPermissions}
                onCheck={(checkedKeys) => {
                  // 只保留 action 节点的 key（纯数字），过滤掉 group/menu 层的字符串 key
                  const keys = (checkedKeys as React.Key[]).filter(
                    k => typeof k === 'number' || /^\d+$/.test(String(k))
                  )
                  setSelectedPermissions(keys.map(k => Number(k)))
                }}
              />
            </Card>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default RolePermissionPage
