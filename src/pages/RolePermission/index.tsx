import React, { useState, useEffect, useCallback, useMemo } from 'react'
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
import { supabase } from '../../utils/supabase'
import { handleApiError } from '../../utils/apiClient'
import { usePermission } from '../../hooks/usePermission'
import { getActionColumn } from '../../components/common/ActionColumn'
import type { Role, Permission } from '../../types/permission'
import { ROLE_STATUS_LABELS, ROLE_STATUS_COLORS, ROLE_STATUS } from '../../types/permission'
import { roleService } from '../../services/roleService'
import EllipsisText from '../../components/common/EllipsisText'
import { resolvePermissionPage, GROUP_ORDER } from '../../constants/permissionMenuMap'
import styles from './index.module.css'
import common from '../../styles/common.module.css'

/** 权限树中跳过的前缀（menu:* 是侧边栏门控元权限，不属于功能资源权限，不应出现在角色配置树中） */
const TREE_SKIP_PREFIXES = ['menu']

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
        .select('id, name, code, description, is_system, status, created_at, updated_at')
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
        .select('id, name, display_name, type, parent_id, sort_order, module, description, created_at')
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
        const { error } = await roleService.updateRole(editingRole.id, roleData)

        if (error) throw error

        // 更新权限关联
        await roleService.deleteRolePermissions(editingRole.id)

        if (selectedPermissions.length > 0) {
          const rolePerms = selectedPermissions.map(pid => ({
            role_id: editingRole.id,
            permission_id: pid,
          }))
          const { error: rpError } = await roleService.createRolePermissions(rolePerms)
          if (rpError) throw rpError
        }

        message.success('角色更新成功')
      } else {
        // 新增角色
        const { data, error } = await roleService.createRole(roleData)

        if (error) throw error

        // 添加权限关联
        if (selectedPermissions.length > 0 && data) {
          const rolePerms = selectedPermissions.map(pid => ({
            role_id: (data as Role).id,
            permission_id: pid,
          }))
          const { error: rpError } = await roleService.createRolePermissions(rolePerms)
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

  // 权限树数据：按「菜单分组 -> 页面 -> 权限」三级组织，与侧边栏对齐
  const permissionTreeData = useCallback(() => {
    interface PageNode { title: string; key: string; children: { title: string; key: string }[] }
    interface GroupNode { title: string; key: string; pages: Record<string, PageNode> }

    // 游戏中心 9 个子页面（与侧边栏菜单一致）：games:read/write/delete 统管全模块，
    // 权限树按页面维度展示（同一权限在每个页面节点下重复出现，key 带 @页序，
    // 勾选/保存时按 @ 前缀解析回权限 id 去重，见下方 onCheck / treeCheckedKeys）
    const GAME_PAGE_NAMES = [
      '游戏与维度配置', '模式管理', '关卡配置', '积分奖励配置', '游戏成就配置',
      '成绩看板', '游戏数据分析', '道具管理', '游戏奖励记录',
    ]
    const gamePerms = permissions.filter(p => p.name.startsWith('games:'))

    const groupMap: Record<string, GroupNode> = {}

    permissions.forEach(p => {
      // 跳过侧边栏门控元权限（menu:*）与 games:*（游戏中心单独按页面展开）
      const prefix = p.name.split(':')[0] || p.name
      if (TREE_SKIP_PREFIXES.includes(prefix) || prefix === 'games') return

      const info = resolvePermissionPage(p.name, p.module)
      let g = groupMap[info.group]
      if (!g) {
        g = { title: info.group, key: `group_${info.group}`, pages: {} }
        groupMap[info.group] = g
      }
      let pg = g.pages[info.page]
      if (!pg) {
        pg = { title: info.page, key: `page_${info.group}_${info.page}`, children: [] }
        g.pages[info.page] = pg
      }
      pg.children.push({
        title: p.display_name || p.name,
        key: String(p.id),
      })
    })

    // 游戏中心：按 9 个子页面展开（每个页面节点挂 games:* 全部权限）
    if (gamePerms.length > 0) {
      const pages: Record<string, PageNode> = {}
      GAME_PAGE_NAMES.forEach((pageName, idx) => {
        pages[pageName] = {
          title: pageName,
          key: `page_游戏中心_${pageName}`,
          children: gamePerms.map(p => ({
            title: p.display_name || p.name,
            key: `${p.id}@${idx}`,
          })),
        }
      })
      groupMap['游戏中心'] = { title: '游戏中心', key: 'group_游戏中心', pages }
    }

    // 按侧边栏分组顺序输出
    const orderedGroups = Object.values(groupMap).sort((a, b) => {
      const ia = GROUP_ORDER.indexOf(a.title)
      const ib = GROUP_ORDER.indexOf(b.title)
      return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib)
    })

    return orderedGroups.map(g => ({
      title: g.title,
      key: g.key,
      children: Object.values(g.pages).map(pg => ({
        title: pg.title,
        key: pg.key,
        children: pg.children,
      })),
    }))
  }, [permissions])

  // Tree 的勾选 key：games:* 权限展开到 9 个页面节点（组合 key `${id}@${页序}`），
  // 其余权限保持原始 id key；由 selectedPermissions（真实权限 id 集合）反向推导。
  const GAME_PAGE_COUNT = 9
  const treeCheckedKeys = useMemo(() => {
    const gamePermIds = new Set(
      permissions.filter(p => p.name.startsWith('games:')).map(p => p.id),
    )
    const keys: string[] = []
    for (const id of selectedPermissions) {
      if (gamePermIds.has(id)) {
        for (let i = 0; i < GAME_PAGE_COUNT; i++) keys.push(`${id}@${i}`)
      } else {
        keys.push(String(id))
      }
    }
    return keys
  }, [selectedPermissions, permissions])

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
      render: (value: string) => <EllipsisText text={value} maxWidth={220} />,
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
    <div className={styles.pageWrap}>
      <Row gutter={[16, 16]}>
        <Col span={24}>
          <Card
            title={
              <div className={styles.titleRow}>
                <SafetyOutlined className={common.mr8} />
                <Title level={5} className={common.noMargin}>角色权限管理</Title>
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
              checkedKeys={treeCheckedKeys}
              onCheck={(checkedKeys) => {
                // 组合 key（`${权限id}@${页序}`）解析回权限 id；与普通 key 合并去重
                const ids = new Set<number>()
                for (const key of checkedKeys as string[]) {
                  if (key.startsWith('group_') || key.startsWith('page_')) continue
                  const n = Number(key.includes('@') ? key.split('@')[0] : key)
                  if (!Number.isNaN(n) && n > 0) ids.add(n)
                }
                setSelectedPermissions([...ids])
              }}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default RolePermissionPage
