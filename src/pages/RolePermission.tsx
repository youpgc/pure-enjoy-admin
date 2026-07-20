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
  message,
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
import { getActionColumn } from '../components/ActionColumn'
import type { Role, Permission } from '../types/permission'
import { ROLE_STATUS_LABELS, ROLE_STATUS_COLORS, ROLE_STATUS } from '../types/permission'

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
        .from('roles')
        .select('*')
        .order('id')

      if (error) throw error
      setRoles((data as Role[]) || [])
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
        .from('permissions')
        .select('*')
        .order('sort_order')

      if (error) throw error
      setPermissions((data as Permission[]) || [])
    } catch (error) {
      handleApiError(error, 'RolePermission-加载权限')
    }
  }, [])

  // 加载角色的权限
  const loadRolePermissions = useCallback(async (roleId: number) => {
    try {
      const { data, error } = await supabase
        .from('role_permissions')
        .select('permission_id')
        .eq('role_id', roleId)

      if (error) throw error
      setSelectedPermissions(data?.map((rp: { permission_id: number }) => rp.permission_id) || [])
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
        status: role.status === ROLE_STATUS.ACTIVE,
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
        status: values.status ? ROLE_STATUS.ACTIVE : ROLE_STATUS.DISABLED,
      }

      if (editingRole) {
        // 更新角色
        // TODO: Supabase type inference issue - roles Update resolves to never
        const { error } = await (supabase.from('roles') as any)
          .update(roleData)
          .eq('id', editingRole.id)

        if (error) throw error

        // 更新权限关联
        await supabase
          .from('role_permissions')
          .delete()
          .eq('role_id', editingRole.id)

        if (selectedPermissions.length > 0) {
          const rolePerms = selectedPermissions.map(pid => ({
            role_id: editingRole.id,
            permission_id: pid,
          }))
          // TODO: Supabase type inference issue - role_permissions Insert resolves to never
          const { error: rpError } = await (supabase.from('role_permissions') as any)
            .insert(rolePerms)
          if (rpError) throw rpError
        }

        message.success('角色更新成功')
      } else {
        // 新增角色
        // TODO: Supabase type inference issue - roles Insert resolves to never
        const { data, error } = await (supabase.from('roles') as any)
          .insert(roleData)
          .select()
          .single()

        if (error) throw error

        // 添加权限关联
        if (selectedPermissions.length > 0 && data) {
          const rolePerms = selectedPermissions.map(pid => ({
            role_id: (data as Role).id,
            permission_id: pid,
          }))
          // TODO: Supabase type inference issue - role_permissions Insert resolves to never
          const { error: rpError } = await (supabase.from('role_permissions') as any)
            .insert(rolePerms)
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
        .from('roles')
        .delete()
        .eq('id', role.id)

      if (error) throw error
      message.success('角色删除成功')
      loadRoles()
    } catch (error) {
      handleApiError(error, 'RolePermission-删除角色')
    }
  }

  // 权限树数据
  const permissionTreeData = useCallback(() => {
    const moduleMap: Record<string, { title: string; key: string; children: { title: string; key: string }[] }> = {}

    permissions.forEach(p => {
      const modKey = p.module || '未分类'
      let mod = moduleMap[modKey]
      if (!mod) {
        mod = {
          title: modKey,
          key: `module_${modKey}`,
          children: [],
        }
        moduleMap[modKey] = mod
      }
      mod.children.push({
        title: `${p.name} (${p.display_name || '-'})`,
        key: String(p.id),
      })
    })

    return Object.values(moduleMap)
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
    getActionColumn<Role>((record) => [
      {
        key: 'edit',
        label: '编辑',
        icon: <EditOutlined />,
        onClick: () => handleOpenModal(record),
      },
      {
        key: 'delete',
        label: '删除',
        icon: <DeleteOutlined />,
        danger: true,
        onClick: () => handleDelete(record),
      },
    ]),
  ]

  return (
    <div style={{ padding: '0 0 24px' }}>
      <Row gutter={[16, 16]}>
        <Col span={24}>
          <Card
            title={
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <SafetyOutlined style={{ marginRight: 8 }} />
                <Title level={5} style={{ margin: 0 }}>角色权限管理</Title>
              </div>
            }
            extra={
              hasPermission('role:create') && (
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={() => handleOpenModal()}
                >
                  新增角色
                </Button>
              )
            }
          >
            <Table
              columns={columns}
              dataSource={roles}
              rowKey="id"
              loading={loading}
              pagination={false}
            />
          </Card>
        </Col>
      </Row>

      <Modal
        title={editingRole ? '编辑角色' : '新增角色'}
        open={modalVisible}
        onOk={handleSave}
        onCancel={() => {
          setModalVisible(false)
          setEditingRole(null)
          form.resetFields()
          setSelectedPermissions([])
        }}
        confirmLoading={saving}
        width={700}
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
            <Input placeholder="请输入角色名称" />
          </Form.Item>
          <Form.Item
            name="code"
            label="角色编码"
            rules={[{ required: true, message: '请输入角色编码' }]}
          >
            <Input placeholder="请输入角色编码" />
          </Form.Item>
          <Form.Item
            name="description"
            label="描述"
          >
            <Input.TextArea rows={3} placeholder="请输入角色描述" />
          </Form.Item>
          <Form.Item
            name="status"
            label="状态"
            valuePropName="checked"
          >
            <Switch checkedChildren="启用" unCheckedChildren="禁用" />
          </Form.Item>
          <Form.Item label="权限配置">
            <Tree
              checkable
              treeData={permissionTreeData()}
              checkedKeys={selectedPermissions.map(String)}
              onCheck={(checkedKeys) => {
                setSelectedPermissions(
                  (checkedKeys as string[])
                    .filter(key => !key.startsWith('module_'))
                    .map(Number)
                )
              }}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default RolePermissionPage
