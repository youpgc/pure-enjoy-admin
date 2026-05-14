import React, { useState, useMemo } from 'react'
import { Card, Row, Col, Button, Table, Tag, Typography, Tooltip } from 'antd'
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
import { getRolesWithPermissions, mockPermissions } from '../utils/mockData'
import PermissionConfigModal from '../components/PermissionConfigModal'
import { useAuth } from '../context/auth'

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

const RolePermission: React.FC = () => {
  const [modalVisible, setModalVisible] = useState(false)
  const [selectedRole, setSelectedRole] = useState<RoleWithPermissions | null>(null)
  const [rolesWithPerms, setRolesWithPerms] = useState<RoleWithPermissions[]>(() => getRolesWithPermissions())

  const { user } = useAuth()

  // 检查是否是超级管理员
  const isSuperAdmin = user?.role === 'super_admin'
  // 检查是否是管理员（可以查看但不能修改）
  const isAdmin = user?.role === 'admin'

  // 是否可以编辑权限（只有超级管理员可以）
  const canEdit = isSuperAdmin

  // 打开权限配置弹窗
  const handleConfigClick = (role: RoleWithPermissions) => {
    setSelectedRole(role)
    setModalVisible(true)
  }

  // 保存权限配置
  const handleSavePermissions = async (roleId: number, permissionIds: number[]) => {
    // 模拟保存到数据库
    return new Promise<void>(resolve => {
      setTimeout(() => {
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
        resolve()
      }, 500)
    })
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
