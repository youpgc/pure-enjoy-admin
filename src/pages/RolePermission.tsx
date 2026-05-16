import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { Card, Row, Col, Button, Table, Tag, Typography, Tooltip, Spin, message } from 'antd'
import {
  UserOutlined,
  TeamOutlined,
  CrownOutlined,
  CheckOutlined,
  CloseOutlined,
  SettingOutlined,
} from '@ant-design/icons'
import type { RoleWithPermissions, Permission } from '../types/permission'
import { MODULE_DISPLAY_NAMES, MODULE_COLORS } from '../types/permission'
import { mockPermissions, getRolesWithPermissions } from '../utils/mockData'
import PermissionConfigModal from '../components/PermissionConfigModal'
import { useAuth } from '../context/auth'
import { supabase } from '../utils/supabase'

const { Title, Text } = Typography

// 角色图标和颜色
const ROLE_CONFIG: Record<string, { icon: React.ReactNode; color: string; bgColor: string }> = {
  user: {
    icon: <UserOutlined style={{ fontSize: 32 }} />,
    color: '#52c41a',
    bgColor: '#f6ffed',
  },
  admin: {
    icon: <TeamOutlined style={{ fontSize: 32 }} />,
    color: '#1890ff',
    bgColor: '#e6f7ff',
  },
  super_admin: {
    icon: <CrownOutlined style={{ fontSize: 32 }} />,
    color: '#722ed1',
    bgColor: '#f9f0ff',
  },
}

/**
 * 检查 Supabase 中是否存在指定表。
 * 通过尝试查询表的第一行来判断，如果返回 "does not exist" 错误则说明表不存在。
 */
async function tableExists(tableName: string): Promise<boolean> {
  const { error } = await supabase.from(tableName).select('id').limit(1)
  if (error && (error.message.includes('does not exist') || error.code === '42P01')) {
    return false
  }
  return true
}

const RolePermission: React.FC = () => {
  const [modalVisible, setModalVisible] = useState(false)
  const [selectedRole, setSelectedRole] = useState<RoleWithPermissions | null>(null)
  const [rolesWithPerms, setRolesWithPerms] = useState<RoleWithPermissions[]>(() => getRolesWithPermissions())
  const [loading, setLoading] = useState(true)
  const [hasRolePermissionsTable, setHasRolePermissionsTable] = useState(false)

  const { user } = useAuth()

  // 检查是否是超级管理员
  const isSuperAdmin = user?.role === 'super_admin'
  // 检查是否是管理员（可以查看但不能修改）
  const isAdmin = user?.role === 'admin'

  // 是否可以编辑权限（只有超级管理员可以）
  const canEdit = isSuperAdmin

  // 从 Supabase 加载角色权限关联数据
  const fetchRolePermissions = useCallback(async () => {
    setLoading(true)
    try {
      // 检查 role_permissions 表是否存在
      const exists = await tableExists('role_permissions')
      setHasRolePermissionsTable(exists)

      if (exists) {
        const { data, error } = await supabase
          .from('role_permissions')
          .select('role_id, permission_id')

        if (error) {
          console.error('加载角色权限关联失败:', error)
          message.warning('加载角色权限关联失败，使用默认配置')
          setRolesWithPerms(getRolesWithPermissions())
        } else if (data && data.length > 0) {
          // 根据数据库中的关联数据构建角色权限
          const defaultRoles = getRolesWithPermissions()
          const updatedRoles = defaultRoles.map(role => {
            const permIds = data
              .filter((rp: { role_id: number; permission_id: number }) => rp.role_id === role.id)
              .map((rp: { role_id: number; permission_id: number }) => rp.permission_id)
            return {
              ...role,
              permissions: mockPermissions.filter(p => permIds.includes(p.id)),
            }
          })
          setRolesWithPerms(updatedRoles)
        } else {
          // 表存在但没有数据，使用默认配置
          setRolesWithPerms(getRolesWithPermissions())
        }
      } else {
        // role_permissions 表不存在，使用默认配置
        setRolesWithPerms(getRolesWithPermissions())
      }
    } catch (err) {
      console.error('加载角色权限异常:', err)
      setRolesWithPerms(getRolesWithPermissions())
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchRolePermissions()
  }, [fetchRolePermissions])

  // 打开权限配置弹窗
  const handleConfigClick = (role: RoleWithPermissions) => {
    setSelectedRole(role)
    setModalVisible(true)
  }

  // 保存权限配置
  const handleSavePermissions = async (roleId: number, permissionIds: number[]) => {
    if (hasRolePermissionsTable) {
      // 使用 Supabase 持久化保存
      try {
        // 先删除该角色的所有权限关联
        const { error: deleteError } = await supabase
          .from('role_permissions')
          .delete()
          .eq('role_id', roleId)

        if (deleteError) {
          console.error('删除角色权限失败:', deleteError)
          message.error('保存权限配置失败')
          throw deleteError
        }

        // 再批量插入新的权限关联
        if (permissionIds.length > 0) {
          const inserts = permissionIds.map(permissionId => ({
            role_id: roleId,
            permission_id: permissionId,
          }))

          const { error: insertError } = await supabase
            .from('role_permissions')
            .insert(inserts)

          if (insertError) {
            console.error('插入角色权限失败:', insertError)
            message.error('保存权限配置失败')
            throw insertError
          }
        }

        message.success('权限配置已保存到数据库')
      } catch (err) {
        console.error('保存权限配置异常:', err)
        // 即使数据库保存失败，仍然更新本地状态
      }
    } else {
      // role_permissions 表不存在，仅更新本地状态并提示
      message.info('数据库中未找到 role_permissions 表，权限配置仅保存在本地（刷新后重置）')
    }

    // 更新本地状态
    setRolesWithPerms(prev =>
      prev.map(role => {
        if (role.id === roleId) {
          return {
            ...role,
            permissions: mockPermissions.filter(p => permissionIds.includes(p.id)),
          }
        }
        return role
      })
    )
  }

  // 权限矩阵数据
  const matrixData = useMemo(() => {
    // 按模块分组权限
    const groupedPermissions: Record<string, Permission[]> = {}
    mockPermissions.forEach(permission => {
      if (!groupedPermissions[permission.module]) {
        groupedPermissions[permission.module] = []
      }
      groupedPermissions[permission.module]!.push(permission)
    })

    // 构建表格数据
    const data: Array<{
      key: string
      module: string
      permission: string
      permissionId: number
      isModuleHeader?: boolean
      user: boolean
      admin: boolean
      super_admin: boolean
    }> = []

    Object.entries(groupedPermissions).forEach(([module, permissions]) => {
      // 添加模块标题行
      data.push({
        key: `module_${module}`,
        module: MODULE_DISPLAY_NAMES[module] || module,
        permission: '',
        permissionId: 0,
        isModuleHeader: true,
        user: false,
        admin: false,
        super_admin: false,
      })

      // 添加权限行
      permissions.forEach(permission => {
        const rolePerms = rolesWithPerms.reduce(
          (acc, role) => {
            acc[role.name] = role.permissions.some(p => p.id === permission.id)
            return acc
          },
          {} as Record<string, boolean>
        )

        data.push({
          key: `perm_${permission.id}`,
          module: '',
          permission: permission.display_name,
          permissionId: permission.id,
          user: rolePerms['user'] || false,
          admin: rolePerms['admin'] || false,
          super_admin: rolePerms['super_admin'] || false,
        })
      })
    })

    return data
  }, [rolesWithPerms])

  // 权限矩阵表格列
  const matrixColumns = [
    {
      title: '权限名称',
      dataIndex: 'permission',
      key: 'permission',
      width: 200,
      render: (text: string, record: typeof matrixData[0]) => {
        if (record.isModuleHeader) {
          return (
            <span style={{ fontWeight: 600, color: MODULE_COLORS[record.key.replace('module_', '')] || '#333' }}>
              {record.module}
            </span>
          )
        }
        return <span style={{ paddingLeft: 16, color: '#666' }}>{text}</span>
      },
    },
    {
      title: '普通用户',
      dataIndex: 'user',
      key: 'user',
      width: 100,
      align: 'center' as const,
      render: (checked: boolean, record: typeof matrixData[0]) => {
        if (record.isModuleHeader) return null
        return checked ? (
          <CheckOutlined style={{ color: '#52c41a', fontSize: 16 }} />
        ) : (
          <CloseOutlined style={{ color: '#d9d9d9', fontSize: 16 }} />
        )
      },
    },
    {
      title: '管理员',
      dataIndex: 'admin',
      key: 'admin',
      width: 100,
      align: 'center' as const,
      render: (checked: boolean, record: typeof matrixData[0]) => {
        if (record.isModuleHeader) return null
        return checked ? (
          <CheckOutlined style={{ color: '#52c41a', fontSize: 16 }} />
        ) : (
          <CloseOutlined style={{ color: '#d9d9d9', fontSize: 16 }} />
        )
      },
    },
    {
      title: '超级管理员',
      dataIndex: 'super_admin',
      key: 'super_admin',
      width: 120,
      align: 'center' as const,
      render: (checked: boolean, record: typeof matrixData[0]) => {
        if (record.isModuleHeader) return null
        return checked ? (
          <CheckOutlined style={{ color: '#52c41a', fontSize: 16 }} />
        ) : (
          <CloseOutlined style={{ color: '#d9d9d9', fontSize: 16 }} />
        )
      },
    },
  ]

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 100 }}>
        <Spin size="large" tip="加载角色权限..." />
      </div>
    )
  }

  return (
    <div>
      {/* 角色卡片区域 */}
      <div style={{ marginBottom: 24 }}>
        <Title level={4} style={{ marginBottom: 16 }}>
          角色列表
        </Title>
        <Row gutter={[16, 16]}>
          {rolesWithPerms.map(role => {
            const config = ROLE_CONFIG[role.name] || ROLE_CONFIG['user']!
            return (
              <Col key={role.id} xs={24} sm={12} md={8}>
                <Card
                  hoverable
                  style={{
                    borderRadius: 12,
                    border: `2px solid ${config.color}20`,
                    overflow: 'hidden',
                  }}
                  styles={{
                    body: { padding: 0 },
                  }}
                >
                  <div
                    style={{
                      background: config.bgColor,
                      padding: '24px 16px',
                      textAlign: 'center',
                      borderBottom: `1px solid ${config.color}20`,
                    }}
                  >
                    <div style={{ color: config.color, marginBottom: 8 }}>{config.icon}</div>
                    <Title level={4} style={{ margin: 0, color: config.color }}>
                      {role.display_name}
                    </Title>
                    <Tag color={config.color} style={{ marginTop: 8 }}>
                      Level {role.level}
                    </Tag>
                  </div>
                  <div style={{ padding: 16 }}>
                    <Text type="secondary" style={{ fontSize: 13, display: 'block', marginBottom: 12 }}>
                      {role.description}
                    </Text>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <Text>
                        <Text strong style={{ fontSize: 18, color: config.color }}>
                          {role.permissions.length}
                        </Text>{' '}
                        个权限
                      </Text>
                      <Tooltip title={!canEdit ? '只有超级管理员可以修改权限' : ''}>
                        <Button
                          type="primary"
                          icon={<SettingOutlined />}
                          onClick={() => handleConfigClick(role)}
                          disabled={!canEdit && !isAdmin}
                          style={{
                            background: canEdit ? config.color : undefined,
                            borderColor: canEdit ? config.color : undefined,
                          }}
                        >
                          {canEdit ? '配置权限' : '查看权限'}
                        </Button>
                      </Tooltip>
                    </div>
                  </div>
                </Card>
              </Col>
            )
          })}
        </Row>
      </div>

      {/* 权限矩阵区域 */}
      <div>
        <Title level={4} style={{ marginBottom: 16 }}>
          权限矩阵
        </Title>
        <Card style={{ borderRadius: 8 }}>
          <Table
            dataSource={matrixData}
            columns={matrixColumns}
            pagination={false}
            size="small"
            rowClassName={(record) =>
              record.isModuleHeader ? 'module-header-row' : ''
            }
            style={{
              '--module-header-bg': '#fafafa',
            } as React.CSSProperties}
          />
          <style>{`
            .module-header-row {
              background: #fafafa;
            }
            .module-header-row td {
              font-weight: 600;
            }
          `}</style>
        </Card>
      </div>

      {/* 权限配置弹窗 */}
      <PermissionConfigModal
        visible={modalVisible}
        role={selectedRole}
        onClose={() => {
          setModalVisible(false)
          setSelectedRole(null)
        }}
        onSave={handleSavePermissions}
        readOnly={!canEdit}
      />
    </div>
  )
}

export default RolePermission
